// Service-Specific Organic Scheduling Configuration
// Auto-detects service type from name/category and applies optimal scheduling

export type ServiceCategory = 
  | 'views' 
  | 'likes' 
  | 'comments' 
  | 'followers' 
  | 'subscribers' 
  | 'retweets' 
  | 'shares' 
  | 'saves' 
  | 'watch_hours'
  | 'reposts'
  | 'generic';

export interface OrganicServiceConfig {
  // Base timing
  baseIntervalMinutes: number;      // Base interval between runs
  intervalVariance: number;          // ±variance in minutes
  
  // Quantity distribution
  quantityVariancePercent: number;   // Base variance (e.g., 40 = ±40%)
  spikeChance: number;               // Chance of spike (0-1)
  spikeMagnitude: [number, number];  // Min-max multiplier for spikes
  dipChance: number;                 // Chance of dip (0-1)
  dipMagnitude: [number, number];    // Min-max multiplier for dips
  
  // Session behavior
  burstChance: number;               // Chance of burst session
  pauseChance: number;               // Chance of pause session
  patternBreakerChance: number;      // Chance of pattern breaker
  
  // Time-based behavior
  peakHourBoost: number;             // Multiplier during peak hours
  nightReduction: number;            // Multiplier during night (0-1)
  
  // Run calculation
  runsPerThousand: number;           // Target runs per 1000 quantity
  minRunsPerOrder: number;           // Minimum runs per order
  maxRunsPerOrder: number;           // Maximum runs per order
  
  // Human score thresholds
  targetHumanScore: [number, number]; // Min-max target human score
  
  // Description
  description: string;
}

