// ===============================================
// ORGANIC PATTERN LIBRARY v2.0 - 500+ UNIQUE TEMPLATES
// Each template has a unique ID for reproducible, searchable graphs
// Deep research-based patterns mimicking real social media behavior
// ===============================================

export type PatternStyle = 
  | 'smooth-s-curve'      // Classic S-curve
  | 'exponential-burst'   // Slow start, explosive end
  | 'logarithmic-fade'    // Fast start, gradual fade
  | 'stepped-growth'      // Distinct steps/plateaus
  | 'viral-spike'         // Random viral moments
  | 'wave-pattern'        // Up-down oscillations
  | 'delayed-explosion'   // Long flat, then burst
  | 'early-peak'          // Peak early, taper off
  | 'double-peak'         // Two growth phases
  | 'chaotic-organic'     // Maximum randomness
  | 'slow-steady'         // Consistent gradual growth
  | 'burst-pause-burst'   // Intermittent bursts
  | 'hockey-stick'        // Flat then exponential
  | 'plateau-heavy'       // Multiple long plateaus
  | 'micro-burst'         // Many tiny increments
  | 'mega-burst'          // Few large increments
  | 'reverse-s'           // Inverted S pattern
  | 'staircase'           // Clear step function
  | 'roller-coaster'      // Wild ups and downs
  | 'gradual-accelerate'  // Slowly increasing speed
  // NEW: Additional 30 pattern styles for 500+ combinations
  | 'pulse-wave'          // Rhythmic pulses
  | 'fibonacci-spiral'    // Growth following golden ratio
  | 'random-walk'         // Brownian motion style
  | 'sawtooth'            // Sharp rises, gradual falls
  | 'inverse-sawtooth'    // Gradual rises, sharp drops
  | 'triple-peak'         // Three distinct peaks
  | 'bell-curve'          // Normal distribution
  | 'bimodal'             // Two humps
  | 'tornado-funnel'      // Wide to narrow
  | 'expansion-wave'      // Narrow to wide
  | 'heartbeat'           // Quick spike, rest, repeat
  | 'tidal-wave'          // Slow build, crash
  | 'earthquake'          // Sudden disruption, aftershocks
  | 'sunrise-curve'       // Gentle morning rise
  | 'sunset-fade'         // Evening decline
  | 'sprint-rest'         // Quick burst, long rest
  | 'marathon'            // Steady long-distance
  | 'guerrilla'           // Unpredictable strikes
  | 'avalanche'           // Starts slow, cascades
  | 'drip-feed'           // Consistent small amounts
  | 'flash-flood'         // Sudden overwhelming volume
  | 'glacier'             // Imperceptibly slow
  | 'rocket-launch'       // Explosive then coast
  | 'meteor-shower'       // Multiple small bursts
  | 'solar-flare'         // Intense burst, calm period
  | 'echo-chamber'        // Diminishing echoes
  | 'snowball'            // Growing momentum
  | 'quantum-leap'        // Discrete jumps
  | 'organic-chaos'       // Natural randomness
  | 'zen-flow';           // Smooth, balanced

// Pattern configuration structure
export interface PatternConfig {
  microSteps: [number, number];
  clusterChance: number;
  pauseChance: number;
  timeJitterMs: [number, number];
  gradualFactor: number;
  dipChance: number;
  burstChance: number;
  plateauDuration: number;
  curveShape: number;
}

// Template structure with unique ID
export interface OrganicTemplate {
  id: number;                    // Unique 1-500+ ID
  name: string;                  // Human-readable name
  style: PatternStyle;           // Base pattern style
  variant: number;               // Variant within style (0-24)
  config: PatternConfig;         // Pattern configuration
  platform?: string;             // Optimized for platform
  engagement?: string;           // Optimized for engagement type
  description: string;           // What this pattern looks like
  organicScore: number;          // Expected organic score (55-99)
  tags: string[];                // Searchable tags
}

