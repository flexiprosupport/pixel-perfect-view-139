// ===============================================
// ULTRA ORGANIC ALGORITHM v3.0 - DEEP ANTI-BOT SYSTEM
// Each engagement type has completely independent, multi-layer randomization
// Designed to be 100% undetectable by platform algorithms
// ===============================================

export interface OrganicRunConfig {
  runNumber: number;
  scheduledAt: Date;
  quantity: number;
  baseQuantity: number;
  varianceApplied: number;
  peakMultiplier: number;
  // Deep anti-detection metrics
  dayOfWeek: number;           // 0-6, affects patterns
  hourOfDay: number;           // 0-23, IST
  sessionType: 'megaBurst' | 'burst' | 'normal' | 'slow' | 'pause' | 'deadZone';
  humanBehaviorScore: number;  // 0-100, how "human" this batch looks
  patternBreaker: boolean;     // True if this intentionally breaks a pattern
}

export interface FullOrganicConfig {
  engagementType: string;
  totalQuantity: number;
  runs: OrganicRunConfig[];
  totalDuration: number;
  warnings: string[];
  // NEW: Anti-detection metrics
  patternBreakCount: number;
  avgHumanScore: number;
  varietyIndex: number;        // How varied the delivery is (higher = more organic)
}

// Provider minimum order quantity FALLBACKS (actual values come from service table via minQuantity prop)
// These are last-resort defaults only — real min comes from DB service.min_quantity
export const PROVIDER_MINIMUMS: Record<string, number> = {
  views: 100,
  likes: 10,
  comments: 10,
  saves: 10,
  shares: 10,
};

// Provider maximum order quantity
export const PROVIDER_MAXIMUMS: Record<string, number> = {
  views: 10000000,    // 10M
  likes: 500000,      // 500K
  comments: 100000,   // 100K
  saves: 50000,       // 50K
  shares: 100000,     // 100K
};

// ULTRA ORGANIC: Longer intervals spread across more time for natural delivery
// Each type has wildly different timing to look completely natural
const TYPE_BASE_INTERVALS: Record<string, { min: number; max: number; jitter: number; chaosMultiplier: number }> = {
  views: { min: 15, max: 120, jitter: 40, chaosMultiplier: 2.2 },     // Views: spread out, natural gaps
  likes: { min: 25, max: 180, jitter: 50, chaosMultiplier: 2.5 },     // Likes: very unpredictable
  comments: { min: 60, max: 360, jitter: 80, chaosMultiplier: 3.0 },  // Comments: extremely sparse
  saves: { min: 90, max: 480, jitter: 100, chaosMultiplier: 3.2 },    // Saves: very sparse and chaotic
  shares: { min: 50, max: 240, jitter: 60, chaosMultiplier: 2.8 },    // Shares: medium chaos
};

// ORGANIC BATCH SIZES - realistic human-like quantities per run
// Views: real humans see 100-300 views in organic bursts, NOT 1000+
// KEY: Keep ranges tight enough to look human, wide enough for variance
const TYPE_RUN_SIZE: Record<string, { min: number; max: number; variance: number; spikeMax: number; maxMultiplier: number; hardCap: number }> = {
  views: { min: 100, max: 250, variance: 0.65, spikeMax: 350, maxMultiplier: 2.5, hardCap: 400 },     // Views: 100-350 range (human-like)
  likes: { min: 10, max: 45, variance: 0.70, spikeMax: 80, maxMultiplier: 4.0, hardCap: 100 },        // Likes: small batches
  comments: { min: 10, max: 20, variance: 0.60, spikeMax: 35, maxMultiplier: 3.0, hardCap: 50 },      // Comments: very small
  saves: { min: 10, max: 25, variance: 0.65, spikeMax: 45, maxMultiplier: 3.0, hardCap: 60 },         // Saves: small
  shares: { min: 10, max: 30, variance: 0.68, spikeMax: 55, maxMultiplier: 3.5, hardCap: 70 },        // Shares: small
};

/**
 * DYNAMIC SCALING: For large orders (50K+), scale up batch sizes to keep runs manageable.
 * Without this, 600K views at 250/run = 2400 runs which hits the 500 cap.
 * Target: ~150-300 runs for ANY quantity for optimal organic delivery.
 */
function getScaledRunSize(
  engagementType: string,
  totalQuantity: number,
  providerMin: number
): { min: number; max: number; spikeMax: number; ultraMax: number } {
  const base = TYPE_RUN_SIZE[engagementType] || { min: 10, max: 50, spikeMax: 150, maxMultiplier: 2.5, hardCap: 200 };

  // Use hardCap as absolute maximum - never exceed this per run
  const hardCap = (base as any).hardCap || 400;

  // Dynamic max relative to providerMin, but NEVER exceeds hardCap
  const dynamicMax = Math.min(hardCap, Math.max(base.max, Math.round(providerMin * (base.maxMultiplier || 2.5))));
  const dynamicSpikeMax = Math.min(hardCap, Math.max(base.spikeMax, Math.round(dynamicMax * 1.3)));

  // Target 150-300 runs for organic feel
  const targetRuns = 250;
  const idealBatchSize = Math.ceil(totalQuantity / targetRuns);

  // Scale thresholds per type
  const scaleThresholds: Record<string, number> = {
    views: 50000,    // Scale up after 50K
    likes: 5000,     // Scale up after 5K
    comments: 500,   // Scale up after 500
    saves: 1000,     // Scale up after 1K
    shares: 2000,    // Scale up after 2K
  };

  const threshold = scaleThresholds[engagementType] || 10000;

  if (totalQuantity <= threshold) {
    return {
      min: Math.max(base.min, providerMin),
      max: dynamicMax,
      spikeMax: dynamicSpikeMax,
      ultraMax: Math.min(hardCap, dynamicMax * 1.2),
    };
  }

  // DYNAMIC SCALING for large orders - still respects hardCap
  const scaleFactor = Math.max(1, totalQuantity / threshold);
  const sqrtScale = Math.sqrt(scaleFactor); // Gentle scaling curve

  const scaledMin = Math.max(providerMin, Math.round(base.min * sqrtScale));
  // Scale up but NEVER exceed hardCap
  const scaledMax = Math.min(hardCap * 1.5, Math.round(dynamicMax * sqrtScale));
  const scaledSpikeMax = Math.min(hardCap * 2, Math.round(dynamicSpikeMax * sqrtScale));
  // Ultra max for finishing large orders, but still capped
  const ultraMax = Math.min(hardCap * 2.5, Math.max(scaledMax * 1.5, Math.ceil(totalQuantity / 400)));

  return {
    min: scaledMin,
    max: scaledMax,
    spikeMax: scaledSpikeMax,
    ultraMax,
  };
}

// VERY WIDE initial delays - types start at completely different times
const TYPE_START_DELAYS: Record<string, { min: number; max: number }> = {
  views: { min: 1, max: 25 },        // Views: quick start, random
  likes: { min: 8, max: 90 },        // Likes: delayed, very random
  comments: { min: 20, max: 180 },   // Comments: much later
  saves: { min: 40, max: 280 },      // Saves: very late start
  shares: { min: 25, max: 200 },     // Shares: wide range
};

// CHAOTIC S-Curve profiles - more extreme spikes and dips
const TYPE_CURVE_PROFILES: Record<string, {
  rampUpPercent: number;
  peakPercent: number;
  declinePercent: number;
  viralChance: number;     // Higher = more viral spikes
  dipChance: number;       // Higher = more natural dips  
  microPauseChance: number; // Chance of short pause/gap
  megaSpikeChance: number;  // Chance of huge viral spike
}> = {
  views: { rampUpPercent: 12, peakPercent: 55, declinePercent: 33, viralChance: 0.18, dipChance: 0.12, microPauseChance: 0.08, megaSpikeChance: 0.04 },
  likes: { rampUpPercent: 20, peakPercent: 48, declinePercent: 32, viralChance: 0.15, dipChance: 0.15, microPauseChance: 0.10, megaSpikeChance: 0.03 },
  comments: { rampUpPercent: 30, peakPercent: 38, declinePercent: 32, viralChance: 0.08, dipChance: 0.20, microPauseChance: 0.15, megaSpikeChance: 0.02 },
  saves: { rampUpPercent: 35, peakPercent: 32, declinePercent: 33, viralChance: 0.05, dipChance: 0.22, microPauseChance: 0.18, megaSpikeChance: 0.01 },
  shares: { rampUpPercent: 25, peakPercent: 42, declinePercent: 33, viralChance: 0.12, dipChance: 0.18, microPauseChance: 0.12, megaSpikeChance: 0.025 },
};

