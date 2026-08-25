import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts";
import { format } from "date-fns";
import { Activity, TrendingUp, Clock, CheckCircle2, Zap, Timer, Loader2, BarChart3 } from "lucide-react";

interface Run {
  id: string;
  run_number: number;
  scheduled_at: string;
  quantity_to_send: number;
  status: string;
  started_at?: string;
  completed_at?: string;
  provider_remains?: number;
}

interface SingleOrderProgressChartProps {
  runs: Run[];
  serviceName?: string;
  serviceCategory?: string;
  totalQuantity: number;
}

// Extract engagement type from service category
const getEngagementTypeLabel = (category: string | undefined, fallbackName?: string): string => {
  if (!category) return fallbackName || 'items';
  const lower = category.toLowerCase();
  
  if (lower.includes('comment')) return 'comments';
  if (lower.includes('like')) return 'likes';
  if (lower.includes('view')) return 'views';
  if (lower.includes('save')) return 'saves';
  if (lower.includes('share')) return 'shares';
  if (lower.includes('repost')) return 'reposts';
  if (lower.includes('follower')) return 'followers';
  if (lower.includes('subscriber')) return 'subscribers';
  if (lower.includes('watch')) return 'watch hours';
  if (lower.includes('retweet')) return 'retweets';
  
  return fallbackName || 'items';
};