// Base pattern configurations (from original 20 patterns)
const BASE_PATTERN_CONFIGS: Record<PatternStyle, PatternConfig> = {
  'smooth-s-curve': {
    microSteps: [10, 25], clusterChance: 0.2, pauseChance: 0.3,
    timeJitterMs: [3*60_000, 20*60_000], gradualFactor: 2.5, dipChance: 0.15,
    burstChance: 0.1, plateauDuration: 1.0, curveShape: 1.0
  },
  'exponential-burst': {
    microSteps: [6, 15], clusterChance: 0.4, pauseChance: 0.5,
    timeJitterMs: [5*60_000, 40*60_000], gradualFactor: 4.0, dipChance: 0.1,
    burstChance: 0.35, plateauDuration: 1.5, curveShape: 2.5
  },
  'logarithmic-fade': {
    microSteps: [15, 30], clusterChance: 0.15, pauseChance: 0.25,
    timeJitterMs: [2*60_000, 15*60_000], gradualFactor: 1.5, dipChance: 0.2,
    burstChance: 0.05, plateauDuration: 0.8, curveShape: 0.4
  },
  'stepped-growth': {
    microSteps: [3, 8], clusterChance: 0.7, pauseChance: 0.7,
    timeJitterMs: [15*60_000, 60*60_000], gradualFactor: 5.0, dipChance: 0.05,
    burstChance: 0.6, plateauDuration: 2.5, curveShape: 1.0
  },
  'viral-spike': {
    microSteps: [5, 12], clusterChance: 0.3, pauseChance: 0.4,
    timeJitterMs: [1*60_000, 10*60_000], gradualFactor: 2.0, dipChance: 0.25,
    burstChance: 0.5, plateauDuration: 0.5, curveShape: 3.0
  },
  'wave-pattern': {
    microSteps: [8, 18], clusterChance: 0.35, pauseChance: 0.45,
    timeJitterMs: [5*60_000, 25*60_000], gradualFactor: 3.0, dipChance: 0.4,
    burstChance: 0.3, plateauDuration: 1.2, curveShape: 1.0
  },
  'delayed-explosion': {
    microSteps: [4, 10], clusterChance: 0.6, pauseChance: 0.7,
    timeJitterMs: [20*60_000, 90*60_000], gradualFactor: 6.0, dipChance: 0.05,
    burstChance: 0.7, plateauDuration: 3.0, curveShape: 4.0
  },
  'early-peak': {
    microSteps: [12, 25], clusterChance: 0.25, pauseChance: 0.35,
    timeJitterMs: [2*60_000, 12*60_000], gradualFactor: 1.8, dipChance: 0.35,
    burstChance: 0.15, plateauDuration: 0.6, curveShape: 0.3
  },
  'double-peak': {
    microSteps: [8, 16], clusterChance: 0.4, pauseChance: 0.5,
    timeJitterMs: [5*60_000, 30*60_000], gradualFactor: 3.5, dipChance: 0.45,
    burstChance: 0.4, plateauDuration: 1.5, curveShape: 1.5
  },
  'chaotic-organic': {
    microSteps: [6, 20], clusterChance: 0.5, pauseChance: 0.5,
    timeJitterMs: [1*60_000, 50*60_000], gradualFactor: 4.0, dipChance: 0.35,
    burstChance: 0.45, plateauDuration: 1.8, curveShape: 1.5
  },
  'slow-steady': {
    microSteps: [15, 35], clusterChance: 0.1, pauseChance: 0.2,
    timeJitterMs: [3*60_000, 18*60_000], gradualFactor: 2.0, dipChance: 0.1,
    burstChance: 0.02, plateauDuration: 0.5, curveShape: 1.0
  },
  'burst-pause-burst': {
    microSteps: [4, 10], clusterChance: 0.65, pauseChance: 0.65,
    timeJitterMs: [2*60_000, 15*60_000], gradualFactor: 4.5, dipChance: 0.1,
    burstChance: 0.55, plateauDuration: 2.0, curveShape: 2.0
  },
  'hockey-stick': {
    microSteps: [5, 12], clusterChance: 0.5, pauseChance: 0.6,
    timeJitterMs: [10*60_000, 60*60_000], gradualFactor: 5.5, dipChance: 0.05,
    burstChance: 0.6, plateauDuration: 2.8, curveShape: 3.5
  },
  'plateau-heavy': {
    microSteps: [6, 14], clusterChance: 0.55, pauseChance: 0.75,
    timeJitterMs: [15*60_000, 70*60_000], gradualFactor: 5.0, dipChance: 0.08,
    burstChance: 0.4, plateauDuration: 3.5, curveShape: 1.2
  },
  'micro-burst': {
    microSteps: [25, 50], clusterChance: 0.15, pauseChance: 0.25,
    timeJitterMs: [1*60_000, 8*60_000], gradualFactor: 1.5, dipChance: 0.2,
    burstChance: 0.08, plateauDuration: 0.4, curveShape: 0.8
  },
  'mega-burst': {
    microSteps: [2, 6], clusterChance: 0.8, pauseChance: 0.6,
    timeJitterMs: [20*60_000, 90*60_000], gradualFactor: 6.0, dipChance: 0.02,
    burstChance: 0.75, plateauDuration: 2.5, curveShape: 2.8
  },
  'reverse-s': {
    microSteps: [10, 22], clusterChance: 0.25, pauseChance: 0.35,
    timeJitterMs: [3*60_000, 20*60_000], gradualFactor: 2.5, dipChance: 0.25,
    burstChance: 0.15, plateauDuration: 1.0, curveShape: 0.5
  },
  'staircase': {
    microSteps: [2, 5], clusterChance: 0.85, pauseChance: 0.8,
    timeJitterMs: [25*60_000, 100*60_000], gradualFactor: 7.0, dipChance: 0.02,
    burstChance: 0.9, plateauDuration: 4.0, curveShape: 1.0
  },
  'roller-coaster': {
    microSteps: [8, 18], clusterChance: 0.4, pauseChance: 0.4,
    timeJitterMs: [3*60_000, 25*60_000], gradualFactor: 3.0, dipChance: 0.5,
    burstChance: 0.4, plateauDuration: 1.0, curveShape: 1.0
  },
  'gradual-accelerate': {
    microSteps: [12, 28], clusterChance: 0.2, pauseChance: 0.3,
    timeJitterMs: [4*60_000, 22*60_000], gradualFactor: 2.8, dipChance: 0.15,
    burstChance: 0.2, plateauDuration: 0.8, curveShape: 1.8
  },
  // NEW: 30 additional base patterns
  'pulse-wave': {
    microSteps: [10, 20], clusterChance: 0.45, pauseChance: 0.55,
    timeJitterMs: [4*60_000, 18*60_000], gradualFactor: 2.8, dipChance: 0.3,
    burstChance: 0.35, plateauDuration: 1.3, curveShape: 1.2
  },
  'fibonacci-spiral': {
    microSteps: [8, 21], clusterChance: 0.3, pauseChance: 0.4,
    timeJitterMs: [5*60_000, 34*60_000], gradualFactor: 3.2, dipChance: 0.18,
    burstChance: 0.25, plateauDuration: 1.6, curveShape: 1.618
  },
  'random-walk': {
    microSteps: [12, 24], clusterChance: 0.5, pauseChance: 0.5,
    timeJitterMs: [2*60_000, 30*60_000], gradualFactor: 3.5, dipChance: 0.4,
    burstChance: 0.4, plateauDuration: 1.4, curveShape: 1.0
  },
  'sawtooth': {
    microSteps: [6, 14], clusterChance: 0.55, pauseChance: 0.35,
    timeJitterMs: [3*60_000, 15*60_000], gradualFactor: 2.2, dipChance: 0.55,
    burstChance: 0.5, plateauDuration: 0.7, curveShape: 2.2
  },
  'inverse-sawtooth': {
    microSteps: [6, 14], clusterChance: 0.35, pauseChance: 0.55,
    timeJitterMs: [3*60_000, 15*60_000], gradualFactor: 2.2, dipChance: 0.15,
    burstChance: 0.2, plateauDuration: 0.7, curveShape: 0.45
  },
  'triple-peak': {
    microSteps: [7, 15], clusterChance: 0.45, pauseChance: 0.55,
    timeJitterMs: [4*60_000, 25*60_000], gradualFactor: 3.8, dipChance: 0.5,
    burstChance: 0.45, plateauDuration: 1.4, curveShape: 1.3
  },
  'bell-curve': {
    microSteps: [14, 28], clusterChance: 0.22, pauseChance: 0.32,
    timeJitterMs: [3*60_000, 16*60_000], gradualFactor: 2.2, dipChance: 0.25,
    burstChance: 0.12, plateauDuration: 0.9, curveShape: 1.1
  },
  'bimodal': {
    microSteps: [9, 18], clusterChance: 0.38, pauseChance: 0.48,
    timeJitterMs: [5*60_000, 28*60_000], gradualFactor: 3.3, dipChance: 0.42,
    burstChance: 0.38, plateauDuration: 1.5, curveShape: 1.4
  },
  'tornado-funnel': {
    microSteps: [16, 32], clusterChance: 0.18, pauseChance: 0.28,
    timeJitterMs: [2*60_000, 12*60_000], gradualFactor: 1.8, dipChance: 0.12,
    burstChance: 0.08, plateauDuration: 0.6, curveShape: 0.6
  },
  'expansion-wave': {
    microSteps: [4, 10], clusterChance: 0.58, pauseChance: 0.62,
    timeJitterMs: [8*60_000, 45*60_000], gradualFactor: 4.5, dipChance: 0.08,
    burstChance: 0.55, plateauDuration: 2.2, curveShape: 2.4
  },
  'heartbeat': {
    microSteps: [5, 12], clusterChance: 0.52, pauseChance: 0.68,
    timeJitterMs: [3*60_000, 20*60_000], gradualFactor: 3.2, dipChance: 0.35,
    burstChance: 0.58, plateauDuration: 1.8, curveShape: 2.0
  },
  'tidal-wave': {
    microSteps: [10, 22], clusterChance: 0.32, pauseChance: 0.42,
    timeJitterMs: [6*60_000, 35*60_000], gradualFactor: 3.8, dipChance: 0.22,
    burstChance: 0.48, plateauDuration: 1.6, curveShape: 2.8
  },
  'earthquake': {
    microSteps: [8, 16], clusterChance: 0.55, pauseChance: 0.5,
    timeJitterMs: [2*60_000, 25*60_000], gradualFactor: 3.5, dipChance: 0.45,
    burstChance: 0.62, plateauDuration: 1.3, curveShape: 3.2
  },
  'sunrise-curve': {
    microSteps: [18, 36], clusterChance: 0.12, pauseChance: 0.22,
    timeJitterMs: [4*60_000, 20*60_000], gradualFactor: 1.8, dipChance: 0.08,
    burstChance: 0.05, plateauDuration: 0.5, curveShape: 0.7
  },
  'sunset-fade': {
    microSteps: [18, 36], clusterChance: 0.12, pauseChance: 0.22,
    timeJitterMs: [4*60_000, 20*60_000], gradualFactor: 1.8, dipChance: 0.32,
    burstChance: 0.05, plateauDuration: 0.5, curveShape: 0.35
  },
  'sprint-rest': {
    microSteps: [4, 9], clusterChance: 0.72, pauseChance: 0.78,
    timeJitterMs: [2*60_000, 12*60_000], gradualFactor: 5.2, dipChance: 0.08,
    burstChance: 0.68, plateauDuration: 2.8, curveShape: 2.5
  },
  'marathon': {
    microSteps: [20, 45], clusterChance: 0.08, pauseChance: 0.15,
    timeJitterMs: [5*60_000, 25*60_000], gradualFactor: 1.5, dipChance: 0.08,
    burstChance: 0.02, plateauDuration: 0.4, curveShape: 1.0
  },
  'guerrilla': {
    microSteps: [5, 12], clusterChance: 0.62, pauseChance: 0.58,
    timeJitterMs: [1*60_000, 40*60_000], gradualFactor: 4.2, dipChance: 0.38,
    burstChance: 0.55, plateauDuration: 2.0, curveShape: 1.8
  },
  'avalanche': {
    microSteps: [6, 14], clusterChance: 0.48, pauseChance: 0.52,
    timeJitterMs: [8*60_000, 50*60_000], gradualFactor: 5.0, dipChance: 0.06,
    burstChance: 0.62, plateauDuration: 2.5, curveShape: 3.8
  },
  'drip-feed': {
    microSteps: [30, 60], clusterChance: 0.05, pauseChance: 0.15,
    timeJitterMs: [2*60_000, 10*60_000], gradualFactor: 1.2, dipChance: 0.05,
    burstChance: 0.01, plateauDuration: 0.3, curveShape: 1.0
  },
  'flash-flood': {
    microSteps: [3, 7], clusterChance: 0.82, pauseChance: 0.45,
    timeJitterMs: [1*60_000, 8*60_000], gradualFactor: 2.5, dipChance: 0.02,
    burstChance: 0.85, plateauDuration: 0.8, curveShape: 4.5
  },
  'glacier': {
    microSteps: [40, 80], clusterChance: 0.03, pauseChance: 0.08,
    timeJitterMs: [10*60_000, 40*60_000], gradualFactor: 1.0, dipChance: 0.02,
    burstChance: 0.005, plateauDuration: 0.2, curveShape: 1.0
  },
  'rocket-launch': {
    microSteps: [5, 12], clusterChance: 0.58, pauseChance: 0.48,
    timeJitterMs: [3*60_000, 18*60_000], gradualFactor: 3.5, dipChance: 0.28,
    burstChance: 0.52, plateauDuration: 1.4, curveShape: 4.0
  },
  'meteor-shower': {
    microSteps: [8, 18], clusterChance: 0.48, pauseChance: 0.55,
    timeJitterMs: [2*60_000, 15*60_000], gradualFactor: 2.8, dipChance: 0.32,
    burstChance: 0.48, plateauDuration: 1.5, curveShape: 1.8
  },
  'solar-flare': {
    microSteps: [4, 10], clusterChance: 0.68, pauseChance: 0.72,
    timeJitterMs: [5*60_000, 35*60_000], gradualFactor: 4.5, dipChance: 0.15,
    burstChance: 0.72, plateauDuration: 2.5, curveShape: 5.0
  },
  'echo-chamber': {
    microSteps: [10, 22], clusterChance: 0.35, pauseChance: 0.45,
    timeJitterMs: [4*60_000, 22*60_000], gradualFactor: 2.8, dipChance: 0.35,
    burstChance: 0.3, plateauDuration: 1.2, curveShape: 0.55
  },
  'snowball': {
    microSteps: [8, 18], clusterChance: 0.35, pauseChance: 0.4,
    timeJitterMs: [5*60_000, 28*60_000], gradualFactor: 3.5, dipChance: 0.12,
    burstChance: 0.35, plateauDuration: 1.2, curveShape: 2.2
  },
  'quantum-leap': {
    microSteps: [3, 7], clusterChance: 0.78, pauseChance: 0.75,
    timeJitterMs: [15*60_000, 75*60_000], gradualFactor: 6.5, dipChance: 0.03,
    burstChance: 0.82, plateauDuration: 3.5, curveShape: 1.0
  },
  'organic-chaos': {
    microSteps: [7, 18], clusterChance: 0.5, pauseChance: 0.5,
    timeJitterMs: [2*60_000, 35*60_000], gradualFactor: 3.8, dipChance: 0.38,
    burstChance: 0.48, plateauDuration: 1.6, curveShape: 1.5
  },
  'zen-flow': {
    microSteps: [15, 32], clusterChance: 0.18, pauseChance: 0.28,
    timeJitterMs: [5*60_000, 22*60_000], gradualFactor: 2.2, dipChance: 0.15,
    burstChance: 0.08, plateauDuration: 0.7, curveShape: 1.0
  },
};

