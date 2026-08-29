import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageMeta } from "@/components/seo/PageMeta";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  FileSearch,
  Paperclip,
  Send,
} from "lucide-react";
import { formatBytes, getProofUrl, type ProofAttachment } from "@/lib/ticket-attachments";

const STAGES = [
  { key: "submitted", label: "Submitted", icon: Send, matches: ["open", "submitted"] },
  { key: "in_review", label: "In review", icon: FileSearch, matches: ["in_progress", "in_review"] },
  {
    key: "more_proof_requested",
    label: "More proof requested",
    icon: Clock,
    matches: ["pending", "more_proof_requested"],
  },
  { key: "resolved", label: "Resolved", icon: CheckCircle2, matches: ["resolved", "closed"] },
];

function stageIndex(status: string) {
  const idx = STAGES.findIndex((s) => s.matches.includes(status));
  return idx === -1 ? 0 : idx;
}

export default function TicketStatus() {
  const { ticketId } = useParams({ from: "/tickets/$ticketId" });
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const ticketQuery = useQuery({
    queryKey: ["support-ticket", ticketId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", ticketId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const eventsQuery = useQuery({
    queryKey: ["support-ticket-events", ticketId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_ticket_events")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Mark related notifications as read when the user opens the ticket.
  useEffect(() => {
    if (!user) return;
    void supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null)
      .eq("link", `/tickets/${ticketId}`)
      .then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }));
  }, [user, ticketId, queryClient]);

  const ticket = ticketQuery.data;
  const attachments = (ticket?.attachments as unknown as ProofAttachment[] | null) ?? [];
  const current = stageIndex(ticket?.status ?? "open");

  const [busyPath, setBusyPath] = useState<string | null>(null);
  const openProof = async (path: string, name: string) => {
    setBusyPath(path);
    try {
      const url = await getProofUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast({
        title: "Could not open file",
        description: e instanceof Error ? e.message : `Failed to load ${name}`,
        variant: "destructive",
      });
    } finally {
      setBusyPath(null);
    }
  };

  return (
    <DashboardLayout>
      <PageMeta
        title="Ticket status — FlexiPro"
        description="Track the status of your FlexiPro support ticket, from submission to resolution."
        canonicalPath="/support"
      />
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/support">
            <ArrowLeft className="h-4 w-4" /> Back to Support
          </Link>
        </Button>

        {ticketQuery.isLoading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : !ticket ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Ticket not found, or you do not have access to it.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="glass-card">
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{ticket.ticket_number ?? ticket.id.slice(0, 8)}</Badge>
                  <Badge>{STAGES[current]?.label}</Badge>
                  <Badge variant="secondary">{ticket.priority}</Badge>
                </div>
                <CardTitle className="text-xl">{ticket.subject}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Raised {new Date(ticket.created_at ?? Date.now()).toLocaleString()}
                </p>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap break-words font-sans text-sm text-muted-foreground">
                  {ticket.message}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {STAGES.map((stage, i) => {
                  const Icon = stage.icon;
                  const done = i <= current;
                  return (
                    <div key={stage.key} className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 rounded-full p-2 ${
                          done ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${done ? "" : "text-muted-foreground"}`}>
                          {stage.label}
                        </p>
                        {i === current && (
                          <p className="text-xs text-muted-foreground">
                            Updated {new Date(ticket.status_changed_at ?? ticket.updated_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {(eventsQuery.data?.length ?? 0) > 0 && (
                  <div className="mt-6 space-y-2 border-t border-border pt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      History
                    </p>
                    {eventsQuery.data?.map((ev) => (
                      <div key={ev.id} className="flex items-center justify-between text-xs">
                        <span>{ev.note ?? ev.status}</span>
                        <span className="text-muted-foreground">
                          {new Date(ev.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Attached proof</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {attachments.map((a) => (
                    <div
                      key={a.path}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Paperclip className="h-4 w-4 shrink-0" />
                        <span className="truncate">{a.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatBytes(a.size)}
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={busyPath === a.path}
                        onClick={() => openProof(a.path, a.name)}
                      >
                        <Download className="h-3.5 w-3.5" /> Open
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
