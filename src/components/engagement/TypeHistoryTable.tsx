import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Eye, Heart, MessageCircle, Bookmark, Share2,
  Clock, Play, CheckCircle2, XCircle, Pencil
} from "lucide-react";

const ENGAGEMENT_CONFIG: Record<string, { icon: typeof Eye; color: string; bg: string; border: string; label: string; emoji: string }> = {
  views: { icon: Eye, color: "text-blue-500", bg: "bg-blue-100", border: "border-blue-500", label: "Views", emoji: "👁️" },
  likes: { icon: Heart, color: "text-red-500", bg: "bg-red-100", border: "border-red-500", label: "Likes", emoji: "❤️" },
  comments: { icon: MessageCircle, color: "text-green-500", bg: "bg-green-100", border: "border-green-500", label: "Comments", emoji: "💬" },
  saves: { icon: Bookmark, color: "text-amber-500", bg: "bg-amber-100", border: "border-amber-500", label: "Saves", emoji: "📥" },
  shares: { icon: Share2, color: "text-purple-500", bg: "bg-purple-100", border: "border-purple-500", label: "Shares", emoji: "🔄" },
  reposts: { icon: Share2, color: "text-indigo-500", bg: "bg-indigo-100", border: "border-indigo-500", label: "Reposts", emoji: "🔁" },
};

const STATUS_CONFIG = {
  pending: { icon: Clock, color: "bg-amber-100 text-amber-700 border-amber-300", symbol: "⏳" },
  started: { icon: Play, color: "bg-blue-100 text-blue-700 border-blue-300", symbol: "🔵" },
  completed: { icon: CheckCircle2, color: "bg-green-100 text-green-700 border-green-300", symbol: "✅" },
  failed: { icon: XCircle, color: "bg-red-100 text-red-700 border-red-300", symbol: "🔴" },
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
  error_message?: string;
}

interface TypeHistoryTableProps {
  engagementType: string;
  targetQuantity: number;
  deliveredQuantity: number;
  runs: Run[];
  onEditRun: (run: Run) => void;
}

