// Curve-to-Schedule Converter
// Converts user-drawn control points into delivery runs

import { EngagementType, ENGAGEMENT_CONFIG } from './engagement-types';
import { PROVIDER_MINIMUMS } from './organic-algorithm';

export interface ControlPoint {
  id: string;
  x: number; // 0-100% of timeline
  y: number; // 0-100% of target quantity
  type: EngagementType;
}

export interface DrawModeState {
  isEnabled: boolean;
  activeType: EngagementType | null;
  points: Record<EngagementType, ControlPoint[]>;
}

export interface CurveScheduleRun {
  runNumber: number;
  timePercent: number;
  quantity: number;
  cumulativeQuantity: number;
}

// Create initial control points for a type (start + end)
export function createInitialPoints(type: EngagementType, quantity: number): ControlPoint[] {
  return [
    { id: `${type}-start`, x: 0, y: 0, type },
    { id: `${type}-end`, x: 100, y: 100, type },
  ];
}

// Cubic spline interpolation for smooth curves
function catmullRomSpline(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

// Interpolate smooth curve through control points
export function interpolateCurve(
  points: ControlPoint[],
  samples: number = 50
): { x: number; y: number }[] {
  if (points.length < 2) return [];
  
  // Sort points by x position
  const sorted = [...points].sort((a, b) => a.x - b.x);
  
  // Ensure we have start and end points
  if (sorted[0].x > 0) {
    sorted.unshift({ id: 'auto-start', x: 0, y: 0, type: sorted[0].type });
  }
  if (sorted[sorted.length - 1].x < 100) {
    sorted.push({ id: 'auto-end', x: 100, y: 100, type: sorted[0].type });
  }
  
  const result: { x: number; y: number }[] = [];
  
  // Simple linear interpolation for 2 points
  if (sorted.length === 2) {
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      result.push({
        x: sorted[0].x + t * (sorted[1].x - sorted[0].x),
        y: sorted[0].y + t * (sorted[1].y - sorted[0].y),
      });
    }
    return result;
  }
  
  // Catmull-Rom spline for 3+ points
  const samplesPerSegment = Math.ceil(samples / (sorted.length - 1));
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const p0 = sorted[Math.max(0, i - 1)];
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    const p3 = sorted[Math.min(sorted.length - 1, i + 2)];
    
    for (let j = 0; j < samplesPerSegment; j++) {
      const t = j / samplesPerSegment;
      result.push({
        x: catmullRomSpline(p0.x, p1.x, p2.x, p3.x, t),
        y: Math.max(0, Math.min(100, catmullRomSpline(p0.y, p1.y, p2.y, p3.y, t))),
      });
    }
  }
  
  // Add final point
  result.push({ x: 100, y: sorted[sorted.length - 1].y });
  
  return result;
}