// DEEP RANDOM: Day of week patterns (real engagement varies by day)
const DAY_OF_WEEK_MULTIPLIERS: Record<string, number[]> = {
  // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  views: [1.3, 0.85, 0.9, 0.95, 1.0, 1.15, 1.35],    // Weekend heavy
  likes: [1.25, 0.8, 0.88, 0.92, 0.98, 1.1, 1.28],   // Weekend heavy
  comments: [1.1, 0.75, 0.85, 0.9, 0.95, 1.05, 1.15], // Slight weekend boost
  saves: [1.0, 0.9, 0.95, 0.98, 1.0, 1.02, 1.05],    // Fairly consistent
  shares: [1.2, 0.78, 0.85, 0.9, 0.95, 1.1, 1.25],   // Weekend heavy for shares
};

// DEEP RANDOM: Hourly patterns with micro-variations
// Each hour has a BASE multiplier plus random micro-adjustments
const TYPE_DAILY_PATTERNS: Record<string, number[]> = {
  views: [
    0.18, 0.12, 0.08, 0.07, 0.12, 0.28,   // 0-5 AM (deep night)
    0.48, 0.68, 0.82, 0.93, 0.98, 1.08,   // 6-11 AM (morning)
    0.98, 0.88, 0.83, 0.88, 0.93, 1.08,   // 12-5 PM (afternoon)
    1.38, 1.58, 1.72, 1.52, 1.18, 0.68,   // 6-11 PM (PEAK evening)
  ],
  likes: [
    0.13, 0.08, 0.06, 0.06, 0.10, 0.23,   // 0-5 AM
    0.38, 0.58, 0.73, 0.83, 0.93, 1.03,   // 6-11 AM
    0.93, 0.83, 0.78, 0.83, 0.88, 0.98,   // 12-5 PM
    1.28, 1.48, 1.63, 1.58, 1.28, 0.78,   // 6-11 PM
  ],
  comments: [
    0.08, 0.06, 0.04, 0.04, 0.08, 0.18,   // 0-5 AM
    0.33, 0.48, 0.63, 0.73, 0.83, 0.93,   // 6-11 AM
    0.88, 0.78, 0.73, 0.78, 0.83, 0.93,   // 12-5 PM
    1.18, 1.38, 1.53, 1.68, 1.48, 0.88,   // 6-11 PM (PEAK later)
  ],
  saves: [
    0.28, 0.23, 0.18, 0.18, 0.23, 0.33,   // 0-5 AM
    0.48, 0.58, 0.68, 0.78, 0.88, 0.98,   // 6-11 AM
    0.93, 0.88, 0.83, 0.88, 0.93, 0.98,   // 12-5 PM
    1.13, 1.23, 1.28, 1.23, 1.08, 0.68,   // 6-11 PM (mild peak)
  ],
  shares: [
    0.10, 0.06, 0.04, 0.04, 0.08, 0.18,   // 0-5 AM
    0.38, 0.53, 0.68, 0.83, 0.98, 1.18,   // 6-11 AM
    1.28, 1.08, 0.88, 0.83, 0.88, 0.98,   // 12-5 PM (lunch peak)
    1.33, 1.53, 1.58, 1.43, 1.18, 0.73,   // 6-11 PM (evening peak)
  ],
};

// CHAOTIC session types - humans have very unpredictable patterns
const SESSION_TYPES = ['megaBurst', 'burst', 'normal', 'slow', 'pause', 'deadZone'] as const;
const SESSION_PROBABILITIES: Record<string, Record<typeof SESSION_TYPES[number], number>> = {
  views: { megaBurst: 0.06, burst: 0.18, normal: 0.48, slow: 0.18, pause: 0.07, deadZone: 0.03 },
  likes: { megaBurst: 0.04, burst: 0.15, normal: 0.45, slow: 0.22, pause: 0.10, deadZone: 0.04 },
  comments: { megaBurst: 0.02, burst: 0.08, normal: 0.40, slow: 0.30, pause: 0.15, deadZone: 0.05 },
  saves: { megaBurst: 0.02, burst: 0.06, normal: 0.38, slow: 0.32, pause: 0.16, deadZone: 0.06 },
  shares: { megaBurst: 0.03, burst: 0.12, normal: 0.42, slow: 0.25, pause: 0.13, deadZone: 0.05 },
};

// EXTREME session multipliers for visible chart chaos
const SESSION_MULTIPLIERS: Record<typeof SESSION_TYPES[number], { interval: number; quantity: number }> = {
  megaBurst: { interval: 0.2, quantity: 3.0 },   // Very fast, huge batches (viral moment)
  burst: { interval: 0.35, quantity: 2.0 },      // Fast intervals, big batches
  normal: { interval: 1.0, quantity: 1.0 },      // Normal behavior
  slow: { interval: 2.2, quantity: 0.6 },        // Long intervals, smaller batches
  pause: { interval: 4.0, quantity: 0.35 },      // Long gap, tiny batch
  deadZone: { interval: 8.0, quantity: 0.2 },    // Very long gap (user sleeping/busy)
};

/**
 * Generate a random session type based on engagement type probabilities
 */
function getRandomSessionType(engagementType: string): typeof SESSION_TYPES[number] {
  const probs = SESSION_PROBABILITIES[engagementType] || SESSION_PROBABILITIES.views;
  const rand = Math.random();
  let cumulative = 0;

  for (const type of SESSION_TYPES) {
    cumulative += probs[type];
    if (rand < cumulative) return type;
  }
  return 'normal';
}

/**
 * Calculate human behavior score (0-100) for anti-detection analysis
 * Higher scores = more human-like behavior
 */
function calculateHumanScore(
  quantity: number,
  interval: number,
  hour: number,
  dayOfWeek: number,
  sessionType: typeof SESSION_TYPES[number],
  engagementType: string
): number {
  let score = 50; // Base score

  // Penalize consistent quantities
  const avgBatch = (TYPE_RUN_SIZE[engagementType]?.min || 10 + TYPE_RUN_SIZE[engagementType]?.max || 100) / 2;
  const quantityVariance = Math.abs(quantity - avgBatch) / avgBatch;
  score += quantityVariance * 20; // More variance = more human

  // Reward natural hour patterns
  const hourPattern = TYPE_DAILY_PATTERNS[engagementType] || TYPE_DAILY_PATTERNS.views;
  if (hourPattern[hour] > 1.0) score += 10; // Peak hour activity
  if (hour >= 2 && hour <= 5 && quantity < avgBatch) score += 15; // Low night activity

  // Reward weekend/weekday consistency
  const dayMultiplier = DAY_OF_WEEK_MULTIPLIERS[engagementType]?.[dayOfWeek] || 1.0;
  if ((dayOfWeek === 0 || dayOfWeek === 6) && dayMultiplier > 1.0) score += 8;

  // Session type affects score
  if (sessionType === 'pause') score += 12; // Pauses are very human
  if (sessionType === 'burst') score += 5;  // Bursts happen naturally

  // Interval randomness
  const baseInterval = TYPE_BASE_INTERVALS[engagementType]?.min || 30;
  const intervalVariance = Math.abs(interval - baseInterval) / baseInterval;
  score += Math.min(intervalVariance * 15, 15);

  return Math.min(100, Math.max(0, score));
}

function pickUniqueQuantity(
  preferredQuantity: number,
  minQuantity: number,
  maxQuantity: number,
  usedQuantities: Set<number>,
  previousQuantity?: number | null
): number {
  const safeMin = Math.round(Math.min(minQuantity, maxQuantity));
  const safeMax = Math.round(Math.max(minQuantity, maxQuantity));
  const preferred = Math.round(Math.max(safeMin, Math.min(safeMax, preferredQuantity)));
  const minGap = previousQuantity != null
    ? Math.max(2, Math.floor(Math.max(safeMin, previousQuantity) * 0.02))
    : 0;

  let fallback = preferred;

  for (let step = 0; step <= safeMax - safeMin; step++) {
    const candidates = step === 0 ? [preferred] : [preferred + step, preferred - step];

    for (const candidate of candidates) {
      if (candidate < safeMin || candidate > safeMax) continue;

      const isDuplicate = usedQuantities.has(candidate);
      const isTooClose = previousQuantity != null && Math.abs(candidate - previousQuantity) < minGap;
      const isRoundNumber = candidate % 5 === 0 && candidate !== safeMin;

      if (!isDuplicate && !isTooClose && !isRoundNumber) {
        return candidate;
      }

      if (!isDuplicate && !isTooClose && fallback === preferred) {
        fallback = candidate;
      } else if (!isDuplicate && fallback === preferred) {
        fallback = candidate;
      }
    }
  }

  return fallback;
}

