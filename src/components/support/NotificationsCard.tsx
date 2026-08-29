import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";

export function NotificationsCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (!notifications || notifications.length === 0) return null;

  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifications {unread > 0 && <span className="text-sm text-primary">({unread} new)</span>}
          </CardTitle>
          <CardDescription>Ticket status updates and account alerts</CardDescription>
        </div>
        {unread > 0 && (
          <Button size="sm" variant="ghost" className="gap-1" onClick={() => markAllRead.mutate()}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {notifications.map((n) => {
          const body = (
            <div
              className={`rounded-lg border border-border p-3 ${
                n.read_at ? "bg-card/40" : "bg-primary/5 border-primary/30"
              }`}
            >
              <p className="text-sm font-medium">{n.title}</p>
              {n.body && <p className="text-xs text-muted-foreground line-clamp-1">{n.body}</p>}
              <p className="mt-1 text-[11px] text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
          );

          const ticketId = n.link?.startsWith("/tickets/") ? n.link.replace("/tickets/", "") : null;

          return ticketId ? (
            <Link
              key={n.id}
              to="/tickets/$ticketId"
              params={{ ticketId }}
              className="block transition-transform hover:scale-[1.005]"
            >
              {body}
            </Link>
          ) : (
            <div key={n.id}>{body}</div>
          );
        })}
      </CardContent>
    </Card>
  );
}
