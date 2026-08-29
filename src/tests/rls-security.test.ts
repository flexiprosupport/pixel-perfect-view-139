/**
 * Integration tests: verify a normal (non-privileged) signed-in user cannot
 *  1. tamper with engagement order item pricing/quantity,
 *  2. change scheduling/quantity of their pending organic runs,
 *  3. forge wallet transaction rows.
 *
 * These run against the real project database. They need
 * SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY (or VITE_*) and SUPABASE_SERVICE_ROLE_KEY.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL']!;
const publishable =
  process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['VITE_SUPABASE_PUBLISHABLE_KEY']!;
const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = `rls-test-${Date.now()}@example.com`;
const password = `Test-${Math.random().toString(36).slice(2)}-A1!`;

let userId = '';
let userClient: SupabaseClient;
let orderId = '';
let itemId = '';
let runId = '';

beforeAll(async () => {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) throw createErr;
  userId = created.user!.id;

  userClient = createClient(url, publishable, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInErr } = await userClient.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;

  // Seed an engagement order + item + pending run owned by the test user.
  const { data: order, error: orderErr } = await admin
    .from('engagement_orders')
    .insert({ user_id: userId, link: 'https://example.com/post', base_quantity: 100, total_price: 1 })
    .select('id')
    .single();
  if (orderErr) throw orderErr;
  orderId = order.id;

  const { data: item, error: itemErr } = await admin
    .from('engagement_order_items')
    .insert({
      engagement_order_id: orderId,
      engagement_type: 'likes',
      quantity: 100,
      price: 1,
      status: 'pending',
    })
    .select('id')
    .single();
  if (itemErr) throw itemErr;
  itemId = item.id;

  const { data: run, error: runErr } = await admin
    .from('organic_run_schedule')
    .insert({
      engagement_order_item_id: itemId,
      run_number: 1,
      scheduled_at: new Date(Date.now() + 3_600_000).toISOString(),
      quantity_to_send: 10,
      base_quantity: 10,
      status: 'pending',
    })
    .select('id')
    .single();
  if (runErr) throw runErr;
  runId = run.id;
}, 60_000);

afterAll(async () => {
  if (runId) await admin.from('organic_run_schedule').delete().eq('id', runId);
  if (itemId) await admin.from('engagement_order_items').delete().eq('id', itemId);
  if (orderId) await admin.from('engagement_orders').delete().eq('id', orderId);
  if (userId) {
    await admin.from('transactions').delete().eq('user_id', userId);
    await admin.auth.admin.deleteUser(userId);
  }
});

describe('engagement_order_items', () => {
  it('does not let a user change price or quantity on their own item', async () => {
    await userClient
      .from('engagement_order_items')
      .update({ price: 0.0001, quantity: 999999, provider_order_id: 'forged-123' })
      .eq('id', itemId);

    const { data } = await admin
      .from('engagement_order_items')
      .select('price, quantity, provider_order_id')
      .eq('id', itemId)
      .single();

    expect(Number(data!.price)).toBe(1);
    expect(data!.quantity).toBe(100);
    expect(data!.provider_order_id).toBeNull();
  });

  it('still allows cancelling own item', async () => {
    const { error } = await userClient
      .from('engagement_order_items')
      .update({ status: 'cancelled' })
      .eq('id', itemId);
    expect(error).toBeNull();

    const { data } = await admin
      .from('engagement_order_items')
      .select('status')
      .eq('id', itemId)
      .single();
    expect(data!.status).toBe('cancelled');
  });
});

describe('organic_run_schedule', () => {
  it('does not let a user change quantity or schedule of a pending run', async () => {
    const tampered = new Date(Date.now() + 999_000_000).toISOString();
    await userClient
      .from('organic_run_schedule')
      .update({ quantity_to_send: 500000, scheduled_at: tampered })
      .eq('id', runId);

    const { data } = await admin
      .from('organic_run_schedule')
      .select('quantity_to_send, scheduled_at')
      .eq('id', runId)
      .single();

    expect(data!.quantity_to_send).toBe(10);
    expect(new Date(data!.scheduled_at).toISOString()).not.toBe(tampered);
  });
});

describe('transactions', () => {
  it('blocks a user from inserting a forged transaction', async () => {
    const { error } = await userClient.from('transactions').insert({
      user_id: userId,
      type: 'deposit',
      amount: 100000,
      balance_after: 100000,
      description: 'forged',
    });

    expect(error).not.toBeNull();

    const { count } = await admin
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    expect(count ?? 0).toBe(0);
  });

  it('blocks inserting a transaction for another user', async () => {
    const { error } = await userClient.from('transactions').insert({
      user_id: '00000000-0000-0000-0000-000000000001',
      type: 'deposit',
      amount: 5,
      balance_after: 5,
    });
    expect(error).not.toBeNull();
  });
});