// All pattern styles
export const ALL_PATTERNS: PatternStyle[] = Object.keys(BASE_PATTERN_CONFIGS) as PatternStyle[];

// Platform names
export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook';
const PLATFORMS: Platform[] = ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook'];

// Engagement types
type EngagementType = 'views' | 'likes' | 'comments' | 'saves' | 'shares';
const ENGAGEMENT_TYPES: EngagementType[] = ['views', 'likes', 'comments', 'saves', 'shares'];

// Variant modifiers (creates 10 variants per pattern)
const VARIANT_MODIFIERS: { name: string; modifier: (config: PatternConfig, idx: number) => PatternConfig }[] = [
  { name: 'Standard', modifier: (c) => c },
  { name: 'Aggressive', modifier: (c) => ({ ...c, burstChance: Math.min(0.95, c.burstChance * 1.5), curveShape: c.curveShape * 1.3 }) },
  { name: 'Conservative', modifier: (c) => ({ ...c, burstChance: c.burstChance * 0.5, pauseChance: Math.min(0.9, c.pauseChance * 1.3) }) },
  { name: 'Smooth', modifier: (c) => ({ ...c, microSteps: [c.microSteps[0] * 2, c.microSteps[1] * 2] as [number, number], dipChance: c.dipChance * 0.5 }) },
  { name: 'Spiky', modifier: (c) => ({ ...c, microSteps: [Math.max(2, c.microSteps[0] / 2), Math.max(4, c.microSteps[1] / 2)] as [number, number], burstChance: Math.min(0.95, c.burstChance * 1.8) }) },
  { name: 'Extended', modifier: (c) => ({ ...c, timeJitterMs: [c.timeJitterMs[0] * 1.5, c.timeJitterMs[1] * 1.5] as [number, number], plateauDuration: c.plateauDuration * 1.5 }) },
  { name: 'Compressed', modifier: (c) => ({ ...c, timeJitterMs: [c.timeJitterMs[0] * 0.6, c.timeJitterMs[1] * 0.6] as [number, number], plateauDuration: c.plateauDuration * 0.6 }) },
  { name: 'Volatile', modifier: (c) => ({ ...c, dipChance: Math.min(0.7, c.dipChance * 2), burstChance: Math.min(0.9, c.burstChance * 1.4) }) },
  { name: 'Stable', modifier: (c) => ({ ...c, dipChance: c.dipChance * 0.3, clusterChance: c.clusterChance * 0.5 }) },
  { name: 'Random', modifier: (c, idx) => {
    const seed = idx * 7919; // Prime number for variety
    const rand = () => ((seed * 48271) % 2147483647) / 2147483647;
    return {
      ...c,
      burstChance: Math.min(0.95, c.burstChance * (0.5 + rand())),
      pauseChance: Math.min(0.9, c.pauseChance * (0.5 + rand())),
      curveShape: c.curveShape * (0.6 + rand() * 0.8),
    };
  }},
];

