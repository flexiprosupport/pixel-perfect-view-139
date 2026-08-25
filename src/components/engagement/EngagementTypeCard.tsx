import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  EngagementType,
  EngagementConfig,
  ENGAGEMENT_CONFIG,
  DEFAULT_ORGANIC_SETTINGS
} from "@/lib/engagement-types";
import {
  generateOrganicSchedule,
  formatDuration,
  PROVIDER_MINIMUMS,
  PROVIDER_MAXIMUMS,
  OrganicRunConfig,
} from "@/lib/organic-algorithm";
import { ControlPoint, curveToSchedule } from "@/lib/curve-to-schedule";
import {
  Eye, Heart, MessageCircle, Bookmark, Share2,
  Clock, Sparkles, AlertTriangle,
  Timer, Shuffle, Flame, Calendar, ChevronDown, ChevronUp, List, Pencil,
  UserPlus, Bell, Repeat, RefreshCw
} from "lucide-react";
import { format } from "date-fns";

interface EngagementTypeCardProps {
  type: EngagementType;
  config: EngagementConfig;
  baseQuantity: number;
  onChange: (config: EngagementConfig) => void;
  minQuantity?: number;
  customCurvePoints?: ControlPoint[];
  pricePerK?: number; // Price per 1000 units for accurate price recalculation
  // EXACT schedule (from DeliveryPreview / saved to backend on submit).
  // When provided, the in-card Schedule Preview mirrors it byte-for-byte,
  // so the user sees the same runs/quantity/timing they'll get post-order.
  previewSchedule?: { scheduled_at: string; quantity_to_send: number }[];
}

// All icons from ENGAGEMENT_CONFIG
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Eye,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  UserPlus,
  Bell,
  Repeat,
  RefreshCw,
  Clock,
};

const TIME_PRESETS = [
  { value: 0, label: 'Auto' },
  { value: 6, label: '6h' },
  { value: 12, label: '12h' },
  { value: 24, label: '24h' },
  { value: 48, label: '48h' },
  { value: -1, label: 'Custom' },
];

