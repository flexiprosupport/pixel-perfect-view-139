import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  EngagementConfig, 
  EngagementType, 
  ENGAGEMENT_CONFIG,
  DEFAULT_ORGANIC_SETTINGS
} from "@/lib/engagement-types";
import { 
  generateOrganicSchedule,
  formatDuration,
  getPeakLabel,
  FullOrganicConfig,
  PROVIDER_MINIMUMS
} from "@/lib/organic-algorithm";
import { 
  ControlPoint, 
  curveToSchedule, 
  interpolateCurve 
} from "@/lib/curve-to-schedule";
import { format } from "date-fns";
import { Clock, TrendingUp, Zap, Timer, Calendar, Pencil, Check, X, ChevronDown, ChevronUp } from "lucide-react";

type Platform = 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook';

interface DeliveryPreviewProps {
  engagements: Record<EngagementType, EngagementConfig>;
  refreshKey?: number;
  platform?: Platform;
  customCurvePoints?: Record<EngagementType, ControlPoint[]>;
  onScheduleChange?: (payload: {
    schedules: FullOrganicConfig[];
    customQuantities: Record<string, number>;
  }) => void;
}

interface TimelineEvent {
  id: string;
  time: Date;
  type: EngagementType;
  quantity: number;
  runNumber: number;
  peakLabel: string;
}