// Generate human-readable description
function generateDescription(style: PatternStyle, variant: string, platform?: string, engagement?: string): string {
  const styleDescriptions: Record<PatternStyle, string> = {
    'smooth-s-curve': 'Classic S-curve with natural acceleration and deceleration',
    'exponential-burst': 'Slow start building to explosive growth at the end',
    'logarithmic-fade': 'Fast initial growth that gradually slows down',
    'stepped-growth': 'Distinct steps with flat plateaus between jumps',
    'viral-spike': 'Sudden viral moments with dramatic spikes',
    'wave-pattern': 'Oscillating ups and downs like ocean waves',
    'delayed-explosion': 'Long quiet period followed by sudden burst',
    'early-peak': 'Quick peak at start then gradual decline',
    'double-peak': 'Two distinct growth phases with dip between',
    'chaotic-organic': 'Maximum randomness mimicking real behavior',
    'slow-steady': 'Consistent, gradual growth without surprises',
    'burst-pause-burst': 'Intermittent activity bursts with rest periods',
    'hockey-stick': 'Flat line then sudden exponential takeoff',
    'plateau-heavy': 'Multiple extended flat periods',
    'micro-burst': 'Many tiny increments for ultra-smooth curve',
    'mega-burst': 'Few large jumps with long gaps',
    'reverse-s': 'Inverted S pattern - fast then slow',
    'staircase': 'Clear discrete steps like stairs',
    'roller-coaster': 'Wild ups and downs throughout',
    'gradual-accelerate': 'Speed increases over time',
    'pulse-wave': 'Rhythmic pulses like heartbeat',
    'fibonacci-spiral': 'Growth following golden ratio proportions',
    'random-walk': 'Brownian motion style random movement',
    'sawtooth': 'Sharp rises followed by gradual falls',
    'inverse-sawtooth': 'Gradual rises with sharp drops',
    'triple-peak': 'Three distinct peak moments',
    'bell-curve': 'Normal distribution shape',
    'bimodal': 'Two-hump camel-back pattern',
    'tornado-funnel': 'Starts wide, narrows over time',
    'expansion-wave': 'Starts narrow, expands outward',
    'heartbeat': 'Quick spike, rest, repeat rhythm',
    'tidal-wave': 'Slow building crash pattern',
    'earthquake': 'Sudden disruption with aftershocks',
    'sunrise-curve': 'Gentle morning rise pattern',
    'sunset-fade': 'Evening decline pattern',
    'sprint-rest': 'Quick burst then long rest',
    'marathon': 'Steady long-distance consistency',
    'guerrilla': 'Unpredictable strike pattern',
    'avalanche': 'Starts slow then cascades',
    'drip-feed': 'Consistent small amounts',
    'flash-flood': 'Sudden overwhelming volume',
    'glacier': 'Imperceptibly slow movement',
    'rocket-launch': 'Explosive start then coast',
    'meteor-shower': 'Multiple small bursts',
    'solar-flare': 'Intense burst, calm period',
    'echo-chamber': 'Diminishing echoes',
    'snowball': 'Growing momentum over time',
    'quantum-leap': 'Discrete quantum-style jumps',
    'organic-chaos': 'Natural organic randomness',
    'zen-flow': 'Smooth, balanced, harmonious',
  };

  let desc = styleDescriptions[style] || 'Unique growth pattern';
  
  if (variant !== 'Standard') {
    desc += ` (${variant} variant)`;
  }
  
  if (platform) {
    desc += `. Optimized for ${platform}`;
  }
  
  if (engagement) {
    desc += `. Best for ${engagement}`;
  }
  
  return desc;
}

