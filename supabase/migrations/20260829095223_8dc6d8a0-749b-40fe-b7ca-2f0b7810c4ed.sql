create policy "Users upload own ticket proofs"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'ticket-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users read own ticket proofs"
  on storage.objects for select to authenticated
  using (bucket_id = 'ticket-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));

create policy "Users delete own ticket proofs"
  on storage.objects for delete to authenticated
  using (bucket_id = 'ticket-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

create sequence if not exists public.support_ticket_number_seq;
grant usage on sequence public.support_ticket_number_seq to authenticated, service_role;

alter table public.support_tickets
  add column if not exists ticket_number text,
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists status_changed_at timestamptz not null default now();

update public.support_tickets
set ticket_number = 'TKT-' || lpad(nextval('public.support_ticket_number_seq')::text, 6, '0')
where ticket_number is null;

alter table public.support_tickets
  alter column ticket_number set default 'TKT-' || lpad(nextval('public.support_ticket_number_seq')::text, 6, '0');

create unique index if not exists support_tickets_ticket_number_key on public.support_tickets(ticket_number);

create table if not exists public.support_ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  status text not null,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

grant select on public.support_ticket_events to authenticated;
grant all on public.support_ticket_events to service_role;
alter table public.support_ticket_events enable row level security;

create policy "Users view own ticket events"
  on public.support_ticket_events for select to authenticated
  using (
    exists (select 1 from public.support_tickets t
            where t.id = ticket_id and (t.user_id = auth.uid() or public.has_role(auth.uid(),'admin')))
  );

create policy "Admins manage ticket events"
  on public.support_ticket_events for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create index if not exists support_ticket_events_ticket_idx on public.support_ticket_events(ticket_id, created_at);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

create policy "Users view own notifications"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

create policy "Users update own notifications"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admins manage notifications"
  on public.notifications for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

create or replace function public.support_ticket_status_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  label text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.status_changed_at := now();
  end if;

  label := case new.status
    when 'open' then 'Submitted'
    when 'submitted' then 'Submitted'
    when 'pending' then 'More proof requested'
    when 'more_proof_requested' then 'More proof requested'
    when 'in_progress' then 'In review'
    when 'in_review' then 'In review'
    when 'resolved' then 'Resolved'
    when 'closed' then 'Closed'
    else new.status
  end;

  insert into public.support_ticket_events (ticket_id, status, note, created_by)
  values (new.id, new.status, label, auth.uid());

  insert into public.notifications (user_id, title, body, link)
  values (
    new.user_id,
    'Ticket ' || coalesce(new.ticket_number, '') || ' — ' || label,
    new.subject,
    '/tickets/' || new.id::text
  );

  return new;
end;
$$;

revoke all on function public.support_ticket_status_notify() from public, anon, authenticated;

drop trigger if exists support_ticket_status_notify_ins on public.support_tickets;
create trigger support_ticket_status_notify_ins
  after insert on public.support_tickets
  for each row execute function public.support_ticket_status_notify();

drop trigger if exists support_ticket_status_notify_upd on public.support_tickets;
create trigger support_ticket_status_notify_upd
  before update on public.support_tickets
  for each row execute function public.support_ticket_status_notify();