function finalizeUniqueRuns(
  runs: OrganicRunConfig[],
  totalQuantity: number,
  minQuantity: number,
  maxQuantity: number
): OrganicRunConfig[] {
  if (runs.length <= 1) return runs;

  const adjustedRuns = runs.map((run) => ({ ...run }));
  const hardMax = Math.max(minQuantity, maxQuantity);
  const usedQuantities = new Set<number>();

  adjustedRuns.forEach((run, index) => {
    const previousQuantity = index > 0 ? adjustedRuns[index - 1].quantity : undefined;
    run.quantity = pickUniqueQuantity(run.quantity, minQuantity, hardMax, usedQuantities, previousQuantity);
    usedQuantities.add(run.quantity);
  });

  let drift = totalQuantity - adjustedRuns.reduce((sum, run) => sum + run.quantity, 0);
  let guard = 0;

  while (drift !== 0 && guard < 10000) {
    let changed = false;
    const candidateIndexes = adjustedRuns
      .map((run, index) => ({ index, quantity: run.quantity }))
      .sort((a, b) => (drift > 0 ? a.quantity - b.quantity : b.quantity - a.quantity))
      .map((item) => item.index);

    for (const index of candidateIndexes) {
      const step = drift > 0 ? 1 : -1;
      const candidateQuantity = adjustedRuns[index].quantity + step;
      const previousQuantity = index > 0 ? adjustedRuns[index - 1].quantity : undefined;

      if (candidateQuantity < minQuantity || candidateQuantity > hardMax) continue;
      if (adjustedRuns.some((run, runIndex) => runIndex !== index && run.quantity === candidateQuantity)) continue;
      if (previousQuantity != null && Math.abs(candidateQuantity - previousQuantity) < 2) continue;

      adjustedRuns[index].quantity = candidateQuantity;
      drift += drift > 0 ? -1 : 1;
      changed = true;

      if (drift === 0) break;
    }

    if (!changed) break;
    guard++;
  }

  if (drift !== 0 && adjustedRuns.length > 0) {
    adjustedRuns[adjustedRuns.length - 1].quantity += drift;
  }

  adjustedRuns.forEach((run) => {
    run.baseQuantity = run.quantity;
    run.varianceApplied = 0;
  });

  return adjustedRuns;
}




/**
 * Generate fully organic schedule for a single engagement type
 * Each type has completely independent, randomized timing
 * CRITICAL: All batches MUST be >= provider minimum (10)
 * NEW: Supports time limit constraint for user-specified delivery duration
 */