// Generate organic score based on pattern config
function calculateOrganicScore(config: PatternConfig): number {
  // Higher variance and chaos = higher organic score
  const varianceScore = config.dipChance * 20 + config.burstChance * 15;
  const pauseScore = config.pauseChance * 15;
  const microScore = Math.min(config.microSteps[1] / 2, 15);
  
  const base = 55 + varianceScore + pauseScore + microScore;
  return Math.round(Math.min(99, Math.max(55, base)));
}

// Generate tags for searchability
function generateTags(style: PatternStyle, variant: string, platform?: string, engagement?: string): string[] {
  const tags: string[] = [
    style,
    variant.toLowerCase(),
  ];
  
  if (platform) tags.push(platform);
  if (engagement) tags.push(engagement);
  
  // Add descriptive tags
  const styleTags: Record<PatternStyle, string[]> = {
    'smooth-s-curve': ['smooth', 'natural', 's-curve', 'classic'],
    'exponential-burst': ['explosive', 'viral', 'growth'],
    'logarithmic-fade': ['fast-start', 'fade', 'decay'],
    'stepped-growth': ['steps', 'plateaus', 'discrete'],
    'viral-spike': ['viral', 'spike', 'trending'],
    'wave-pattern': ['waves', 'oscillation', 'rhythm'],
    'delayed-explosion': ['delayed', 'explosion', 'sudden'],
    'early-peak': ['early', 'peak', 'decline'],
    'double-peak': ['double', 'peaks', 'two-phase'],
    'chaotic-organic': ['chaos', 'random', 'organic'],
    'slow-steady': ['slow', 'steady', 'consistent'],
    'burst-pause-burst': ['burst', 'pause', 'intermittent'],
    'hockey-stick': ['hockey', 'flat-then-up', 'takeoff'],
    'plateau-heavy': ['plateau', 'flat', 'stable'],
    'micro-burst': ['micro', 'tiny', 'smooth'],
    'mega-burst': ['mega', 'large', 'jumps'],
    'reverse-s': ['reverse', 'inverted', 'flipped'],
    'staircase': ['stairs', 'steps', 'discrete'],
    'roller-coaster': ['wild', 'ups-downs', 'volatile'],
    'gradual-accelerate': ['accelerate', 'speed-up'],
    'pulse-wave': ['pulse', 'heartbeat', 'rhythmic'],
    'fibonacci-spiral': ['fibonacci', 'golden', 'mathematical'],
    'random-walk': ['random', 'brownian', 'walk'],
    'sawtooth': ['saw', 'sharp-rise', 'teeth'],
    'inverse-sawtooth': ['inverse', 'sharp-drop'],
    'triple-peak': ['triple', 'three', 'peaks'],
    'bell-curve': ['bell', 'normal', 'gaussian'],
    'bimodal': ['bimodal', 'two-humps', 'camel'],
    'tornado-funnel': ['tornado', 'funnel', 'narrow'],
    'expansion-wave': ['expand', 'wide', 'grow'],
    'heartbeat': ['heart', 'beat', 'pulse'],
    'tidal-wave': ['tidal', 'wave', 'crash'],
    'earthquake': ['quake', 'shock', 'aftershock'],
    'sunrise-curve': ['sunrise', 'morning', 'gentle'],
    'sunset-fade': ['sunset', 'evening', 'fade'],
    'sprint-rest': ['sprint', 'rest', 'burst'],
    'marathon': ['marathon', 'long', 'steady'],
    'guerrilla': ['guerrilla', 'unpredictable', 'strike'],
    'avalanche': ['avalanche', 'cascade', 'snowball'],
    'drip-feed': ['drip', 'feed', 'consistent'],
    'flash-flood': ['flash', 'flood', 'overwhelming'],
    'glacier': ['glacier', 'slow', 'imperceptible'],
    'rocket-launch': ['rocket', 'launch', 'explosive'],
    'meteor-shower': ['meteor', 'shower', 'multiple'],
    'solar-flare': ['solar', 'flare', 'intense'],
    'echo-chamber': ['echo', 'diminish', 'fade'],
    'snowball': ['snowball', 'momentum', 'grow'],
    'quantum-leap': ['quantum', 'leap', 'discrete'],
    'organic-chaos': ['organic', 'chaos', 'natural'],
    'zen-flow': ['zen', 'flow', 'balanced'],
  };
  
  tags.push(...(styleTags[style] || []));
  
  return [...new Set(tags)]; // Remove duplicates
}

