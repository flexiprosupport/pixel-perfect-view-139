// Interactive Drawable Growth Chart
// SVG overlay with draggable control points

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import {
  EngagementType,
  EngagementConfig,
  ENGAGEMENT_CONFIG,
} from '@/lib/engagement-types';
import {
  ControlPoint,
  DrawModeState,
  interpolateCurve,
  createInitialPoints,
  CURVE_PRESETS,
} from '@/lib/curve-to-schedule';
import { CurveControlPoint } from './CurveControlPoint';
import {
  Pencil,
  RotateCcw,
  Sparkles,
  MousePointer2,
  Layers,
} from 'lucide-react';

type VisibleType = Extract<EngagementType, 'views' | 'likes' | 'comments' | 'saves' | 'shares'>;

const VISIBLE_TYPES: VisibleType[] = ['views', 'likes', 'comments', 'saves', 'shares'];

// Type colors for curves
const TYPE_COLORS: Record<VisibleType, string> = {
  views: '#2563EB',
  comments: '#93C5FD',
  likes: '#60A5FA',
  saves: '#fbbf24',
  shares: '#a78bfa',
};

interface DrawableGrowthChartProps {
  engagements: Record<EngagementType, EngagementConfig>;
  onCurveChange: (type: EngagementType, points: ControlPoint[]) => void;
  drawModeState: DrawModeState;
  onDrawModeChange: (state: DrawModeState) => void;
}