export function EngagementTypeCard({
  type,
  config,
  baseQuantity,
  onChange,
  minQuantity,
  customCurvePoints,
  pricePerK = 0,
  previewSchedule,
}: EngagementTypeCardProps) {
  const { formatPrice } = useCurrency();
  const [customHoursInput, setCustomHoursInput] = useState('24');
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [editingRunIndex, setEditingRunIndex] = useState<number | null>(null);
  const [customRunQuantities, setCustomRunQuantities] = useState<Record<number, number>>({});
  const [customRunsInput, setCustomRunsInput] = useState<string>(
    config.runCount ? String(config.runCount) : ''
  );

  // Local quantity input state for smooth typing
  const [localQtyValue, setLocalQtyValue] = useState(config.quantity.toString());
  const qtyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isQtyTypingRef = useRef(false);

  // Sync from parent when not typing
  useEffect(() => {
    if (!isQtyTypingRef.current) {
      setLocalQtyValue(prev => {
        const newVal = config.quantity.toString();
        return prev === newVal ? prev : newVal;
      });
    }
  }, [config.quantity]);

  // Cleanup
  useEffect(() => {
    return () => { if (qtyTimerRef.current) clearTimeout(qtyTimerRef.current); };
  }, []);

  const engagementConfig = ENGAGEMENT_CONFIG[type];
  const Icon = iconMap[engagementConfig?.icon as keyof typeof iconMap] || Eye;

  // Get provider limits
  const providerMin = minQuantity ?? PROVIDER_MINIMUMS[type] ?? 10;
  const providerMax = PROVIDER_MAXIMUMS[type] || 1000000;

  // Use per-type settings or defaults
  const timeLimitHours = config.timeLimitHours ?? DEFAULT_ORGANIC_SETTINGS.timeLimitHours;
  const isCustomMode = config.timeLimitCustomMode ?? false;
  const variancePercent = config.variancePercent ?? DEFAULT_ORGANIC_SETTINGS.variancePercent;
  const peakHoursEnabled = config.peakHoursEnabled ?? DEFAULT_ORGANIC_SETTINGS.peakHoursEnabled;

  // Calculate full schedule with runs
  const scheduleData = useMemo(() => {
    if (!config.enabled || config.quantity < providerMin) return null;

    // ✅ Single source of truth: when DeliveryPreview has already produced the
    // exact schedule that will be saved on submit, mirror it here so the user
    // never sees a different number of runs / interval / finish time before
    // vs after placing the order.
    if (previewSchedule && previewSchedule.length > 0) {
      const runs: OrganicRunConfig[] = previewSchedule.map((r, idx) => {
        const scheduledAt = new Date(r.scheduled_at);
        return {
          runNumber: idx + 1,
          scheduledAt,
          quantity: r.quantity_to_send,
          baseQuantity: r.quantity_to_send,
          varianceApplied: 0,
          peakMultiplier: 1,
          dayOfWeek: scheduledAt.getDay(),
          hourOfDay: scheduledAt.getHours(),
          sessionType: 'normal',
          humanBehaviorScore: 85,
          patternBreaker: false,
        };
      });
      const totalDuration = runs.length > 1
        ? runs[runs.length - 1].scheduledAt.getTime() - runs[0].scheduledAt.getTime()
        : 0;
      const avgInterval = runs.length > 1 ? Math.round(totalDuration / (runs.length - 1) / 60000) : 0;
      const finishTime = runs.length > 0 ? runs[runs.length - 1].scheduledAt : new Date();
      return { runs, runCount: runs.length, avgInterval, finishTime, duration: totalDuration };
    }

    // For custom mode, use the actual timeLimitHours value (already stored in config)
    // For preset modes, use timeLimitHours directly
    const effectiveTimeLimit = timeLimitHours;
    const durationHoursForCurve = effectiveTimeLimit > 0 ? effectiveTimeLimit : 24;
    const timeLimitArg = effectiveTimeLimit > 0 ? effectiveTimeLimit : undefined;
    const startTime = new Date();

    // If draw-mode provides a curve, let AI generate runs following that shape
    if (customCurvePoints && customCurvePoints.length >= 2) {
      const curveRuns = curveToSchedule(
        customCurvePoints,
        type,
        config.quantity,
        durationHoursForCurve,
        30
      );

      const runs: OrganicRunConfig[] = curveRuns.map((run) => {
        const scheduledAt = new Date(
          startTime.getTime() +
          (run.timePercent / 100) * durationHoursForCurve * 60 * 60 * 1000
        );
        return {
          runNumber: run.runNumber,
          scheduledAt,
          quantity: run.quantity,
          baseQuantity: run.quantity,
          varianceApplied: 0,
          peakMultiplier: 1,
          dayOfWeek: scheduledAt.getDay(),
          hourOfDay: scheduledAt.getHours(),
          sessionType: 'normal',
          humanBehaviorScore: 85,
          patternBreaker: false,
        };
      });

      const totalDuration =
        runs.length > 1
          ? runs[runs.length - 1].scheduledAt.getTime() - runs[0].scheduledAt.getTime()
          : 0;

      const avgInterval = runs.length > 1 ? Math.round(totalDuration / (runs.length - 1) / 60000) : 0;
      const finishTime = runs.length > 0 ? runs[runs.length - 1].scheduledAt : new Date();

      return {
        runs,
        runCount: runs.length,
        avgInterval,
        finishTime,
        duration: totalDuration,
      };
    }

    // Default: use organic schedule generator
    const schedule = generateOrganicSchedule(
      type,
      config.quantity,
      variancePercent,
      peakHoursEnabled,
      startTime,
      providerMin,
      timeLimitArg,
      config.runCount && config.runCount > 0 ? config.runCount : undefined
    );

    const avgInterval =
      schedule.runs.length > 1
        ? Math.round(schedule.totalDuration / (schedule.runs.length - 1) / 60000)
        : 0;

    const finishTime =
      schedule.runs.length > 0 ? schedule.runs[schedule.runs.length - 1].scheduledAt : new Date();

    return {
      runs: schedule.runs,
      runCount: schedule.runs.length,
      avgInterval,
      finishTime,
      duration: schedule.totalDuration,
    };
  }, [
    config.enabled,
    config.quantity,
    timeLimitHours,
    isCustomMode,
    variancePercent,
    peakHoursEnabled,
    type,
    providerMin,
    config.runCount,
    customCurvePoints,
    previewSchedule,
  ]);

  const handleToggle = (enabled: boolean) => {
    if (enabled && config.quantity < providerMin) {
      onChange({
        ...config,
        enabled,
        quantity: providerMin,
        timeLimitHours: config.timeLimitHours ?? DEFAULT_ORGANIC_SETTINGS.timeLimitHours,
        variancePercent: config.variancePercent ?? DEFAULT_ORGANIC_SETTINGS.variancePercent,
        peakHoursEnabled: config.peakHoursEnabled ?? DEFAULT_ORGANIC_SETTINGS.peakHoursEnabled,
      });
    } else {
      onChange({ ...config, enabled });
    }
  };

  const handleQuantityChange = useCallback((value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setLocalQtyValue(cleaned);
    isQtyTypingRef.current = true;

    if (qtyTimerRef.current) clearTimeout(qtyTimerRef.current);

    qtyTimerRef.current = setTimeout(() => {
      const quantity = parseInt(cleaned) || 0;
      const effectivePricePerK = pricePerK > 0
        ? pricePerK
        : (config.quantity > 0 ? (config.price * 1000) / config.quantity : 0);
      const newPrice = effectivePricePerK > 0 ? (quantity / 1000) * effectivePricePerK : 0;
      onChange({ ...config, quantity, price: newPrice });
    }, 500);
  }, [pricePerK, config, onChange]);

  const handleQuantityBlur = useCallback(() => {
    if (qtyTimerRef.current) clearTimeout(qtyTimerRef.current);
    isQtyTypingRef.current = false;
    const quantity = parseInt(localQtyValue) || 0;
    const effectivePricePerK = pricePerK > 0
      ? pricePerK
      : (config.quantity > 0 ? (config.price * 1000) / config.quantity : 0);
    const newPrice = effectivePricePerK > 0 ? (quantity / 1000) * effectivePricePerK : 0;
    setLocalQtyValue(quantity.toString());
    onChange({ ...config, quantity, price: newPrice });
  }, [localQtyValue, pricePerK, config, onChange]);

  const handleTimeLimitChange = (value: number) => {
    // -1 means "Custom" button was clicked - enter custom mode
    if (value === -1) {
      onChange({ ...config, timeLimitCustomMode: true });
    } else {
      // Preset value selected - store actual hours, exit custom mode
      onChange({ ...config, timeLimitHours: value, timeLimitCustomMode: false });
    }
  };

  const handleCustomHoursChange = (hours: number) => {
    // Store actual hours value when user enters custom hours
    onChange({ ...config, timeLimitHours: hours, timeLimitCustomMode: true });
  };

  const handleVarianceChange = (value: number[]) => {
    onChange({ ...config, variancePercent: value[0] });
  };

  const handlePeakHoursChange = (enabled: boolean) => {
    onChange({ ...config, peakHoursEnabled: enabled });
  };

  // Number-of-runs control
  const maxAllowedRuns = Math.max(1, Math.floor((config.quantity || 0) / providerMin));
  const handleRunCountChange = (value: number | undefined) => {
    if (!value || value <= 0) {
      onChange({ ...config, runCount: undefined });
      setCustomRunsInput('');
      return;
    }
    const clamped = Math.max(1, Math.min(value, maxAllowedRuns));
    onChange({ ...config, runCount: clamped });
    setCustomRunsInput(String(clamped));
  };

  // Validation
  const isBelowMin = config.enabled && config.quantity < providerMin;
  const isAboveMax = config.enabled && config.quantity > providerMax;
  const hasError = isBelowMin || isAboveMax;

  return (
    <Card className={cn(
      "three-d-card border-2",
      hasError
        ? "border-white/20"
        : config.enabled
          ? "border-primary/30"
          : "border-white/5 opacity-60"
    )}>
      <CardContent className="p-2 sm:p-3 overflow-hidden">
        {/* Header Row - compact single line */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 min-w-0">
          {/* Left: Icon + Label */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <div className={cn(
              "p-1 sm:p-1.5 rounded-lg sm:rounded-xl shrink-0",
              config.enabled ? "bg-white/10" : "bg-white/5"
            )}>
              <Icon className={cn(
                "h-3.5 w-3.5 sm:h-4 sm:w-4",
                config.enabled ? "text-primary" : "text-white/20"
              )} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                <span className={cn(
                  "text-xs sm:text-sm font-extrabold tracking-tight truncate",
                  engagementConfig.color
                )}>
                  {engagementConfig.emoji} {engagementConfig.label}
                </span>
                {type === 'views' && (
                  <Badge className="text-[8px] sm:text-[9px] bg-primary text-black font-black px-1 sm:px-1.5 py-0 uppercase tracking-wider border-none">
                    Base
                  </Badge>
                )}
              </div>
              {config.enabled && scheduleData && (
                <div className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] text-white/30 mt-0.5 font-black uppercase tracking-wider">
                  <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary shrink-0" />
                  <span>{scheduleData.runCount} runs</span>
                  <span className="opacity-20">•</span>
                  <span>~{formatDuration(scheduleData.duration)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Input + Price + Switch */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {config.enabled && (
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={localQtyValue}
                onChange={(e) => handleQuantityChange(e.target.value)}
                onBlur={handleQuantityBlur}
                className={cn(
                  "w-14 sm:w-20 h-7 sm:h-8 text-xs sm:text-sm text-right bg-secondary border-2 border-border text-foreground font-bold px-1.5",
                  hasError && "border-foreground"
                )}
              />
            )}
            <Badge variant="outline" className="font-black text-[10px] sm:text-xs border-white/10 bg-white/5 text-white/60 px-1.5 sm:px-2 py-0.5 sm:py-1 shrink-0">
              {formatPrice(config.price)}
            </Badge>
            <div className="scale-90 sm:scale-100">
              <Switch
                checked={config.enabled}
                onCheckedChange={handleToggle}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>
        </div>

        {/* Quantity Limits - compact */}
        {config.enabled && (
          <div className="mt-1 text-[10px] text-muted-foreground">
            <span>Min: {providerMin.toLocaleString()} • Max: {providerMax.toLocaleString()}</span>
            {hasError && (
              <span className="ml-2 text-foreground font-bold">
                ⚠ {isBelowMin && `Min ${providerMin}`}{isAboveMax && `Max ${providerMax.toLocaleString()}`}
              </span>
            )}
          </div>
        )}

        {/* Advanced Settings - collapsed behind a small toggle */}
        {config.enabled && !hasError && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="group mt-3 w-full flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors px-3 py-2.5 text-left data-[state=open]:bg-primary/10"
              >
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Timer className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                  </span>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-bold text-foreground leading-tight">
                    Tap to customise delivery
                  </span>
                  <span className="block text-[10.5px] text-muted-foreground leading-snug mt-0.5">
                    Set delivery time, number of runs, variance & peak hours
                  </span>
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary shrink-0">
                  Open
                  <ChevronDown className="h-4 w-4 animate-bounce group-data-[state=open]:rotate-180 group-data-[state=open]:animate-none transition-transform" />
                </span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 pt-2 border-t border-border space-y-3">
                {/* Friendly intro: what is this section */}
                <div className="rounded-lg bg-muted/40 border border-border px-3 py-2">
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    <strong className="text-foreground">How delivery works:</strong> we split your total qty into multiple smaller batches ("runs") and ship them over the selected time window with randomised quantity + timing. More runs + longer time + higher variance = more organic looking.
                  </p>
                </div>
                {/* Time Limit + Number of Runs side-by-side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-[10px] font-bold flex items-center gap-1.5 text-foreground uppercase tracking-widest">
                    <Timer className="h-3 w-3 text-foreground" />
                    Delivery Time
                  </Label>
                  <p className="text-[10px] text-muted-foreground leading-snug -mt-0.5">
                    Total time window over which all runs ship. Longer = safer & more natural.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {TIME_PRESETS.map(preset => {
                      // Determine if this preset is selected
                      let isSelected = false;
                      if (preset.value === -1) {
                        // Custom button is selected when isCustomMode is true
                        isSelected = isCustomMode;
                      } else {
                        // Preset buttons: selected when value matches AND not in custom mode
                        isSelected = timeLimitHours === preset.value && !isCustomMode;
                      }

                      return (
                        <Button
                          key={preset.value}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-6 text-[10px] px-2 font-bold",
                            isSelected
                              ? "bg-foreground text-background"
                              : "bg-secondary text-foreground border border-border hover:bg-muted"
                          )}
                          onClick={() => handleTimeLimitChange(preset.value)}
                        >
                          {preset.label}
                        </Button>
                      );
                    })}
                  </div>
                  {isCustomMode && (
                    <div className="flex items-center gap-2 sm:gap-3 mt-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={customHoursInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomHoursInput(val);
                          // Immediately update config with the value for backend
                          const n = Number(val);
                          if (Number.isFinite(n) && n > 0) {
                            handleCustomHoursChange(n);
                          }
                        }}
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          const n = Number(raw);
                          if (!raw || !Number.isFinite(n)) {
                            setCustomHoursInput('1');
                            handleCustomHoursChange(1);
                            return;
                          }
                          const clamped = Math.min(168, Math.max(1, n));
                          setCustomHoursInput(String(clamped));
                          handleCustomHoursChange(clamped);
                        }}
                        min={1}
                        max={168}
                        step={1}
                        className="w-20 sm:w-24 h-9 sm:h-10 text-sm sm:text-base bg-secondary border-2 border-border text-foreground font-bold"
                      />
                      <span className="text-xs sm:text-sm text-muted-foreground font-medium">hours</span>
                    </div>
                  )}
                </div>

                {/* Number of Runs */}
                <div className="space-y-2 min-w-0">
                  <Label className="text-[10px] font-bold flex flex-wrap items-center justify-between gap-1 text-foreground uppercase tracking-widest">
                    <span className="flex items-center gap-1.5">
                      <List className="h-3 w-3 text-foreground" />
                      Number of Runs
                    </span>
                    <span className="text-[9px] text-muted-foreground normal-case tracking-normal font-medium">
                      Max {maxAllowedRuns.toLocaleString()} · min {providerMin}/run
                    </span>
                  </Label>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    How many small batches to split the order into. More runs = smoother, more human-like delivery.
                  </p>

                  {/* Presets + custom input on one responsive row */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { value: 0, label: 'Auto' },
                      { value: 50, label: '50' },
                      { value: 100, label: '100' },
                      { value: 200, label: '200' },
                    ].map(preset => {
                      const isSelected = preset.value === 0
                        ? !config.runCount
                        : config.runCount === preset.value;
                      const disabled = preset.value > 0 && preset.value > maxAllowedRuns;
                      return (
                        <Button
                          key={preset.value}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          disabled={disabled}
                          className={cn(
                            "h-7 min-w-[42px] px-2.5 text-[11px] font-bold rounded-md",
                            isSelected
                              ? "bg-foreground text-background border-foreground"
                              : "bg-secondary text-foreground border border-border hover:bg-muted",
                            disabled && "opacity-40 cursor-not-allowed"
                          )}
                          onClick={() => handleRunCountChange(preset.value || undefined)}
                        >
                          {preset.label}
                        </Button>
                      );
                    })}

                    <div className="flex items-center gap-1.5 ml-auto">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Custom"
                        value={customRunsInput}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setCustomRunsInput(val);
                          const n = parseInt(val, 10);
                          if (Number.isFinite(n) && n > 0) {
                            handleRunCountChange(n);
                          } else if (val === '') {
                            onChange({ ...config, runCount: undefined });
                          }
                        }}
                        onBlur={() => {
                          const n = parseInt(customRunsInput, 10);
                          if (!Number.isFinite(n) || n <= 0) {
                            setCustomRunsInput('');
                            onChange({ ...config, runCount: undefined });
                            return;
                          }
                          handleRunCountChange(n);
                        }}
                        className="w-20 sm:w-24 h-7 text-xs text-center bg-secondary border-2 border-border text-foreground font-bold px-1.5"
                      />
                    </div>
                  </div>

                  {/* Per-run hint */}
                  {config.runCount && config.runCount > 0 && config.quantity > 0 && (
                    <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-secondary/60 border border-border/60">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        Per run
                      </span>
                      <span className="text-[11px] font-bold text-foreground font-mono">
                        ~{Math.round(config.quantity / config.runCount).toLocaleString()} {engagementConfig?.label.toLowerCase()}
                      </span>
                    </div>
                  )}

                  {customRunsInput && parseInt(customRunsInput, 10) > maxAllowedRuns && (
                    <div className="flex items-start gap-1.5 text-[10px] text-red-500 font-bold p-2 rounded-md bg-red-500/10 border border-red-500/30">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>Max {maxAllowedRuns} runs allowed ({config.quantity.toLocaleString()} ÷ {providerMin})</span>
                    </div>
                  )}
                </div>
                </div>

                {/* Variance Slider */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold flex items-center justify-between text-foreground uppercase tracking-widest">
                    <span className="flex items-center gap-1">
                      <Shuffle className="h-3 w-3 text-foreground" />
                      Random Variance
                    </span>
                    <span className={cn(
                      "font-mono text-sm font-bold px-2 py-0.5 rounded-lg",
                      variancePercent <= 15 ? "text-red-400 bg-red-500/20"
                        : variancePercent <= 25 ? "text-amber-400 bg-amber-500/20"
                          : variancePercent <= 35 ? "text-blue-400 bg-blue-500/20"
                            : "text-green-400 bg-green-400/20"
                    )}>±{variancePercent}%</span>
                  </Label>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    How much each batch quantity randomly differs. Higher % = looks less like a bot pattern.
                  </p>

                  {/* Enhanced Slider */}
                  <div className="py-1 sm:py-2">
                    <Slider
                      value={[variancePercent]}
                      onValueChange={handleVarianceChange}
                      min={10}
                      max={50}
                      step={5}
                      className="w-full"
                      rangeClassName={cn(
                        variancePercent <= 15
                          ? "from-red-600 to-red-500"
                          : variancePercent <= 25
                            ? "from-amber-600 to-amber-500"
                            : variancePercent <= 35
                              ? "from-blue-600 to-blue-500"
                              : "from-green-500 to-green-400"
                      )}
                      thumbClassName={cn(
                        "border-3",
                        variancePercent <= 15
                          ? "border-red-500 shadow-red-500/30"
                          : variancePercent <= 25
                            ? "border-amber-500 shadow-amber-500/30"
                            : variancePercent <= 35
                              ? "border-blue-500 shadow-blue-500/30"
                              : "border-green-400 shadow-green-400/30"
                      )}
                    />
                  </div>

                  {/* Slider Scale */}
                  <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground font-medium px-1">
                    <span>10%</span>
                    <span>25%</span>
                    <span>50%</span>
                  </div>

                  {/* Detection Risk Level Indicator - Compact on mobile */}
                  <div className={cn(
                    "rounded-xl border-2 p-2.5 sm:p-4 mt-2 sm:mt-3 space-y-2 sm:space-y-3 transition-all duration-300",
                    variancePercent <= 15
                      ? "border-red-500/60 bg-red-500/10"
                      : variancePercent <= 25
                        ? "border-amber-500/60 bg-amber-500/10"
                        : variancePercent <= 35
                          ? "border-blue-500/60 bg-blue-500/10"
                          : "border-green-400/60 bg-green-400/10"
                  )}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm font-bold text-foreground">Detection Risk</span>
                      <Badge className={cn(
                        "text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 font-bold border-2",
                        variancePercent <= 15
                          ? "bg-red-500 text-white border-red-400"
                          : variancePercent <= 25
                            ? "bg-amber-500 text-black border-amber-400"
                            : variancePercent <= 35
                              ? "bg-blue-500 text-white border-blue-400"
                              : "bg-green-400 text-black border-green-300"
                      )}>
                        {variancePercent <= 15
                          ? "⚠ High"
                          : variancePercent <= 25
                            ? "⚠ Medium"
                            : variancePercent <= 35
                              ? "✓ Low"
                              : "✓ Safe"}
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-2 sm:h-3 w-full rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          variancePercent <= 15
                            ? "bg-red-500"
                            : variancePercent <= 25
                              ? "bg-amber-500"
                              : variancePercent <= 35
                                ? "bg-blue-500"
                                : "bg-green-400"
                        )}
                        style={{ width: `${Math.min(100, ((variancePercent - 10) / 40) * 100)}%` }}
                      />
                    </div>

                    {/* Description - Hidden on mobile for space */}
                    <p className={cn(
                      "text-xs sm:text-sm font-medium hidden sm:block",
                      variancePercent <= 15
                        ? "text-red-400"
                        : variancePercent <= 25
                          ? "text-amber-400"
                          : variancePercent <= 35
                            ? "text-blue-400"
                            : "text-green-400"
                    )}>
                      {variancePercent <= 15
                        ? "⚠ High bot detection risk - increase variance"
                        : variancePercent <= 25
                          ? "⚠ Moderate risk - consider increasing"
                          : variancePercent <= 35
                            ? "✓ Natural organic pattern"
                            : "✓ 100% undetectable"}
                    </p>
                  </div>

                  {/* Per run range - Compact on mobile */}
                  {scheduleData && scheduleData.runCount > 0 && (
                    <div className="flex items-center justify-between text-xs sm:text-sm bg-secondary rounded-xl px-3 sm:px-4 py-2 sm:py-3 border-2 border-border">
                      <span className="text-muted-foreground font-medium">Per run:</span>
                      <div className="flex items-center gap-1.5 sm:gap-3">
                        <span className="text-foreground/60 font-bold font-mono text-xs sm:text-sm">
                          -{Math.round((config.quantity / scheduleData.runCount) * (variancePercent / 100))}
                        </span>
                        <span className="text-muted-foreground text-xs">to</span>
                        <span className="text-foreground font-bold font-mono text-xs sm:text-sm">
                          +{Math.round((config.quantity / scheduleData.runCount) * (variancePercent / 100))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Peak Hours Toggle - compact */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary border border-border gap-3">
                  <div className="min-w-0">
                    <Label className="text-[10px] font-bold flex items-center gap-1.5 text-foreground uppercase tracking-widest">
                      <Flame className="h-3 w-3 text-foreground shrink-0" />
                      Peak Hours Boost
                    </Label>
                    <p className="text-[9px] text-muted-foreground mt-0.5">More during 6-11 PM IST</p>
                  </div>
                  <Switch checked={peakHoursEnabled} onCheckedChange={handlePeakHoursChange} />
                </div>

                {/* Schedule Preview - Compact on mobile */}
                {scheduleData && (
                  <div className="bg-secondary rounded-xl border-2 border-border overflow-hidden">
                    <div className="p-3 sm:p-5">
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-bold mb-3 sm:mb-4 text-foreground">
                        <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
                        Schedule Preview
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                        <div className="bg-muted rounded-lg sm:rounded-xl p-2 sm:p-4 border border-border">
                          <p className="text-xl sm:text-3xl font-bold text-foreground">{scheduleData.runCount}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-0.5 sm:mt-1">runs</p>
                        </div>
                        <div className="bg-muted rounded-lg sm:rounded-xl p-2 sm:p-4 border border-border">
                          <p className="text-base sm:text-3xl font-bold text-foreground">
                            {scheduleData.avgInterval >= 60
                              ? `~${Math.floor(scheduleData.avgInterval / 60)}h`
                              : `~${scheduleData.avgInterval}m`
                            }
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-0.5 sm:mt-1">interval</p>
                        </div>
                        <div className="bg-muted rounded-lg sm:rounded-xl p-2 sm:p-4 border border-border">
                          <p className="text-sm sm:text-lg font-bold text-foreground">{format(scheduleData.finishTime, 'MMM d')}</p>
                          <p className="text-xs sm:text-base font-bold text-foreground">{format(scheduleData.finishTime, 'h:mm a')}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium hidden sm:block mt-1">finish</p>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Runs Timeline */}
                    <Collapsible open={isTimelineOpen} onOpenChange={setIsTimelineOpen}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full h-9 sm:h-10 rounded-none border-t border-border text-[10px] sm:text-xs gap-1.5 sm:gap-2 hover:bg-muted font-bold text-foreground"
                        >
                          <List className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          View {scheduleData.runCount} Runs
                          {isTimelineOpen ? <ChevronUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="max-h-48 sm:max-h-64 overflow-y-auto">
                          <div className="p-2 sm:p-3 space-y-1 sm:space-y-1.5">
                            {scheduleData.runs.map((run, idx) => {
                              // Calculate cumulative total up to this run
                              const cumulativeTotal = scheduleData.runs
                                .slice(0, idx + 1)
                                .reduce((sum, r) => sum + (customRunQuantities[scheduleData.runs.indexOf(r)] ?? r.quantity), 0);

                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg bg-muted text-[10px] sm:text-xs"
                                >
                                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                    <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-[9px] sm:text-[10px] shrink-0">
                                      {run.runNumber}
                                    </span>
                                    <span className="font-bold text-foreground truncate">{format(run.scheduledAt, 'MMM d, h:mm')}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                                    {editingRunIndex === idx ? (
                                      <Input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        defaultValue={customRunQuantities[idx] ?? run.quantity}
                                        className="w-16 sm:w-20 h-5 sm:h-6 text-[10px] sm:text-xs text-right font-mono bg-secondary border-border text-foreground font-bold"
                                        min={providerMin}
                                        autoFocus
                                        onBlur={(e) => {
                                          const val = parseInt(e.target.value) || run.quantity;
                                          const clamped = Math.max(providerMin, val);
                                          setCustomRunQuantities(prev => ({ ...prev, [idx]: clamped }));
                                          setEditingRunIndex(null);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            const val = parseInt((e.target as HTMLInputElement).value) || run.quantity;
                                            const clamped = Math.max(providerMin, val);
                                            setCustomRunQuantities(prev => ({ ...prev, [idx]: clamped }));
                                            setEditingRunIndex(null);
                                          }
                                        }}
                                      />
                                    ) : (
                                      <button
                                        onClick={() => setEditingRunIndex(idx)}
                                        className="flex items-center gap-0.5 sm:gap-1 hover:bg-secondary px-1 sm:px-2 py-0.5 sm:py-1 rounded transition-colors"
                                      >
                                        <span className="font-mono font-bold text-foreground text-[10px] sm:text-xs">
                                          +{(customRunQuantities[idx] ?? run.quantity).toLocaleString()}
                                        </span>
                                        <Pencil className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground opacity-50" />
                                      </button>
                                    )}
                                    {peakHoursEnabled && run.peakMultiplier > 1.1 && (
                                      <Badge className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0 bg-foreground text-background hidden sm:flex">
                                        <Flame className="h-2 w-2 sm:h-2.5 sm:w-2.5 mr-0.5" />
                                        Peak
                                      </Badge>
                                    )}
                                    {/* Cumulative Total - Simplified on mobile */}
                                    <div className="border-l border-border pl-1.5 sm:pl-2 text-right">
                                      <span className="font-bold text-foreground text-[10px] sm:text-xs">={cumulativeTotal.toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