// Convert drawn curve to ORGANIC delivery schedule
// AI generates many runs following the user's curve shape with variance + randomization
export function curveToSchedule(
  points: ControlPoint[],
  type: EngagementType,
  totalQuantity: number,
  totalDurationHours: number = 24,
  _numRunsHint: number = 20 // Ignored - AI decides optimal run count
): CurveScheduleRun[] {
  const providerMin = PROVIDER_MINIMUMS[type] || 10;
  
  if (totalQuantity < providerMin) {
    return [{
      runNumber: 1,
      timePercent: 50,
      quantity: totalQuantity,
      cumulativeQuantity: totalQuantity,
    }];
  }
  
  // AI decides optimal number of runs based on quantity and type
  // More quantity = more runs for organic feel
  const optimalRunCount = calculateOptimalRunCount(type, totalQuantity, providerMin);
  
  // Interpolate user's curve into many sample points (smooth curve)
  const curve = interpolateCurve(points, 200); // High resolution sampling
  if (curve.length === 0) return [];
  
  // Generate organic time distribution with variance
  const timeSlots = generateOrganicTimeSlots(optimalRunCount, totalDurationHours);
  
  // Distribute quantity according to curve shape + organic variance
  const runs: CurveScheduleRun[] = [];
  let cumulative = 0;
  let remainingQuantity = totalQuantity;
  
  for (let i = 0; i < timeSlots.length && remainingQuantity > 0; i++) {
    const timePercent = timeSlots[i];
    
    // Find Y value on curve at this time position
    const curveY = getCurveValueAtX(curve, timePercent);
    
    // Calculate target cumulative at this point
    const targetCumulative = Math.round((curveY / 100) * totalQuantity);
    
    // Delta from current cumulative
    let delta = targetCumulative - cumulative;
    
    // Add organic variance (±15-30%)
    const variance = 0.15 + Math.random() * 0.15;
    const varianceAmount = Math.round(delta * variance * (Math.random() > 0.5 ? 1 : -1));
    delta = Math.max(0, delta + varianceAmount);
    
    // Enforce minimum batch size
    if (delta < providerMin) {
      if (i === timeSlots.length - 1 && remainingQuantity > 0) {
        // Last run - take all remaining
        delta = remainingQuantity;
      } else if (remainingQuantity < providerMin * 2) {
        // Not enough left - take all
        delta = remainingQuantity;
      } else {
        // Skip small delta, will accumulate
        continue;
      }
    }
    
    // Cap at remaining
    delta = Math.min(delta, remainingQuantity);
    
    if (delta >= providerMin || (remainingQuantity > 0 && remainingQuantity < providerMin)) {
      cumulative += delta;
      remainingQuantity -= delta;
      
      runs.push({
        runNumber: runs.length + 1,
        timePercent,
        quantity: delta,
        cumulativeQuantity: cumulative,
      });
    }
  }
  
  // Distribute any remaining quantity
  if (remainingQuantity > 0) {
    if (runs.length > 0) {
      // Add to last run
      runs[runs.length - 1].quantity += remainingQuantity;
      runs[runs.length - 1].cumulativeQuantity += remainingQuantity;
    } else {
      runs.push({
        runNumber: 1,
        timePercent: 100,
        quantity: remainingQuantity,
        cumulativeQuantity: remainingQuantity,
      });
    }
  }
  
  return runs;
}

// Calculate optimal number of runs based on quantity and type
function calculateOptimalRunCount(type: EngagementType, quantity: number, minBatch: number): number {
  // Base run count ranges by type
  const baseRuns: Record<string, { min: number; max: number }> = {
    views: { min: 15, max: 60 },
    likes: { min: 12, max: 45 },
    comments: { min: 8, max: 30 },
    saves: { min: 8, max: 25 },
    shares: { min: 10, max: 35 },
  };
  
  const range = baseRuns[type] || { min: 10, max: 40 };
  
  // Scale runs based on quantity
  const maxPossibleRuns = Math.floor(quantity / minBatch);
  const scaledRuns = Math.min(
    range.max,
    Math.max(range.min, Math.round(quantity / (minBatch * 3)))
  );
  
  // Add randomness
  const variance = Math.floor(Math.random() * 5) - 2;
  return Math.min(maxPossibleRuns, Math.max(3, scaledRuns + variance));
}

// Generate organic time slots with natural variance
function generateOrganicTimeSlots(count: number, durationHours: number): number[] {
  const slots: number[] = [];
  const baseInterval = 100 / count;
  
  let currentTime = 0;
  
  for (let i = 0; i < count; i++) {
    // Add variance to interval (±30%)
    const variance = (Math.random() - 0.5) * 0.6;
    const interval = baseInterval * (1 + variance);
    
    // Random micro-gaps (organic pauses)
    const microGap = Math.random() < 0.15 ? baseInterval * 0.3 : 0;
    
    currentTime += interval + microGap;
    
    // Clamp to valid range
    const timePercent = Math.min(100, Math.max(0, currentTime));
    slots.push(timePercent);
    
    if (timePercent >= 100) break;
  }
  
  // Ensure we end at or near 100%
  if (slots.length > 0 && slots[slots.length - 1] < 95) {
    slots.push(100);
  }
  
  return slots;
}