export function generateOrganicSchedule(
  engagementType: string,
  totalQuantity: number,
  variancePercent: number,
  peakEnabled: boolean,
  startTime: Date,
  serviceMinimum?: number,
  timeLimitHours?: number, // NEW: Optional time limit in hours
  forcedRunCount?: number   // NEW: User-specified exact run count
): FullOrganicConfig {
  // FORCED RUN COUNT BRANCH: user explicitly chose how many runs
  if (forcedRunCount && forcedRunCount > 0) {
    return generateForcedRunCountSchedule(
      engagementType,
      totalQuantity,
      forcedRunCount,
      variancePercent,
      startTime,
      serviceMinimum,
      timeLimitHours,
    );
  }

  const runs: OrganicRunConfig[] = [];
  const warnings: string[] = [];
  let patternBreakCount = 0;

  const providerMin = serviceMinimum || PROVIDER_MINIMUMS[engagementType] || 10;
  const typeIntervalConfig = TYPE_BASE_INTERVALS[engagementType] || { min: 40, max: 100, jitter: 15, chaosMultiplier: 2.5 };
  let typeInterval = { min: typeIntervalConfig.min, max: typeIntervalConfig.max };
  const typeRunSizeConfig = TYPE_RUN_SIZE[engagementType] || { min: 10, max: 50, variance: 0.4, spikeMax: 150 };

  // DYNAMIC SCALING: scale batch sizes for large orders
  const scaled = getScaledRunSize(engagementType, totalQuantity, providerMin);
  let typeRunSize = { min: scaled.min, max: scaled.max };
  const jitterAmount = typeIntervalConfig.jitter || 10;

  // Ensure minimum batch size respects provider minimum
  const effectiveMinBatch = Math.max(typeRunSize.min, providerMin);

  // DYNAMIC ULTRA MAX: scales with order size (no longer static 250 for views!)
  const ULTRA_MAX_PER_RUN: Record<string, number> = {
    views: scaled.ultraMax,
    likes: scaled.ultraMax,
    comments: scaled.ultraMax,
    saves: scaled.ultraMax,
    shares: scaled.ultraMax,
  };

  // NEW: Calculate time-constrained intervals if time limit is specified
  if (timeLimitHours && timeLimitHours > 0) {
    const timeLimitMinutes = timeLimitHours * 60;

    // Calculate how many runs we'll need with current batch sizes
    const avgBatchSize = (effectiveMinBatch + typeRunSize.max) / 2;
    const estimatedRuns = Math.ceil(totalQuantity / avgBatchSize);

    // Calculate what interval we need to fit within time limit
    // Leave some buffer (15%) for variance and jitter
    const availableMinutes = timeLimitMinutes * 0.85;
    const requiredInterval = availableMinutes / Math.max(estimatedRuns - 1, 1);

    // Adjust intervals to fit time limit while keeping randomness
    const intervalVariation = Math.min(requiredInterval * 0.3, 15);
    typeInterval = {
      min: Math.max(5, requiredInterval - intervalVariation),
      max: Math.max(10, requiredInterval + intervalVariation),
    };

    // If time is very tight, increase batch sizes to reduce number of runs
    if (requiredInterval < 15) {
      const minBatchForTime = Math.ceil(totalQuantity / (estimatedRuns * 0.5));
      typeRunSize = {
        min: Math.max(effectiveMinBatch, Math.min(minBatchForTime, 100)),
        max: Math.max(typeRunSize.max, Math.min(minBatchForTime * 2, 500)),
      };
      warnings.push(`Increased batch sizes to meet ${timeLimitHours}h time limit`);
    }

    warnings.push(`Time-constrained: ~${Math.round(requiredInterval)}min intervals for ${timeLimitHours}h delivery`);
  }

  // Check if total quantity is too low for organic pattern
  // For organic behavior, even small quantities should have 2-3 runs when possible
  if (totalQuantity < providerMin) {
    warnings.push(`Total quantity ${totalQuantity} is below provider minimum ${providerMin}`);
    const now = startTime;
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);

    runs.push({
      runNumber: 1,
      scheduledAt: startTime,
      quantity: totalQuantity,
      baseQuantity: totalQuantity,
      varianceApplied: 0,
      peakMultiplier: 1.0,
      dayOfWeek: istTime.getUTCDay(),
      hourOfDay: istTime.getUTCHours(),
      sessionType: 'normal',
      humanBehaviorScore: 60,
      patternBreaker: false,
    });

    return {
      engagementType,
      totalQuantity,
      runs,
      totalDuration: 0,
      warnings,
      patternBreakCount: 0,
      avgHumanScore: 60,
      varietyIndex: 0,
    };
  }

  // Small-quantity organic mode (still respects provider minimum)
  const maxRunsByMin = Math.floor(totalQuantity / providerMin);

  // Get type delays early (used by both small + normal modes)
  const typeDelays = TYPE_START_DELAYS[engagementType] || { min: 5, max: 40 };

  // For totals up to 25x the provider minimum, we use a denser splitting logic
  const shouldSmallQuantitySplit = maxRunsByMin >= 2 && totalQuantity < providerMin * 25;
  if (shouldSmallQuantitySplit) {
    // Distribute across 2-8 runs naturally, but leave "quantity budget" for variety
    const numRuns = Math.max(2, Math.min(8, Math.floor(maxRunsByMin * 0.7)));
    let remainingForSmall = totalQuantity;

    const istOffset = 5.5 * 60 * 60 * 1000;

    // Interval based on time limit or type defaults
    const targetIntervalMinutes = timeLimitHours && timeLimitHours > 0
      ? (timeLimitHours * 60 * 0.8) / (numRuns - 1)
      : typeInterval.min + Math.random() * (typeInterval.max - typeInterval.min);

    for (let i = 0; i < numRuns; i++) {
      const runsLeft = numRuns - i;
      const minNeededAfter = (runsLeft - 1) * providerMin;

      let batchQty: number;
      if (i === numRuns - 1) {
        batchQty = remainingForSmall; // remainder
      } else {
        const minAllowed = providerMin;
        const maxAllowed = remainingForSmall - minNeededAfter;

        // Pick a slightly-randomized "ideal" size but clamp to legal range
        const ideal = Math.round((remainingForSmall / runsLeft) * (0.6 + Math.random() * 0.8));
        batchQty = Math.max(minAllowed, Math.min(ideal, maxAllowed));

        // ULTRA-STRICT ANTI-REPEAT: Never use same quantity twice in one schedule for small orders
        if (runs.length > 0) {
          const usedQuantities = runs.map(r => r.quantity);
          let attempts = 0;
          const primeJitters = [1, 2, 3, 5, 7];

          while (usedQuantities.includes(batchQty) && attempts < 15 && maxAllowed > minAllowed) {
            const nudge = primeJitters[attempts % primeJitters.length];
            const nextUp = batchQty + nudge;
            const nextDown = batchQty - nudge;

            if (nextUp <= maxAllowed && !usedQuantities.includes(nextUp)) {
              batchQty = nextUp;
              break;
            } else if (nextDown >= minAllowed && !usedQuantities.includes(nextDown)) {
              batchQty = nextDown;
              break;
            }
            attempts++;
          }
        }
        // Final Anti-Round: ensure no round multiples of 5/10 if range allows
        if (batchQty % 5 === 0 && batchQty > minAllowed) {
          if (batchQty + 1 <= maxAllowed) batchQty += 1;
          else if (batchQty - 1 >= minAllowed) batchQty -= 1;
        }
      }

      // Schedule time with jitter
      let scheduleTime: Date;
      if (i === 0) {
        const initialDelay = (typeDelays.min + Math.random() * (typeDelays.max - typeDelays.min)) * 60 * 1000;
        scheduleTime = new Date(startTime.getTime() + initialDelay);
      } else {
        const prevTime = runs[runs.length - 1].scheduledAt;
        const intervalMs = targetIntervalMinutes * 60 * 1000;
        const jitterMs = (Math.random() - 0.5) * intervalMs * 0.6; // ±30% jitter
        scheduleTime = new Date(prevTime.getTime() + intervalMs + jitterMs);
      }

      const istTime = new Date(scheduleTime.getTime() + istOffset);

      runs.push({
        runNumber: i + 1,
        scheduledAt: scheduleTime,
        quantity: batchQty,
        baseQuantity: batchQty,
        varianceApplied: 0,
        peakMultiplier: 1.0,
        dayOfWeek: istTime.getUTCDay(),
        hourOfDay: istTime.getUTCHours(),
        sessionType: i === 0 ? "burst" : (Math.random() > 0.55 ? "normal" : "slow"),
        humanBehaviorScore: 70 + Math.floor(Math.random() * 20),
        patternBreaker: false,
      });

      remainingForSmall -= batchQty;
      if (remainingForSmall <= 0) break;
    }

    const finalizedRuns = finalizeUniqueRuns(runs, totalQuantity, providerMin, Math.max(providerMin + numRuns + 10, typeRunSize.max));

    const totalDurationSmall = finalizedRuns.length > 1
      ? finalizedRuns[finalizedRuns.length - 1].scheduledAt.getTime() - finalizedRuns[0].scheduledAt.getTime()
      : 0;

    return {
      engagementType,
      totalQuantity,
      runs: finalizedRuns,
      totalDuration: totalDurationSmall,
      warnings,
      patternBreakCount: 0,
      avgHumanScore: Math.round(finalizedRuns.reduce((s, r) => s + r.humanBehaviorScore, 0) / finalizedRuns.length),
      varietyIndex: 45,
    };
  }

  // HARD TIME LIMIT MODE: When user selects 6h/12h/etc, schedule MUST finish within that window.
  // We intentionally reduce chaos/pause logic here so the deadline is respected.
  if (timeLimitHours && timeLimitHours > 0) {
    const istOffset = 5.5 * 60 * 60 * 1000;

    const timeLimitMs = timeLimitHours * 60 * 60 * 1000;
    const scheduleEndMs = startTime.getTime() + timeLimitMs;

    // Small mandatory delay so first run is never "now" (aligns with submission-time behavior)
    const startDelayMs = Math.min(5 * 60 * 1000, Math.max(2 * 60 * 1000, timeLimitMs * 0.05));
    const scheduleStartMs = startTime.getTime() + startDelayMs;

    const minSpacingMs = 30 * 1000; // 30s
    const maxRunsByTime =
      scheduleEndMs > scheduleStartMs
        ? Math.floor((scheduleEndMs - scheduleStartMs) / minSpacingMs) + 1
        : 1;

    // Estimate run count from batch sizing, but cap for performance
    const avgBatchGuess = (effectiveMinBatch + Math.max(effectiveMinBatch, typeRunSize.max)) / 2;
    let targetRuns = Math.ceil(totalQuantity / Math.max(1, avgBatchGuess));

    // Reduce target runs to leave budget for randomness
    const maxPossibleRuns = Math.floor(totalQuantity / providerMin);
    if (targetRuns > maxPossibleRuns * 0.75 && maxPossibleRuns > 2) {
      targetRuns = Math.max(2, Math.floor(maxPossibleRuns * 0.75));
    }
    targetRuns = Math.min(300, maxPossibleRuns, Math.max(1, targetRuns));

    if (targetRuns <= 1) {
      const t = scheduleStartMs;
      const istTime = new Date(t + istOffset);

      runs.push({
        runNumber: 1,
        scheduledAt: new Date(t),
        quantity: totalQuantity,
        baseQuantity: totalQuantity,
        varianceApplied: 0,
        peakMultiplier: 1,
        dayOfWeek: istTime.getUTCDay(),
        hourOfDay: istTime.getUTCHours(),
        sessionType: 'normal',
        humanBehaviorScore: 60,
        patternBreaker: false,
      });

      return {
        engagementType,
        totalQuantity,
        runs,
        totalDuration: 0,
        warnings: [...warnings, `Hard time limit applied: ${timeLimitHours}h`],
        patternBreakCount: 0,
        avgHumanScore: 60,
        varietyIndex: 0,
      };
    }

    const spanMs = Math.max(0, scheduleEndMs - scheduleStartMs);
    const stepMs = spanMs / (targetRuns - 1);
    const jitterMaxMs = Math.min(2 * 60 * 1000, stepMs * 0.2);

    const typeDailyPattern = TYPE_DAILY_PATTERNS[engagementType] || TYPE_DAILY_PATTERNS.views;
    const dayOfWeekPattern = DAY_OF_WEEK_MULTIPLIERS[engagementType] || DAY_OF_WEEK_MULTIPLIERS.views;

    // Build times + weights first
    const times: number[] = [];
    const weights: number[] = [];
    let prevT = scheduleStartMs;

    for (let i = 0; i < targetRuns; i++) {
      const baseT = scheduleStartMs + i * stepMs;
      const jitter = (Math.random() * 2 - 1) * jitterMaxMs;

      let t = Math.round(baseT + jitter);
      if (i === 0) t = Math.max(t, scheduleStartMs);
      if (i === targetRuns - 1) t = Math.min(t, scheduleEndMs);

      // Ensure monotonic increasing
      t = Math.max(t, prevT + minSpacingMs);
      t = Math.min(t, scheduleEndMs - (targetRuns - 1 - i) * minSpacingMs);
      prevT = t;

      const istTime = new Date(t + istOffset);
      const hour = istTime.getUTCHours();
      const dayOfWeek = istTime.getUTCDay();

      let w = 1.0;

      if (peakEnabled) {
        const daily = typeDailyPattern[hour] || 1.0;
        const dayMult = dayOfWeekPattern[dayOfWeek] || 1.0;
        w *= daily * dayMult;
      }

      // Add controlled randomness based on user variance (but keep deadline safe)
      const varianceScale = Math.min(0.25, Math.max(0.05, (variancePercent / 100) * 0.25));
      w *= 1 + (Math.random() * 2 - 1) * varianceScale;

      weights.push(Math.max(0.05, w));
      times.push(t);
    }

    // Convert weights -> quantities
    const weightSum = weights.reduce((s, w) => s + w, 0) || 1;
    const maxForTypeBase = ULTRA_MAX_PER_RUN[engagementType] || 200;
    const avgNeeded = Math.ceil(totalQuantity / targetRuns);
    const maxForTimeLimit = Math.max(maxForTypeBase, Math.ceil(avgNeeded * 3));
    const minQty = providerMin;

    let quantities = weights.map((w) => Math.round((w / weightSum) * totalQuantity));

    // ANTI-REPEAT: Add random jitter to avoid identical consecutive quantities
    for (let i = 1; i < quantities.length; i++) {
      if (quantities[i] === quantities[i - 1] && quantities[i] > minQty) {
        const jitter = Math.ceil(Math.random() * Math.max(3, Math.floor(quantities[i] * 0.15)));
        quantities[i] = Math.random() > 0.5
          ? Math.max(minQty, quantities[i] - jitter)
          : Math.min(maxForTimeLimit, quantities[i] + jitter);
      }
      // Anti-round number: avoid multiples of 5/10
      if (quantities[i] % 5 === 0 && quantities[i] > minQty) {
        quantities[i] += Math.ceil(Math.random() * 3) * (Math.random() > 0.5 ? 1 : -1);
        quantities[i] = Math.max(minQty, Math.min(maxForTimeLimit, quantities[i]));
      }
    }

    // Fix rounding drift
    let drift = totalQuantity - quantities.reduce((s, q) => s + q, 0);
    if (drift !== 0) {
      const idxByWeight = weights
        .map((w, idx) => ({ w, idx }))
        .sort((a, b) => b.w - a.w)
        .map((x) => x.idx);

      let p = 0;
      while (drift !== 0 && p < idxByWeight.length * 10) {
        const idx = idxByWeight[p % idxByWeight.length];
        const next = quantities[idx] + (drift > 0 ? 1 : -1);
        if (next >= 0) {
          quantities[idx] = next;
          drift += drift > 0 ? -1 : 1;
        }
        p++;
      }
    }

    // Enforce per-run min/max, then rebalance to exact total
    quantities = quantities.map((q) => Math.max(minQty, Math.min(maxForTimeLimit, q)));

    let totalNow = quantities.reduce((s, q) => s + q, 0);

    if (totalNow > totalQuantity) {
      let extra = totalNow - totalQuantity;
      const idxByQtyDesc = quantities
        .map((q, idx) => ({ q, idx }))
        .sort((a, b) => b.q - a.q)
        .map((x) => x.idx);

      for (const idx of idxByQtyDesc) {
        if (extra <= 0) break;
        const reducible = quantities[idx] - minQty;
        const take = Math.min(reducible, extra);
        quantities[idx] -= take;
        extra -= take;
      }
    } else if (totalNow < totalQuantity) {
      let missing = totalQuantity - totalNow;
      const idxByQtyAsc = quantities
        .map((q, idx) => ({ q, idx }))
        .sort((a, b) => a.q - b.q)
        .map((x) => x.idx);

      for (const idx of idxByQtyAsc) {
        if (missing <= 0) break;
        const addable = maxForTimeLimit - quantities[idx];
        const take = Math.min(addable, missing);
        quantities[idx] += take;
        missing -= take;
      }
    }

    // Final safety: ensure exact total
    totalNow = quantities.reduce((s, q) => s + q, 0);
    if (totalNow !== totalQuantity) {
      quantities[quantities.length - 1] += totalQuantity - totalNow;
      quantities[quantities.length - 1] = Math.max(minQty, quantities[quantities.length - 1]);
    }

    const uniqueQuantities = finalizeUniqueRuns(
      quantities.map((qty, index) => ({
        runNumber: index + 1,
        scheduledAt: new Date(times[index]),
        quantity: qty,
        baseQuantity: qty,
        varianceApplied: 0,
        peakMultiplier: 1,
        dayOfWeek: 0,
        hourOfDay: 0,
        sessionType: 'normal',
        humanBehaviorScore: 0,
        patternBreaker: false,
      })),
      totalQuantity,
      minQty,
      maxForTimeLimit
    ).map((run) => run.quantity);

    for (let i = 0; i < targetRuns; i++) {
      const scheduledAt = new Date(times[i]);
      const istTime = new Date(times[i] + istOffset);
      const hour = istTime.getUTCHours();
      const dayOfWeek = istTime.getUTCDay();

      const intervalMinutes = i === 0 ? Math.round(stepMs / 60000) : Math.round((times[i] - times[i - 1]) / 60000);
      const qty = uniqueQuantities[i];

      const humanScore = calculateHumanScore(
        qty,
        Math.max(1, intervalMinutes),
        hour,
        dayOfWeek,
        'normal',
        engagementType
      );

      runs.push({
        runNumber: i + 1,
        scheduledAt,
        quantity: qty,
        baseQuantity: qty,
        varianceApplied: 0,
        peakMultiplier: 1.0,
        dayOfWeek,
        hourOfDay: hour,
        sessionType: 'normal',
        humanBehaviorScore: humanScore,
        patternBreaker: false,
      });
    }

    const totalDuration =
      runs.length > 1 ? runs[runs.length - 1].scheduledAt.getTime() - runs[0].scheduledAt.getTime() : 0;

    return {
      engagementType,
      totalQuantity,
      runs,
      totalDuration,
      warnings: [...warnings, `Hard time limit applied: ${timeLimitHours}h`],
      patternBreakCount: 0,
      avgHumanScore: Math.round(runs.reduce((s, r) => s + r.humanBehaviorScore, 0) / runs.length),
      varietyIndex: 55,
    };
  }

  // Initialize loop variables for normal organic mode
  let remaining = totalQuantity;
  let currentTime = new Date(startTime.getTime());
  let runNumber = 1;
  let lastQuantity = 0;
  let lastSessionType: typeof SESSION_TYPES[number] = 'normal';

  // Dynamic safety limit - scales with order size
  // Small orders: 500, Large orders (600K+): up to 800
  const maxRunLimit = Math.min(800, Math.max(500, Math.ceil(totalQuantity / 1000)));

  const initialDelayMinutes = typeDelays.min + Math.random() * (typeDelays.max - typeDelays.min);
  const initialDelay = initialDelayMinutes * 60 * 1000;
  currentTime = new Date(currentTime.getTime() + initialDelay);

  // Get S-curve profile for this type with all chaos properties
  const curveProfile = TYPE_CURVE_PROFILES[engagementType] || {
    rampUpPercent: 25, peakPercent: 40, declinePercent: 35, viralChance: 0.08, dipChance: 0.10, microPauseChance: 0.08, megaSpikeChance: 0.03
  };

  // Get type-specific patterns
  const typeDailyPattern = TYPE_DAILY_PATTERNS[engagementType] || TYPE_DAILY_PATTERNS.views;
  const dayOfWeekPattern = DAY_OF_WEEK_MULTIPLIERS[engagementType] || DAY_OF_WEEK_MULTIPLIERS.views;

  // Get chaos multiplier for this type
  const chaosMultiplier = typeIntervalConfig.chaosMultiplier || 2.5;
  const spikeMax = scaled.spikeMax || typeRunSize.max * 2;

  while (remaining > 0) {
    // Get random session type for this run
    const sessionType = getRandomSessionType(engagementType);
    const sessionMult = SESSION_MULTIPLIERS[sessionType];

    // CHAOS: Pattern breakers more frequent
    const isPatternBreaker = Math.random() < 0.18; // 18% chance

    // EXTREME random interval with chaos multiplier
    const baseIntervalMinutes = typeInterval.min + Math.random() * (typeInterval.max - typeInterval.min);
    let intervalMultiplier = sessionMult.interval;

    // Add HEAVY randomness - each run can vary dramatically
    intervalMultiplier *= (0.5 + Math.random() * chaosMultiplier);

    // Pattern breaker: use extremely different interval
    if (isPatternBreaker) {
      const chaosRoll = Math.random();
      if (chaosRoll < 0.3) {
        intervalMultiplier *= 0.15; // Sudden rapid fire
      } else if (chaosRoll < 0.6) {
        intervalMultiplier *= 3.5; // Long pause
      } else {
        intervalMultiplier *= (0.2 + Math.random() * 2.8); // Random extreme
      }
      patternBreakCount++;
    }

    const intervalMinutes = Math.max(3, baseIntervalMinutes * intervalMultiplier);
    const intervalMs = intervalMinutes * 60 * 1000;

    // EXTREME asymmetric jitter 
    const jitterDirection = Math.random() > 0.5 ? 1 : -1;
    const jitterMs = jitterDirection * Math.random() * jitterAmount * 1.5 * 60 * 1000;
    const scheduledAt = new Date(currentTime.getTime() + jitterMs);

    // Calculate IST time for peak hours and day patterns
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(scheduledAt.getTime() + istOffset);
    const hour = istTime.getUTCHours();
    const dayOfWeek = istTime.getUTCDay();

    // Type-specific daily pattern with day of week adjustment
    let dailyMultiplier = typeDailyPattern[hour] || 1.0;
    const dayMultiplier = dayOfWeekPattern[dayOfWeek] || 1.0;
    dailyMultiplier *= dayMultiplier;

    // Apply CHAOTIC S-curve multiplier
    const estimatedTotalRuns = Math.ceil(totalQuantity / ((effectiveMinBatch + typeRunSize.max) / 2));
    const runProgress = runNumber / Math.max(estimatedTotalRuns, 1);
    let sCurveMultiplier = 1.0;

    // Add random noise to S-curve for natural irregularity
    const curveNoise = 0.7 + Math.random() * 0.6; // 0.7-1.3x noise

    if (runProgress <= curveProfile.rampUpPercent / 100) {
      // Ramp up with noise - not smooth!
      sCurveMultiplier = (0.3 + (runProgress / (curveProfile.rampUpPercent / 100)) * 0.7) * curveNoise;
    } else if (runProgress <= (curveProfile.rampUpPercent + curveProfile.peakPercent) / 100) {
      // Peak phase - high but irregular
      sCurveMultiplier = (0.9 + Math.random() * 0.4) * curveNoise;
    } else {
      // Decline - gradual but bumpy
      const declineProgress = (runProgress - (curveProfile.rampUpPercent + curveProfile.peakPercent) / 100) / (curveProfile.declinePercent / 100);
      sCurveMultiplier = Math.max(0.3, (1.0 - declineProgress * 0.5) * curveNoise);
    }

    // EXTREME viral spikes and dips for visible chart chaos
    let viralDipMultiplier = 1.0;
    const eventRoll = Math.random();

    if (eventRoll < curveProfile.megaSpikeChance) {
      // MEGA SPIKE - huge viral moment
      viralDipMultiplier = 2.5 + Math.random() * 2.0; // 2.5-4.5x spike!
    } else if (eventRoll < curveProfile.megaSpikeChance + curveProfile.viralChance) {
      // Normal viral spike
      viralDipMultiplier = 1.5 + Math.random() * 1.2; // 1.5-2.7x
    } else if (eventRoll < curveProfile.megaSpikeChance + curveProfile.viralChance + curveProfile.microPauseChance) {
      // Micro pause - very low activity
      viralDipMultiplier = 0.15 + Math.random() * 0.25; // 0.15-0.4x
    } else if (eventRoll < curveProfile.megaSpikeChance + curveProfile.viralChance + curveProfile.microPauseChance + curveProfile.dipChance) {
      // Natural dip
      viralDipMultiplier = 0.25 + Math.random() * 0.35; // 0.25-0.6x
    }

    // Peak hour multiplier with all chaos factors
    let peakMultiplier = dailyMultiplier * sCurveMultiplier * viralDipMultiplier;

    // Add random fluctuation on top
    peakMultiplier *= (0.6 + Math.random() * 0.8); // 0.6-1.4x random

    if (peakEnabled) {
      peakMultiplier = Math.max(0.1, Math.min(4.0, peakMultiplier)); // Allow bigger extremes
    } else {
      peakMultiplier = sCurveMultiplier * viralDipMultiplier * (0.7 + Math.random() * 0.6);
    }

    // TRULY RANDOM quantity generation - uses FULL range from providerMin to max
    // This prevents the "all same quantity" drip-feed look
    let baseQty: number;

    // Use multiple distribution tiers for visible randomness
    const tierRoll = Math.random();
    if (tierRoll < 0.05) {
      // MEGA SPIKE: use spike max (rare but dramatic)
      baseQty = Math.floor(typeRunSize.max + Math.random() * (spikeMax - typeRunSize.max));
    } else if (tierRoll < 0.20) {
      // BIG batch: upper 60-100% of range
      baseQty = Math.floor(effectiveMinBatch + (0.6 + Math.random() * 0.4) * (typeRunSize.max - effectiveMinBatch));
    } else if (tierRoll < 0.45) {
      // MEDIUM batch: middle 30-60% of range
      baseQty = Math.floor(effectiveMinBatch + (0.3 + Math.random() * 0.3) * (typeRunSize.max - effectiveMinBatch));
    } else if (tierRoll < 0.70) {
      // SMALL batch: lower 0-30% of range (near providerMin)
      baseQty = Math.floor(effectiveMinBatch + Math.random() * 0.3 * (typeRunSize.max - effectiveMinBatch));
    } else {
      // EXACT minimum or near it (creates natural "dip" in charts)
      baseQty = effectiveMinBatch + Math.floor(Math.random() * Math.max(1, effectiveMinBatch * 0.15));
    }

    baseQty = Math.round(baseQty * sessionMult.quantity);

    // Apply HEAVY variance - user setting amplified
    const varianceAmplified = Math.min(variancePercent * 1.8, 90); // Even stronger amplification
    const varianceFactor = 1 + (Math.random() * 2 - 1) * (varianceAmplified / 100);
    let qty = Math.round(baseQty * peakMultiplier * varianceFactor);

    // DYNAMIC SPLIT SAFETY: If we have room for multiple runs, don't consume everything in one go
    // If total remaining is not huge, don't take more than 40-50% in one run
    if (remaining > providerMin * 3) {
      const maxSafeQty = Math.floor(remaining * (0.35 + Math.random() * 0.15));
      qty = Math.min(qty, Math.max(providerMin, maxSafeQty));
    }

    // ULTRA ANTI-REPEAT: Track last 5 quantities, reject any that match
    // This prevents the robotic +10, +10, +10 pattern
    const recentQuantities = runs.slice(-5).map(r => r.quantity);

    // CRITICAL: Ensure quantity is ALWAYS >= provider minimum FIRST
    qty = Math.max(qty, providerMin);

    // Cap maximum per run
    const maxForType = ULTRA_MAX_PER_RUN[engagementType] || scaled.max || 500;
    qty = Math.min(qty, maxForType);

    // ANTI-ROUND NUMBER: Add jitter so we never land on exact multiples of 5 or 10
    if (qty % 5 === 0 && qty > providerMin) {
      const jitter = Math.random() > 0.5 ? Math.ceil(Math.random() * 4) : -Math.ceil(Math.random() * 4);
      qty = Math.max(providerMin, qty + jitter);
    }

    // DEEP ANTI-REPEAT: If this quantity was used in last 5 runs, force a different value
    let antiRepeatAttempts = 0;
    while (recentQuantities.includes(qty) && antiRepeatAttempts < 15) {
      // Generate a completely new random quantity within the valid range
      const range = Math.max(1, maxForType - providerMin);
      qty = providerMin + Math.floor(Math.random() * range);
      // Add non-round jitter
      if (qty % 5 === 0 && range > 10) {
        qty += Math.ceil(Math.random() * 3) * (Math.random() > 0.5 ? 1 : -1);
        qty = Math.max(providerMin, Math.min(maxForType, qty));
      }
      antiRepeatAttempts++;
    }

    // STRONG anti-pattern - force big differences between consecutive runs
    if (lastQuantity > 0) {
      const similarity = Math.abs(qty - lastQuantity) / Math.max(qty, lastQuantity);
      if (similarity < 0.25) { // If within 25% similarity
        // Force dramatic change
        if (Math.random() > 0.5) {
          qty = Math.round(qty * (1.5 + Math.random() * 1.5)); // 1.5x-3x bigger
        } else {
          qty = Math.max(providerMin, Math.round(qty * (0.3 + Math.random() * 0.3))); // Much smaller
        }
        // Re-apply bounds
        qty = Math.max(providerMin, Math.min(maxForType, qty));
        // Final anti-round
        if (qty % 5 === 0 && qty > providerMin) {
          qty += Math.ceil(Math.random() * 3);
        }
      }
    }

    // Ensure we don't exceed remaining
    qty = Math.min(qty, remaining);

    // If remaining itself is too small to legally split into 2 runs, send it all now
    // (Fixes: min=10, total=25 should split into 10+15, not force 25 in one batch)
    if (remaining < providerMin * 2) {
      qty = remaining;
    }

    // Skip this run if it would leave remaining below minimum
    if (remaining - qty > 0 && remaining - qty < providerMin) {
      qty = remaining;
    }

    // Only add run if quantity meets provider minimum (or it's the last batch)
    if (qty >= providerMin || remaining === qty) {
      const humanScore = calculateHumanScore(qty, intervalMinutes, hour, dayOfWeek, sessionType, engagementType);

      runs.push({
        runNumber,
        scheduledAt,
        quantity: qty,
        baseQuantity: baseQty,
        varianceApplied: qty - baseQty,
        peakMultiplier,
        dayOfWeek,
        hourOfDay: hour,
        sessionType,
        humanBehaviorScore: humanScore,
        patternBreaker: isPatternBreaker,
      });

      lastQuantity = qty;
      lastSessionType = sessionType;
      remaining -= qty;
      runNumber++;

      // NEW: Force at least 2 runs if we have enough for 2 provider mins remaining
      if (remaining > 0 && remaining < providerMin) {
        // If what's left is < min, adjust this run to leave nothing
        const lastRun = runs[runs.length - 1];
        lastRun.quantity += remaining;
        remaining = 0;
      }
    } else {
      warnings.push(`Skipped batch of ${qty} (below minimum ${providerMin})`);
    }

    currentTime = new Date(currentTime.getTime() + intervalMs);

    if (runNumber > maxRunLimit) {
      warnings.push(`Reached maximum run limit (${maxRunLimit})`);
      break;
    }
  }

  // ULTRA ORGANIC: Handle remaining quantity by SPREADING across additional runs
  // Don't dump everything into last batch - that's not human-like!
  if (remaining > 0) {
    const maxForRemaining = ULTRA_MAX_PER_RUN[engagementType] || 200;
    const typeIntervalForRemaining = TYPE_BASE_INTERVALS[engagementType] || { min: 30, max: 90 };

    while (remaining > 0) {
      // Calculate batch size for remaining
      let batchSize = Math.min(
        remaining,
        maxForRemaining,
        providerMin + Math.floor(Math.random() * (maxForRemaining - providerMin))
      );

      // Ensure minimum
      batchSize = Math.max(batchSize, providerMin);

      // If this is the last possible batch, take everything
      if (remaining < providerMin * 2) {
        batchSize = remaining;
      }

      // Schedule with random interval
      const intervalMs = (typeIntervalForRemaining.min + Math.random() * (typeIntervalForRemaining.max - typeIntervalForRemaining.min)) * 60 * 1000;
      const scheduledAt = new Date(currentTime.getTime() + intervalMs);

      const istOffset = 5.5 * 60 * 60 * 1000;
      const istTime = new Date(scheduledAt.getTime() + istOffset);

      runs.push({
        runNumber,
        scheduledAt,
        quantity: batchSize,
        baseQuantity: batchSize,
        varianceApplied: 0,
        peakMultiplier: 0.8 + Math.random() * 0.4, // Slight variation
        dayOfWeek: istTime.getUTCDay(),
        hourOfDay: istTime.getUTCHours(),
        sessionType: 'normal',
        humanBehaviorScore: 65 + Math.floor(Math.random() * 20),
        patternBreaker: false,
      });

      remaining -= batchSize;
      runNumber++;
      currentTime = scheduledAt;

      // Safety limit
      if (runNumber > maxRunLimit) break;
    }
  }

  const finalizedRuns = finalizeUniqueRuns(runs, totalQuantity, providerMin, ULTRA_MAX_PER_RUN[engagementType] || scaled.ultraMax || scaled.max || providerMin + totalQuantity);

  const totalDuration = finalizedRuns.length > 1
    ? finalizedRuns[finalizedRuns.length - 1].scheduledAt.getTime() - finalizedRuns[0].scheduledAt.getTime()
    : 0;

  const quantities = finalizedRuns.map(r => r.quantity);
  const avgQty = quantities.reduce((a, b) => a + b, 0) / quantities.length;
  const variance = quantities.reduce((sum, q) => sum + Math.pow(q - avgQty, 2), 0) / quantities.length;
  const varietyIndex = Math.min(100, Math.round((Math.sqrt(variance) / avgQty) * 100));

  const avgHumanScore = Math.round(finalizedRuns.reduce((sum, r) => sum + r.humanBehaviorScore, 0) / finalizedRuns.length);

  return {
    engagementType,
    totalQuantity,
    runs: finalizedRuns,
    totalDuration,
    warnings,
    patternBreakCount,
    avgHumanScore,
    varietyIndex,
  };
}

