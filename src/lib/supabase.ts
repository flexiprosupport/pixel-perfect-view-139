import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export { supabase };

export type { User, Session };

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  api_key: string | null;
  currency: string;
  telegram_id: string | null;
  telegram_username: string | null;
  is_organic_mode_default: boolean;
  organic_ratios: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    [key: string]: number;
  };
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  total_deposited: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  provider_id: string | null;
  provider_service_id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  min_quantity: number;
  max_quantity: number;
  speed: string | null;
  quality: string | null;
  drip_feed_enabled: boolean | null;
  is_active: boolean | null;
  start_time: string | null;
  refill: string | null;
  cancel_allowed: string | null;
  drop_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: number;
  user_id: string;
  service_id: string | null;
  link: string;
  quantity: number;
  price: number;
  status: string;
  start_count: number | null;
  remains: number | null;
  provider_order_id: string | null;
  is_drip_feed: boolean;
  drip_runs: number | null;
  drip_interval: number | null;
  drip_interval_unit: string | null;
  drip_quantity_per_run: number | null;
  is_organic_mode: boolean;
  variance_percent: number;
  peak_hours_enabled: boolean;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  service?: Service;
}

export interface OrganicRun {
  id: string;
  order_id: string;
  run_number: number;
  scheduled_at: string;
  quantity_to_send: number;
  base_quantity: number;
  variance_applied: number;
  peak_multiplier: number;
  status: string;
  provider_order_id: string | null;
  provider_response: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_after: number;
  order_id: string | null;
  description: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  status: string;
  created_at: string;
}

export type AppRole = 'admin' | 'moderator' | 'user';