// ====== GENERATE 500+ TEMPLATES ======
// Pattern: 50 base styles × 10 variants = 500 base templates
// Plus platform/engagement specific variants = 500+ total

function generateAllTemplates(): OrganicTemplate[] {
  const templates: OrganicTemplate[] = [];
  let id = 1;

  // Generate base 500 templates (50 patterns × 10 variants)
  for (const style of ALL_PATTERNS) {
    const baseConfig = BASE_PATTERN_CONFIGS[style];
    
    for (let v = 0; v < VARIANT_MODIFIERS.length; v++) {
      const variant = VARIANT_MODIFIERS[v];
      const config = variant.modifier({ ...baseConfig }, v);
      
      templates.push({
        id,
        name: `${style.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} - ${variant.name}`,
        style,
        variant: v,
        config,
        description: generateDescription(style, variant.name),
        organicScore: calculateOrganicScore(config),
        tags: generateTags(style, variant.name),
      });
      
      id++;
    }
  }

  // Add platform-optimized templates (50 per platform = 250 more)
  for (const platform of PLATFORMS) {
    const platformPatterns = getPlatformOptimizedPatterns(platform);
    
    for (const pattern of platformPatterns.slice(0, 10)) { // Top 10 per platform
      const baseConfig = BASE_PATTERN_CONFIGS[pattern];
      const config = applyPlatformOptimization({ ...baseConfig }, platform);
      
      templates.push({
        id,
        name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Optimized - ${pattern.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`,
        style: pattern,
        variant: 0,
        config,
        platform,
        description: generateDescription(pattern, 'Standard', platform),
        organicScore: calculateOrganicScore(config),
        tags: generateTags(pattern, 'Standard', platform),
      });
      
      id++;
    }
  }

  return templates;
}

// Get patterns optimized for specific platform
function getPlatformOptimizedPatterns(platform: Platform): PatternStyle[] {
  const platformPreferences: Record<Platform, PatternStyle[]> = {
    instagram: ['smooth-s-curve', 'wave-pattern', 'gradual-accelerate', 'double-peak', 'early-peak', 'viral-spike', 'zen-flow', 'pulse-wave', 'fibonacci-spiral', 'bell-curve'],
    tiktok: ['viral-spike', 'exponential-burst', 'hockey-stick', 'mega-burst', 'burst-pause-burst', 'flash-flood', 'rocket-launch', 'avalanche', 'solar-flare', 'chaotic-organic'],
    youtube: ['slow-steady', 'gradual-accelerate', 'smooth-s-curve', 'logarithmic-fade', 'plateau-heavy', 'marathon', 'drip-feed', 'glacier', 'sunrise-curve', 'staircase'],
    twitter: ['viral-spike', 'burst-pause-burst', 'micro-burst', 'exponential-burst', 'guerrilla', 'meteor-shower', 'heartbeat', 'earthquake', 'chaotic-organic', 'roller-coaster'],
    facebook: ['slow-steady', 'stepped-growth', 'gradual-accelerate', 'plateau-heavy', 'wave-pattern', 'bell-curve', 'sunrise-curve', 'zen-flow', 'snowball', 'bimodal'],
  };
  
  return platformPreferences[platform];
}

// Apply platform-specific optimizations to config
function applyPlatformOptimization(config: PatternConfig, platform: Platform): PatternConfig {
  const optimizations: Record<Platform, Partial<PatternConfig>> = {
    instagram: { gradualFactor: config.gradualFactor * 1.1, dipChance: config.dipChance * 1.2 },
    tiktok: { burstChance: Math.min(0.95, config.burstChance * 1.4), curveShape: config.curveShape * 1.3 },
    youtube: { pauseChance: Math.min(0.9, config.pauseChance * 1.3), plateauDuration: config.plateauDuration * 1.4 },
    twitter: { microSteps: [config.microSteps[0] * 1.5, config.microSteps[1] * 1.5] as [number, number], burstChance: Math.min(0.9, config.burstChance * 1.3) },
    facebook: { gradualFactor: config.gradualFactor * 0.9, clusterChance: config.clusterChance * 0.8 },
  };
  
  return { ...config, ...optimizations[platform] };
}

// ====== EXPORTED TEMPLATE LIBRARY ======

// Pre-generated library (cached)
let _cachedTemplates: OrganicTemplate[] | null = null;

export function getTemplateLibrary(): OrganicTemplate[] {
  if (!_cachedTemplates) {
    _cachedTemplates = generateAllTemplates();
  }
  return _cachedTemplates;
}

// Get template by ID
export function getTemplateById(id: number): OrganicTemplate | undefined {
  return getTemplateLibrary().find(t => t.id === id);
}

// Search templates by query
export function searchTemplates(query: string): OrganicTemplate[] {
  const lowerQuery = query.toLowerCase().trim();
  
  if (!lowerQuery) return getTemplateLibrary();
  
  // Check if query is a number (template ID)
  const numQuery = parseInt(lowerQuery, 10);
  if (!isNaN(numQuery)) {
    const exact = getTemplateById(numQuery);
    if (exact) return [exact];
  }
  
  return getTemplateLibrary().filter(t => 
    t.name.toLowerCase().includes(lowerQuery) ||
    t.style.includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.includes(lowerQuery)) ||
    (t.platform && t.platform.includes(lowerQuery)) ||
    (t.engagement && t.engagement.includes(lowerQuery))
  );
}

// Get templates by platform
export function getTemplatesForPlatform(platform: Platform): OrganicTemplate[] {
  return getTemplateLibrary().filter(t => t.platform === platform || !t.platform);
}

// Get templates by organic score range
export function getTemplatesByOrganicScore(minScore: number, maxScore: number = 99): OrganicTemplate[] {
  return getTemplateLibrary().filter(t => t.organicScore >= minScore && t.organicScore <= maxScore);
}

// Get random template
export function getRandomTemplate(seed?: number): OrganicTemplate {
  const templates = getTemplateLibrary();
  const idx = seed !== undefined 
    ? Math.abs(seed) % templates.length 
    : Math.floor(Math.random() * templates.length);
  return templates[idx];
}

// Get template count
export function getTemplateCount(): number {
  return getTemplateLibrary().length;
}

// Export pattern config for use in chart generation
export function getPatternConfigForTemplate(templateId: number): PatternConfig | undefined {
  const template = getTemplateById(templateId);
  return template?.config;
}
