import { useState } from "react";
import { Eye, Heart, MessageCircle, Bookmark, Share2, TrendingUp, Zap, BarChart3, Pause, Play, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";
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

const ENGAGEMENT_CONFIG: Record<string, { icon: typeof Eye; label: string; emoji: string; color: string; bg: string; border: string }> = {
  views: { icon: Eye, label: "Views", emoji: "👁️", color: "text-cyan-400", bg: "bg-cyan-500/20", border: "border-cyan-500/40" },
  likes: { icon: Heart, label: "Likes", emoji: "❤️", color: "text-green-400", bg: "bg-green-500/20", border: "border-green-500/40" },
  comments: { icon: MessageCircle, label: "Comments", emoji: "💬", color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/40" },
  saves: { icon: Bookmark, label: "Saves", emoji: "📥", color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/40" },
  shares: { icon: Share2, label: "Shares", emoji: "🔄", color: "text-violet-400", bg: "bg-violet-500/20", border: "border-violet-500/40" },
  reposts: { icon: Share2, label: "Reposts", emoji: "🔁", color: "text-indigo-400", bg: "bg-indigo-500/20", border: "border-indigo-500/40" },
};

// Helper to get config with dynamic fallback
const getEngagementConfig = (type: string) => {
  return ENGAGEMENT_CONFIG[type] || {
    icon: Eye,
    label: type?.charAt(0).toUpperCase() + type?.slice(1) || "Items",
    emoji: "📦",
    color: "text-gray-400",
    bg: "bg-gray-500/20",
    border: "border-gray-500/40"
  };
};

interface RunData {
  id: string;
  engagement_type: string;
  run_number: number;
  status: string;
  quantity_to_send: number;
  scheduled_at: string;
  completed_at?: string;
  started_at?: string;
}

interface TypeData {
  type: string;
  target: number;
  delivered: number;
  scheduled?: number;
}

interface PerTypeBreakdownProps {
  types: TypeData[];
  allRuns?: RunData[];
  onTypeClick?: (type: string) => void;
  itemStatuses?: Record<string, { id: string; status: string }>;
  onPauseType?: (itemId: string) => void;
  onResumeType?: (itemId: string) => void;
  onCancelType?: (itemId: string) => void;
}

export function PerTypeBreakdown({ types, allRuns = [], onTypeClick, itemStatuses, onPauseType, onResumeType, onCancelType }: PerTypeBreakdownProps) {
  const [cancelConfirmType, setCancelConfirmType] = useState<string | null>(null);
  // Filter active types and sort by their appearance in ENGAGEMENT_CONFIG keys, unknown types at end
  const knownTypes = Object.keys(ENGAGEMENT_CONFIG);
  const activeTypes = types
    .filter(t => t.target > 0)
    .sort((a, b) => {
      const aIndex = knownTypes.indexOf(a.type);
      const bIndex = knownTypes.indexOf(b.type);
      // If not found, put at end
      const aPos = aIndex === -1 ? 999 : aIndex;
      const bPos = bIndex === -1 ? 999 : bIndex;
      return aPos - bPos;
    });

  // Compute cumulative history for each type - NO TARGET CAPPING
  // Sum all runs (except failed) for real scheduled total
  const typeHistories = activeTypes.map(typeData => {
    const typeRuns = allRuns
      .filter(r => r.engagement_type === typeData.type)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    
    // Calculate cumulative scheduled (NO capping, exclude failed)
    let cumulativeScheduled = 0;
    const history = typeRuns.map(run => {
      if (run.status !== 'failed') {
        cumulativeScheduled += run.quantity_to_send;
      }
      return { ...run, cumulativeScheduled };
    });

    const completedRuns = history.filter(r => r.status === 'completed');
    const activeRuns = history.filter(r => r.status === 'started');
    const pendingRuns = history.filter(r => r.status === 'pending');
    const failedRuns = history.filter(r => r.status === 'failed');

    return {
      ...typeData,
      history,
      completedRuns,
      activeRuns,
      pendingRuns,
      failedRuns,
    };
  });

  // Grand totals - use scheduled as dynamic target when it exceeds original
  const grandScheduled = typeHistories.reduce((sum, t) => {
    const lastRun = t.history[t.history.length - 1];
    return sum + (lastRun?.cumulativeScheduled || 0);
  }, 0);
  const grandOriginalTarget = activeTypes.reduce((sum, t) => sum + t.target, 0);
  const grandTarget = Math.max(grandOriginalTarget, grandScheduled); // Dynamic target
  const grandDelivered = activeTypes.reduce((sum, t) => sum + t.delivered, 0);
  const grandProgress = grandTarget > 0 ? (grandDelivered / grandTarget) * 100 : 0;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Header with Grand Total */}
      <div className="p-3 sm:p-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Zap className="h-5 w-5 text-foreground" />
            <span className="font-bold text-base sm:text-lg text-foreground flex items-center gap-1.5"><BarChart3 className="h-4.5 w-4.5 text-primary" /> Live Engagement Stats</span>
            <Badge variant="outline" className="text-muted-foreground border-border text-xs">
              Real-time sync
            </Badge>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs sm:text-sm text-muted-foreground">Grand Total:</span>
            <span className="font-bold text-lg sm:text-xl text-foreground">
              {grandDelivered.toLocaleString()} / {grandTarget.toLocaleString()}
            </span>
            <Badge className="bg-foreground/10 text-foreground border-foreground/30">
              {grandProgress.toFixed(0)}%
            </Badge>
          </div>
        </div>
      </div>

      {/* Quick Summary Cards - Dynamic Types */}
      <div className="p-4 border-b border-border bg-secondary/20">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {activeTypes.map(typeData => {
            const config = getEngagementConfig(typeData.type);
            const Icon = config.icon;
            const originalTarget = typeData.target || 0;
            const delivered = typeData.delivered || 0;
            const scheduled = typeData.scheduled || 0;
            
            // Dynamic target = max of original and scheduled (when runs edited to exceed)
            const dynamicTarget = Math.max(originalTarget, scheduled);
            const progress = dynamicTarget > 0 ? (delivered / dynamicTarget) * 100 : 0;

            const itemInfo = itemStatuses?.[typeData.type];
            const itemStatus = itemInfo?.status || 'processing';
            const isPaused = itemStatus === 'paused';
            const isCancelled = itemStatus === 'cancelled';
            const isCompleted = itemStatus === 'completed';
            const isTerminal = isCancelled || itemStatus === 'completed' || itemStatus === 'failed';

            return (
              <div 
                key={typeData.type} 
                className={`relative p-3 rounded-xl ${config.bg} border ${config.border} transition-all duration-300 ${
                  isPaused ? 'ring-1 ring-amber-500/30 grayscale-[30%]' : ''
                } ${isCancelled ? 'ring-1 ring-destructive/30 grayscale-[50%]' : ''} ${
                  onTypeClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg' : ''
                }`}
                onClick={() => onTypeClick?.(typeData.type)}
                role={onTypeClick ? "button" : undefined}
                tabIndex={onTypeClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onTypeClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onTypeClick(typeData.type);
                  }
                }}
              >
                {/* Status overlay stripe */}
                {isPaused && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 rounded-t-xl" />
                )}
                {isCancelled && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-destructive via-red-400 to-destructive rounded-t-xl" />
                )}
                {isCompleted && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500 rounded-t-xl" />
                )}

                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <span className={`text-xs uppercase font-bold tracking-wider ${config.color}`}>{config.label}</span>
                  </div>
                  {isPaused && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                      <Pause className="h-2.5 w-2.5" /> PAUSED
                    </span>
                  )}
                  {isCancelled && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-md border border-destructive/20">
                      <X className="h-2.5 w-2.5" /> STOPPED
                    </span>
                  )}
                  {isCompleted && (
                    <span className="flex items-center gap-1 text-[10px] font-black text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md border border-blue-500/20 uppercase tracking-wider">
                      ✓ Completed
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-xl font-bold tabular-nums ${config.color}`}>{delivered.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">/ {dynamicTarget.toLocaleString()}</span>
                </div>
                <Progress value={Math.min(progress, 100)} className="h-1.5 mt-2" />
                
                {/* Sleek inline action buttons */}
                {itemInfo && !isTerminal && (
                  <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                    {isPaused ? (
                      <button 
                        className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold py-1 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
                        onClick={() => onResumeType?.(itemInfo.id)}
                      >
                        <Play className="h-3 w-3" /> Resume
                      </button>
                    ) : (
                      <button 
                        className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold py-1 rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
                        onClick={() => onPauseType?.(itemInfo.id)}
                      >
                        <Pause className="h-3 w-3" /> Pause
                      </button>
                    )}
                    <button 
                      className="flex items-center justify-center gap-1 text-[11px] font-semibold py-1 px-2.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-colors"
                      onClick={() => setCancelConfirmType(typeData.type)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelConfirmType} onOpenChange={(open) => !open && setCancelConfirmType(null)}>
        <AlertDialogContent className="border-destructive/20 bg-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 mx-auto mb-2">
              <X className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">
              Cancel {cancelConfirmType ? getEngagementConfig(cancelConfirmType).label : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              All pending runs will be permanently stopped and <strong>never sent to the provider</strong>. Completed deliveries remain untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel className="sm:w-32">Keep Active</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-32"
              onClick={() => {
                if (cancelConfirmType && itemStatuses?.[cancelConfirmType]) {
                  onCancelType?.(itemStatuses[cancelConfirmType].id);
                }
                setCancelConfirmType(null);
              }}
            >
              Cancel Type
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