export function TypeHistoryTable({
  engagementType,
  targetQuantity,
  deliveredQuantity,
  runs,
  onEditRun,
}: TypeHistoryTableProps) {
  // Dynamic fallback for unknown engagement types
  const config = ENGAGEMENT_CONFIG[engagementType] || {
    icon: Eye,
    color: "text-gray-500",
    bg: "bg-gray-100",
    border: "border-gray-500",
    label: engagementType?.charAt(0).toUpperCase() + engagementType?.slice(1) || "Items",
    emoji: "📦"
  };
  const Icon = config.icon;
  const remaining = targetQuantity - deliveredQuantity;
  const progress = targetQuantity > 0 ? (deliveredQuantity / targetQuantity) * 100 : 0;
  
  const sortedRuns = [...runs].sort((a, b) => a.run_number - b.run_number);
  const completedRuns = runs.filter(r => r.status === 'completed');
  const pendingRuns = runs.filter(r => r.status === 'pending');
  const startedRuns = runs.filter(r => r.status === 'started');

  return (
    <div className="space-y-4">
      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className={`p-4 rounded-xl ${config?.bg} border ${config?.border}`}>
          <p className="text-xs text-muted-foreground uppercase">Target</p>
          <p className="text-2xl font-bold">{targetQuantity.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200">
          <p className="text-xs text-muted-foreground uppercase">Delivered</p>
          <p className="text-2xl font-bold text-green-600">{deliveredQuantity.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200">
          <p className="text-xs text-muted-foreground uppercase">Remaining</p>
          <p className="text-2xl font-bold text-amber-600">{remaining.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-xl bg-muted border">
          <p className="text-xs text-muted-foreground uppercase">Completed</p>
          <p className="text-2xl font-bold">{completedRuns.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-muted border">
          <p className="text-xs text-muted-foreground uppercase">Active</p>
          <p className="text-2xl font-bold text-blue-600">{startedRuns.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-muted border">
          <p className="text-xs text-muted-foreground uppercase">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{pendingRuns.length}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${config?.color}`} />
            <span className="font-medium">{config?.label} Progress</span>
          </span>
          <span className="font-medium">{progress.toFixed(1)}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Full Run Table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="bg-muted/50 p-3 border-b">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase">
            <div className="col-span-1">#</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2">Quantity</div>
            <div className="col-span-1">Var</div>
            <div className="col-span-2">Scheduled</div>
            <div className="col-span-1">Started</div>
            <div className="col-span-1">Done</div>
            <div className="col-span-1">Peak</div>
            <div className="col-span-1">Provider</div>
            <div className="col-span-1"></div>
          </div>
        </div>
        <ScrollArea className="h-[400px]">
          <div className="divide-y">
            {sortedRuns.map((run) => {
              const statusConfig = STATUS_CONFIG[run.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;
              const isPending = run.status === 'pending';
              const isActive = run.status === 'started';
              const scheduledDate = new Date(run.scheduled_at);
              const isPast = scheduledDate < new Date() && isPending;

              return (
                <div
                  key={run.id}
                  className={`grid grid-cols-12 gap-2 p-3 text-sm items-center transition-colors ${
                    isActive ? 'bg-blue-50/80 dark:bg-blue-950/20' :
                    isPending ? 'hover:bg-muted/50 cursor-pointer' : ''
                  }`}
                  onClick={() => isPending && onEditRun(run)}
                >
                  {/* Run Number */}
                  <div className="col-span-1">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                      run.status === 'completed' ? 'bg-green-100 text-green-700 border-2 border-green-300' :
                      run.status === 'started' ? 'bg-blue-100 text-blue-700 border-2 border-blue-300 animate-pulse' :
                      run.status === 'failed' ? 'bg-red-100 text-red-700 border-2 border-red-300' :
                      'bg-muted text-muted-foreground border-2 border-border'
                    }`}>
                      {run.run_number}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="col-span-1">
                    <span className="text-lg">{statusConfig.symbol}</span>
                  </div>

                  {/* Quantity */}
                  <div className="col-span-2">
                    <span className="font-mono font-bold">+{run.quantity_to_send.toLocaleString()}</span>
                  </div>

                  {/* Variance */}
                  <div className="col-span-1">
                    {run.variance_applied !== undefined && run.variance_applied !== 0 ? (
                      <Badge variant="secondary" className={`text-xs ${
                        run.variance_applied > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {run.variance_applied > 0 ? '+' : ''}{run.variance_applied}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>

                  {/* Scheduled */}
                  <div className="col-span-2">
                    <p className="font-medium">{format(scheduledDate, 'HH:mm')}</p>
                    <p className={`text-xs ${isPast ? 'text-orange-500 font-medium' : 'text-muted-foreground'}`}>
                      {format(scheduledDate, 'MMM d')}
                    </p>
                  </div>

                  {/* Started */}
                  <div className="col-span-1 text-xs">
                    {run.started_at ? (
                      <span className="text-blue-600">{format(new Date(run.started_at), 'HH:mm')}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>

                  {/* Completed */}
                  <div className="col-span-1 text-xs">
                    {run.completed_at ? (
                      <span className="text-green-600">{format(new Date(run.completed_at), 'HH:mm')}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>

                  {/* Peak */}
                  <div className="col-span-1">
                    {run.peak_multiplier && run.peak_multiplier > 1.3 ? (
                      <span className="text-orange-600 text-xs">🔥 {run.peak_multiplier.toFixed(1)}x</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">1.0x</span>
                    )}
                  </div>

                  {/* Provider */}
                  <div className="col-span-1">
                    {run.provider_order_id ? (
                      <span className="font-mono text-[10px] text-muted-foreground">{run.provider_order_id.slice(0, 6)}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>

                  {/* Edit */}
                  <div className="col-span-1 flex justify-end">
                    {isPending && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditRun(run);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
