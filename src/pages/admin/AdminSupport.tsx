import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Link } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, MessageSquare, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

const STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "pending", label: "Waiting on customer" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const statusTone = (s: string) =>
  s === "resolved" || s === "closed"
    ? "bg-emerald-500/15 text-emerald-500"
    : s === "in_progress"
      ? "bg-blue-500/15 text-blue-500"
      : s === "pending"
        ? "bg-amber-500/15 text-amber-500"
        : "bg-muted text-muted-foreground";

export default function AdminSupport() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [nextStatus, setNextStatus] = useState("in_progress");
  const [saving, setSaving] = useState(false);

  const ticketsQuery = useQuery({
    queryKey: ["admin-support-tickets", filter],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const eventsQuery = useQuery({
    queryKey: ["admin-ticket-events", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_ticket_events")
        .select("*")
        .eq("ticket_id", selected!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const tickets = (ticketsQuery.data ?? []).filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [t.ticket_number, t.subject, t.category, t.id].some((v) =>
      String(v ?? "").toLowerCase().includes(q),
    );
  });

  const ticket = tickets.find((t) => t.id === selected) ?? null;

  const submit = async () => {
    if (!ticket) return;
    const note = reply.trim();
    if (note.length < 3) {
      toast.error("Reply must be at least 3 characters");
      return;
    }
    setSaving(true);
    try {
      const { error: evErr } = await supabase.from("support_ticket_events").insert({
        ticket_id: ticket.id,
        status: nextStatus,
        note,
        created_by: user?.id ?? null,
      });
      if (evErr) throw evErr;

      const { error: tErr } = await supabase
        .from("support_tickets")
        .update({ status: nextStatus, status_changed_at: new Date().toISOString() })
        .eq("id", ticket.id);
      if (tErr) throw tErr;

      await supabase.from("notifications").insert({
        user_id: ticket.user_id,
        title: `Support update — ${ticket.ticket_number ?? ticket.id.slice(0, 8)}`,
        body: note.slice(0, 240),
        link: `/tickets/${ticket.id}`,
      });

      setReply("");
      toast.success("Reply posted and customer notified");
      void qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      void qc.invalidateQueries({ queryKey: ["admin-ticket-events", ticket.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update ticket");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 px-2 sm:px-4 lg:px-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="gap-2">
              <Link to="/admin">
                <ArrowLeft className="h-4 w-4" /> Admin
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Support tickets</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void ticketsQuery.refetch()}
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search ticket number or subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">{tickets.length} ticket(s)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
              {ticketsQuery.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : tickets.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No tickets found.</p>
              ) : (
                tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelected(t.id);
                      setNextStatus(t.status ?? "in_progress");
                    }}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      selected === t.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {t.ticket_number ?? t.id.slice(0, 8)}
                      </Badge>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusTone(t.status ?? "open")}`}>
                        {t.status ?? "open"}
                      </span>
                      <span className="text-xs text-muted-foreground">{t.priority}</span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">{t.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.created_at ?? Date.now()).toLocaleString()}
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {ticket ? ticket.subject : "Select a ticket"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!ticket ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Pick a ticket to see the full conversation timeline.
                </p>
              ) : (
                <>
                  <p className="whitespace-pre-wrap rounded-xl bg-muted/40 p-3 text-sm">
                    {ticket.message}
                  </p>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Timeline
                    </p>
                    {eventsQuery.isLoading ? (
                      <Skeleton className="h-24 w-full" />
                    ) : (eventsQuery.data?.length ?? 0) === 0 ? (
                      <p className="text-sm text-muted-foreground">No updates yet.</p>
                    ) : (
                      eventsQuery.data?.map((ev) => (
                        <div key={ev.id} className="rounded-xl border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs ${statusTone(ev.status)}`}>
                              {ev.status}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(ev.created_at).toLocaleString()}
                            </span>
                          </div>
                          {ev.note && <p className="mt-2 whitespace-pre-wrap text-sm">{ev.note}</p>}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <Select value={nextStatus} onValueChange={setNextStatus}>
                      <SelectTrigger className="w-full sm:w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      rows={4}
                      placeholder="Write a reply for the customer…"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                    />
                    <Button onClick={() => void submit()} disabled={saving} className="gap-2">
                      <Send className="h-4 w-4" />
                      {saving ? "Posting…" : "Post reply & update status"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
