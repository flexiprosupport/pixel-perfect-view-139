// Types for Full Organic Engagement System

export interface EngagementBundle {
  id: string;
  name: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook';
  provider_id: string | null;
  description: string | null;
  icon: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  items?: BundleItem[];
}

export interface BundleItem {
  id: string;
  bundle_id: string;
  service_id: string | null;
  engagement_type: EngagementType;
  ratio_percent: number;
  is_base: boolean;
  /** Admin-set per-1000 price in USD. Overrides service.price when present. */
  price_per_k?: number | null;
  default_drip_qty_per_run: number;
  default_drip_interval: number;
  default_drip_interval_unit: 'minutes' | 'hours';
  sort_order: number;
  created_at: string;
  service?: {
    id: string;
    name: string;
    price: number;
    min_quantity: number;
    max_quantity: number;
  };
}

export type EngagementType = 'views' | 'likes' | 'comments' | 'saves' | 'shares' | 'followers' | 'subscribers' | 'watch_hours' | 'retweets' | 'reposts';

export type SpeedPreset = 'fast' | 'natural' | 'safe';

export interface EngagementOrder {
  id: string;
  order_number: number;
  user_id: string;
  bundle_id: string | null;
  link: string;
  base_quantity: number;
  total_price: number;
  is_organic_mode: boolean;
  variance_percent: number;
  peak_hours_enabled: boolean;
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
  bundle?: EngagementBundle;
  items?: EngagementOrderItem[];
}

export interface EngagementOrderItem {
  id: string;
  engagement_order_id: string;
  engagement_type: EngagementType;
  service_id: string | null;
  quantity: number;
  price: number;
  drip_qty_per_run: number | null;
  drip_interval: number | null;
  drip_interval_unit: string;
  speed_preset: SpeedPreset;
  is_enabled: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  provider_order_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  runs?: OrganicRun[];
  service?: {
    id: string;
    name: string;
    price: number;
    min_quantity: number;
  };
}

