import { useMemo, forwardRef } from 'react';
import { Clock, TrendingUp, Zap, Activity, CalendarClock, Shield, Sparkles, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrganicRun {
  runNumber: number;
  scheduledAt: Date;
  quantity: number;
  baseQuantity: number;
  variance?: number;
  varianceApplied?: number;
  peakMultiplier: number;
  isPeakHour?: boolean;
  // NEW: Anti-detection metrics
  dayOfWeek?: number;
  hourOfDay?: number;
  sessionType?: 'burst' | 'normal' | 'slow' | 'pause';
  humanBehaviorScore?: number;
  patternBreaker?: boolean;
}

interface OrganicTimelinePreviewProps {
  runs: OrganicRun[];
  totalQuantity: number;
  // NEW: Show anti-detection stats
  showAntiDetection?: boolean;
  avgHumanScore?: number;
  varietyIndex?: number;
  patternBreakCount?: number;
}

// Session type colors - pure grayscale
const SESSION_COLORS: Record<string, string> = {
  burst: 'bg-foreground',
  normal: 'bg-foreground/40',
  slow: 'bg-foreground/25',
  pause: 'bg-foreground/15',
};

const SESSION_LABELS: Record<string, string> = {
  burst: '⚡ Burst',
  normal: '📊 Normal',
  slow: '🐢 Slow',
  pause: '⏸️ Pause',
};

export const OrganicTimelinePreview = forwardRef<HTMLDivElement, OrganicTimelinePreviewProps>(({ 
  runs, 
  totalQuantity,
  showAntiDetection = true,
  avgHumanScore,
  varietyIndex,
  patternBreakCount,
}, ref) => {
  const totalDelivered = useMemo(() => 
    runs.reduce((sum, r) => sum + r.quantity, 0)
  , [runs]);

  const maxQuantity = useMemo(() => 
    Math.max(...runs.map(r => r.quantity), 1)
  , [runs]);

  const minQuantity = useMemo(() => 
    Math.min(...runs.map(r => r.quantity))
  , [runs]);

  const avgQuantity = useMemo(() => 
    Math.round(runs.reduce((sum, r) => sum + r.quantity, 0) / runs.length)
  , [runs]);

  const peakHourRuns = useMemo(() => 
    runs.filter(r => r.isPeakHour || (r.hourOfDay && r.hourOfDay >= 18 && r.hourOfDay <= 22)).length
  , [runs]);

  // NEW: Calculate session distribution
  const sessionDistribution = useMemo(() => {
    const dist: Record<string, number> = { burst: 0, normal: 0, slow: 0, pause: 0 };
    runs.forEach(r => {
      if (r.sessionType) {
        dist[r.sessionType] = (dist[r.sessionType] || 0) + 1;
      }
    });
    return dist;
  }, [runs]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    if (runs.length < 2) return { value: 0, unit: 'min' };
    const startTime = runs[0].scheduledAt.getTime();
    const endTime = runs[runs.length - 1].scheduledAt.getTime();
    const diffMs = endTime - startTime;
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 60) return { value: diffMins, unit: 'min' };
    if (diffMins < 1440) return { value: Math.round(diffMins / 60), unit: 'hours' };
    return { value: Math.round(diffMins / 1440), unit: 'days' };
  }, [runs]);

  // Calculate computed human score if not provided
  const computedHumanScore = useMemo(() => {
    if (avgHumanScore !== undefined) return avgHumanScore;
    const scores = runs.map(r => r.humanBehaviorScore || 60);
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [runs, avgHumanScore]);

  // Calculate computed variety if not provided
  const computedVariety = useMemo(() => {
    if (varietyIndex !== undefined) return varietyIndex;
    const quantities = runs.map(r => r.quantity);
    const avg = quantities.reduce((a, b) => a + b, 0) / quantities.length;
    const variance = quantities.reduce((sum, q) => sum + Math.pow(q - avg, 2), 0) / quantities.length;
    return Math.min(100, Math.round((Math.sqrt(variance) / avg) * 100));
  }, [runs, varietyIndex]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'TODAY';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'TOMORROW';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
    }
  };

  // Get detection risk level - pure grayscale
  const getDetectionRisk = (score: number) => {
    if (score >= 75) return { label: 'Very Low', color: 'text-foreground', bg: 'bg-foreground' };
    if (score >= 60) return { label: 'Low', color: 'text-foreground/80', bg: 'bg-foreground/80' };
    if (score >= 45) return { label: 'Medium', color: 'text-muted-foreground', bg: 'bg-muted-foreground' };
    if (score >= 30) return { label: 'High', color: 'text-muted-foreground/70', bg: 'bg-muted-foreground/70' };
    return { label: 'Very High', color: 'text-muted-foreground/50', bg: 'bg-muted-foreground/50' };
  };

  const detectionRisk = getDetectionRisk(computedHumanScore);

  if (runs.length === 0) {
    return null;
  }

  return (
    <div ref={ref} className="rounded-xl bg-background border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-foreground rounded-full animate-pulse" />
          <TrendingUp className="h-4 w-4 text-foreground" />
          <span className="text-sm font-bold text-foreground uppercase tracking-wider">ORGANIC PREVIEW</span>
        </div>
        <div className="text-sm font-bold text-foreground">
          {runs.length} runs scheduled
        </div>
      </div>

      {/* NEW: Anti-Detection Stats */}
      {showAntiDetection && (
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border bg-secondary/30">
          <div className="text-center py-3 px-2">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">HUMAN SCORE</p>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <p className={cn("text-xl font-bold", detectionRisk.color)}>{computedHumanScore}</p>
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", detectionRisk.bg, "text-white")}>
                {detectionRisk.label}
              </span>
            </div>
          </div>
          <div className="text-center py-3 px-2">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">VARIETY</p>
            </div>
            <p className="text-xl font-bold text-foreground">{computedVariety}%</p>
          </div>
          <div className="text-center py-3 px-2">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">PATTERN BREAKS</p>
            </div>
            <p className="text-xl font-bold text-foreground">{patternBreakCount || runs.filter(r => r.patternBreaker).length}</p>
          </div>
        </div>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-4 divide-x divide-border border-b border-border">
        <div className="text-center py-4 px-2">
          <p className="text-2xl font-bold text-foreground">{runs.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">RUNS</p>
        </div>
        <div className="text-center py-4 px-2">
          <p className="text-2xl font-bold text-foreground">{totalDuration.value}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{totalDuration.unit.toUpperCase()}</p>
        </div>
        <div className="text-center py-4 px-2">
          <p className="text-2xl font-bold text-foreground">{peakHourRuns}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">PEAK HRS</p>
        </div>
        <div className="text-center py-4 px-2">
          <p className="text-2xl font-bold text-foreground">{avgQuantity}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">AVG/RUN</p>
        </div>
      </div>

      {/* Session Distribution (NEW) */}
      {showAntiDetection && (
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-secondary/20">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Sessions:</span>
          <div className="flex items-center gap-3 flex-1">
            {Object.entries(sessionDistribution).map(([type, count]) => count > 0 && (
              <div key={type} className="flex items-center gap-1.5">
                <div className={cn("w-2 h-2 rounded-full", SESSION_COLORS[type])} />
                <span className="text-xs text-foreground font-medium">{SESSION_LABELS[type]}</span>
                <span className="text-xs text-muted-foreground">({count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="max-h-[400px] overflow-y-auto">
        {runs.map((run, idx) => {
          const widthPercent = Math.max(20, (run.quantity / maxQuantity) * 100);
          const isFirst = idx === 0;
          const showDate = idx === 0 || runs[idx - 1]?.scheduledAt.toDateString() !== run.scheduledAt.toDateString();
          
          // Calculate cumulative total up to this run
          const cumulativeTotal = runs.slice(0, idx + 1).reduce((sum, r) => sum + r.quantity, 0);
          
          return (
            <div key={run.runNumber}>
              {/* Date Separator */}
              {showDate && (
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border-b border-border">
                  <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {formatDate(run.scheduledAt)}
                  </span>
                </div>
              )}
              
              <div 
                className={cn(
                  "flex items-center gap-3 px-4 py-3 border-b border-border transition-colors",
                  isFirst ? 'bg-foreground/5' : 'hover:bg-secondary/30',
                  run.patternBreaker && 'bg-foreground/5'
                )}
              >
                {/* Run Number Badge */}
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs relative",
                  isFirst 
                    ? 'bg-foreground text-background' 
                    : run.patternBreaker 
                      ? 'bg-foreground/20 text-foreground border border-foreground/50'
                      : 'bg-secondary text-muted-foreground'
                )}>
                  {run.runNumber}
                  {run.patternBreaker && (
                    <Sparkles className="absolute -top-1 -right-1 h-2.5 w-2.5 text-foreground" />
                  )}
                </div>

                {/* Session Type Indicator */}
                {run.sessionType && (
                  <div className={cn("w-1.5 h-6 rounded-full shrink-0", SESSION_COLORS[run.sessionType])} />
                )}

                {/* Time */}
                <div className="w-16 shrink-0">
                  <p className={cn("text-sm font-bold", isFirst ? 'text-foreground' : 'text-foreground')}>
                    {formatTime(run.scheduledAt)}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="flex-1 min-w-0">
                  <div className="h-6 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        isFirst 
                          ? 'bg-foreground' 
                          : run.patternBreaker
                            ? 'bg-foreground/40'
                            : 'bg-muted-foreground/30'
                      )}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>

                {/* Human Score (small) */}
                {run.humanBehaviorScore && showAntiDetection && (
                  <div className="shrink-0 w-8 text-center">
                    <p className={cn(
                      "text-xs font-bold",
                      run.humanBehaviorScore >= 70 ? 'text-foreground' : 
                      run.humanBehaviorScore >= 50 ? 'text-foreground/80' : 'text-muted-foreground'
                    )}>
                      {run.humanBehaviorScore}
                    </p>
                  </div>
                )}

                {/* Quantity Only */}
                <div className="text-right shrink-0 min-w-12">
                  <p className={cn("text-sm font-bold", isFirst ? 'text-foreground' : 'text-foreground')}>
                    +{run.quantity}
                  </p>
                </div>

                {/* Cumulative Total */}
                <div className="text-right shrink-0 min-w-16 border-l border-border pl-3">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-sm font-bold text-foreground">{cumulativeTotal.toLocaleString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-border">
        {/* Total Row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground font-medium">Total Delivery</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-foreground">
              {totalDelivered.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">
              / {totalQuantity.toLocaleString()}
            </span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-secondary rounded-full overflow-hidden mb-3">
          <div 
            className="h-full bg-foreground rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (totalDelivered / totalQuantity) * 100)}%` }}
          />
        </div>

        {/* Min/Max Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>Min: <span className="text-foreground font-bold">{minQuantity}</span></span>
            <span>Max: <span className="text-foreground font-bold">{maxQuantity}</span></span>
            <span>Δ: <span className="text-foreground font-bold">{maxQuantity - minQuantity}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-foreground" />
            <span className="text-foreground font-bold">Ultra Organic Active</span>
          </div>
        </div>
      </div>
    </div>
  );
});

OrganicTimelinePreview.displayName = 'OrganicTimelinePreview';