// Service-specific configurations optimized for each type
export const SERVICE_ORGANIC_CONFIGS: Record<ServiceCategory, OrganicServiceConfig> = {
  // VIEWS - Fast delivery, high volume, moderate variance
  views: {
    baseIntervalMinutes: 25,
    intervalVariance: 12,
    quantityVariancePercent: 45,
    spikeChance: 0.18,
    spikeMagnitude: [2.0, 3.8],
    dipChance: 0.12,
    dipMagnitude: [0.25, 0.55],
    burstChance: 0.20,
    pauseChance: 0.08,
    patternBreakerChance: 0.15,
    peakHourBoost: 1.9,
    nightReduction: 0.25,
    runsPerThousand: 3,
    minRunsPerOrder: 5,
    maxRunsPerOrder: 50,
    targetHumanScore: [55, 90],
    description: 'Fast organic views with natural viral spikes',
  },
  
  // LIKES - Moderate speed, follows engagement curve
  likes: {
    baseIntervalMinutes: 35,
    intervalVariance: 18,
    quantityVariancePercent: 50,
    spikeChance: 0.15,
    spikeMagnitude: [1.8, 3.2],
    dipChance: 0.15,
    dipMagnitude: [0.3, 0.6],
    burstChance: 0.15,
    pauseChance: 0.12,
    patternBreakerChance: 0.18,
    peakHourBoost: 1.7,
    nightReduction: 0.3,
    runsPerThousand: 2.5,
    minRunsPerOrder: 4,
    maxRunsPerOrder: 40,
    targetHumanScore: [58, 92],
    description: 'Natural like engagement pattern',
  },
  
  // COMMENTS - Slow, highly variable, very human-like
  comments: {
    baseIntervalMinutes: 90,
    intervalVariance: 45,
    quantityVariancePercent: 65,
    spikeChance: 0.08,
    spikeMagnitude: [1.5, 2.5],
    dipChance: 0.25,
    dipMagnitude: [0.2, 0.5],
    burstChance: 0.05,
    pauseChance: 0.25,
    patternBreakerChance: 0.22,
    peakHourBoost: 1.5,
    nightReduction: 0.15,
    runsPerThousand: 1.5,
    minRunsPerOrder: 3,
    maxRunsPerOrder: 25,
    targetHumanScore: [70, 98],
    description: 'Ultra-organic comment scheduling',
  },
  
  // FOLLOWERS - Very slow, gradual accumulation
  followers: {
    baseIntervalMinutes: 180,
    intervalVariance: 90,
    quantityVariancePercent: 55,
    spikeChance: 0.05,
    spikeMagnitude: [1.4, 2.0],
    dipChance: 0.20,
    dipMagnitude: [0.3, 0.6],
    burstChance: 0.03,
    pauseChance: 0.30,
    patternBreakerChance: 0.20,
    peakHourBoost: 1.3,
    nightReduction: 0.2,
    runsPerThousand: 1,
    minRunsPerOrder: 3,
    maxRunsPerOrder: 20,
    targetHumanScore: [75, 98],
    description: 'Gradual follower growth pattern',
  },
  
  // SUBSCRIBERS (YouTube) - Very slow, premium scheduling
  subscribers: {
    baseIntervalMinutes: 240,
    intervalVariance: 120,
    quantityVariancePercent: 60,
    spikeChance: 0.04,
    spikeMagnitude: [1.3, 1.8],
    dipChance: 0.22,
    dipMagnitude: [0.35, 0.65],
    burstChance: 0.02,
    pauseChance: 0.35,
    patternBreakerChance: 0.25,
    peakHourBoost: 1.2,
    nightReduction: 0.15,
    runsPerThousand: 0.8,
    minRunsPerOrder: 3,
    maxRunsPerOrder: 15,
    targetHumanScore: [78, 99],
    description: 'Premium YouTube subscriber growth',
  },
  
  // RETWEETS (Twitter/X) - Medium speed, viral potential
  retweets: {
    baseIntervalMinutes: 45,
    intervalVariance: 25,
    quantityVariancePercent: 55,
    spikeChance: 0.22,
    spikeMagnitude: [2.5, 4.5],
    dipChance: 0.10,
    dipMagnitude: [0.25, 0.5],
    burstChance: 0.25,
    pauseChance: 0.08,
    patternBreakerChance: 0.18,
    peakHourBoost: 2.0,
    nightReduction: 0.35,
    runsPerThousand: 2,
    minRunsPerOrder: 4,
    maxRunsPerOrder: 35,
    targetHumanScore: [55, 88],
    description: 'Viral retweet pattern with spikes',
  },
  
  // SHARES - Medium-slow, social spread pattern
  shares: {
    baseIntervalMinutes: 60,
    intervalVariance: 30,
    quantityVariancePercent: 50,
    spikeChance: 0.15,
    spikeMagnitude: [2.0, 3.5],
    dipChance: 0.15,
    dipMagnitude: [0.3, 0.55],
    burstChance: 0.12,
    pauseChance: 0.18,
    patternBreakerChance: 0.20,
    peakHourBoost: 1.6,
    nightReduction: 0.25,
    runsPerThousand: 1.8,
    minRunsPerOrder: 3,
    maxRunsPerOrder: 30,
    targetHumanScore: [62, 92],
    description: 'Natural share distribution',
  },
  
  // SAVES - Slow, deliberate action pattern
  saves: {
    baseIntervalMinutes: 75,
    intervalVariance: 35,
    quantityVariancePercent: 55,
    spikeChance: 0.08,
    spikeMagnitude: [1.6, 2.5],
    dipChance: 0.20,
    dipMagnitude: [0.3, 0.6],
    burstChance: 0.05,
    pauseChance: 0.22,
    patternBreakerChance: 0.18,
    peakHourBoost: 1.4,
    nightReduction: 0.2,
    runsPerThousand: 1.5,
    minRunsPerOrder: 3,
    maxRunsPerOrder: 25,
    targetHumanScore: [68, 95],
    description: 'Organic save accumulation',
  },
  
  // WATCH HOURS (YouTube) - Very slow, long-term engagement
  watch_hours: {
    baseIntervalMinutes: 360,
    intervalVariance: 180,
    quantityVariancePercent: 45,
    spikeChance: 0.03,
    spikeMagnitude: [1.2, 1.6],
    dipChance: 0.25,
    dipMagnitude: [0.4, 0.7],
    burstChance: 0.02,
    pauseChance: 0.40,
    patternBreakerChance: 0.15,
    peakHourBoost: 1.2,
    nightReduction: 0.4,
    runsPerThousand: 0.5,
    minRunsPerOrder: 2,
    maxRunsPerOrder: 10,
    targetHumanScore: [80, 99],
    description: 'Gradual watch hour accumulation',
  },
  
  // REPOSTS - Similar to shares
  reposts: {
    baseIntervalMinutes: 55,
    intervalVariance: 28,
    quantityVariancePercent: 52,
    spikeChance: 0.16,
    spikeMagnitude: [2.0, 3.2],
    dipChance: 0.14,
    dipMagnitude: [0.28, 0.55],
    burstChance: 0.14,
    pauseChance: 0.16,
    patternBreakerChance: 0.18,
    peakHourBoost: 1.7,
    nightReduction: 0.28,
    runsPerThousand: 1.8,
    minRunsPerOrder: 3,
    maxRunsPerOrder: 28,
    targetHumanScore: [60, 90],
    description: 'Natural repost pattern',
  },
  
  // GENERIC - Balanced fallback for unknown services
  generic: {
    baseIntervalMinutes: 45,
    intervalVariance: 20,
    quantityVariancePercent: 45,
    spikeChance: 0.12,
    spikeMagnitude: [1.8, 3.0],
    dipChance: 0.12,
    dipMagnitude: [0.3, 0.6],
    burstChance: 0.12,
    pauseChance: 0.15,
    patternBreakerChance: 0.15,
    peakHourBoost: 1.5,
    nightReduction: 0.3,
    runsPerThousand: 2,
    minRunsPerOrder: 4,
    maxRunsPerOrder: 35,
    targetHumanScore: [55, 88],
    description: 'Balanced organic delivery',
  },
};

