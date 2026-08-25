// Draggable Control Point Component
// Optimized for mobile touch + mouse + pen with large hit areas

import { useCallback, useRef, forwardRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { EngagementType, ENGAGEMENT_CONFIG } from '@/lib/engagement-types';

interface CurveControlPointProps {
  id: string;
  x: number; // 0-100%
  y: number; // 0-100%
  type: EngagementType;
  isActive: boolean;
  isMinimized?: boolean; // Smaller/subtle when not endpoint or active
  containerRef: React.RefObject<HTMLDivElement | null>;
  onDrag: (id: string, x: number, y: number) => void;
  onDragEnd: () => void;
  onDoubleClick?: (id: string) => void;
  isRemovable?: boolean;
}

// Type colors for control points
const TYPE_COLORS: Record<string, string> = {
  views: '#2563EB',
  likes: '#60A5FA',
  comments: '#93C5FD',
  saves: '#fbbf24',
  shares: '#a78bfa',
  followers: '#818cf8',
  subscribers: '#f87171',
  watch_hours: '#fb923c',
  retweets: '#2dd4bf',
  reposts: '#60A5FA',
};

export const CurveControlPoint = forwardRef<HTMLDivElement, CurveControlPointProps>(
  function CurveControlPoint(
    { id, x, y, type, isActive, isMinimized = false, containerRef, onDrag, onDragEnd, onDoubleClick, isRemovable = true },
    _ref
  ) {
    const pointRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const isPointerDown = useRef(false);
    const activePointerId = useRef<number | null>(null);
    const lastTapTime = useRef<number>(0);
    const downClient = useRef<{ x: number; y: number } | null>(null);

    const color = TYPE_COLORS[type] || '#ffffff';
    const config = ENGAGEMENT_CONFIG[type];

    // Convert page coordinates to percentage
    const getPercentPosition = useCallback(
      (clientX: number, clientY: number) => {
        if (!containerRef.current) return { x, y };

        const rect = containerRef.current.getBoundingClientRect();
        const newX = ((clientX - rect.left) / rect.width) * 100;
        const newY = 100 - ((clientY - rect.top) / rect.height) * 100; // Invert Y

        return {
          x: Math.max(0, Math.min(100, newX)),
          y: Math.max(0, Math.min(100, newY)),
        };
      },
      [containerRef, x, y]
    );

    const startDrag = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        isPointerDown.current = true;
        isDragging.current = false; // becomes true after movement threshold
        activePointerId.current = e.pointerId;
        downClient.current = { x: e.clientX, y: e.clientY };

        // Capture pointer for reliable tracking
        if (pointRef.current) {
          try {
            pointRef.current.setPointerCapture(e.pointerId);
          } catch {
            // ignore
          }
        }
      },
      []
    );

    const moveDrag = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isPointerDown.current) return;
        if (activePointerId.current !== e.pointerId) return;

        e.preventDefault();
        e.stopPropagation();

        // Start dragging only after a small movement threshold (prevents accidental taps = "reset")
        if (!isDragging.current) {
          const start = downClient.current;
          const dx = start ? e.clientX - start.x : 0;
          const dy = start ? e.clientY - start.y : 0;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < 36) return; // 6px threshold
          isDragging.current = true;
        }

        const pos = getPercentPosition(e.clientX, e.clientY);
        onDrag(id, pos.x, pos.y);
      },
      [getPercentPosition, id, onDrag]
    );

    const endDrag = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isPointerDown.current) return;
        if (activePointerId.current !== e.pointerId) return;

        e.preventDefault();
        e.stopPropagation();

        // Release pointer capture
        if (pointRef.current) {
          try {
            pointRef.current.releasePointerCapture(e.pointerId);
          } catch {
            // ignore
          }
        }

        isPointerDown.current = false;
        activePointerId.current = null;
        downClient.current = null;

        // If user actually dragged, commit curve changes
        if (isDragging.current) {
          isDragging.current = false;
          onDragEnd();
          return;
        }

        // Otherwise treat as a tap: double-tap removes (prevents accidental remove during quick edits)
        const now = Date.now();
        if (now - lastTapTime.current < 300 && isRemovable && onDoubleClick) {
          onDoubleClick(id);
          lastTapTime.current = 0;
          return;
        }
        lastTapTime.current = now;
      },
      [id, isRemovable, onDoubleClick, onDragEnd]
    );

    const handleDoubleClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isRemovable && onDoubleClick) {
          onDoubleClick(id);
        }
      },
      [id, isRemovable, onDoubleClick]
    );

    // Minimized points are smaller and less prominent
    if (isMinimized) {
      return (
        <div
          ref={pointRef}
          className="absolute select-none z-10 w-10 h-10 flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{
            left: `${x}%`,
            bottom: `${y}%`,
            transform: 'translate(-50%, 50%)',
            touchAction: 'none',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
          }}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={(e) => {
            if (isDragging.current && activePointerId.current === e.pointerId) {
              if (!pointRef.current?.hasPointerCapture(e.pointerId)) {
                endDrag(e);
              }
            }
          }}
          onDoubleClick={handleDoubleClick}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Small dot for minimized state */}
          <div
            className="w-3 h-3 rounded-full opacity-60 transition-all hover:opacity-100 hover:scale-150"
            style={{ backgroundColor: color, boxShadow: `0 2px 8px ${color}40` }}
          />
        </div>
      );
    }

    return (
      <div
        ref={pointRef}
        className={cn(
          'absolute select-none z-10',
          // Extra large touch target for mobile (56x56px)
          'w-14 h-14 flex items-center justify-center',
          'cursor-grab active:cursor-grabbing',
          isActive && 'scale-110 z-20',
          isRemovable && 'hover:scale-105'
        )}
        style={{
          left: `${x}%`,
          bottom: `${y}%`,
          transform: 'translate(-50%, 50%)',
          touchAction: 'none',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={(e) => {
          // Only end if we don't have capture
          if (isDragging.current && activePointerId.current === e.pointerId) {
            if (!pointRef.current?.hasPointerCapture(e.pointerId)) {
              endDrag(e);
            }
          }
        }}
        onDoubleClick={handleDoubleClick}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Outer glow ring - larger on active */}
        <div
          className={cn(
            'absolute rounded-full opacity-30 blur-md transition-all pointer-events-none',
            isActive ? 'inset-0 opacity-60' : 'inset-2'
          )}
          style={{ backgroundColor: color }}
        />

        {/* Main visible point - larger for mobile */}
        <div
          className={cn(
            'w-8 h-8 rounded-full border-3 shadow-xl flex items-center justify-center pointer-events-none',
            'bg-background transition-all duration-150',
            isActive && 'ring-4 ring-offset-2 ring-offset-background scale-110'
          )}
          style={
            {
              borderColor: color,
              borderWidth: '3px',
              boxShadow: `0 6px 20px ${color}50`,
              '--tw-ring-color': color,
            } as React.CSSProperties
          }
        >
          <span className="text-sm">{config?.emoji || '●'}</span>
        </div>

        {/* Tooltip on active */}
        {isActive && (
          <div
            className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap pointer-events-none shadow-lg"
            style={{ backgroundColor: color, color: '#000' }}
          >
            {Math.round(y)}%
          </div>
        )}

        {/* Remove hint for removable points */}
        {isRemovable && isActive && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap pointer-events-none">
            Double-tap to remove
          </div>
        )}
      </div>
    );
  }
);