/**
 * Generate organic schedules for all enabled engagement types
 * NEW: Supports per-type settings (time limit, variance, peak hours)
 */
export function generateAllOrganicSchedules(
  engagements: Array<{
    type: string;
    quantity: number;
    enabled: boolean;
    serviceMinimum?: number;
    // Per-type organic settings (optional)
    timeLimitHours?: number;
    variancePercent?: number;
    peakHoursEnabled?: boolean;
  }>,
  // These are now fallback defaults if per-type not specified
  defaultVariancePercent: number = 25,
  defaultPeakEnabled: boolean = false,
  startTime: Date = new Date(),
  defaultTimeLimitHours?: number
): FullOrganicConfig[] {
  const schedules = engagements
    .filter(e => e.enabled && e.quantity > 0)
    .map(e => generateOrganicSchedule(
      e.type,
      e.quantity,
      // Use per-type settings or fallback to defaults
      e.variancePercent ?? defaultVariancePercent,
      e.peakHoursEnabled ?? defaultPeakEnabled,
      startTime,
      e.serviceMinimum,
      e.timeLimitHours ?? defaultTimeLimitHours
    ));

  // NEW: Cross-type organic coordination — views lead, others trail proportionally
  return coordinateOrganicSchedules(schedules, startTime);
}

/**
 * ORGANIC COORDINATION LAYER
 * Real engagement pattern: views go first, then likes/saves/shares/comments/reposts
 * trickle in AFTER views start, and their cumulative progress never runs ahead of views.
 * This dramatically reduces bot-detection scores because platform algorithms expect
 * secondary engagement to follow view growth, not precede or race it.
 */