// Keywords to detect service type from name/category
const SERVICE_KEYWORDS: Record<ServiceCategory, string[]> = {
  views: ['view', 'views', 'impression', 'impressions', 'plays', 'play', 'watch'],
  likes: ['like', 'likes', 'heart', 'hearts', 'love', 'reaction', 'reactions', 'upvote'],
  comments: ['comment', 'comments', 'reply', 'replies', 'review', 'reviews'],
  followers: ['follower', 'followers', 'follow', 'following', 'fan', 'fans'],
  subscribers: ['subscriber', 'subscribers', 'subscribe', 'subscription', 'sub', 'subs', 'channel'],
  retweets: ['retweet', 'retweets', 'rt', 'quote', 'quotes'],
  shares: ['share', 'shares', 'sharing', 'forward', 'forwards'],
  saves: ['save', 'saves', 'bookmark', 'bookmarks', 'collection'],
  watch_hours: ['watch hour', 'watch hours', 'watch time', 'watchtime', 'hours watched'],
  reposts: ['repost', 'reposts', 'reshare', 'reshares'],
  generic: [],
};

/**
 * Detect service category from service name and category
 */
export function detectServiceCategory(serviceName: string, serviceCategory: string): ServiceCategory {
  const searchText = `${serviceName} ${serviceCategory}`.toLowerCase();
  
  // Check each category's keywords
  for (const [category, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    if (category === 'generic') continue;
    
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return category as ServiceCategory;
      }
    }
  }
  
  return 'generic';
}

/**
 * Get organic config for a service
 */
export function getOrganicConfigForService(serviceName: string, serviceCategory: string): OrganicServiceConfig {
  const category = detectServiceCategory(serviceName, serviceCategory);
  return SERVICE_ORGANIC_CONFIGS[category];
}

/**
 * Calculate optimal runs for a service based on quantity
 */
export function calculateOptimalRuns(
  quantity: number,
  serviceMinQty: number,
  config: OrganicServiceConfig
): number {
  // Calculate based on config
  const idealRuns = Math.round((quantity / 1000) * config.runsPerThousand);
  
  // Apply bounds
  const boundedRuns = Math.max(
    config.minRunsPerOrder,
    Math.min(config.maxRunsPerOrder, idealRuns)
  );
  
  // Ensure each run can have at least minimum quantity
  const maxPossibleRuns = Math.floor(quantity / serviceMinQty);
  
  return Math.min(boundedRuns, maxPossibleRuns);
}

/**
 * Get category display info
 */
export function getCategoryDisplayInfo(category: ServiceCategory): {
  emoji: string;
  color: string;
  label: string;
} {
  const info: Record<ServiceCategory, { emoji: string; color: string; label: string }> = {
    views: { emoji: '👁️', color: 'text-cyan-400', label: 'Views' },
    likes: { emoji: '❤️', color: 'text-green-400', label: 'Likes' },
    comments: { emoji: '💬', color: 'text-blue-400', label: 'Comments' },
    followers: { emoji: '👥', color: 'text-indigo-400', label: 'Followers' },
    subscribers: { emoji: '🔔', color: 'text-red-400', label: 'Subscribers' },
    retweets: { emoji: '🔁', color: 'text-teal-400', label: 'Retweets' },
    shares: { emoji: '🔄', color: 'text-violet-400', label: 'Shares' },
    saves: { emoji: '📥', color: 'text-amber-400', label: 'Saves' },
    watch_hours: { emoji: '⏱️', color: 'text-orange-400', label: 'Watch Hours' },
    reposts: { emoji: '🔄', color: 'text-green-400', label: 'Reposts' },
    generic: { emoji: '📊', color: 'text-muted-foreground', label: 'Service' },
  };
  
  return info[category];
}