export interface OrganicRun {
  id: string;
  order_id?: string;
  engagement_order_item_id?: string;
  run_number: number;
  scheduled_at: string;
  quantity_to_send: number;
  base_quantity: number;
  variance_applied: number;
  peak_multiplier: number;
  status: 'pending' | 'started' | 'completed' | 'failed';
  provider_order_id: string | null;
  provider_response: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface EngagementConfig {
  type: EngagementType;
  enabled: boolean;
  quantity: number;
  price: number;
  serviceId: string | null;
  minQuantity?: number;        // Actual service minimum from provider
  // Per-type organic settings (optional - defaults will be used if not set)
  timeLimitHours: number;      // 0 = Auto, >0 = specific hours (actual value for backend)
  timeLimitCustomMode?: boolean; // UI-only: true when "Custom" button is selected
  variancePercent: number;     // 10-50, default 25
  peakHoursEnabled: boolean;   // default true
  runCount?: number;           // User-forced number of runs (undefined = auto)
}

// Default organic settings for each type
export const DEFAULT_ORGANIC_SETTINGS = {
  timeLimitHours: 0,        // Auto mode
  variancePercent: 25,      // 25% variance
  peakHoursEnabled: false,  // Peak hours OFF by default
};

// Platform icons and colors - Deep Premium Palettes
export const PLATFORM_CONFIG = {
  instagram: { icon: 'Instagram', color: 'from-green-600/60 to-purple-800/60', label: 'Instagram', bgColor: 'bg-green-600/10', borderColor: 'border-green-600/20' },
  tiktok: { icon: 'Music', color: 'from-cyan-700/60 to-green-700/60', label: 'TikTok', bgColor: 'bg-cyan-700/10', borderColor: 'border-cyan-700/20' },
  youtube: { icon: 'Youtube', color: 'from-red-800/60 to-red-950/80', label: 'YouTube', bgColor: 'bg-red-800/10', borderColor: 'border-red-800/20' },
  twitter: { icon: 'Twitter', color: 'from-sky-800/60 to-blue-950/80', label: 'Twitter/X', bgColor: 'bg-sky-800/10', borderColor: 'border-sky-800/20' },
  facebook: { icon: 'Facebook', color: 'from-blue-800/60 to-indigo-950/80', label: 'Facebook', bgColor: 'bg-blue-800/10', borderColor: 'border-blue-800/20' },
} as const;

// Engagement type icons and colors - Muted deep colors
export const ENGAGEMENT_CONFIG = {
  views: { icon: 'Eye', color: 'text-cyan-600', bgColor: 'bg-cyan-600/10', borderColor: 'border-cyan-600/20', label: 'Views', emoji: '👁️' },
  likes: { icon: 'Heart', color: 'text-green-600', bgColor: 'bg-green-600/10', borderColor: 'border-green-600/20', label: 'Likes', emoji: '❤️' },
  comments: { icon: 'MessageCircle', color: 'text-blue-700', bgColor: 'bg-blue-700/10', borderColor: 'border-blue-700/20', label: 'Comments', emoji: '💬' },
  saves: { icon: 'Bookmark', color: 'text-amber-700', bgColor: 'bg-amber-700/10', borderColor: 'border-amber-700/20', label: 'Saves', emoji: '📥' },
  shares: { icon: 'Share2', color: 'text-violet-700', bgColor: 'bg-violet-700/10', borderColor: 'border-violet-700/20', label: 'Shares', emoji: '🔄' },
  followers: { icon: 'UserPlus', color: 'text-indigo-700', bgColor: 'bg-indigo-700/10', borderColor: 'border-indigo-700/20', label: 'Followers', emoji: '👥' },
  subscribers: { icon: 'Bell', color: 'text-red-700', bgColor: 'bg-red-700/10', borderColor: 'border-red-700/20', label: 'Subscribers', emoji: '🔔' },
  watch_hours: { icon: 'Clock', color: 'text-orange-700', bgColor: 'bg-orange-700/10', borderColor: 'border-orange-700/20', label: 'Watch Hours', emoji: '⏱️' },
  retweets: { icon: 'Repeat', color: 'text-teal-700', bgColor: 'bg-teal-700/10', borderColor: 'border-teal-700/20', label: 'Retweets', emoji: '🔁' },
  reposts: { icon: 'RefreshCw', color: 'text-green-700', bgColor: 'bg-green-700/10', borderColor: 'border-green-700/20', label: 'Reposts', emoji: '🔄' },
} as const;

// Default engagement ratios (percentage of base views)
export const DEFAULT_RATIOS: Record<EngagementType, number> = {
  views: 100,
  likes: 3.1,
  comments: 0.2,
  saves: 1.1,
  shares: 1.3,
  followers: 2,
  subscribers: 3,
  watch_hours: 5,
  retweets: 4,
  reposts: 1.3,
};

// Platform-specific engagement types
export const PLATFORM_ENGAGEMENT_TYPES: Record<string, EngagementType[]> = {
  instagram: ['views', 'likes', 'comments', 'saves', 'shares', 'reposts', 'followers'],
  tiktok: ['views', 'likes', 'comments', 'saves', 'shares', 'followers'],
  youtube: ['views', 'likes', 'comments', 'subscribers', 'watch_hours'],
  twitter: ['views', 'likes', 'comments', 'retweets', 'followers'],
  facebook: ['views', 'likes', 'comments', 'shares', 'followers'],
};

// Speed presets (kept for legacy compatibility)
export const SPEED_PRESETS: Record<SpeedPreset, { interval: number; unit: 'minutes' | 'hours'; label: string }> = {
  fast: { interval: 15, unit: 'minutes', label: 'Fast' },
  natural: { interval: 30, unit: 'minutes', label: 'Natural' },
  safe: { interval: 60, unit: 'minutes', label: 'Safe' },
};
