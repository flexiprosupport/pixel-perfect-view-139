import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "@/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { executeDueRunsFn, syncRunStatusFn } from "@/lib/engagement.functions";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Loader2, 
  ArrowLeft, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Play,
  RefreshCw,
  Eye,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  BarChart3,
  Ban,
  Pause,
  PlayCircle
} from "lucide-react";
import { PageMeta } from "@/components/seo/PageMeta";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Import new components
import { LiveStatsBoard } from "@/components/engagement/LiveStatsBoard";
import { MergedTimeline } from "@/components/engagement/MergedTimeline";
import { TypeHistoryCard } from "@/components/engagement/TypeHistoryCard";
import { PerTypeBreakdown } from "@/components/engagement/PerTypeBreakdown";
import { EditRunDialog } from "@/components/engagement/EditRunDialog";
import { OrderProgressChart } from "@/components/engagement/OrderProgressChart";

const ENGAGEMENT_ICONS = {
  views: { icon: Eye, label: "Views", emoji: "👁️" },
  likes: { icon: Heart, label: "Likes", emoji: "❤️" },
  comments: { icon: MessageCircle, label: "Comments", emoji: "💬" },
  saves: { icon: Bookmark, label: "Saves", emoji: "📥" },
  shares: { icon: Share2, label: "Shares", emoji: "🔄" },
};

const STATUS_CONFIG = {
  pending: { color: "bg-muted text-muted-foreground border-border", icon: Clock, label: "Pending" },
  started: { color: "bg-foreground/10 text-foreground border-foreground/30", icon: Play, label: "Started" },
  processing: { color: "bg-muted text-muted-foreground border-border", icon: Play, label: "Processing" },
  completed: { color: "bg-foreground/20 text-foreground border-foreground/40", icon: CheckCircle2, label: "Completed" },
  failed: { color: "bg-secondary text-muted-foreground border-border", icon: XCircle, label: "Failed" },
  partial: { color: "bg-muted text-muted-foreground border-border", icon: RefreshCw, label: "Partial" },
  cancelled: { color: "bg-destructive/20 text-destructive border-destructive/30", icon: Ban, label: "Cancelled" },
  paused: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Pause, label: "Paused" },
};

const isTargetCompleteCancelMessage = (message: string) => (
  message.startsWith('target met') ||
  message.startsWith('target count reached') ||
  message.includes('target count reached') ||
  message.includes('target reached') ||
  message.includes('cancelling remaining runs') ||
  message.startsWith('delivery reserved') ||
  message.includes('already delivered') ||
  message.includes('auto-cancelled') ||
  message.includes('auto completed') ||
  message.includes('auto-completed') ||
  message.includes('item completed')
);

interface EditRunData {
  id: string;
  quantity: number;
  scheduledAt: string;
  engagementType?: string;
  runNumber?: number;
}

