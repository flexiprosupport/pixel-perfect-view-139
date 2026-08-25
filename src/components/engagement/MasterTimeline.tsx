import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  EngagementType, 
  EngagementConfig, 
  ENGAGEMENT_CONFIG,
  DEFAULT_ORGANIC_SETTINGS
} from "@/lib/engagement-types";
import { 
  generateOrganicSchedule,
  PROVIDER_MINIMUMS,
  OrganicRunConfig
} from "@/lib/organic-algorithm";
import { 
  Eye, Heart, MessageCircle, Bookmark, Share2, 
  Clock, ChevronDown, ChevronUp, Layers, Flame, Calendar
} from "lucide-react";
import { format } from "date-fns";

interface MasterTimelineProps {
  engagements: Record<EngagementType, EngagementConfig>;
}

interface CombinedRun {
  type: EngagementType;
  run: OrganicRunConfig;
  scheduledAt: Date;
}

const iconMap: Record<string, any> = {
  Eye,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
};

const typeColors: Record<EngagementType, string> = {
  views: 'bg-foreground',
  likes: 'bg-foreground/90',
  comments: 'bg-foreground/80',
  saves: 'bg-foreground/70',
  shares: 'bg-foreground/60',
  followers: 'bg-foreground/55',
  subscribers: 'bg-foreground/50',
  watch_hours: 'bg-foreground/45',
  retweets: 'bg-foreground/40',
  reposts: 'bg-foreground/35',
};

export function MasterTimeline({ engagements }: MasterTimelineProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Generate combined timeline from all enabled engagement types
  const combinedRuns = useMemo(() => {
    const allRuns: CombinedRun[] = [];
    
    Object.entries(engagements).forEach(([type, config]) => {
      if (!config.enabled || config.quantity < (PROVIDER_MINIMUMS[type] || 10)) return;
      
      const timeLimitHours = config.timeLimitHours ?? DEFAULT_ORGANIC_SETTINGS.timeLimitHours;
      const variancePercent = config.variancePercent ?? DEFAULT_ORGANIC_SETTINGS.variancePercent;
      const peakHoursEnabled = config.peakHoursEnabled ?? DEFAULT_ORGANIC_SETTINGS.peakHoursEnabled;
      const providerMin = PROVIDER_MINIMUMS[type] || 10;
      
      const schedule = generateOrganicSchedule(
        type,
        config.quantity,
        variancePercent,
        peakHoursEnabled,
        new Date(),
        providerMin,
        timeLimitHours > 0 ? timeLimitHours : undefined
      );
      
      schedule.runs.forEach(run => {
        allRuns.push({
          type: type as EngagementType,
          run,
          scheduledAt: run.scheduledAt,
        });
      });
    });
    
    // Sort by scheduled time
    return allRuns.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }, [engagements]);

  // Track per-type run numbers for display
  const runsWithTypeIndex = useMemo(() => {
    const typeCounters: Record<string, number> = {};
    return combinedRuns.map(item => {
      typeCounters[item.type] = (typeCounters[item.type] || 0) + 1;
      return {
        ...item,
        typeRunNumber: typeCounters[item.type],
      };
    });
  }, [combinedRuns]);

  if (combinedRuns.length === 0) return null;

  // Calculate stats
  const totalRuns = combinedRuns.length;
  const firstRun = combinedRuns[0];
  const lastRun = combinedRuns[combinedRuns.length - 1];
  const totalDuration = lastRun.scheduledAt.getTime() - firstRun.scheduledAt.getTime();
  const avgInterval = totalRuns > 1 ? Math.round(totalDuration / (totalRuns - 1) / 60000) : 0;

  // Group runs by type for summary
  const typeCounts = combinedRuns.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="glass-card border-2 border-primary/30 overflow-hidden">
      <CardContent className="p-0">
        {/* Header Stats */}
        <div className="p-5 bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Master Schedule</h3>
              <p className="text-xs text-muted-foreground">Combined timeline for all engagement types</p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
            <div className="bg-background/50 rounded-xl p-2 sm:p-3 text-center">
              <p className="text-xl sm:text-2xl font-bold text-primary">{totalRuns}</p>
              <p className="text-[10px] text-muted-foreground">total runs</p>
            </div>
            <div className="bg-background/50 rounded-xl p-2 sm:p-3 text-center">
              <p className="text-xl sm:text-2xl font-bold text-primary">
                {avgInterval >= 60 
                  ? `~${Math.floor(avgInterval / 60)}h ${avgInterval % 60}m`
                  : `~${avgInterval}m`
                }
              </p>
              <p className="text-[10px] text-muted-foreground">avg interval</p>
            </div>
            <div className="bg-background/50 rounded-xl p-2 sm:p-3 text-center">
              <p className="text-base sm:text-lg font-bold text-primary">{format(firstRun.scheduledAt, 'h:mm a')}</p>
              <p className="text-[10px] text-muted-foreground">starts</p>
            </div>
            <div className="bg-background/50 rounded-xl p-2 sm:p-3 text-center">
              <p className="text-xs sm:text-sm font-bold text-primary">{format(lastRun.scheduledAt, 'MMM d')}</p>
              <p className="text-xs font-semibold text-primary">{format(lastRun.scheduledAt, 'h:mm a')}</p>
              <p className="text-[10px] text-muted-foreground">finish</p>
            </div>
          </div>

          {/* Type Breakdown Chips */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(typeCounts).map(([type, count]) => {
              const config = ENGAGEMENT_CONFIG[type as EngagementType];
              return (
                <Badge 
                  key={type} 
                  variant="secondary" 
                  className="gap-1.5 px-2.5 py-1"
                >
                  <span className={`w-2 h-2 rounded-full ${typeColors[type as EngagementType]}`} />
                  <span className="capitalize">{type}</span>
                  <span className="font-bold">{count}</span>
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Collapsible Full Timeline */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full h-12 rounded-none border-t border-primary/10 text-sm gap-2 hover:bg-primary/5"
            >
              <Calendar className="h-4 w-4" />
              View Complete Timeline ({totalRuns} runs)
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="max-h-96 overflow-y-auto">
              <div className="p-4 space-y-2">
                {runsWithTypeIndex.map((item, idx) => {
                  const config = ENGAGEMENT_CONFIG[item.type];
                  const Icon = iconMap[config?.icon] || Eye;
                  
                  return (
                    <div 
                      key={idx}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-muted/50 text-sm"
                    >
                      {/* Global Run Number */}
                      <span className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-xs font-bold text-muted-foreground">
                        #{idx + 1}
                      </span>
                      
                      {/* Type Icon with Color */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeColors[item.type]} bg-opacity-20`}>
                        <Icon className={`h-4 w-4 ${config?.color || 'text-primary'}`} />
                      </div>
                      
                      {/* Time and Type Label */}
                      <div className="flex-1">
                        <p className="font-medium">{format(item.scheduledAt, 'MMM d, h:mm a')}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className={`font-semibold ${config?.color || 'text-primary'}`}>
                            {config?.label || item.type} #{item.typeRunNumber}
                          </span>
                        </p>
                      </div>
                      
                      {/* Quantity */}
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary text-lg">
                          +{item.run.quantity.toLocaleString()}
                        </span>
                        {item.run.peakMultiplier > 1 && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                            <Flame className="h-2.5 w-2.5 mr-0.5 text-orange-500" />
                            Peak
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}