function coordinateOrganicSchedules(
  schedules: FullOrganicConfig[],
  startTime: Date,
): FullOrganicConfig[] {
  const viewSched = schedules.find(s => s.engagementType === 'views');
  // No views leader → nothing to coordinate against
  if (!viewSched || viewSched.runs.length === 0) return schedules;

  const viewRuns = [...viewSched.runs].sort(
    (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime(),
  );
  const viewTotal = viewSched.totalQuantity;
  const viewFirst = viewRuns[0].scheduledAt.getTime();
  const viewEnd = viewRuns[viewRuns.length - 1].scheduledAt.getTime();
  const viewSpan = Math.max(1, viewEnd - viewFirst);

  // Precompute view cumulative delivery ratio at any timestamp
  const viewCumRatioAt = (t: number): number => {
    if (t <= viewFirst) return 0;
    if (t >= viewEnd) return 1;
    let cum = 0;
    for (const r of viewRuns) {
      if (r.scheduledAt.getTime() <= t) cum += r.quantity;
      else break;
    }
    return Math.min(1, cum / viewTotal);
  };

  // Industry-standard start-delay range: secondary engagement lags views by 5-15 min
  const DELAY_MIN_MS = 5 * 60 * 1000;
  const DELAY_MAX_MS = 15 * 60 * 1000;
  // Tolerance: secondary cum ratio may briefly exceed view ratio by this factor
  const TOLERANCE = 1.05;
  // Max push per throttle step
  const PUSH_STEP_MS = 90 * 1000;
  const MAX_PUSH_STEPS = 60;
  // Allow secondary types to end slightly after views (natural tail)
  const TAIL_ALLOWANCE_MS = 30 * 60 * 1000;

  return schedules.map(s => {
    if (s.engagementType === 'views' || s.runs.length === 0) return s;

    const runs = [...s.runs].sort(
      (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime(),
    );
    const origFirst = runs[0].scheduledAt.getTime();
    const origSpan = Math.max(
      1,
      runs[runs.length - 1].scheduledAt.getTime() - origFirst,
    );

    // Per-type independent random delay so each type has its own "feel"
    const delay = DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS);
    const newStart = viewFirst + delay;

    // Stretch this type's window to roughly match views (0.9x-1.2x) so it trails naturally
    const targetSpan = Math.max(origSpan, viewSpan * (0.9 + Math.random() * 0.3));
    const scale = targetSpan / origSpan;

    // Step 1: rescale timestamps around new start
    const shifted = runs.map(r => {
      const rel = r.scheduledAt.getTime() - origFirst;
      return {
        ...r,
        scheduledAt: new Date(newStart + rel * scale),
      };
    });

    // Step 2: throttle each run so cumulative ratio ≤ view cumulative ratio * tolerance
    const total = s.totalQuantity;
    let cumBefore = 0;
    const maxAllowedTime = viewEnd + TAIL_ALLOWANCE_MS;

    for (let i = 0; i < shifted.length; i++) {
      const r = shifted[i];
      let t = r.scheduledAt.getTime();
      // Never schedule earlier than previous run + small gap
      if (i > 0) {
        const minT = shifted[i - 1].scheduledAt.getTime() + 30 * 1000;
        if (t < minT) t = minT;
      }
      const targetRatioAfter = (cumBefore + r.quantity) / total;

      let steps = 0;
      while (
        steps < MAX_PUSH_STEPS &&
        t < maxAllowedTime &&
        targetRatioAfter > viewCumRatioAt(t) * TOLERANCE
      ) {
        t += PUSH_STEP_MS;
        steps++;
      }
      shifted[i] = { ...r, scheduledAt: new Date(t) };
      cumBefore += r.quantity;
    }

    // Step 3: re-sort & renumber, update day/hour metadata, mark as coordinated
    shifted.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    shifted.forEach((r, i) => {
      r.runNumber = i + 1;
      r.dayOfWeek = r.scheduledAt.getDay();
      r.hourOfDay = r.scheduledAt.getHours();
    });

    const totalDuration =
      shifted[shifted.length - 1].scheduledAt.getTime() -
      shifted[0].scheduledAt.getTime();

    return {
      ...s,
      runs: shifted,
      totalDuration,
      warnings: [
        ...s.warnings,
        `Coordinated with views: starts ~${Math.round(delay / 60000)}min after views, throttled to trail view progress`,
      ],
    };
  });
}




/**
 * Validate if a quantity is valid for provider
 */
export function validateQuantityForProvider(
  quantity: number,
  engagementType: string
): { valid: boolean; error?: string } {
  const min = PROVIDER_MINIMUMS[engagementType] || 10;
  const max = PROVIDER_MAXIMUMS[engagementType] || 1000000;

  if (quantity < min) {
    return { valid: false, error: `Minimum order is ${min}` };
  }
  if (quantity > max) {
    return { valid: false, error: `Maximum order is ${max.toLocaleString()}` };
  }
  return { valid: true };
}

/**
 * Get peak hour label for a given time
 */
export function getPeakLabel(date: Date): string {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(date.getTime() + istOffset);
  const hour = istTime.getUTCHours();

  if (hour >= 18 && hour <= 22) {
    return '🔥 Peak';
  } else if (hour >= 9 && hour <= 12) {
    return '☀️ Morning';
  } else if (hour >= 22 || hour < 6) {
    return '🌙 Night';
  }
  return '📊 Normal';
}

/**
 * Format duration in human readable format
 */
export function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours === 0) {
    return `${minutes} min`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Get estimated delivery time for display
 */
export function getEstimatedDeliveryTime(totalQuantity: number, engagementType: string): string {
  const typeRunSize = TYPE_RUN_SIZE[engagementType] || { min: 10, max: 50 };
  const typeInterval = TYPE_BASE_INTERVALS[engagementType] || { min: 40, max: 100 };

  const avgRunSize = (typeRunSize.min + typeRunSize.max) / 2;
  const avgInterval = (typeInterval.min + typeInterval.max) / 2;
  const estimatedRuns = Math.ceil(totalQuantity / avgRunSize);
  const estimatedMinutes = estimatedRuns * avgInterval;

  return formatDuration(estimatedMinutes * 60 * 1000);
}

// Legacy exports for compatibility
export function calculateOrganicQuantities(
  totalQuantity: number,
  runs: number,
  variancePercent: number,
  peakEnabled: boolean,
  startTime: Date,
  intervalMs: number
): OrganicRunConfig[] {
  const schedule = generateOrganicSchedule('views', totalQuantity, variancePercent, peakEnabled, startTime);
  return schedule.runs;
}

export function intervalToMs(interval: number, unit: 'minutes' | 'hours'): number {
  if (unit === 'hours') {
    return interval * 60 * 60 * 1000;
  }
  return interval * 60 * 1000;
}

export function calculateRunCount(
  totalQuantity: number,
  qtyPerRun: number,
  minQuantity: number = 10
): number {
  const effectiveQtyPerRun = Math.max(qtyPerRun, minQuantity);
  return Math.max(1, Math.ceil(totalQuantity / effectiveQtyPerRun));
}

export function calculateTotalDuration(
  runs: number,
  interval: number,
  unit: 'minutes' | 'hours'
): number {
  return (runs - 1) * intervalToMs(interval, unit);
}

/**
 * FORCED RUN COUNT: Generate schedule with exact user-chosen run count.
 * Distributes total quantity across N runs with ±variance, ensuring each
 * run >= providerMin. Spreads times across timeLimitHours window (or default).
 */
export function generateForcedRunCountSchedule(
  engagementType: string,
  totalQuantity: number,
  requestedRunCount: number,
  variancePercent: number,
  startTime: Date,
  serviceMinimum?: number,
  timeLimitHours?: number,
): FullOrganicConfig {
  const providerMin = serviceMinimum || PROVIDER_MINIMUMS[engagementType] || 10;
  const warnings: string[] = [];

  // Clamp run count: cannot exceed quantity / providerMin
  const maxAllowedRuns = Math.max(1, Math.floor(totalQuantity / providerMin));
  const runCount = Math.max(1, Math.min(requestedRunCount, maxAllowedRuns));

  if (requestedRunCount > maxAllowedRuns) {
    warnings.push(
      `Requested ${requestedRunCount} runs exceeds max ${maxAllowedRuns} (quantity ${totalQuantity} / min ${providerMin}). Clamped.`
    );
  }

  // Time window: use timeLimitHours if set, else estimate from default intervals
  const intervalCfg = TYPE_BASE_INTERVALS[engagementType] || { min: 15, max: 60, jitter: 10, chaosMultiplier: 2 };
  const totalWindowMs = timeLimitHours && timeLimitHours > 0
    ? timeLimitHours * 60 * 60 * 1000
    : Math.max(runCount, 1) * ((intervalCfg.min + intervalCfg.max) / 2) * 60 * 1000;

  // Distribute quantity: each run gets at least providerMin, then random share of remainder
  const baseQty = Math.floor(totalQuantity / runCount);
  const variance = Math.max(0, Math.min(variancePercent ?? 25, 80)) / 100;

  // Generate raw weighted quantities respecting min
  const quantities: number[] = new Array(runCount);
  let remaining = totalQuantity;
  for (let i = 0; i < runCount; i++) {
    const isLast = i === runCount - 1;
    if (isLast) {
      quantities[i] = Math.max(providerMin, remaining);
      continue;
    }
    // Random multiplier in [1-variance, 1+variance]
    const mult = 1 + (Math.random() * 2 - 1) * variance;
    let q = Math.max(providerMin, Math.round(baseQty * mult));
    // Don't take so much that remaining runs can't get providerMin each
    const runsLeft = runCount - i - 1;
    const reserveForRest = runsLeft * providerMin;
    const maxThisRun = Math.max(providerMin, remaining - reserveForRest);
    if (q > maxThisRun) q = maxThisRun;
    quantities[i] = q;
    remaining -= q;
  }

  // Final balance pass to ensure sum === totalQuantity
  let sum = quantities.reduce((a, b) => a + b, 0);
  let drift = totalQuantity - sum;
  let guard = 0;
  while (drift !== 0 && guard < 10000) {
    const idx = Math.floor(Math.random() * runCount);
    const step = drift > 0 ? 1 : -1;
    const next = quantities[idx] + step;
    if (next >= providerMin) {
      quantities[idx] = next;
      drift -= step;
    }
    guard++;
  }

  // Spread scheduled times across the window with jitter
  const runs: OrganicRunConfig[] = [];
  const jitterMs = Math.min(totalWindowMs / Math.max(runCount * 4, 4), 5 * 60 * 1000);
  for (let i = 0; i < runCount; i++) {
    const ratio = runCount === 1 ? 0 : i / (runCount - 1);
    const baseOffset = ratio * totalWindowMs;
    const jitter = (Math.random() * 2 - 1) * jitterMs;
    const scheduledAt = new Date(startTime.getTime() + Math.max(0, baseOffset + jitter));
    runs.push({
      runNumber: i + 1,
      scheduledAt,
      quantity: quantities[i],
      baseQuantity: quantities[i],
      varianceApplied: 0,
      peakMultiplier: 1,
      dayOfWeek: scheduledAt.getDay(),
      hourOfDay: scheduledAt.getHours(),
      sessionType: 'normal',
      humanBehaviorScore: 85,
      patternBreaker: false,
    });
  }
  runs.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  runs.forEach((r, i) => { r.runNumber = i + 1; });

  // Anti-repeat: no two provider orders on the same link share a quantity
  const uniqueRuns = runs.length > 1
    ? finalizeUniqueRuns(
        runs,
        totalQuantity,
        providerMin,
        Math.max(...runs.map((r) => r.quantity)) + runs.length * 3
      )
    : runs;

  const totalDuration = uniqueRuns.length > 1
    ? uniqueRuns[uniqueRuns.length - 1].scheduledAt.getTime() - uniqueRuns[0].scheduledAt.getTime()
    : 0;


  return {
    engagementType,
    totalQuantity,
    runs: uniqueRuns,
    totalDuration,
    warnings,
    patternBreakCount: 0,
    avgHumanScore: 85,
    varietyIndex: 0.8,
  };
}