export function SingleOrderProgressChart({ runs, serviceName = "Views", serviceCategory, totalQuantity }: SingleOrderProgressChartProps) {
  const displayLabel = getEngagementTypeLabel(serviceCategory, serviceName);
  const { chartData, stats } = useMemo(() => {
    if (!runs || runs.length === 0) {
      return { chartData: [], stats: null };
    }

    // Filter only runs that have ACTUAL delivery (completed or started with some delivery)
    const deliveredRuns = runs.filter(run => {
      if (run.status === 'completed') return true;
      if ((run.status === 'started' || run.status === 'failed') && 
          run.provider_remains !== null && run.provider_remains !== undefined) {
        return run.quantity_to_send - run.provider_remains > 0;
      }
      return false;
    });

    // Sort by completed_at or scheduled_at (actual delivery time)
    const sortedRuns = [...deliveredRuns].sort((a, b) => {
      const timeA = new Date(a.completed_at || a.started_at || a.scheduled_at).getTime();
      const timeB = new Date(b.completed_at || b.started_at || b.scheduled_at).getTime();
      return timeA - timeB;
    });

    // Calculate stats even if no delivered runs yet
    const totalScheduled = runs.reduce((sum, r) => sum + r.quantity_to_send, 0);
    const totalDelivered = runs
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + r.quantity_to_send, 0);
    const inProgressDelivered = runs
      .filter(r => r.status === 'started' && r.provider_remains !== null && r.provider_remains !== undefined)
      .reduce((sum, r) => Math.max(0, r.quantity_to_send - (r.provider_remains || 0)), 0);
    const completedRuns = runs.filter(r => r.status === 'completed').length;
    const pendingRuns = runs.filter(r => r.status === 'pending').length;
    const startedRuns = runs.filter(r => r.status === 'started').length;

    const statsData = { 
      totalScheduled: Math.max(totalScheduled, totalQuantity), 
      totalDelivered: totalDelivered + inProgressDelivered, 
      completedRuns, 
      pendingRuns, 
      startedRuns, 
      totalRuns: runs.length 
    };

    if (sortedRuns.length === 0) {
      return { chartData: [], stats: statsData };
    }

    // Build chart data - ONLY actual delivered quantities
    let cumulative = 0;
    const chartData: Record<string, any>[] = [];

    // Add starting point at 0
    const firstRunTime = new Date(sortedRuns[0].completed_at || sortedRuns[0].started_at || sortedRuns[0].scheduled_at);
    chartData.push({
      time: format(new Date(firstRunTime.getTime() - 60000), 'HH:mm'),
      timestamp: firstRunTime.getTime() - 60000,
      displayTime: format(new Date(firstRunTime.getTime() - 60000), 'MMM d, HH:mm'),
      delivered: 0,
      runNumber: 0,
    });

    // Add each delivered run
    sortedRuns.forEach((run) => {
      const runTime = new Date(run.completed_at || run.started_at || run.scheduled_at);
      
      // Calculate ACTUAL delivered quantity
      let deliveredQty = 0;
      if (run.status === 'completed') {
        deliveredQty = run.quantity_to_send;
      } else if ((run.status === 'started' || run.status === 'failed') && 
                 run.provider_remains !== null && run.provider_remains !== undefined) {
        deliveredQty = Math.max(0, run.quantity_to_send - run.provider_remains);
      }

      cumulative += deliveredQty;

      chartData.push({
        time: format(runTime, 'HH:mm'),
        timestamp: runTime.getTime(),
        displayTime: format(runTime, 'MMM d, HH:mm'),
        delivered: cumulative,
        runNumber: run.run_number,
        deliveredQty,
      });
    });

    // If we have data points and there's time progression, extend to show current time
    if (chartData.length > 1) {
      const lastPoint = chartData[chartData.length - 1];
      const now = Date.now();
      if (now > lastPoint.timestamp + 60000) {
        chartData.push({
          time: format(now, 'HH:mm'),
          timestamp: now,
          displayTime: format(now, 'MMM d, HH:mm'),
          delivered: cumulative, // Keep same value to show flat line
          runNumber: 0,
        });
      }
    }

    return { chartData, stats: statsData };
  }, [runs, totalQuantity]);

  // Calculate progress percentage
  const progressPercent = stats ? Math.round((stats.totalDelivered / stats.totalScheduled) * 100) : 0;
  const isActive = stats && (stats.pendingRuns > 0 || stats.startedRuns > 0);

  return (
    <Card className="border-2 border-border bg-gradient-to-br from-background to-secondary/20 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-foreground">Delivery Progress Chart</span>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                Real-time • Updates with run edits
              </p>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-lg border-primary text-primary">
            {progressPercent}% Complete
          </Badge>
        </CardTitle>

        {/* Stats Row */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge className="bg-primary text-primary-foreground font-bold gap-1">
            <TrendingUp className="h-3 w-3" />
            {stats?.totalDelivered.toLocaleString()} / {stats?.totalScheduled.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="border-border text-foreground gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {stats?.completedRuns} / {stats?.totalRuns} runs
          </Badge>
          <Badge variant="outline" className="border-border text-foreground gap-1">
            <Clock className="h-3 w-3" />
            {stats?.pendingRuns} pending
          </Badge>
        </div>

        {/* Service breakdown with color indicator */}
        <div className="flex flex-wrap gap-2 mt-3">
          <div 
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/50 border border-border"
          >
            <div className="w-2 h-2 rounded-full bg-primary" />
            <BarChart3 className="h-3 w-3 text-primary" />
            <span className="text-xs font-bold text-foreground">
              {stats?.totalDelivered.toLocaleString()}/{stats?.totalScheduled.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground">({progressPercent}%)</span>
          </div>
          
          {/* Active indicator */}
          {isActive && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-warning/10 border border-warning/30">
              <Loader2 className="h-3 w-3 animate-spin text-warning" />
              <span className="text-xs text-warning font-medium">
                Live tracking...
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-6">
        {chartData.length > 1 ? (
          <>
            {/* Chart */}
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="singleDeliveryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}K` : value}
                  />
                  
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const dataPoint = payload[0]?.payload;
                        return (
                          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
                            <p className="text-xs text-muted-foreground mb-2 font-mono">
                              {dataPoint?.displayTime}
                            </p>
                            {dataPoint?.runNumber > 0 && (
                              <p className="text-xs text-muted-foreground mb-1">
                                Run #{dataPoint.runNumber}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                              <span className="font-bold text-primary">
                                {(payload[0].value as number).toLocaleString()} delivered
                              </span>
                            </div>
                            {dataPoint?.deliveredQty > 0 && (
                              <p className="text-xs text-success mt-1">
                                +{dataPoint.deliveredQty.toLocaleString()} this run
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  
                  <Line
                    type="monotone"
                    dataKey="delivered"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground capitalize">{displayLabel}</span>
              </div>
              {stats && stats.startedRuns > 0 && (
                <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border">
                  <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                  <span className="text-xs text-muted-foreground">{stats.startedRuns} in progress</span>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty state - no delivered runs yet */
          <div className="h-[280px] w-full flex flex-col items-center justify-center text-center border border-dashed border-border rounded-xl">
            {isActive ? (
              <>
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                <p className="text-sm font-medium text-foreground">Waiting for first delivery...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Chart will appear when runs start completing
                </p>
              </>
            ) : (
              <>
                <Timer className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">No deliveries yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.pendingRuns || 0} runs scheduled
                </p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