export function DeliveryPreview({ engagements, refreshKey = 0, platform = 'instagram', customCurvePoints, onScheduleChange }: DeliveryPreviewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  // Reset custom quantities when engagements, refreshKey, or curve changes
  useEffect(() => {
    setCustomQuantities({});
  }, [engagements, refreshKey, customCurvePoints]);

  const { timeline, schedules, stats, perTypeStats } = useMemo(() => {
    // Include refreshKey in the computation to trigger regeneration
    const _ = refreshKey;
    const enabledTypes = Object.entries(engagements)
      .filter(([_, config]) => config.enabled && config.quantity > 0)
      .map(([type, config]) => ({
        type: type as EngagementType,
        config,
      }));

    if (enabledTypes.length === 0) {
      return { timeline: [], schedules: [], stats: null, perTypeStats: [] };
    }

    const baseStartTime = new Date();
    
    // DELIVERY SEQUENCING: strictly ordered — each type starts AFTER the previous one.
    // Priority (lower = earlier): Views → Likes → Comments → Saves/Shares → Followers …
    // This mirrors real organic growth: a post first gets impressions, then reactions,
    // then discussion, then re-distribution and follows.
    const TYPE_PRIORITY: Partial<Record<EngagementType, number>> = {
      views: 0,
      watch_hours: 1,   // watch time grows alongside views
      likes: 2,
      comments: 3,
      shares: 4,
      retweets: 4,
      reposts: 5,
      saves: 6,
      subscribers: 7,
      followers: 8,
    };

    // Random GAP added between one type's start and the NEXT type's start (minutes).
    // Because we add cumulatively, order is guaranteed — no more overlap surprises.
    const TYPE_STEP_GAP_MINUTES: Partial<Record<EngagementType, { min: number; max: number }>> = {
      views: { min: 0, max: 0 },
      watch_hours: { min: 4, max: 10 },
      likes: { min: 12, max: 28 },
      comments: { min: 18, max: 40 },
      shares: { min: 15, max: 35 },
      retweets: { min: 15, max: 35 },
      reposts: { min: 12, max: 30 },
      saves: { min: 15, max: 35 },
      subscribers: { min: 20, max: 45 },
      followers: { min: 25, max: 55 },
    };

    // Sort by priority so views are processed first
    const sortedTypes = [...enabledTypes].sort((a, b) =>
      (TYPE_PRIORITY[a.type] ?? 10) - (TYPE_PRIORITY[b.type] ?? 10)
    );

    // Track when views actually start/end so other engagement types can follow the same window
    let viewsStartTime = baseStartTime;
    let viewsDurationHours = 0;
    // Rolling anchor — start of the previously scheduled type. Guarantees monotonic ordering.
    let prevTypeStartTime = baseStartTime;


    
    // Generate individual schedule for each type with SEQUENCED start times
    const schedules: FullOrganicConfig[] = sortedTypes.map(({ type, config }) => {
      const rawTimeLimitHours = config.timeLimitHours ?? DEFAULT_ORGANIC_SETTINGS.timeLimitHours;
      const variancePercent = config.variancePercent ?? DEFAULT_ORGANIC_SETTINGS.variancePercent;
      const peakHoursEnabled = config.peakHoursEnabled ?? DEFAULT_ORGANIC_SETTINGS.peakHoursEnabled;
      const serviceMinimum = config.minQuantity || PROVIDER_MINIMUMS[type] || 10;
      const isViewType = type === 'views';
      const timeLimitHours = !isViewType && viewsDurationHours > 0
        ? Math.max(viewsDurationHours, 0.25)
        : rawTimeLimitHours;
      
      // Calculate start time — strictly after the previous type's start (monotonic).
      let typeStartTime: Date;
      if (type === 'views') {
        typeStartTime = baseStartTime;
      } else {
        const gapCfg = TYPE_STEP_GAP_MINUTES[type] ?? { min: 15, max: 40 };
        const gapMinutes = gapCfg.min + Math.random() * (gapCfg.max - gapCfg.min);
        typeStartTime = new Date(prevTypeStartTime.getTime() + gapMinutes * 60 * 1000);
      }
      prevTypeStartTime = typeStartTime;

      
      // Check if we have custom curve points for this type
      const curvePoints = customCurvePoints?.[type];
      
      if (curvePoints && curvePoints.length >= 2) {
        // Use custom curve to generate schedule
        const totalDurationHours = timeLimitHours > 0 ? timeLimitHours : 24;
        const curveRuns = curveToSchedule(
          curvePoints,
          type,
          config.quantity,
          totalDurationHours,
          Math.min(30, Math.max(5, Math.ceil(config.quantity / serviceMinimum)))
        );
        
        // Convert curve runs to schedule format with full OrganicRunConfig properties
        const runs = curveRuns.map((run, idx) => {
          const timeOffset = (run.timePercent / 100) * totalDurationHours * 60 * 60 * 1000;
          const runTime = new Date(typeStartTime.getTime() + timeOffset);
          return {
            scheduledAt: runTime,
            quantity: run.quantity,
            runNumber: run.runNumber,
            baseQuantity: run.quantity,
            varianceApplied: 0,
            peakMultiplier: 1,
            dayOfWeek: runTime.getDay(),
            hourOfDay: runTime.getHours(),
            sessionType: 'normal' as const,
            humanBehaviorScore: 85,
            patternBreaker: false,
          };
        });
        
        const totalDuration = runs.length > 1 
          ? runs[runs.length - 1].scheduledAt.getTime() - runs[0].scheduledAt.getTime()
          : 0;
        
        return {
          engagementType: type,
          runs,
          totalDuration,
          totalQuantity: config.quantity,
          runCount: runs.length,
          warnings: [] as string[],
          patternBreakCount: 0,
          avgHumanScore: 85,
          varietyIndex: 0.8,
        } as FullOrganicConfig;
      }
      
      // Default: use organic schedule generator
      const schedule = generateOrganicSchedule(
        type,
        config.quantity,
        variancePercent,
        peakHoursEnabled,
        typeStartTime,
        serviceMinimum,
        timeLimitHours > 0 ? timeLimitHours : undefined,
        config.runCount && config.runCount > 0 ? config.runCount : undefined
      );
      
      // Capture views first run time for anchoring other types
      if (type === 'views' && schedule.runs.length > 0) {
        viewsStartTime = schedule.runs[0].scheduledAt;
        const lastViewRun = schedule.runs[schedule.runs.length - 1];
        viewsDurationHours = Math.max(
          (lastViewRun.scheduledAt.getTime() - schedule.runs[0].scheduledAt.getTime()) / (1000 * 60 * 60),
          0.25
        );
      }
      
      return schedule;
    });

    // Merge all runs into a single timeline with unique IDs
    const allEvents: TimelineEvent[] = [];
    schedules.forEach(schedule => {
      schedule.runs.forEach(run => {
        const id = `${schedule.engagementType}-${run.runNumber}`;
        allEvents.push({
          id,
          time: run.scheduledAt,
          type: schedule.engagementType as EngagementType,
          quantity: customQuantities[id] ?? run.quantity,
          runNumber: run.runNumber,
          peakLabel: getPeakLabel(run.scheduledAt),
        });
      });
    });

    // Sort by time
    allEvents.sort((a, b) => a.time.getTime() - b.time.getTime());

    // Calculate stats with custom quantities
    const totalRuns = schedules.reduce((sum, s) => sum + s.runs.length, 0);
    const maxDuration = Math.max(...schedules.map(s => s.totalDuration));
    const totalEngagements = allEvents.reduce((sum, e) => sum + e.quantity, 0);

    // Per-type stats for summary
    const perTypeStats = schedules.map(schedule => {
      const config = engagements[schedule.engagementType as EngagementType];
      const finishTime = schedule.runs.length > 0 
        ? schedule.runs[schedule.runs.length - 1].scheduledAt 
        : baseStartTime;
      
      // Calculate actual total for this type with custom quantities
      const typeTotal = allEvents
        .filter(e => e.type === schedule.engagementType)
        .reduce((sum, e) => sum + e.quantity, 0);
        
      return {
        type: schedule.engagementType as EngagementType,
        runs: schedule.runs.length,
        duration: schedule.totalDuration,
        finishTime,
        timeLimitHours: config.timeLimitHours ?? 0,
        variancePercent: config.variancePercent ?? 25,
        peakHoursEnabled: config.peakHoursEnabled ?? false, // OFF by default
        totalQuantity: typeTotal,
      };
    });

    return {
      timeline: allEvents,
      schedules,
      stats: {
        totalRuns,
        totalDuration: maxDuration,
        totalEngagements,
        typesActive: enabledTypes.length,
      },
      perTypeStats,
    };
  }, [engagements, customQuantities, refreshKey, customCurvePoints]);

  useEffect(() => {
    onScheduleChange?.({ schedules, customQuantities });
  }, [schedules, customQuantities, onScheduleChange]);

  const handleEdit = (event: TimelineEvent) => {
    setEditingId(event.id);
    setEditValue(event.quantity);
  };

  const handleSave = () => {
    if (editingId) {
      setCustomQuantities(prev => ({
        ...prev,
        [editingId]: editValue,
      }));
      setEditingId(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  // Calculate cumulative totals per type
  const getCumulativeTotal = (eventId: string, type: EngagementType) => {
    let total = 0;
    for (const event of timeline) {
      if (event.type === type) {
        total += event.quantity;
        if (event.id === eventId) break;
      }
    }
    return total;
  };

  if (timeline.length === 0) {
    return null;
  }

  return (
    <Card className="border border-border bg-background">
      <CardHeader className="pb-3 px-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-foreground">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-foreground shrink-0" />
          <span className="truncate">🌱 Per-Type Organic Delivery Preview</span>
        </CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Each type has its own organic settings
        </p>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
          <Badge className="flex items-center gap-1 bg-foreground text-background font-bold text-xs">
            <Zap className="h-3 w-3" />
            {stats?.totalEngagements.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 border-border text-foreground text-xs">
            <Timer className="h-3 w-3" />
            {stats?.totalRuns} runs
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 border-border text-foreground text-xs">
            <Clock className="h-3 w-3" />
            ~{formatDuration(stats?.totalDuration || 0)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {/* Per-type breakdown - Compact on mobile */}
        <div className="grid grid-cols-5 gap-1 sm:gap-2 mb-4">
          {perTypeStats.map(stat => {
            const config = ENGAGEMENT_CONFIG[stat.type];
            return (
              <div 
                key={stat.type}
                className="bg-secondary rounded-lg p-1.5 sm:p-2 text-center border border-border"
              >
                <span className="text-sm sm:text-lg">{config?.emoji}</span>
                <p className="text-[10px] sm:text-xs font-bold text-foreground">{stat.runs}</p>
                <p className="text-[8px] sm:text-[10px] text-muted-foreground hidden sm:block">
                  {stat.timeLimitHours > 0 ? `${stat.timeLimitHours}h` : 'Auto'}
                </p>
              </div>
            );
          })}
        </div>

        {/* Settings summary per type - hidden on mobile */}
        <div className="mb-4 p-3 bg-secondary rounded-lg border border-border hidden sm:block">
          <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Per-Type Settings
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {perTypeStats.map(stat => {
              const config = ENGAGEMENT_CONFIG[stat.type];
              return (
                <div key={stat.type} className="text-xs flex items-center gap-2">
                  <span>{config?.emoji}</span>
                  <span className="font-bold text-foreground">{config?.label}:</span>
                  <span className="text-muted-foreground">
                    {stat.timeLimitHours > 0 ? `${stat.timeLimitHours}h` : 'Auto'} 
                    {' · '}±{stat.variancePercent}%
                    {stat.peakHoursEnabled && ' · 🔥'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Collapsible Timeline */}
        <Collapsible open={isTimelineOpen} onOpenChange={setIsTimelineOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full h-9 sm:h-10 text-xs gap-1.5 sm:gap-2 border-border hover:bg-muted font-bold text-foreground mb-2"
            >
              {isTimelineOpen ? <ChevronUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
              {isTimelineOpen ? 'Hide' : 'View'} Schedule ({timeline.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="h-[300px] sm:h-[400px]">
              <div className="relative pr-2 sm:pr-4">
                {/* Timeline line */}
                <div className="absolute left-[18px] sm:left-[30px] top-0 bottom-0 w-0.5 bg-border" />
                
                <div className="space-y-1.5 sm:space-y-2">
                  {timeline.map((event, index) => {
                    const config = ENGAGEMENT_CONFIG[event.type];
                    const isEditing = editingId === event.id;
                    const cumulativeTotal = getCumulativeTotal(event.id, event.type);
                    
                    return (
                      <div
                        key={event.id}
                        className="flex items-start gap-2 sm:gap-3 pl-1 sm:pl-2 relative"
                      >
                        {/* Timeline dot */}
                        <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 bg-background border-foreground z-10 flex-shrink-0 mt-1.5 sm:mt-1" />
                        
                        <div className="flex-1 flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg bg-secondary border border-border hover:bg-muted transition-colors min-w-0">
                          <div className="text-[10px] sm:text-xs font-mono text-muted-foreground shrink-0">
                            {format(event.time, 'HH:mm')}
                          </div>
                          
                          {isEditing ? (
                            <div className="flex items-center gap-1 w-full sm:w-auto">
                              <Input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                                className="w-16 sm:w-20 h-6 sm:h-7 text-xs font-mono bg-background border-border"
                                autoFocus
                              />
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                                onClick={handleSave}
                              >
                                <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-foreground" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                                onClick={handleCancel}
                              >
                                <X className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Badge className="font-mono text-[10px] sm:text-xs bg-foreground text-background font-bold px-1.5 sm:px-2">
                                {config?.emoji} +{event.quantity.toLocaleString()}
                              </Badge>
                              <Badge variant="outline" className="text-[9px] sm:text-[10px] border-border text-foreground font-mono px-1 sm:px-2">
                                ={cumulativeTotal.toLocaleString()}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 sm:h-7 px-1.5 sm:px-2 ml-auto text-muted-foreground hover:text-foreground"
                                onClick={() => handleEdit(event)}
                              >
                                <Pencil className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
