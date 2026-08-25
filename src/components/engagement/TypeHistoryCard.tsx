import { useState } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, formatDistanceToNow } from "date-fns";
import {
  Eye, Heart, MessageCircle, Bookmark, Share2,
  Clock, Play, CheckCircle2, XCircle, Pencil,
  ChevronDown, ChevronUp, ExternalLink, RefreshCw, Zap, CalendarClock,
  Pause, PlayCircle, Ban, RefreshCw as Repost, Repeat, UserPlus, Bell, Clock as ClockIcon
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ENGAGEMENT_CONFIG = {
  views: { icon: Eye, label: "Views" },
  likes: { icon: Heart, label: "Likes" },
  comments: { icon: MessageCircle, label: "Comments" },
  saves: { icon: Bookmark, label: "Saves" },
  shares: { icon: Share2, label: "Shares" },
  reposts: { icon: Repost, label: "Reposts" },
  retweets: { icon: Repeat, label: "Retweets" },
  followers: { icon: UserPlus, label: "Followers" },
  subscribers: { icon: Bell, label: "Subscribers" },
  watch_hours: { icon: ClockIcon, label: "Watch Hours" },
};

interface Run {
  id: string;
  run_number: number;
  status: string;
  quantity_to_send: number;
  base_quantity: number;
  variance_applied?: number;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  peak_multiplier?: number;
  provider_order_id?: string;
  provider_remains?: number | null;
  provider_start_count?: number | null;
  error_message?: string;
  provider_account_name?: string | null;
  provider_status?: string | null;
  last_status_check?: string | null;
}

interface TypeHistoryCardProps {
  engagementType: string;
  targetQuantity: number;
  deliveredQuantity: number;
  runs: Run[];
  serviceName?: string;
  servicePrice?: number;
  onEditRun: (run: Run) => void;
  itemId?: string;
  itemStatus?: string;
  itemStartCount?: number | null;
  onPause?: (itemId: string) => void;
  onResume?: (itemId: string) => void;
  onCancel?: (itemId: string) => void;
}

export function TypeHistoryCard({
  engagementType,
  targetQuantity,
  deliveredQuantity,
  runs,
  serviceName,
  servicePrice,
  onEditRun,
  itemId,
  itemStatus,
  itemStartCount,
  onPause,
  onResume,
  onCancel,
}: TypeHistoryCardProps) {
  const { formatPrice } = useCurrency();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const config = ENGAGEMENT_CONFIG[engagementType as keyof typeof ENGAGEMENT_CONFIG] || ENGAGEMENT_CONFIG.views;
  const Icon = config.icon;

  const sortedRuns = [...runs].sort((a, b) => a.run_number - b.run_number);

  // Provider-first helper: delivered + effective status should follow provider_status/remains
  const normalizeProviderStatus = (s?: string | null) => (s ?? '').toString().toLowerCase().trim();
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
  const isTargetMetAutoCompleted = (run: Run) => {
    const status = (run.status || '').toString().toLowerCase().trim();
    const message = (run.error_message || '').toString().toLowerCase().trim();

    if (status !== 'cancelled' && status !== 'canceled') return false;
    if (isTargetCompleteCancelMessage(message)) return true;

    // If the whole type already hit its target and this run never went to a
    // provider, it was only skipped because delivery is complete. Users should
    // see it as Completed, not Cancelled.
    return !run.provider_order_id && Boolean(run.completed_at) && (
      itemStatus === 'completed' ||
      (targetQuantity > 0 && deliveredQuantity >= targetQuantity)
    );
  };

  const getEffectiveStatus = (run: Run): 'pending' | 'started' | 'completed' | 'failed' => {
    // Target already complete before this run went to provider — show user "Completed".
    if (isTargetMetAutoCompleted(run)) return 'completed';

    const ps = normalizeProviderStatus(run.provider_status);

    if (run.provider_order_id && run.provider_remains === 0) return 'completed';
    if (ps === 'completed' || ps === 'complete' || ps === 'partial') return 'completed';
    // Provider pending with provider_order_id means provider accepted it; show as Processing, not overdue/pending.
    if (ps === 'pending') return run.provider_order_id ? 'started' : 'pending';
    if (ps === 'in progress' || ps === 'processing') return 'started';
    if (ps === 'canceled' || ps === 'cancelled' || ps === 'refunded' || ps === 'failed' || ps === 'error') return 'failed';

    const s = (run.status || '').toString().toLowerCase().trim();
    if (run.provider_order_id && (s === 'pending' || s === 'started' || s === 'processing')) return 'started';
    if (s === 'processing') return 'started';
    if (s === 'pending' || s === 'started' || s === 'completed' || s === 'failed') return s as any;
    return 'pending';
  };

  // Helper to calculate actual delivered from provider data
  const calculateActualDelivered = (run: Run): number => {
    const ps = normalizeProviderStatus(run.provider_status);

    // Auto-completed cancel ("Target met") — count as fully delivered
    if (
      isTargetMetAutoCompleted(run)
    ) {
      return run.quantity_to_send;
    }

    // Provider-confirmed completion
    if (ps === 'completed' || ps === 'complete') return run.quantity_to_send;

    // If we have remains, it’s the most accurate signal (including partial/in progress)
    if (run.provider_remains !== null && run.provider_remains !== undefined) {
      return Math.max(0, run.quantity_to_send - run.provider_remains);
    }

    // Legacy fallback
    if (run.status === 'completed') return run.quantity_to_send;

    return 0;
  };

  const completedCount = runs.filter(r => getEffectiveStatus(r) === 'completed').length;
  const pendingCount = runs.filter(r => getEffectiveStatus(r) === 'pending').length;
  const activeCount = runs.filter(r => getEffectiveStatus(r) === 'started').length;

  // Build per-run view with cumulative totals
  const runsWithSchedule = (() => {
    let cumulativeScheduled = 0;
    let cumulativeDelivered = 0;
    // Baseline for types where provider doesn't return start_count (likes/comments/shares/etc).
    // Prefer the item's captured start_count; otherwise 0. Each subsequent run starts from
    // baseline + delivered-so-far, so users still see start → end progression.
    const fallbackBaseline =
      typeof itemStartCount === 'number' && itemStartCount >= 0 ? itemStartCount : 0;
    return sortedRuns.map((run) => {
      const eff = getEffectiveStatus(run);
      const countsTowardSchedule = eff !== 'failed';
      if (countsTowardSchedule) cumulativeScheduled += run.quantity_to_send;
      const actualDel = calculateActualDelivered(run);
      // Real-time provider counts (not target math):
      // - startCount = provider's public count captured when this run went to provider
      // - endCount   = startCount + what the provider actually delivered so far
      const providerStart =
        typeof run.provider_start_count === 'number' && run.provider_start_count > 0
          ? run.provider_start_count
          : null;
      // Fallback for likes/comments/shares where provider omits start_count:
      // use itemStartCount (or 0) + everything delivered before this run.
      const runStartCount =
        providerStart !== null ? providerStart : fallbackBaseline + cumulativeDelivered;
      const runEndCount = runStartCount + actualDel;
      cumulativeDelivered += actualDel;
      return {
        ...run,
        plannedQuantity: run.quantity_to_send,
        cumulativeScheduled,
        cumulativeDelivered,
        actualDeliveredThisRun: actualDel,
        runStartCount,
        runEndCount,
        isCapped: false,
        countsTowardSchedule,
      };
    });
  })();

  // Calculate total delivered
  const totalDelivered = runsWithSchedule.length > 0
    ? runsWithSchedule[runsWithSchedule.length - 1].cumulativeDelivered
    : 0;

  // Calculate total scheduled from all non-failed runs
  const totalScheduled = runsWithSchedule.length > 0
    ? runsWithSchedule[runsWithSchedule.length - 1].cumulativeScheduled
    : 0;

  // Dynamic target = max of original target and scheduled (allows exceeding original)
  const dynamicTarget = Math.max(targetQuantity, totalScheduled);

  // Find next pending run
  const now = new Date();
  const nextRun = sortedRuns.find(r => getEffectiveStatus(r) === 'pending' && new Date(r.scheduled_at) >= now);
  const nextRunDue = nextRun ? new Date(nextRun.scheduled_at) : null;
  const isNextDue = nextRunDue && nextRunDue <= now;

  const isPaused = itemStatus === 'paused';
  const isCancelled = itemStatus === 'cancelled';
  const isTerminal = isCancelled || itemStatus === 'completed' || itemStatus === 'failed';

  return (
    <Card className={`three-d-card overflow-hidden ${isPaused ? 'border-amber-500/30' : ''} ${isCancelled ? 'border-destructive/30 opacity-60' : ''}`}>
      {/* Paused/Cancelled status banner */}
      {isPaused && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20">
            <Pause className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <span className="text-sm font-semibold text-amber-400">Paused</span>
          <span className="text-xs text-muted-foreground">— Runs are being skipped until resumed</span>
          {itemId && (
            <Button variant="outline" size="sm" className="ml-auto h-7 text-xs text-blue-400 border-blue-500/30 hover:bg-blue-500/10" onClick={() => onResume?.(itemId)}>
              <PlayCircle className="h-3 w-3 mr-1" /> Resume Now
            </Button>
          )}
        </div>
      )}
      {isCancelled && (
        <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border-b border-destructive/20">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive/20">
            <Ban className="h-3.5 w-3.5 text-destructive" />
          </div>
          <span className="text-sm font-semibold text-destructive">Cancelled</span>
          <span className="text-xs text-muted-foreground">— No more runs will be sent to provider</span>
        </div>
      )}

      {/* Header - Service Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className={`flex items-center justify-center w-12 h-12 rounded-lg font-bold text-lg ${isPaused ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : isCancelled ? 'bg-white/5 text-white/20 border border-white/10' : 'bg-primary/20 text-primary border border-primary/30'
              }`}>
              <Icon className="h-6 w-6 fill-current opacity-60" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground truncate max-w-[400px]">
                  {serviceName || `Instagram ${config.label}`}
                </h3>
                <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30 text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  Organic
                </Badge>
              </div>
              <a
                href="#"
                className="text-sm text-white/30 hover:text-white/50 flex items-center gap-1 mt-0.5"
              >
                https://www.instagram.com/reel/...
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Right side - Dynamic Target & Controls */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xl font-bold text-foreground tabular-nums">{dynamicTarget.toLocaleString()}</p>
              {servicePrice !== undefined && (
                <p className="text-sm text-muted-foreground">{formatPrice(servicePrice)}</p>
              )}
            </div>

            {/* Per-type control buttons */}
            {itemId && !isTerminal && !isPaused && !isCancelled && (
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="h-8 text-amber-400 border-amber-500/30 hover:bg-amber-500/10" onClick={() => onPause?.(itemId)}>
                  <Pause className="h-3.5 w-3.5 mr-1" /> Pause
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setShowCancelDialog(true)}>
                  <Ban className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            <Badge className={`text-[10px] font-black uppercase tracking-widest border-none ${isPaused ? "bg-amber-500/20 text-amber-400" :
              isCancelled ? "bg-destructive/20 text-destructive" :
                itemStatus === 'completed' ? "bg-blue-500/20 text-blue-400" :
                  "bg-primary/20 text-primary"
              }`}>
              {isPaused && <Pause className="h-3 w-3 mr-1 fill-current" />}
              {isCancelled && <Ban className="h-3 w-3 mr-1 fill-current" />}
              {itemStatus === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {itemStatus || 'processing'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="border-destructive/20 bg-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 mx-auto mb-2">
              <Ban className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">
              Cancel {config.label}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              All pending runs will be permanently stopped and <strong>never sent to the provider</strong>. Completed deliveries ({totalDelivered.toLocaleString()} delivered) remain untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel className="sm:w-32">Keep Active</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-32"
              onClick={() => { if (itemId) onCancel?.(itemId); }}
            >
              Cancel Type
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Live Delivery Tracking Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500/60"></span>
          </span>
          <Zap className="h-4 w-4 text-white/40" />
          <span className="font-semibold text-sm uppercase tracking-wider">LIVE DELIVERY TRACKING</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            Auto-updating
          </span>
          {nextRunDue && (
            <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">
              <Clock className="h-3 w-3 mr-1" />
              Next: {isNextDue ? 'Due now' : formatDistanceToNow(nextRunDue)}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-5 divide-x divide-border border-b border-border">
        <div className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{runs.length}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Runs</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-black text-blue-500/40">{completedCount}</p>
          <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.2em]">Completed</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-black text-primary/40">{activeCount}</p>
          <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.2em]">Processing</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-black text-white/50">{pendingCount}</p>
          <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.2em]">Pending</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-black text-blue-500/60">{totalDelivered.toLocaleString()}</p>
          <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.2em]">Delivered</p>
        </div>
      </div>

      {/* Runs List */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <div className="max-h-[600px] overflow-y-auto">
            <div className="divide-y divide-border">
              {runsWithSchedule.map((run, idx) => {
                const isAutoCompletedCancel = isTargetMetAutoCompleted(run);
                const effectiveStatus = getEffectiveStatus(run);
                const isPending = effectiveStatus === 'pending';
                const isActive = effectiveStatus === 'started';
                const isCompleted = effectiveStatus === 'completed';
                const isFailed = effectiveStatus === 'failed';
                const scheduledDate = new Date(run.scheduled_at);
                const isUpcoming = isPending && scheduledDate > now;
                const isPastDue = scheduledDate < now && isPending;
                const relativeTime = formatDistanceToNow(scheduledDate, { addSuffix: false });

                // Smart status: provider_status > mapped internal status
                const getDisplayStatus = () => {
                  if (isAutoCompletedCancel) return 'Completed';
                  if (isCompleted) return 'Completed';
                  if (isActive) return 'Processing';
                  if (run.provider_status) return run.provider_status;
                  if (run.status === 'cancelled') return isAutoCompletedCancel ? 'Completed' : 'CANCELLED';
                  if (isFailed) return 'FAILED';
                  if (isUpcoming) return 'Scheduled';
                  if (isPending) return 'Queued';
                  if (isCompleted) return 'Completed';
                  return run.status.toUpperCase();
                };
                const displayStatus = getDisplayStatus();

                return (
                  <div
                    key={run.id}
                    className={`p-4 transition-colors ${isActive ? 'bg-blue-500/10' :
                      isFailed ? 'bg-green-500/5' :
                        isPending ? 'hover:bg-violet-500/5 cursor-pointer' :
                          isCompleted ? 'bg-blue-500/5' : ''
                      }`}
                    onClick={() => isPending && onEditRun(run)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Run Number Circle - Colorful Gradient */}
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${isCompleted ? 'bg-gradient-to-br from-blue-500 to-teal-500 text-white' :
                        isActive ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white animate-pulse' :
                          isFailed ? 'bg-gradient-to-br from-green-500 to-red-500 text-white' :
                            'bg-gradient-to-br from-violet-500 to-purple-500 text-white'
                        }`}>
                        #{run.run_number}
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Status Badge - Colorful */}
                          <Badge className={`text-xs ${isCompleted ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' :
                            isActive ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' :
                              isFailed ? 'bg-green-500/20 text-green-400 border border-green-500/40' :
                                isUpcoming ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' :
                                  'bg-violet-500/20 text-violet-400 border border-violet-500/40'
                            }`}>
                            {isCompleted && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {isActive && <Play className="h-3 w-3 mr-1" />}
                            {isPending && isUpcoming && <CalendarClock className="h-3 w-3 mr-1" />}
                            {isPending && !isUpcoming && <Clock className="h-3 w-3 mr-1" />}
                            {isFailed && <XCircle className="h-3 w-3 mr-1" />}
                            {displayStatus}
                          </Badge>

                          {/* Quantity (capped to remaining target) */}
                          <span className="font-bold text-cyan-400">
                            +{run.plannedQuantity.toLocaleString()} {config.label.toLowerCase()}
                            {run.isCapped && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (raw {run.quantity_to_send.toLocaleString()})
                              </span>
                            )}
                          </span>

                          {/* Cumulative Scheduled - Teal (excludes failed runs) */}
                          <span className="text-sm border-l border-border pl-2 ml-1">
                            Scheduled: <span className="font-bold text-teal-400">{run.cumulativeScheduled.toLocaleString()}</span>
                            <span className="text-muted-foreground"> / {dynamicTarget.toLocaleString()}</span>
                            {run.status === 'failed' && (
                              <span className="text-muted-foreground"> (not counted)</span>
                            )}
                          </span>
                        </div>

                        {/* Timestamps Row - Colorful */}
                        <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground flex-wrap">
                          {run.runStartCount !== null && run.runStartCount !== undefined && (
                            <span className="flex items-center gap-1 text-cyan-400">
                              📊
                              <span className="font-bold tabular-nums text-foreground">
                                {run.runStartCount.toLocaleString()}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              {isCompleted && run.runEndCount !== null ? (
                                <span className="font-bold tabular-nums text-blue-400">
                                  {run.runEndCount.toLocaleString()}
                                </span>
                              ) : (
                                <span className="tabular-nums text-muted-foreground italic">
                                  in progress…
                                </span>
                              )}
                              {isCompleted && run.actualDeliveredThisRun > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  (+{run.actualDeliveredThisRun.toLocaleString()})
                                </span>
                              )}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            📅 Scheduled: {format(scheduledDate, 'MMM d, hh:mm a')}
                            <span className={`ml-1 font-medium ${isActive ? 'text-blue-400' : isPastDue ? 'text-amber-500' : 'text-teal-400'}`}>
                              ({isActive ? `${relativeTime} ago` : isPastDue ? `${relativeTime} ago` : `in ${relativeTime}`})
                            </span>
                          </span>

                          {run.started_at && (
                            <span className="flex items-center gap-1 text-blue-400">
                              <Play className="h-3 w-3" />
                              Started: {format(new Date(run.started_at), 'hh:mm a')}
                            </span>
                          )}

                          {run.completed_at && (
                            <span className="flex items-center gap-1 text-blue-400">
                              <CheckCircle2 className="h-3 w-3" />
                              Done: {format(new Date(run.completed_at), 'hh:mm a')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Side - Provider Name + ID & Edit */}
                      <div className="flex items-center gap-4">
                        {/* Provider Account Name */}
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

                        {isPending && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditRun(run);
                            }}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>

        {/* Toggle Button */}
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full rounded-none border-t border-border py-3 h-auto text-muted-foreground hover:text-foreground">
            {isExpanded ? (
              <><ChevronUp className="h-4 w-4 mr-2" /> Hide Schedule</>
            ) : (
              <><ChevronDown className="h-4 w-4 mr-2" /> Show Full Schedule ({runs.length} runs)</>
            )}
          </Button>
        </CollapsibleTrigger>
      </Collapsible>
    </Card>
  );
}
