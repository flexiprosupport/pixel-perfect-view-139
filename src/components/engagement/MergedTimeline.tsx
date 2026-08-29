import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { format, formatDistanceToNow } from "date-fns";
import {
  Eye, Heart, MessageCircle, Bookmark, Share2,
  Clock, Play, CheckCircle2, XCircle, Pencil, Timer, RefreshCw, Loader2, TrendingUp, CalendarClock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { syncRunStatusFn } from "@/lib/engagement.functions";
import { useState } from "react";
import { toast } from "sonner";

const ENGAGEMENT_CONFIG: Record<string, { icon: typeof Eye; label: string; emoji: string; color: string; bg: string; border: string }> = {
  views: { icon: Eye, label: "views", emoji: "👁️", color: "text-cyan-400", bg: "bg-cyan-500/20", border: "border-cyan-500/40" },
  likes: { icon: Heart, label: "likes", emoji: "❤️", color: "text-green-400", bg: "bg-green-500/20", border: "border-green-500/40" },
  comments: { icon: MessageCircle, label: "comments", emoji: "💬", color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/40" },
  saves: { icon: Bookmark, label: "saves", emoji: "📥", color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/40" },
  shares: { icon: Share2, label: "shares", emoji: "🔄", color: "text-violet-400", bg: "bg-violet-500/20", border: "border-violet-500/40" },
  reposts: { icon: Share2, label: "reposts", emoji: "🔁", color: "text-indigo-400", bg: "bg-indigo-500/20", border: "border-indigo-500/40" },
};

// All engagement types to always show
const ALL_ENGAGEMENT_TYPES = ['views', 'likes', 'comments', 'saves', 'shares'] as const;

interface MergedRun {
  id: string;
  engagement_type: string;
  run_number: number;
  status: string;
  quantity_to_send: number;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  peak_multiplier?: number;
  variance_applied?: number;
  provider_order_id?: string;
  provider_status?: string;
  provider_start_count?: number;
  provider_remains?: number;
  last_status_check?: string;
  item_id: string;
  provider_account_name?: string | null;
  error_message?: string | null;
}

interface TypeTarget {
  type: string;
  target: number;
  delivered: number;
}

interface MergedTimelineProps {
  runs: MergedRun[];
  onEditRun: (run: MergedRun) => void;
  nextRun?: MergedRun | null;
  onRefresh?: () => void;
  typeTargets?: TypeTarget[]; // Total targets for each engagement type in order
}

export function MergedTimeline({ runs, onEditRun, nextRun, onRefresh, typeTargets = [] }: MergedTimelineProps) {
  const [refreshingRunId, setRefreshingRunId] = useState<string | null>(null);
  const [isGlobalRefreshing, setIsGlobalRefreshing] = useState(false);

  const normalizeProviderStatus = (s?: string | null) => (s ?? '').toString().toLowerCase().trim();
  const targetStateByType: Record<string, TypeTarget> = {};
  typeTargets.forEach(t => { targetStateByType[t.type] = t; });
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
  const isTargetMetAutoCompleted = (run: MergedRun) => {
    const status = (run.status || '').toString().toLowerCase().trim();
    const message = (run.error_message || '').toString().toLowerCase().trim();

    if (status !== 'cancelled' && status !== 'canceled') return false;
    if (isTargetCompleteCancelMessage(message)) return true;

    const typeTarget = targetStateByType[run.engagement_type];
    return !run.provider_order_id && Boolean(run.completed_at) && Boolean(typeTarget?.target) && typeTarget.delivered >= typeTarget.target;
  };

  const getEffectiveStatus = (run: MergedRun): 'pending' | 'started' | 'completed' | 'failed' | 'cancelled' => {
    // Target already complete before this run went to provider — show user "Completed".
    if (isTargetMetAutoCompleted(run)) return 'completed';

    const ps = normalizeProviderStatus(run.provider_status);

    if (run.provider_order_id && run.provider_remains === 0) return 'completed';
    if (ps === 'completed' || ps === 'complete' || ps === 'partial') return 'completed';
    // Once a provider order id exists, the order has already left our queue.
    // Provider "Pending" means their side is processing/queued, not user-editable overdue.
    if (ps === 'pending') return run.provider_order_id ? 'started' : 'pending';
    if (ps === 'in progress' || ps === 'processing') return 'started';
    if (ps === 'canceled' || ps === 'cancelled' || ps === 'refunded' || ps === 'failed' || ps === 'error') return 'failed';

    const s = (run.status || '').toString().toLowerCase().trim();
    if (run.provider_order_id && (s === 'pending' || s === 'started' || s === 'processing')) return 'started';
    if (s === 'processing') return 'started';
    if (s === 'cancelled' || s === 'canceled') return 'cancelled';
    if (s === 'pending' || s === 'started' || s === 'completed' || s === 'failed') return s as any;
    return 'pending';
  };

  const getDeliveredFromProvider = (run: MergedRun): number => {
    const ps = normalizeProviderStatus(run.provider_status);

    // Provider-confirmed completion
    if (ps === 'completed' || ps === 'complete') return run.quantity_to_send;

    // Target already complete locally; this run was not sent to provider.
    if (isTargetMetAutoCompleted(run)) return run.quantity_to_send;

    // If we have remains, that's the most accurate signal (including partial/in progress)
    if (run.provider_remains !== null && run.provider_remains !== undefined) {
      return Math.max(0, run.quantity_to_send - run.provider_remains);
    }

    // Legacy fallback
    if ((run.status || '').toLowerCase() === 'completed') return run.quantity_to_send;

    return 0;
  };

  // Sort by scheduled_at ascending (oldest first)
  const sortedRuns = [...runs].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );

  // Get targets per type from typeTargets prop
  const targetsMap: Record<string, number> = {};
  typeTargets.forEach(t => { targetsMap[t.type] = t.target; });

  // Calculate cumulative counts for ALL runs - NO TARGET CAPPING
  // Sum all runs (except failed) for scheduled, allows dynamic updates on edit
  const cumulativeDelivered: Record<string, number> = {};
  const cumulativeScheduled: Record<string, number> = {};

  const runsWithCumulative = sortedRuns.map((run) => {
    const type = run.engagement_type;
    const effective = getEffectiveStatus(run);

    // Calculate ACTUAL delivered for this run from provider data
    const actualDelivered = getDeliveredFromProvider(run);

    // Track scheduled for non-failed/non-cancelled runs (NO capping)
    if (effective !== 'failed' && effective !== 'cancelled') {
      const currentScheduled = cumulativeScheduled[type] || 0;
      cumulativeScheduled[type] = currentScheduled + run.quantity_to_send;
    }

    // Track delivered (NO capping)
    if (actualDelivered > 0) {
      const currentDelivered = cumulativeDelivered[type] || 0;
      cumulativeDelivered[type] = currentDelivered + actualDelivered;
    }

    return {
      ...run,
      actualDeliveredThisRun: actualDelivered,
      scheduledThisRun: (effective !== 'failed' && effective !== 'cancelled') ? run.quantity_to_send : 0,
      deliveredSnapshot: { ...cumulativeDelivered },
      scheduledSnapshot: { ...cumulativeScheduled },
      cumulativeAtThisPoint: cumulativeDelivered[type] || 0,
    };
  });

  // Dynamic targets per type = max(original target, total scheduled)
  const overallScheduledByType: Record<string, number> =
    runsWithCumulative.length > 0 ? (runsWithCumulative[runsWithCumulative.length - 1].scheduledSnapshot as Record<string, number>) : {};

  const refreshRunStatus = async (runId: string) => {
    setRefreshingRunId(runId);
    try {
      await syncStatus({ data: { runId } });

      toast.success('Status updated from provider!');
      onRefresh?.();
    } catch (err: any) {
      toast.error(`Failed to refresh: ${err.message}`);
    } finally {
      setRefreshingRunId(null);
    }
  };

  // Refresh all started runs
  const refreshAllStatus = async () => {
    setIsGlobalRefreshing(true);
    try {
      const data = await syncStatus({ data: {} });

      toast.success(`Checked ${(data?.completed ?? 0) + (data?.stillProcessing ?? 0)} runs from provider`);
      onRefresh?.();
    } catch (err: any) {
      toast.error(`Failed to refresh: ${err.message}`);
    } finally {
      setIsGlobalRefreshing(false);
    }
  };

  // Count active runs
  const activeRuns = runs.filter(r => getEffectiveStatus(r) === 'started').length;

  // Calculate grand total delivered from provider truth
  const grandTotalDelivered = runs.reduce((sum, r) => sum + getDeliveredFromProvider(r), 0);

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Timer className="h-5 w-5 text-foreground" />
          <span className="font-semibold text-sm sm:text-base">🌱 Organic Delivery Timeline</span>
          <Badge variant="outline" className="border-border text-muted-foreground text-xs">{runs.length} runs</Badge>
          <Badge className="bg-success/20 text-success border-success/30 font-mono text-xs">
            ✓ {grandTotalDelivered.toLocaleString()} delivered
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {activeRuns > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAllStatus}
              disabled={isGlobalRefreshing}
              className="gap-2"
            >
              {isGlobalRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Check {activeRuns} Active
            </Button>
          )}
          {nextRun && (
            <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">
              ⏱️ Next: {formatDistanceToNow(new Date(nextRun.scheduled_at))}
            </Badge>
          )}
        </div>
      </div>

      {/* Timeline - Scrollable list */}
      <div className="max-h-[700px] overflow-y-auto">
        <div className="space-y-2 p-4">
          {runsWithCumulative.map((run, index) => {
            // Dynamic fallback for unknown engagement types
            const engConfig = ENGAGEMENT_CONFIG[run.engagement_type] || {
              icon: Eye,
              label: run.engagement_type || "items",
              emoji: "📦",
              color: "text-gray-400",
              bg: "bg-gray-500/20",
              border: "border-gray-500/40"
            };
            const Icon = engConfig.icon;
            const scheduledDate = new Date(run.scheduled_at);
            const now = new Date();
            // Treat target-met auto-cancellations as completed in the UI
            const isAutoCompletedCancel = isTargetMetAutoCompleted(run);
            const effectiveStatus = getEffectiveStatus(run);
            const isPending = effectiveStatus === 'pending';
            const isActive = effectiveStatus === 'started';
            const isCompleted = effectiveStatus === 'completed';
            const isFailed = effectiveStatus === 'failed';
            const isCancelled = effectiveStatus === 'cancelled';
            const providerStatus = normalizeProviderStatus(run.provider_status);
            const hasProviderOrder = Boolean(run.provider_order_id) && !isAutoCompletedCancel;

            const isAlreadyExecuted = isCompleted || isFailed || isActive;
            const isScheduledInPast = scheduledDate < now;
            const isUpcoming = isPending && !isScheduledInPast;

            // Smart status label: provider_status > internal status mapping
            // If provider_status exists, use it directly (real-time from provider)
            // If pending + future = "Scheduled", pending + past = "Queued"
            const getDisplayStatus = () => {
              if (isAutoCompletedCancel) return 'Completed';
              if (isCompleted) return 'Completed';
              if (isActive) return 'Processing';
              if (run.provider_status) return run.provider_status;
              if (isCancelled) return 'CANCELLED';
              if (isFailed) return 'FAILED';
              if (isPending && isUpcoming) return 'Scheduled';
              if (isPending) return 'Queued';
              if (isCompleted) return 'Completed';
              return run.status.toUpperCase();
            };
            const displayStatus = getDisplayStatus();

            // Provider progress data
            const providerRemains = run.provider_remains ?? null;
            const delivered = providerRemains !== null ? (run.quantity_to_send - providerRemains) : null;
            const progressPercent = providerRemains !== null && run.quantity_to_send > 0
              ? Math.min(100, Math.max(0, ((run.quantity_to_send - providerRemains) / run.quantity_to_send) * 100))
              : null;

            return (
              <div
                key={run.id}
                className={`rounded-xl border transition-all ${isActive
                  ? 'bg-blue-500/10 border-2 border-blue-500/40 shadow-lg shadow-blue-500/10'
                  : isCompleted
                    ? 'bg-blue-500/10 border border-blue-500/30'
                    : isFailed
                      ? 'bg-green-500/10 border border-green-500/30'
                      : 'bg-violet-500/5 border border-violet-500/20 hover:bg-violet-500/10 cursor-pointer'
                  }`}
                onClick={() => isPending && onEditRun(run)}
              >
                {/* Main Row */}
                <div className="p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  {/* Run Number Circle - Colorful Gradient */}
                  <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full font-bold text-sm sm:text-base shrink-0 ${isCompleted ? 'bg-gradient-to-br from-blue-500 to-teal-500 text-white' :
                    isActive ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white animate-pulse' :
                        isFailed ? 'bg-gradient-to-br from-green-500 to-red-500 text-white' :
                          'bg-gradient-to-br from-amber-400 to-yellow-500 text-white'
                    }`}>
                    #{index + 1}
                  </div>

                  {/* Status + Quantity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      {/* Status Badge - Colorful */}
                      <Badge className={`text-sm px-3 py-1 ${isCompleted ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' :
                        isActive ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' :
                          isFailed ? 'bg-green-500/20 text-green-400 border border-green-500/40' :
                            isUpcoming ? 'bg-amber-400/20 text-amber-500 border border-amber-400/40' :
                              'bg-amber-400/20 text-amber-500 border border-amber-400/40'
                        }`}>
                        {isCompleted && <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                        {isActive && <Play className="h-4 w-4 mr-1.5" />}
                        {isPending && isUpcoming && <CalendarClock className="h-4 w-4 mr-1.5" />}
                        {isPending && !isUpcoming && <Clock className="h-4 w-4 mr-1.5" />}
                        {isFailed && <XCircle className="h-4 w-4 mr-1.5" />}
                        {displayStatus}
                      </Badge>

                      {/* This run's delivery amount - Cyan */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
                        <span className="font-bold text-base sm:text-lg text-cyan-400">
                          +{run.quantity_to_send.toLocaleString()} {engConfig.label}
                        </span>

                        {/* Variance indicator - Sky/Pink */}
                        {run.variance_applied !== undefined && run.variance_applied !== 0 && (
                          <span className={`text-xs font-medium ${run.variance_applied > 0 ? 'text-sky-400' : 'text-green-400'}`}>
                            ({run.variance_applied > 0 ? '+' : ''}{run.variance_applied})
                          </span>
                        )}
                      </div>

                      {/* Provider source badge - shows where this came from */}
                      {run.provider_account_name && !isAutoCompletedCancel && (
                        <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/40 text-xs truncate max-w-[200px] sm:max-w-none">
                          via {run.provider_account_name}
                        </Badge>
                      )}

                      {/* CUMULATIVE TOTAL - Teal */}
                      {isCompleted && run.cumulativeAtThisPoint > 0 && (
                        <div className="flex items-center gap-1.5 bg-teal-500/20 border border-teal-500/40 px-3 py-1 rounded-lg">
                          <TrendingUp className="h-4 w-4 text-teal-400" />
                          <span className="text-sm font-bold text-teal-400">
                            = {run.cumulativeAtThisPoint.toLocaleString()} total
                          </span>
                        </div>
                      )}
                    </div>

                    {/* LIVE PROGRESS BAR - Only for active runs */}
                    {isActive && progressPercent !== null && (
                      <div className="mb-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-blue-400">
                            <TrendingUp className="h-4 w-4" />
                            <span className="font-bold">LIVE PROGRESS</span>
                          </span>
                          <span className="font-mono font-bold text-foreground">
                            {delivered?.toLocaleString()} / {run.quantity_to_send.toLocaleString()}
                            <span className="text-muted-foreground ml-2">
                              ({progressPercent.toFixed(1)}%)
                            </span>
                          </span>
                        </div>
                        <Progress value={progressPercent} className="h-3" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>✓ Delivered: <span className="text-green-400 font-bold">{delivered?.toLocaleString()}</span></span>
                          <span>⏳ Remaining: <span className="text-amber-400 font-bold">{providerRemains?.toLocaleString()}</span></span>
                          {run.last_status_check && (
                            <span>
                              Updated: {formatDistanceToNow(new Date(run.last_status_check))} ago
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Timestamps Row */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1.5">
                        📅 {format(scheduledDate, 'MMM d, hh:mm a')}
                      </span>

                      {isAlreadyExecuted ? (
                        <span className="font-medium text-muted-foreground">
                          ({formatDistanceToNow(scheduledDate)} ago)
                        </span>
                      ) : isUpcoming ? (
                        <span className="font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">
                          ⏰ Next in {formatDistanceToNow(scheduledDate)}
                        </span>
                      ) : (
                        <span className="font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                          ⏳ Processing • scheduled {formatDistanceToNow(scheduledDate)} ago
                        </span>
                      )}

                      {run.started_at && (
                          <span className="flex items-center gap-1.5 text-blue-400">
                          ▶ Started: {format(new Date(run.started_at), 'hh:mm a')}
                        </span>
                      )}
                      {run.completed_at && (
                        <span className="flex items-center gap-1.5 text-green-400">
                          ✓ Done: {format(new Date(run.completed_at), 'hh:mm a')}
                        </span>
                      )}
                    </div>

                    {/* SMART STATUS MESSAGE - Shows real-time provider status */}
                    {/* Hide for auto-completed (target-met) cancellations — no provider order, badge already says Completed */}
                    {!isAutoCompletedCancel && (run.error_message || run.provider_status || run.provider_order_id) && (
                      <div className={`mt-2 px-3 py-2 rounded-lg text-sm ${run.provider_status === 'Completed' || run.provider_status === 'Partial' || (hasProviderOrder && run.provider_remains === 0)
                        ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                        : run.provider_status === 'In progress' || run.provider_status === 'Processing' || (providerStatus === 'pending' && hasProviderOrder)
                          ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                          : providerStatus === 'pending'
                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                            : run.error_message?.includes('Auto-completed')
                              ? 'bg-teal-500/10 border border-teal-500/30 text-teal-400'
                              : isFailed
                                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                                : 'bg-secondary/50 border border-border text-muted-foreground'
                        }`}>
                        <div className="flex items-center gap-2">
                          {/* Provider Status with Real-time Info */}
                          {(run.provider_status === 'Completed' || (hasProviderOrder && run.provider_remains === 0)) && (
                            <span className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" />
                              ✅ Provider delivery completed
                            </span>
                          )}
                          {run.provider_status === 'Partial' && (
                            <span>⚠️ Partial delivery - {run.provider_remains?.toLocaleString() || 'some'} remaining</span>
                          )}
                          {(run.provider_status === 'In progress' || run.provider_status === 'Processing') && (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              🔄 Provider is delivering...
                              {run.provider_remains !== null && run.provider_remains !== undefined && (
                                <span className="text-xs opacity-80">({run.provider_remains} remaining)</span>
                              )}
                            </span>
                          )}
                          {providerStatus === 'pending' && hasProviderOrder && run.provider_remains !== 0 && (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              🔄 Provider ne order receive kar liya, delivery processing hai
                              {run.provider_remains !== null && run.provider_remains !== undefined && (
                                <span className="text-xs opacity-80">({run.provider_remains} remaining)</span>
                              )}
                            </span>
                          )}
                          {providerStatus === 'pending' && !hasProviderOrder && (
                            <span className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5" />
                              ⏳ Queued at provider, starting soon...
                            </span>
                          )}
                          {/* Auto-completed = Order IS placed, delivery continues at provider */}
                          {run.error_message?.includes('Auto-completed') && !run.provider_status?.includes('Completed') && run.provider_remains !== 0 && (
                            <div className="flex flex-col gap-0.5">
                              <span className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" />
                                ✅ Order placed at provider (#{run.provider_order_id})
                              </span>
                              <span className="text-xs opacity-80">
                                Provider is delivering in the background
                                {run.provider_status && ` • Status: ${run.provider_status}`}
                                {run.provider_remains !== null && run.provider_remains !== undefined && ` • ${run.provider_remains} pending`}
                              </span>
                            </div>
                          )}
                          {isFailed && !run.error_message?.includes('Auto-completed') && (
                            <span className="flex items-center gap-2">
                              <XCircle className="h-4 w-4" />
                              <span className="line-clamp-1">{run.error_message || 'Order failed'}</span>
                            </span>
                          )}
                          {!run.provider_status && !run.error_message && run.provider_order_id && (
                            <span className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5" />
                              Order #{run.provider_order_id} - Status check pending...
                            </span>
                          )}
                        </div>

                        {/* Time since last check */}
                        {run.last_status_check && (
                          <div className="text-xs opacity-70 mt-1">
                            Last checked: {formatDistanceToNow(new Date(run.last_status_check))} ago
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Provider Name + ID + Actions */}
                  <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0 flex-wrap">
                    {/* Provider/Service Name - visible to all users */}
                    {run.provider_account_name && !isAutoCompletedCancel && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground uppercase">Provider</p>
                        <p className="text-sm font-bold text-purple-400">{run.provider_account_name}</p>
                      </div>
                    )}

                    {run.provider_order_id && !isAutoCompletedCancel && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground uppercase">Order ID</p>
                        <p className="text-sm font-mono text-teal-400">{run.provider_order_id}</p>
                      </div>
                    )}

                    {isActive && run.provider_order_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          refreshRunStatus(run.id);
                        }}
                        disabled={refreshingRunId === run.id}
                      >
                        {refreshingRunId === run.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-1.5" />
                        )}
                        Check Now
                      </Button>
                    )}

                    {isPending && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditRun(run);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-1.5" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>

                {/* CUMULATIVE SNAPSHOT BOX - Shows ALL types at this point in time */}
                <div className="mx-3 sm:mx-5 mb-3 sm:mb-4 p-2 sm:p-3 rounded-xl bg-secondary/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-foreground" />
                    <span className="text-xs text-muted-foreground uppercase font-bold">
                      📊 Total at {format(scheduledDate, 'hh:mm a')}:
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2">
                    {/* Show only types that exist in this order, or all if no typeTargets provided */}
                    {(typeTargets.length > 0
                      ? ALL_ENGAGEMENT_TYPES.filter(t => typeTargets.some(tt => tt.type === t))
                      : ALL_ENGAGEMENT_TYPES
                    ).map((type) => {
                      const typeConfig = ENGAGEMENT_CONFIG[type];
                      const TypeIcon = typeConfig?.icon || Eye;
                      const delivered = run.deliveredSnapshot[type] || 0;
                      const scheduled = run.scheduledSnapshot[type] || 0;
                      const typeTarget = typeTargets.find(tt => tt.type === type);
                      const originalTarget = typeTarget?.target || 0;
                      const overallScheduled = overallScheduledByType[type] || 0;
                      const dynamicTarget = Math.max(originalTarget, overallScheduled, scheduled);
                      const hasValue = dynamicTarget > 0 || scheduled > 0 || delivered > 0;

                      return (
                        <div
                          key={type}
                          className={`flex flex-col items-center p-2 rounded-lg ${delivered > 0
                            ? `${typeConfig?.bg} border ${typeConfig?.border}`
                            : hasValue
                              ? 'bg-amber-500/10 border border-amber-500/30'
                              : 'bg-secondary/30 border border-border/50 opacity-50'
                            }`}
                        >
                          <TypeIcon className={`h-4 w-4 mb-1 ${delivered > 0 ? typeConfig?.color : hasValue ? 'text-amber-400' : 'text-muted-foreground'
                            }`} />
                          <span className={`font-mono font-bold text-[11px] sm:text-sm ${delivered > 0 ? typeConfig?.color : hasValue ? 'text-amber-400' : 'text-muted-foreground'
                            }`}>
                            {delivered > 0
                              ? `${delivered.toLocaleString()}/${dynamicTarget.toLocaleString()}`
                              : hasValue
                                ? `${scheduled.toLocaleString()}/${dynamicTarget.toLocaleString()}`
                                : '—'}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase">{typeConfig?.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