export default function EngagementOrderDetail() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading, wallet, refreshWallet, isAdmin } = useAuth();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // View mode state removed - showing both views now
  
  // Edit modal state
  const [editingRun, setEditingRun] = useState<EditRunData | null>(null);

  // Dynamic refetch interval - balanced for performance
  const [refetchInterval, setRefetchInterval] = useState<number | false>(20000);

  const { data: order, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['engagement-order-detail', orderNumber],
    queryFn: async () => {
      if (!orderNumber) return null;
      const { data, error } = await supabase
        .from('engagement_orders')
        .select(`
          *,
          bundle:engagement_bundles(*),
          items:engagement_order_items(
            *,
            service:services(name, price, min_quantity),
            runs:organic_run_schedule(id, run_number, status, scheduled_at, quantity_to_send, base_quantity, variance_applied, started_at, completed_at, provider_status, provider_remains, provider_start_count, provider_order_id, provider_account_name, error_message, order_id, engagement_order_item_id)
          )
        `)
        .eq('order_number', parseInt(orderNumber))
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderNumber && !!user,
    refetchInterval,
    staleTime: 15000,
    refetchOnWindowFocus: false,
    placeholderData: (prev: any) => prev, // Show previous data instantly while refetching
  });

  // Adjust polling speed based on order status
  useEffect(() => {
    if (!order) return;
    const isActive = order.status === 'processing' || order.status === 'pending';
    const hasActiveRuns = order.items?.some((item: any) => 
      item.runs?.some((run: any) => run.status === 'started')
    );
    
    if (hasActiveRuns) {
      setRefetchInterval(20000); // 20s for orders with active runs
    } else if (isActive) {
      setRefetchInterval(45000); // 45s for pending/processing
    } else if (['completed', 'cancelled', 'failed', 'partial'].includes(order.status as string)) {
      setRefetchInterval(false); // Stop polling for finished orders
    } else {
      setRefetchInterval(60000); // 60s for other states
    }
  }, [order?.status, order?.items?.length]);

  // Real-time subscription — ONLY listen for this order's changes (filtered)
  useEffect(() => {
    if (!order?.id || !user) return;

    const channelName = `engagement-order-${order.id}-${Date.now()}`;
    
    // Debounce invalidation to prevent cascading refetches
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedInvalidate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['engagement-order-detail', orderNumber] });
      }, 2000); // Wait 2s to batch multiple rapid changes
    };
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'engagement_orders',
          filter: `id=eq.${order.id}`,
        },
        () => debouncedInvalidate()
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [order?.id, user, queryClient, orderNumber]);

  // Retry failed runs mutation - resets failed runs back to pending
  const retryFailedMutation = useMutation({
    mutationFn: async () => {
      if (!order?.items) throw new Error('No order items');
      
      // Get all failed run IDs from this order
      const failedRunIds = order.items.flatMap((item: any) => 
        (item.runs || [])
          .filter((run: any) => run.status === 'failed')
          .map((run: any) => run.id)
      );
      
      if (failedRunIds.length === 0) {
        throw new Error('No failed runs to retry');
      }
      
      console.log(`🔄 Retrying ${failedRunIds.length} failed runs...`);
      
      // Reset all failed runs to pending and clear error messages
      const { error } = await supabase
        .from('organic_run_schedule')
        .update({ 
          status: 'pending', 
          error_message: null,
          provider_order_id: null,
          provider_response: null,
          provider_status: null,
          started_at: null,
          completed_at: null,
          retry_count: 0, // Reset retry count
        })
        .in('id', failedRunIds);
      
      if (error) throw error;
      
      return { count: failedRunIds.length };
    },
    onSuccess: async (data) => {
      toast({
        title: "🔄 Retrying Failed Runs",
        description: `${data.count} runs reset to pending - will execute with new API keys!`,
      });
      
      // Refetch order data
      await refetch();
      
      // Trigger immediate execution
      setTimeout(async () => {
        console.log('⚡ Triggering execution for retried runs...');
        await executeRuns({ data: { limit: 50 } });
        refetch();
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Retry Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Admin: Cancel entire order (order + items + active/pending runs)
  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      if (!order?.id || !order?.items) throw new Error('No order data');

      const now = new Date().toISOString();
      const itemIds = order.items.map((item: any) => item.id);

      // 1. Hard-stop parent order first so backend workers see cancelled state immediately
      const { error: orderError } = await supabase
        .from('engagement_orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id)
        .neq('status', 'cancelled');
      if (orderError) throw orderError;

      // 2. Cancel all active/non-final items
      const { error: itemsError } = await supabase
        .from('engagement_order_items')
        .update({ status: 'cancelled' })
        .eq('engagement_order_id', order.id)
        .not('status', 'in', '("completed","cancelled","failed")');
      if (itemsError) throw itemsError;

      // 3. Cancel all non-final runs so nothing can retry or continue from queue
      for (const itemId of itemIds) {
        const { error: runsError } = await supabase
          .from('organic_run_schedule')
          .update({
            status: 'cancelled',
            error_message: 'Order cancelled by admin',
            completed_at: now,
          })
          .eq('engagement_order_item_id', itemId)
          .in('status', ['pending', 'failed', 'started']);

        if (runsError) throw runsError;
      }
    },
    onSuccess: () => {
      toast({ title: "🚫 Order Cancelled", description: "Order and all queued/active runs have been permanently cancelled." });
      refetch();
    },
    onError: (error: Error) => {
      toast({ title: "Cancel Failed", description: error.message, variant: "destructive" });
    },
  });

  // Admin: Pause order (skip future runs without cancelling)
  const pauseOrderMutation = useMutation({
    mutationFn: async () => {
      if (!order?.id) throw new Error('No order');
      const { error } = await supabase
        .from('engagement_orders')
        .update({ status: 'paused' })
        .eq('id', order.id);
      if (error) throw error;
      
      // Also pause all non-completed items
      await supabase
        .from('engagement_order_items')
        .update({ status: 'paused' })
        .eq('engagement_order_id', order.id)
        .not('status', 'in', '("completed","cancelled","failed")');
    },
    onSuccess: () => {
      toast({ title: "⏸️ Order Paused", description: "Runs will be skipped until resumed." });
      refetch();
    },
    onError: (error: Error) => {
      toast({ title: "Pause Failed", description: error.message, variant: "destructive" });
    },
  });

  // Admin: Resume paused order
  const resumeOrderMutation = useMutation({
    mutationFn: async () => {
      if (!order?.id) throw new Error('No order');
      const now = new Date().toISOString();
      
      // Resume order
      const { error } = await supabase
        .from('engagement_orders')
        .update({ status: 'processing' })
        .eq('id', order.id);
      if (error) throw error;
      
      // Resume paused items
      await supabase
        .from('engagement_order_items')
        .update({ status: 'processing' })
        .eq('engagement_order_id', order.id)
        .eq('status', 'paused');
      
      // Cancel overdue pending runs (scheduled during pause)
      const itemIds = order.items?.map((item: any) => item.id) || [];
      for (const itemId of itemIds) {
        await supabase
          .from('organic_run_schedule')
          .update({ status: 'cancelled', error_message: 'Skipped — order was paused during this scheduled time', completed_at: now })
          .eq('engagement_order_item_id', itemId)
          .eq('status', 'pending')
          .lt('scheduled_at', now);
      }
    },
    onSuccess: () => {
      toast({ title: "▶️ Order Resumed", description: "Future runs will execute as scheduled. Overdue runs were cancelled." });
      refetch();
    },
    onError: (error: Error) => {
      toast({ title: "Resume Failed", description: error.message, variant: "destructive" });
    },
  });

  // Per-type: Pause a specific item
  const pauseItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('engagement_order_items')
        .update({ status: 'paused' })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "⏸️ Type Paused", description: "This engagement type has been paused. Runs will be skipped until resumed." });
      refetch();
    },
    onError: (error: Error) => {
      toast({ title: "Pause Failed", description: error.message, variant: "destructive" });
    },
  });

  // Per-type: Resume a specific item
  const resumeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const now = new Date().toISOString();
      // Resume item
      const { error } = await supabase
        .from('engagement_order_items')
        .update({ status: 'processing' })
        .eq('id', itemId);
      if (error) throw error;
      // Cancel overdue pending runs
      await supabase
        .from('organic_run_schedule')
        .update({ status: 'cancelled', error_message: 'Skipped — paused during this scheduled time', completed_at: now })
        .eq('engagement_order_item_id', itemId)
        .eq('status', 'pending')
        .lt('scheduled_at', now);
    },
    onSuccess: () => {
      toast({ title: "▶️ Type Resumed", description: "Future runs will execute. Overdue runs were auto-cancelled." });
      refetch();
    },
    onError: (error: Error) => {
      toast({ title: "Resume Failed", description: error.message, variant: "destructive" });
    },
  });

  // Per-type: Cancel a specific item
  const cancelItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!order?.id) throw new Error('No order');
      const now = new Date().toISOString();

      // Hard-stop item first
      const { error: itemError } = await supabase
        .from('engagement_order_items')
        .update({ status: 'cancelled' })
        .eq('id', itemId)
        .neq('status', 'cancelled');
      if (itemError) throw itemError;

      // Cancel all active/queued runs for this item
      await supabase
        .from('organic_run_schedule')
        .update({ status: 'cancelled', error_message: 'Type cancelled by user', completed_at: now })
        .eq('engagement_order_item_id', itemId)
        .in('status', ['pending', 'failed', 'started']);

      // Recalculate parent order status based on remaining items.
      // Only mark parent 'cancelled' if NO item delivered anything.
      // If any item completed/partial, parent should be 'partial' instead.
      const { data: remainingItems } = await supabase
        .from('engagement_order_items')
        .select('id, status')
        .eq('engagement_order_id', order.id);
      if (remainingItems && remainingItems.length > 0) {
        const allTerminal = remainingItems.every((i: any) =>
          ['cancelled', 'completed', 'failed', 'partial'].includes(i.status)
        );
        if (allTerminal) {
          const hasDelivered = remainingItems.some((i: any) =>
            i.status === 'completed' || i.status === 'partial'
          );
          const hasFailed = remainingItems.some((i: any) => i.status === 'failed');
          const newStatus = hasDelivered ? 'partial' : hasFailed ? 'failed' : 'cancelled';
          await supabase
            .from('engagement_orders')
            .update({ status: newStatus })
            .eq('id', order.id)
            .neq('status', 'cancelled');
        }
      }
    },
    onSuccess: () => {
      toast({ title: "🚫 Type Cancelled", description: "All pending runs for this type have been permanently cancelled." });
      refetch();
    },
    onError: (error: Error) => {
      toast({ title: "Cancel Failed", description: error.message, variant: "destructive" });
    },
  });

  // Update run mutation with optimistic updates AND wallet charge
  const updateRunMutation = useMutation({
    mutationFn: async ({ runId, quantity, scheduledAt }: { runId: string; quantity: number; scheduledAt: string }) => {
      const currentRun = stats?.allRuns.find((r: any) => r.id === runId);
      if (!currentRun) throw new Error('Run not found');

      const { data, error } = await supabase.rpc('reschedule_organic_run', {
        p_run_id: runId,
        p_quantity: quantity,
        p_scheduled_at: scheduledAt,
      });

      if (error) throw error;

      return {
        currentRun,
        result: data as { success: boolean; extra_charged?: number },
      };
    },
    // OPTIMISTIC UPDATE - Update UI immediately before server confirms
    onMutate: async ({ runId, quantity, scheduledAt }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['engagement-order-detail', orderNumber] });
      
      // Snapshot previous value
      const previousOrder = queryClient.getQueryData(['engagement-order-detail', orderNumber]);
      
      // Optimistically update the cache
      queryClient.setQueryData(['engagement-order-detail', orderNumber], (old: any) => {
        if (!old?.items) return old;
        
        return {
          ...old,
          items: old.items.map((item: any) => ({
            ...item,
            runs: item.runs?.map((run: any) => 
              run.id === runId 
                ? { ...run, quantity_to_send: quantity, scheduled_at: scheduledAt, variance_applied: 0 }
                : run
            )
          }))
        };
      });
      
      return { previousOrder };
    },
    onSuccess: async (data) => {
      const extraCharged = Number(data?.result?.extra_charged || 0);

      toast({
        title: "✅ Run Updated",
        description: extraCharged > 0
          ? `Schedule updated. ${formatPrice(extraCharged)} charged from wallet.`
          : "Schedule updated successfully.",
      });
      setEditingRun(null);
      refreshWallet?.();
      
      // Refetch to ensure data consistency
      await refetch();
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousOrder) {
        queryClient.setQueryData(['engagement-order-detail', orderNumber], context.previousOrder);
      }
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Compute all stats
  const stats = useMemo(() => {
    if (!order?.items) return null;

    const allRuns = order.items.flatMap((item: any) => 
      (item.runs || []).map((run: any) => ({
        ...run,
        engagement_type: item.engagement_type,
        item_id: item.id,
        item_quantity: item.quantity,
        item_delivered_count: typeof item.delivered_count === 'number' ? item.delivered_count : null,
        provider_account_name: run.provider_account_name || null,
        error_message: run.error_message || null,
      }))
    );

    const isTargetMetAutoCompleted = (run: any): boolean => {
      const status = (run.status || '').toString().toLowerCase().trim();
      const message = (run.error_message || '').toString().toLowerCase().trim();

      if (status !== 'cancelled' && status !== 'canceled') return false;
      if (isTargetCompleteCancelMessage(message)) return true;
      return !run.provider_order_id && Boolean(run.completed_at) && Number(run.item_quantity || 0) > 0 && Number(run.item_delivered_count || 0) >= Number(run.item_quantity || 0);
    };

    const completedRuns = allRuns.filter((r: any) => r.status === 'completed' || isTargetMetAutoCompleted(r));
    const pendingRuns = allRuns.filter((r: any) => r.status === 'pending');
    const startedRuns = allRuns.filter((r: any) => r.status === 'started');
    const failedRuns = allRuns.filter((r: any) => r.status === 'failed');
    
    // Calculate ACTUAL delivered from provider data (provider_status + remains)
    // IMPORTANT: do NOT trust local `status === 'completed'` when the run was "auto-completed"
    const normalizeProviderStatus = (s: any): string => (s ?? '').toString().toLowerCase().trim();

    const calculateActualDelivered = (run: any): number => {
      const ps = normalizeProviderStatus(run.provider_status);

      // Auto-completed cancel ("Target met") — count as fully delivered
      if (isTargetMetAutoCompleted(run)) {
        return run.quantity_to_send;
      }

      // Provider-confirmed completion
      if (ps === 'completed' || ps === 'complete') return run.quantity_to_send;

      // Partial/in-progress where remains is meaningful
      if (run.provider_remains !== null && run.provider_remains !== undefined) {
        return Math.max(0, run.quantity_to_send - run.provider_remains);
      }

      // Fallback for legacy rows without provider tracking
      if (run.status === 'completed') return run.quantity_to_send;

      return 0;
    };

    // Per-type breakdown - NO TARGET CAPPING
    // Sum all runs (except failed) for real scheduled total
    // Allows users to edit runs and see updated totals dynamically
    const perType = order.items.map((item: any) => {
      const itemRuns = (item.runs || [])
        .filter((r: any) => r.status !== 'failed')
        .sort((a: any, b: any) => a.run_number - b.run_number);
      
      // Calculate scheduled (NO capping, just sum all non-failed runs)
      const totalScheduled = itemRuns.reduce((sum: number, r: any) => sum + r.quantity_to_send, 0);
      
      // Calculate delivered (provider truth)
      const allItemRuns = item.runs || [];
      const totalDelivered = allItemRuns.reduce((sum: number, r: any) => sum + calculateActualDelivered(r), 0);
      
      return {
        type: item.engagement_type,
        target: item.quantity,
        delivered: totalDelivered,
        scheduled: totalScheduled,
      };
    });
    
    const totalDelivered = perType.reduce((sum: number, t: any) => sum + t.delivered, 0);
    const totalOriginalQuantity = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const totalScheduled = perType.reduce((sum: number, t: any) => sum + t.scheduled, 0);
    
    // Dynamic total quantity = max of original and scheduled (allows exceeding original)
    const totalQuantity = Math.max(totalOriginalQuantity, totalScheduled);

    // Find next scheduled run
    const nextRun = pendingRuns
      .sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

    return {
      allRuns,
      completedRuns,
      pendingRuns,
      startedRuns,
      failedRuns,
      totalDelivered,
      totalQuantity,
      totalScheduled,
      perType,
      nextRun,
    };
  }, [order]);

  const handleEditRun = (run: any) => {
    if (run.status !== 'pending') {
      toast({
        title: "Cannot Edit",
        description: "Only pending runs can be edited",
        variant: "destructive",
      });
      return;
    }
    setEditingRun({
      id: run.id,
      quantity: run.quantity_to_send,
      scheduledAt: run.scheduled_at,
      engagementType: run.engagement_type,
      runNumber: run.run_number,
    });
  };

  const handleSaveEdit = (data: { runId: string; quantity: number; scheduledAt: string }) => {
    updateRunMutation.mutate(data);
  };

  // INSTANT RENDER - Show layout immediately, content loads in background
  // Never show blank/black screen - always render DashboardLayout first
  
  if (isLoading || !order || !stats) {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-secondary rounded-lg" />
            <div className="flex-1">
              <div className="h-6 w-48 bg-secondary rounded mb-2" />
              <div className="h-4 w-64 bg-secondary rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-secondary rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-secondary rounded-xl" />
          <div className="h-96 bg-secondary rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  // Derive effective status from real delivery (provider truth) so the header
  // badge stays in sync with the Live Stats board.
  const totalOriginalQuantity = order.items?.reduce((s: number, i: any) => s + (i.quantity || 0), 0) || 0;
  const liveDelivered = stats?.totalDelivered ?? 0;
  const hasPending = (stats?.pendingRuns?.length ?? 0) > 0;
  const hasActive = (stats?.startedRuns?.length ?? 0) > 0;
  let effectiveStatus = order.status as string;
  if (totalOriginalQuantity > 0 && liveDelivered >= totalOriginalQuantity) {
    effectiveStatus = 'completed';
  } else if (effectiveStatus !== 'cancelled' && effectiveStatus !== 'failed' && effectiveStatus !== 'paused') {
    if (hasActive || hasPending || liveDelivered > 0) {
      effectiveStatus = 'processing';
    }
  }
  const StatusIcon = STATUS_CONFIG[effectiveStatus as keyof typeof STATUS_CONFIG]?.icon || Clock;
  const statusColor = STATUS_CONFIG[effectiveStatus as keyof typeof STATUS_CONFIG]?.color || "";
  const lastUpdated = new Date(dataUpdatedAt);

  return (
    <DashboardLayout>
      <PageMeta title="Engagement Order Detail" description="Live progress, delivery timeline, and per-run breakdown for your FlexiPro engagement order." noIndex />
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/engagement-orders')} className="shrink-0 self-start">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2"><BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Order #{order.order_number}</h1>
              <Badge className={statusColor}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {effectiveStatus}
              </Badge>
              {order.is_organic_mode && (
                <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">
                  🌱 Organic
                </Badge>
              )}
              <Badge variant="outline" className="text-muted-foreground border-border text-xs">
                LIVE TRACKING
              </Badge>
            </div>
            <a 
              href={order.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1 transition-colors break-all"
            >
              🔗 {order.link.length > 40 ? order.link.slice(0, 40) + '...' : order.link}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
          <div className="text-right hidden md:block shrink-0">
            <p className="text-xs text-muted-foreground">● Auto-updating</p>
            <p className="text-xs text-muted-foreground">
              Last: {format(lastUpdated, 'HH:mm:ss')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            {/* Admin Controls */}
            {isAdmin && order.status !== 'cancelled' && order.status !== 'completed' && (
              <>
                {order.status === 'paused' ? (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => resumeOrderMutation.mutate()}
                    disabled={resumeOrderMutation.isPending}
                  >
                    <PlayCircle className="h-4 w-4 mr-1" />
                    Resume
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => pauseOrderMutation.mutate()}
                    disabled={pauseOrderMutation.isPending}
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                )}
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      <Ban className="h-4 w-4 mr-1" />
                      Cancel Order
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <Ban className="h-5 w-5 text-destructive" />
                        Cancel Order #{order.order_number}?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently cancel this order. All pending runs will be stopped and cannot be resumed. Completed deliveries will remain.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Order</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => cancelOrderMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Yes, Cancel Permanently
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        {/* Live Stats Board */}
        <LiveStatsBoard
          totalRuns={stats.allRuns.length}
          completedRuns={stats.completedRuns.length}
          startedRuns={stats.startedRuns.length}
          pendingRuns={stats.pendingRuns.length}
          failedRuns={stats.failedRuns.length}
          totalDelivered={stats.totalDelivered}
          totalQuantity={stats.totalQuantity}
          nextRun={stats.nextRun}
          onRetryFailed={() => retryFailedMutation.mutate()}
          isRetrying={retryFailedMutation.isPending}
        />

        {/* Real-Time Progress Chart */}
        <OrderProgressChart runs={stats.allRuns} perType={stats.perType} />

        {/* Per-Type Breakdown with Real-Time History - Clickable cards */}
        <PerTypeBreakdown 
          types={stats.perType} 
          allRuns={stats.allRuns} 
          onTypeClick={(type) => {
            const element = document.getElementById(`type-history-${type}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
          itemStatuses={Object.fromEntries(
            (order.items || []).map((item: any) => [item.engagement_type, { id: item.id, status: item.status }])
          )}
          onPauseType={(itemId) => pauseItemMutation.mutate(itemId)}
          onResumeType={(itemId) => resumeItemMutation.mutate(itemId)}
          onCancelType={(itemId) => cancelItemMutation.mutate(itemId)}
        />

        {/* SECTION 1: Merged Organic Timeline */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            📋 Run Schedule 
            <Badge variant="outline">{stats.allRuns.length} total runs</Badge>
          </h2>
        <MergedTimeline
            runs={stats.allRuns}
            onEditRun={handleEditRun}
            nextRun={stats.nextRun}
            onRefresh={() => refetch()}
            typeTargets={stats.perType}
          />
        </div>

        {/* SECTION 2: Per-Service History Cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Per-Service History
            <span className="text-sm font-normal text-muted-foreground">
              (Edit from here or merged timeline - both sync automatically)
            </span>
          </h2>
          
          {/* Sort items by engagement type priority: Views → Likes → Comments → Reposts → Shares → Saves */}
          {[...(order.items || [])]
            .sort((a: any, b: any) => {
              const priorityOrder = ['views', 'likes', 'comments', 'reposts', 'shares', 'saves', 'followers'];
              const aIndex = priorityOrder.indexOf(a.engagement_type?.toLowerCase()) ?? 99;
              const bIndex = priorityOrder.indexOf(b.engagement_type?.toLowerCase()) ?? 99;
              return aIndex - bIndex;
            })
            .map((item: any) => {
            const itemRuns = (item.runs || []).map((run: any) => ({
              ...run,
              provider_account_name: run.provider_account_name || null,
              provider_status: run.provider_status || null,
              provider_order_id: run.provider_order_id || null,
              provider_remains: run.provider_remains ?? null,
              provider_start_count: run.provider_start_count ?? null,
              last_status_check: run.last_status_check || null,
            }));
            // Prefer backend live-count tracking: delivered = current_count - start_count,
            // capped by ordered quantity. Fallback to per-run provider remains for old rows.
            const trackedDelivered = typeof item.delivered_count === 'number'
              ? item.delivered_count
              : null;
            const itemDelivered = trackedDelivered !== null ? trackedDelivered : itemRuns.reduce((sum: number, r: any) => {
              const status = (r.status || '').toString().toLowerCase().trim();
              const message = (r.error_message || '').toString().toLowerCase().trim();
              const isTargetMetAutoCompleted = (status === 'cancelled' || status === 'canceled') && isTargetCompleteCancelMessage(message);

              if (r.status === 'completed' || isTargetMetAutoCompleted) {
                return sum + r.quantity_to_send;
              } else if ((r.status === 'started' || r.status === 'failed') && r.provider_remains !== null && r.provider_remains !== undefined) {
                return sum + Math.max(0, r.quantity_to_send - r.provider_remains);
              }
              return sum;
            }, 0);

            return (
              <div key={item.id} id={`type-history-${item.engagement_type}`}>
                <TypeHistoryCard
                  engagementType={item.engagement_type}
                  targetQuantity={item.quantity}
                  deliveredQuantity={itemDelivered}
                  runs={itemRuns}
                  serviceName={item.service?.name}
                  onEditRun={(run) => handleEditRun({ ...run, engagement_type: item.engagement_type })}
                  itemId={item.id}
                  itemStatus={item.status}
                  itemStartCount={item.start_count ?? null}
                  onPause={(id) => pauseItemMutation.mutate(id)}
                  onResume={(id) => resumeItemMutation.mutate(id)}
                  onCancel={(id) => cancelItemMutation.mutate(id)}
                />
              </div>
            );
          })}
        </div>

        {/* Order Info */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-foreground">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium text-foreground">{format(new Date(order.created_at as string), 'MMM d, yyyy HH:mm')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Price</p>
                <p className="font-medium text-lg text-foreground">{formatPrice(order.total_price || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Variance</p>
                <p className="font-medium text-foreground">±{order.variance_percent}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Peak Hours</p>
                <p className="font-medium text-foreground">{order.peak_hours_enabled ? '🔥 Enabled' : 'Disabled'}</p>
              </div>
            </div>

            {/* Detection Risk Level */}
            {order.is_organic_mode && order.variance_percent && (
              <div className="rounded-xl border border-border bg-secondary/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Detection Risk Level</span>
                  <Badge className={
                    order.variance_percent <= 15 
                      ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                      : order.variance_percent <= 25 
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                        : order.variance_percent <= 35
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  }>
                    {order.variance_percent <= 15 
                      ? "⚠ Very High" 
                      : order.variance_percent <= 25 
                        ? "⚠ Medium" 
                        : order.variance_percent <= 35
                          ? "✓ Low"
                          : "✓ Very Low"}
                  </Badge>
                </div>
                
                {/* Progress Bar */}
                <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div 
                    className={
                      order.variance_percent <= 15 
                        ? "h-full rounded-full transition-all duration-300 bg-red-500" 
                        : order.variance_percent <= 25 
                          ? "h-full rounded-full transition-all duration-300 bg-amber-500" 
                          : order.variance_percent <= 35
                            ? "h-full rounded-full transition-all duration-300 bg-green-500"
                            : "h-full rounded-full transition-all duration-300 bg-blue-500"
                    }
                    style={{ 
                      width: `${Math.min(100, ((order.variance_percent - 10) / 40) * 100)}%` 
                    }}
                  />
                </div>
                
                {/* Description */}
                <p className="text-xs text-muted-foreground">
                  {order.variance_percent <= 15 
                    ? "High bot detection risk - patterns may be detected" 
                    : order.variance_percent <= 25 
                      ? "Moderate detection risk - some patterns visible" 
                      : order.variance_percent <= 35
                        ? "Natural looking organic pattern"
                        : "100% undetectable organic pattern"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Run Dialog */}
      <EditRunDialog
        open={!!editingRun}
        onOpenChange={(open) => !open && setEditingRun(null)}
        run={editingRun}
        onSave={handleSaveEdit}
        isSaving={updateRunMutation.isPending}
        walletBalance={wallet?.balance || 0}
        pricePerThousand={
          order?.items?.find((i: any) => 
            i.runs?.some((r: any) => r.id === editingRun?.id)
          )?.service?.price || 0.1
        }
      />
    </DashboardLayout>
  );
}
