import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useServerFn } from '@tanstack/react-start';
import { schedulerStatusFn, executeDueRunsFn, syncRunStatusFn } from '@/lib/engagement.functions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Activity,
  Zap,
  Timer,
  Play,
  TrendingUp,
  ArrowLeft,
} from 'lucide-react';
import { Link, Navigate } from "@/lib/router-compat";
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface CronJob {
  id: number;
  name: string;
  schedule: string;
  frequency: string;
  active: boolean;
}

interface CronRun {
  id: number;
  jobId: number;
  jobName: string;
  status: string;
  message: string;
  startTime: string;
  endTime: string;
  duration: number | null;
}

interface CronStats {
  totalRuns: number;
  successCount: number;
  failedCount: number;
  successRate: number;
}

interface CronStatusResponse {
  jobs: CronJob[];
  recentRuns: CronRun[];
  stats: CronStats;
  note?: string;
}

export default function AdminCronMonitor() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [countdown, setCountdown] = useState(30);
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const fetchStatus = useServerFn(schedulerStatusFn);
  const executeRuns = useServerFn(executeDueRunsFn);
  const syncStatus = useServerFn(syncRunStatusFn);

  // Fetch cron status
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['cron-status'],
    queryFn: async (): Promise<CronStatusResponse> => {
      return (await fetchStatus()) as unknown as CronStatusResponse;
    },
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset countdown on refetch
  useEffect(() => {
    if (!isFetching) {
      setCountdown(30);
    }
  }, [isFetching]);

  // Manual trigger function
  const triggerJob = async (jobName: string) => {
    setTriggeringJob(jobName);
    try {
      if (jobName.includes('execute-all')) {
        await executeRuns({ data: { limit: 50 } });
      } else {
        await syncStatus({ data: {} });
      }
      
      toast.success(`${jobName} triggered successfully!`);
      setTimeout(() => refetch(), 2000);
    } catch (error: any) {
      toast.error(`Failed to trigger: ${error.message}`);
    } finally {
      setTriggeringJob(null);
    }
  };

  // INSTANT RENDER - No blocking loader

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const getStatusBadge = (status: string) => {
    if (status === 'succeeded') {
      return (
        <Badge className="bg-success/20 text-success border-success/30 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          SUCCESS
        </Badge>
      );
    }
    if (status === 'failed') {
      return (
        <Badge className="bg-destructive/20 text-destructive border-destructive/30 gap-1">
          <XCircle className="h-3 w-3" />
          FAILED
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 px-2 sm:px-4 lg:px-6 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Cron Job Monitor</h1>
                <p className="text-sm text-muted-foreground">
                  Real-time execution status
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Timer className="h-4 w-4" />
              <span>Refresh in {countdown}s</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-xl gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Job Cards */}
          {data?.jobs.map((job) => (
            <Card key={job.id} className="glass-card relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-3 h-3 rounded-full ${job.active ? 'bg-success animate-pulse' : 'bg-muted'}`} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => triggerJob(job.name)}
                    disabled={triggeringJob === job.name}
                  >
                    {triggeringJob === job.name ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <h3 className="font-semibold text-sm truncate mb-1">
                  {job.name.replace('-cron', '')}
                </h3>
                <p className="text-xs text-muted-foreground mb-2">{job.frequency}</p>
                <Badge variant={job.active ? 'default' : 'secondary'} className="text-xs">
                  {job.active ? 'Active' : 'Inactive'}
                </Badge>
              </CardContent>
            </Card>
          ))}

          {/* Success Rate Card */}
          <Card className="glass-card relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <Zap className="h-4 w-4 text-success" />
              </div>
              <p className="text-3xl font-bold text-success">
                {data?.stats.successRate || 100}%
              </p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </CardContent>
          </Card>

          {/* Total Runs Card */}
          <Card className="glass-card relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold">{data?.stats.totalRuns || 0}</p>
              <p className="text-xs text-muted-foreground">Recent Executions</p>
            </CardContent>
          </Card>
        </div>

        {/* Note if using cached data */}
        {data?.note && (
          <Card className="glass-card border-warning/30 bg-warning/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
                <Activity className="h-4 w-4 text-warning" />
              </div>
              <p className="text-sm text-warning">{data.note}</p>
            </CardContent>
          </Card>
        )}

        {/* Recent Executions Table */}
        <Card className="glass-card">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Recent Executions</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Last 50 cron job runs
                  </p>
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  {data?.stats.successCount || 0} Success
                </Badge>
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                  {data?.stats.failedCount || 0} Failed
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : data?.recentRuns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mb-4 opacity-50" />
                <p>No execution history available</p>
                <p className="text-xs mt-1">Runs will appear here once cron jobs execute</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[200px]">Job Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.recentRuns.map((run) => (
                      <TableRow key={run.id} className="group">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              run.status === 'succeeded' ? 'bg-success' : 
                              run.status === 'failed' ? 'bg-destructive' : 'bg-muted'
                            }`} />
                            {run.jobName}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(run.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {run.duration ? `${run.duration}ms` : '-'}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {run.startTime 
                            ? formatDistanceToNow(new Date(run.startTime), { addSuffix: true })
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
