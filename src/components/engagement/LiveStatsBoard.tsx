import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Timer, CheckCircle2, Play, Clock, AlertTriangle, RefreshCw, TrendingUp, RotateCcw, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LiveStatsBoardProps {
  totalRuns: number;
  completedRuns: number;
  startedRuns: number;
  pendingRuns: number;
  failedRuns: number;
  totalDelivered: number;
  totalQuantity: number;
  nextRun?: { scheduled_at: string } | null;
  onRetryFailed?: () => void;
  isRetrying?: boolean;
}

export function LiveStatsBoard({
  totalRuns,
  completedRuns,
  startedRuns,
  pendingRuns,
  failedRuns,
  totalDelivered,
  totalQuantity,
  nextRun,
  onRetryFailed,
  isRetrying = false,
}: LiveStatsBoardProps) {
  const progressPercent = totalQuantity > 0 ? (totalDelivered / totalQuantity) * 100 : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Decorative gradient orbs */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-foreground/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
      
      {/* Header */}
      <div className="relative px-4 sm:px-6 py-3 sm:py-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute inset-0 animate-ping rounded-full bg-foreground/40"></span>
            <span className="relative flex h-3 w-3 rounded-full bg-foreground shadow-lg shadow-foreground/50"></span>
          </div>
          <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-secondary/50 border border-border">
            <Zap className="h-4 w-4 text-foreground" />
            <span className="font-bold text-xs sm:text-sm uppercase tracking-widest text-foreground">Live Tracking</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '10s' }} />
            <span>Auto-updating</span>
          </div>
          {nextRun && (
            <Badge className="bg-secondary/50 text-foreground border-border px-3 py-1.5">
              <Timer className="h-4 w-4 mr-1.5" />
              Next: {formatDistanceToNow(new Date(nextRun.scheduled_at))}
            </Badge>
          )}
        </div>
      </div>

      {/* Big Stats Grid */}
      <div className="relative grid grid-cols-3 sm:grid-cols-5 divide-x divide-border/50">
        {/* Total Runs */}
        <div className="p-3 sm:p-6 text-center group hover:bg-secondary/30 transition-colors">
          <div className="w-9 h-9 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-xl bg-secondary/50 flex items-center justify-center border border-border">
            <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-foreground" />
          </div>
          <p className="text-2xl sm:text-4xl font-bold text-foreground mb-1">{totalRuns}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Total Runs</p>
        </div>

        {/* Completed */}
        <div className="p-3 sm:p-6 text-center group hover:bg-secondary/30 transition-colors">
          <div className="w-9 h-9 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-xl bg-foreground/10 flex items-center justify-center border border-foreground/20">
            <CheckCircle2 className="h-4 w-4 sm:h-6 sm:w-6 text-foreground" />
          </div>
          <p className="text-2xl sm:text-4xl font-bold text-foreground mb-1">{completedRuns}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Completed</p>
        </div>

        {/* In Progress */}
        <div className="p-3 sm:p-6 text-center group hover:bg-secondary/30 transition-colors">
          <div className="w-9 h-9 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-xl bg-foreground/10 flex items-center justify-center border border-foreground/20">
            <Play className="h-4 w-4 sm:h-6 sm:w-6 text-foreground" />
          </div>
          <p className="text-2xl sm:text-4xl font-bold text-foreground mb-1">{startedRuns}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">In Progress</p>
        </div>

        {/* Pending */}
        <div className="p-3 sm:p-6 text-center group hover:bg-secondary/30 transition-colors">
          <div className="w-9 h-9 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-xl bg-muted flex items-center justify-center border border-border">
            <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-muted-foreground" />
          </div>
          <p className="text-2xl sm:text-4xl font-bold text-foreground mb-1">{pendingRuns}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Pending</p>
        </div>

        {/* Delivered */}
        <div className="p-3 sm:p-6 text-center group hover:bg-secondary/30 transition-colors">
          <div className="w-9 h-9 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-xl bg-foreground/10 flex items-center justify-center border border-foreground/20">
            <Zap className="h-4 w-4 sm:h-6 sm:w-6 text-foreground" />
          </div>
          <p className="text-2xl sm:text-4xl font-bold text-foreground mb-1">
            {totalDelivered.toLocaleString()}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Delivered</p>
        </div>
      </div>

      {/* Failed Runs Warning with Retry Button */}
      {failedRuns > 0 && (
        <div className="mx-6 mt-4 bg-muted border border-border rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <span className="text-foreground font-bold">{failedRuns} runs failed</span>
              <p className="text-xs text-muted-foreground">API key errors can be retried after updating keys</p>
            </div>
          </div>
          {onRetryFailed && (
            <Button 
              onClick={onRetryFailed} 
              disabled={isRetrying}
              variant="outline"
              className="gap-2 border-primary/30 hover:bg-primary/10"
            >
              {isRetrying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Retry All Failed
            </Button>
          )}
        </div>
      )}

      {/* Overall Progress Bar */}
      <div className="relative p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center border border-border">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="font-semibold text-foreground">Overall Progress</span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-foreground">
              {totalDelivered.toLocaleString()}
            </span>
            <span className="text-muted-foreground"> / {totalQuantity.toLocaleString()}</span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="relative h-4 bg-secondary/50 rounded-full overflow-hidden border border-border/50">
          <div 
            className="absolute inset-y-0 left-0 bg-foreground rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{completedRuns}</span> of {totalRuns} runs complete
          </span>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border">
            <Zap className="h-4 w-4 text-foreground" />
            <span className="text-foreground font-bold">{progressPercent.toFixed(0)}% done</span>
          </div>
        </div>
      </div>
    </div>
  );
}