// Get interpolated Y value at a given X position on the curve
function getCurveValueAtX(curve: { x: number; y: number }[], targetX: number): number {
  if (curve.length === 0) return 0;
  if (curve.length === 1) return curve[0].y;
  
  // Find surrounding points
  let left = curve[0];
  let right = curve[curve.length - 1];
  
  for (let i = 0; i < curve.length - 1; i++) {
    if (curve[i].x <= targetX && curve[i + 1].x >= targetX) {
      left = curve[i];
      right = curve[i + 1];
      break;
    }
  }
  
  // Linear interpolation between points
  if (right.x === left.x) return left.y;
  
  const t = (targetX - left.x) / (right.x - left.x);
  return left.y + t * (right.y - left.y);
}

// Calculate schedule quantities from curve (for updating EngagementConfig)
export function calculateQuantitiesFromCurve(
  points: Record<EngagementType, ControlPoint[]>,
  baseQuantities: Record<EngagementType, number>
): Record<EngagementType, number> {
  const result: Partial<Record<EngagementType, number>> = {};
  
  for (const [type, pts] of Object.entries(points)) {
    const engType = type as EngagementType;
    if (pts.length >= 2) {
      // Use the final Y value as the target percentage
      const sorted = [...pts].sort((a, b) => a.x - b.x);
      const finalY = sorted[sorted.length - 1].y;
      result[engType] = Math.round((finalY / 100) * baseQuantities[engType]);
    }
  }
  
  return result as Record<EngagementType, number>;
}

// Generate chart data from drawn curve
export function generateChartDataFromCurve(
  points: ControlPoint[],
  type: EngagementType,
  totalQuantity: number,
  samples: number = 50
): { time: number; value: number }[] {
  const curve = interpolateCurve(points, samples);
  
  return curve.map(point => ({
    time: point.x,
    value: Math.round((point.y / 100) * totalQuantity),
  }));
}

// Presets for common growth patterns
export interface CurvePreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  getPoints: (type: EngagementType) => ControlPoint[];
}

export const CURVE_PRESETS: CurvePreset[] = [
  {
    id: 'viral-spike',
    name: 'Viral Spike',
    emoji: '🚀',
    description: 'Slow start, explosive peak',
    getPoints: (type) => [
      { id: `${type}-0`, x: 0, y: 0, type },
      { id: `${type}-1`, x: 30, y: 5, type },
      { id: `${type}-2`, x: 60, y: 15, type },
      { id: `${type}-3`, x: 80, y: 70, type },
      { id: `${type}-4`, x: 100, y: 100, type },
    ],
  },
  {
    id: 'steady-growth',
    name: 'Steady Growth',
    emoji: '📈',
    description: 'Linear consistent growth',
    getPoints: (type) => [
      { id: `${type}-0`, x: 0, y: 0, type },
      { id: `${type}-1`, x: 100, y: 100, type },
    ],
  },
  {
    id: 's-curve',
    name: 'S-Curve',
    emoji: '🌊',
    description: 'Natural organic pattern',
    getPoints: (type) => [
      { id: `${type}-0`, x: 0, y: 0, type },
      { id: `${type}-1`, x: 25, y: 5, type },
      { id: `${type}-2`, x: 50, y: 50, type },
      { id: `${type}-3`, x: 75, y: 95, type },
      { id: `${type}-4`, x: 100, y: 100, type },
    ],
  },
  {
    id: 'double-peak',
    name: 'Double Peak',
    emoji: '⛰️',
    description: 'Two growth phases',
    getPoints: (type) => [
      { id: `${type}-0`, x: 0, y: 0, type },
      { id: `${type}-1`, x: 25, y: 40, type },
      { id: `${type}-2`, x: 40, y: 30, type },
      { id: `${type}-3`, x: 70, y: 85, type },
      { id: `${type}-4`, x: 100, y: 100, type },
    ],
  },
  {
    id: 'early-boost',
    name: 'Early Boost',
    emoji: '⚡',
    description: 'Fast start, gradual finish',
    getPoints: (type) => [
      { id: `${type}-0`, x: 0, y: 0, type },
      { id: `${type}-1`, x: 20, y: 50, type },
      { id: `${type}-2`, x: 50, y: 75, type },
      { id: `${type}-3`, x: 100, y: 100, type },
    ],
  },
];