export function DrawableGrowthChart({
  engagements,
  onCurveChange,
  drawModeState,
  onDrawModeChange,
}: DrawableGrowthChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const [hoveredType, setHoveredType] = useState<VisibleType | null>(null);

  // When user taps empty chart area, we create a new point and (optionally) drag it with that same pointer.
  // Stored as refs to avoid extra renders while pointer events stream in.
  const pendingNewPointRef = useRef<{
    pointerId: number;
    pointId: string;
    type: VisibleType;
  } | null>(null);

  // Get enabled types
  const enabledTypes = VISIBLE_TYPES.filter(
    (t) => engagements[t]?.enabled && engagements[t]?.quantity > 0
  );

  // Initialize points for all types with just start + end (user adds more by clicking)
  useEffect(() => {
    const newPoints = { ...drawModeState.points };
    let hasChanges = false;

    enabledTypes.forEach((type) => {
      if (!newPoints[type] || newPoints[type].length === 0) {
        // Start with just 2 points - user can add more by clicking
        const initialPoints: ControlPoint[] = [
          { id: `${type}-0`, x: 0, y: 0, type },
          { id: `${type}-1`, x: 100, y: 100, type },
        ];
        newPoints[type] = initialPoints;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      onDrawModeChange({ ...drawModeState, points: newPoints });
    }
  }, [enabledTypes.join(',')]);

  // Handle point drag
  const handleDrag = useCallback(
    (id: string, x: number, y: number) => {
      if (!drawModeState.isEnabled || !drawModeState.activeType) return;

      const type = drawModeState.activeType;
      const points = drawModeState.points[type] || [];
      const pointIndex = points.findIndex((p) => p.id === id);

      if (pointIndex === -1) return;

      // Don't allow moving the first point's X (anchor at 0)
      const newX = pointIndex === 0 ? 0 : x;
      // Don't allow moving the last point's X (anchor at 100)
      const isLast = pointIndex === points.length - 1;
      const finalX = isLast ? 100 : newX;

      const newPoints = [...points];
      newPoints[pointIndex] = { ...newPoints[pointIndex], x: finalX, y };

      const updatedPoints = {
        ...drawModeState.points,
        [type]: newPoints,
      };

      onDrawModeChange({ ...drawModeState, points: updatedPoints });
      setActivePointId(id);
    },
    [drawModeState, onDrawModeChange]
  );

  const handleDragEnd = useCallback(() => {
    setActivePointId(null);
    if (drawModeState.activeType) {
      const points = drawModeState.points[drawModeState.activeType];
      if (points) {
        onCurveChange(drawModeState.activeType, points);
      }
    }
  }, [drawModeState, onCurveChange]);

  const getChartPercentPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = 100 - ((clientY - rect.top) / rect.height) * 100;
      return { x, y };
    },
    []
  );

  // Tap on empty chart area to add a point.
  // Also supports "tap + drag" in the same gesture so the new point doesn't feel like it "resets".
  const handleChartPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drawModeState.isEnabled || !drawModeState.activeType) return;
      if (!containerRef.current) return;

      // Only left mouse button (touch/pen doesn't have button)
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      // If we're already creating a point with another pointer, ignore.
      if (pendingNewPointRef.current) return;

      e.preventDefault();

      const pos = getChartPercentPosition(e.clientX, e.clientY);
      if (!pos) return;

      const type = drawModeState.activeType as VisibleType;
      const points = drawModeState.points[type] || [];

      const pointId = `${type}-${Date.now()}`;
      const newPoint: ControlPoint = {
        id: pointId,
        x: Math.max(1, Math.min(99, pos.x)),
        y: Math.max(0, Math.min(100, pos.y)),
        type,
      };

      const newPoints = [...points, newPoint].sort((a, b) => a.x - b.x);
      const updatedPoints = {
        ...drawModeState.points,
        [type]: newPoints,
      };

      pendingNewPointRef.current = { pointerId: e.pointerId, pointId, type };
      setActivePointId(pointId);
      onDrawModeChange({ ...drawModeState, points: updatedPoints });

      // Capture pointer on container so "tap+drag" keeps working even if finger leaves bounds.
      try {
        containerRef.current.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    },
    [drawModeState, getChartPercentPosition, onDrawModeChange]
  );

  const handleChartPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const pending = pendingNewPointRef.current;
      if (!pending) return;
      if (pending.pointerId !== e.pointerId) return;
      if (!drawModeState.isEnabled) return;

      const pos = getChartPercentPosition(e.clientX, e.clientY);
      if (!pos) return;

      e.preventDefault();

      const clampedX = Math.max(1, Math.min(99, pos.x));
      const clampedY = Math.max(0, Math.min(100, pos.y));

      const type = pending.type;
      const points = drawModeState.points[type] || [];
      const newPoints = points
        .map((p) => (p.id === pending.pointId ? { ...p, x: clampedX, y: clampedY } : p))
        .sort((a, b) => a.x - b.x);

      onDrawModeChange({
        ...drawModeState,
        points: {
          ...drawModeState.points,
          [type]: newPoints,
        },
      });
    },
    [drawModeState, getChartPercentPosition, onDrawModeChange]
  );

  const handleChartPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const pending = pendingNewPointRef.current;
      if (!pending) return;
      if (pending.pointerId !== e.pointerId) return;

      e.preventDefault();

      // Release capture
      try {
        containerRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      pendingNewPointRef.current = null;
      setActivePointId(null);

      const points = drawModeState.points[pending.type];
      if (points) onCurveChange(pending.type, points);
    },
    [drawModeState.points, onCurveChange]
  );

  // Remove point on double-click (except start/end)
  const handlePointDoubleClick = useCallback(
    (pointId: string) => {
      if (!drawModeState.activeType) return;

      const type = drawModeState.activeType;
      const points = drawModeState.points[type] || [];

      // Don't allow removing start or end points
      const pointIndex = points.findIndex((p) => p.id === pointId);
      if (pointIndex === 0 || pointIndex === points.length - 1) return;

      const newPoints = points.filter((p) => p.id !== pointId);
      const updatedPoints = {
        ...drawModeState.points,
        [type]: newPoints,
      };

      onDrawModeChange({ ...drawModeState, points: updatedPoints });
      onCurveChange(type, newPoints);
    },
    [drawModeState, onDrawModeChange, onCurveChange]
  );

  // Reset curve to default
  const handleReset = useCallback(() => {
    if (!drawModeState.activeType) return;

    const type = drawModeState.activeType;
    const defaultPoints = createInitialPoints(type, engagements[type].quantity);

    const updatedPoints = {
      ...drawModeState.points,
      [type]: defaultPoints,
    };

    onDrawModeChange({ ...drawModeState, points: updatedPoints });
    onCurveChange(type, defaultPoints);
  }, [drawModeState, engagements, onDrawModeChange, onCurveChange]);

  // Apply preset
  const handlePreset = useCallback(
    (presetId: string) => {
      if (!drawModeState.activeType) return;

      const preset = CURVE_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;

      const type = drawModeState.activeType;
      const newPoints = preset.getPoints(type);

      const updatedPoints = {
        ...drawModeState.points,
        [type]: newPoints,
      };

      onDrawModeChange({ ...drawModeState, points: updatedPoints });
      onCurveChange(type, newPoints);
    },
    [drawModeState, onDrawModeChange, onCurveChange]
  );

  // Generate smooth Bézier SVG path for a curve (no choppy segments)
  const generatePath = useMemo(() => {
    return (type: VisibleType) => {
      const points = drawModeState.points[type];
      if (!points || points.length < 2) return '';

      // Sort points by x
      const sorted = [...points].sort((a, b) => a.x - b.x);
      
      if (sorted.length === 2) {
        // Simple line for 2 points
        const [p1, p2] = sorted;
        return `M ${p1.x} ${100 - p1.y} L ${p2.x} ${100 - p2.y}`;
      }

      // Generate smooth Catmull-Rom to Bézier curve
      let path = `M ${sorted[0].x} ${100 - sorted[0].y}`;
      
      for (let i = 0; i < sorted.length - 1; i++) {
        const p0 = sorted[Math.max(0, i - 1)];
        const p1 = sorted[i];
        const p2 = sorted[i + 1];
        const p3 = sorted[Math.min(sorted.length - 1, i + 2)];

        // Catmull-Rom to cubic bezier control points
        const tension = 0.3;
        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = 100 - (p1.y + (p2.y - p0.y) * tension);
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = 100 - (p2.y - (p3.y - p1.y) * tension);
        
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${100 - p2.y}`;
      }

      return path;
    };
  }, [drawModeState.points]);

  // Toggle draw mode
  const toggleDrawMode = () => {
    const newEnabled = !drawModeState.isEnabled;
    onDrawModeChange({
      ...drawModeState,
      isEnabled: newEnabled,
      activeType: newEnabled ? enabledTypes[0] || null : null,
    });
  };

  // Select active type
  const selectActiveType = (type: VisibleType) => {
    onDrawModeChange({
      ...drawModeState,
      activeType: type,
    });
  };

  return (
    <Card className="border-2 border-border bg-background overflow-hidden">
      <CardHeader className="pb-3 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-foreground">
            <Pencil className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Draw Your Growth Curve</span>
            {drawModeState.isEnabled && (
              <Badge className="bg-primary text-primary-foreground text-[10px] sm:text-xs">
                Draw Mode ON
              </Badge>
            )}
          </CardTitle>

          <div className="flex items-center gap-3">
            <Label htmlFor="draw-mode" className="text-xs sm:text-sm font-medium">
              {drawModeState.isEnabled ? 'Drawing' : 'View Only'}
            </Label>
            <Switch
              id="draw-mode"
              checked={drawModeState.isEnabled}
              onCheckedChange={toggleDrawMode}
            />
          </div>
        </div>

        {drawModeState.isEnabled && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Click to add points • Drag to adjust • Double-click to remove
          </p>
        )}
      </CardHeader>

      <CardContent className="p-3 sm:p-6 space-y-4">
        {/* Type Selector */}
        {drawModeState.isEnabled && (
          <div className="flex flex-wrap gap-2">
            {enabledTypes.map((type) => {
              const config = ENGAGEMENT_CONFIG[type];
              const isActive = drawModeState.activeType === type;
              const points = drawModeState.points[type]?.length || 0;

              return (
                <Button
                  key={type}
                  size="sm"
                  variant={isActive ? 'default' : 'outline'}
                  className={cn(
                    'gap-1.5 h-8 sm:h-9 text-xs sm:text-sm font-bold transition-all',
                    isActive
                      ? 'ring-2 ring-offset-2 ring-offset-background'
                      : 'hover:bg-secondary'
                  )}
                  style={{
                    borderColor: TYPE_COLORS[type],
                    backgroundColor: isActive ? TYPE_COLORS[type] : undefined,
                    color: isActive ? '#000' : TYPE_COLORS[type],
                    ['--tw-ring-color' as string]: TYPE_COLORS[type],
                  }}
                  onClick={() => selectActiveType(type)}
                >
                  <span>{config?.emoji}</span>
                  <span className="hidden sm:inline">{config?.label}</span>
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 px-1 text-[10px] bg-background/20"
                  >
                    {points}
                  </Badge>
                </Button>
              );
            })}
          </div>
        )}

        {/* Chart Area */}
        <div
          ref={containerRef}
          className={cn(
            'relative w-full aspect-[2/1] sm:aspect-[3/1] rounded-xl border-2 overflow-hidden transition-colors',
            drawModeState.isEnabled
              ? 'border-primary/40 bg-primary/5 cursor-crosshair'
              : 'border-border bg-secondary/30'
          )}
          style={{
            touchAction: 'none',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
          }}
          onPointerDown={handleChartPointerDown}
          onPointerMove={handleChartPointerMove}
          onPointerUp={handleChartPointerUp}
          onPointerCancel={handleChartPointerUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Grid */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <pattern
                id="grid"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 10 0 L 0 0 0 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.3"
                  className="text-border"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Y-axis labels */}
            <text x="2" y="12" className="text-[8px] fill-muted-foreground">
              100%
            </text>
            <text x="2" y="52%" className="text-[8px] fill-muted-foreground">
              50%
            </text>
            <text x="2" y="98%" className="text-[8px] fill-muted-foreground">
              0%
            </text>

            {/* X-axis labels */}
            <text x="48%" y="98%" className="text-[8px] fill-muted-foreground">
              50%
            </text>
            <text x="95%" y="98%" className="text-[8px] fill-muted-foreground">
              100%
            </text>
          </svg>

          {/* Curves SVG */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {enabledTypes.map((type) => {
              const path = generatePath(type);
              const isActive = drawModeState.activeType === type;
              const isHovered = hoveredType === type;

              return (
                <g key={type}>
                  {/* Curve shadow */}
                  <path
                    d={path}
                    fill="none"
                    stroke={TYPE_COLORS[type]}
                    strokeWidth={isActive ? 4 : 2}
                    strokeOpacity={0.3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="blur-sm"
                  />
                  {/* Main curve */}
                  <path
                    d={path}
                    fill="none"
                    stroke={TYPE_COLORS[type]}
                    strokeWidth={isActive ? 3 : isHovered ? 2.5 : 1.5}
                    strokeOpacity={isActive ? 1 : 0.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-200"
                    onMouseEnter={() => setHoveredType(type)}
                    onMouseLeave={() => setHoveredType(null)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Control Points - Minimal view: endpoints + active only */}
          {drawModeState.isEnabled &&
            drawModeState.activeType &&
            drawModeState.points[drawModeState.activeType]?.map((point, idx, arr) => {
              const isEndpoint = idx === 0 || idx === arr.length - 1;
              const isBeingDragged = activePointId === point.id;
              
              return (
                <CurveControlPoint
                  key={point.id}
                  {...point}
                  isActive={isBeingDragged}
                  isMinimized={!isEndpoint && !isBeingDragged}
                  containerRef={containerRef}
                  onDrag={handleDrag}
                  onDragEnd={handleDragEnd}
                  onDoubleClick={handlePointDoubleClick}
                  isRemovable={!isEndpoint}
                />
              );
            })}

          {/* Instructions overlay when not in draw mode */}
          {!drawModeState.isEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <div className="text-center p-4">
                <MousePointer2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Enable Draw Mode to customize curves
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Drag points to shape your growth pattern
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Presets & Actions */}
        {drawModeState.isEnabled && drawModeState.activeType && (
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {CURVE_PRESETS.slice(0, 4).map((preset) => (
                <Button
                  key={preset.id}
                  size="sm"
                  variant="outline"
                  className="h-7 sm:h-8 text-[10px] sm:text-xs gap-1 border-border hover:bg-secondary"
                  onClick={() => handlePreset(preset.id)}
                  title={preset.description}
                >
                  <span>{preset.emoji}</span>
                  <span className="hidden sm:inline">{preset.name}</span>
                </Button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 border-border hover:bg-secondary"
                onClick={handleReset}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 sm:gap-4 pt-2 border-t border-border">
          {enabledTypes.map((type) => {
            const config = ENGAGEMENT_CONFIG[type];
            const qty = engagements[type]?.quantity || 0;

            return (
              <div
                key={type}
                className="flex items-center gap-1.5 text-xs sm:text-sm"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: TYPE_COLORS[type] }}
                />
                <span className="font-medium text-foreground">
                  {config?.emoji} {qty.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
