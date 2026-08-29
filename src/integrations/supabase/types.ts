export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          amount_inr: number | null
          amount_usd: number | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          notes: string | null
          target_email: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          amount_inr?: number | null
          amount_usd?: number | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          notes?: string | null
          target_email?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          amount_inr?: number | null
          amount_usd?: number | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          notes?: string | null
          target_email?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      api_audit_log: {
        Row: {
          action: string | null
          api_key_prefix: string | null
          created_at: string
          endpoint: string
          error_message: string | null
          id: string
          ip_address: string | null
          metadata: Json
          method: string | null
          status_code: number | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          api_key_prefix?: string | null
          created_at?: string
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          method?: string | null
          status_code?: number | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          api_key_prefix?: string | null
          created_at?: string
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          method?: string | null
          status_code?: number | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          bucket_key: string
          request_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          bucket_key: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Update: {
          bucket_key?: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      bundle_items: {
        Row: {
          bundle_id: string
          created_at: string | null
          default_drip_interval: number | null
          default_drip_interval_unit: string | null
          default_drip_qty_per_run: number | null
          engagement_type: string
          id: string
          is_base: boolean | null
          price_per_k: number | null
          ratio_percent: number | null
          service_id: string | null
          sort_order: number | null
        }
        Insert: {
          bundle_id: string
          created_at?: string | null
          default_drip_interval?: number | null
          default_drip_interval_unit?: string | null
          default_drip_qty_per_run?: number | null
          engagement_type: string
          id?: string
          is_base?: boolean | null
          price_per_k?: number | null
          ratio_percent?: number | null
          service_id?: string | null
          sort_order?: number | null
        }
        Update: {
          bundle_id?: string
          created_at?: string | null
          default_drip_interval?: number | null
          default_drip_interval_unit?: string | null
          default_drip_qty_per_run?: number | null
          engagement_type?: string
          id?: string
          is_base?: boolean | null
          price_per_k?: number | null
          ratio_percent?: number | null
          service_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "engagement_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          status: string
          updated_at: string
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          status?: string
          updated_at?: string
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          status?: string
          updated_at?: string
          user_email?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          sender_id: string
          sender_role: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      deposits: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          payment_method: string | null
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          payment_method?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          payment_method?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      engagement_bundles: {
        Row: {
          ai_organic_enabled: boolean | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          platform: string
          provider_id: string | null
          sort_order: number | null
          updated_at: string | null
          use_custom_ratios: boolean | null
        }
        Insert: {
          ai_organic_enabled?: boolean | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          platform: string
          provider_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
          use_custom_ratios?: boolean | null
        }
        Update: {
          ai_organic_enabled?: boolean | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          platform?: string
          provider_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
          use_custom_ratios?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_bundles_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_bundles_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_order_items: {
        Row: {
          completion_locked_at: string | null
          created_at: string | null
          current_count: number | null
          delivered_count: number
          drip_interval: number | null
          drip_interval_unit: string | null
          drip_qty_per_run: number | null
          engagement_order_id: string
          engagement_type: string
          error_message: string | null
          id: string
          is_enabled: boolean | null
          last_synced_at: string | null
          max_observed_count: number | null
          price: number
          progress_percentage: number
          provider_order_id: string | null
          quantity: number
          remaining_count: number
          service_id: string | null
          speed_preset: string | null
          start_count: number | null
          status: string | null
          target_count: number | null
          updated_at: string | null
        }
        Insert: {
          completion_locked_at?: string | null
          created_at?: string | null
          current_count?: number | null
          delivered_count?: number
          drip_interval?: number | null
          drip_interval_unit?: string | null
          drip_qty_per_run?: number | null
          engagement_order_id: string
          engagement_type: string
          error_message?: string | null
          id?: string
          is_enabled?: boolean | null
          last_synced_at?: string | null
          max_observed_count?: number | null
          price: number
          progress_percentage?: number
          provider_order_id?: string | null
          quantity: number
          remaining_count?: number
          service_id?: string | null
          speed_preset?: string | null
          start_count?: number | null
          status?: string | null
          target_count?: number | null
          updated_at?: string | null
        }
        Update: {
          completion_locked_at?: string | null
          created_at?: string | null
          current_count?: number | null
          delivered_count?: number
          drip_interval?: number | null
          drip_interval_unit?: string | null
          drip_qty_per_run?: number | null
          engagement_order_id?: string
          engagement_type?: string
          error_message?: string | null
          id?: string
          is_enabled?: boolean | null
          last_synced_at?: string | null
          max_observed_count?: number | null
          price?: number
          progress_percentage?: number
          provider_order_id?: string | null
          quantity?: number
          remaining_count?: number
          service_id?: string | null
          speed_preset?: string | null
          start_count?: number | null
          status?: string | null
          target_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_order_items_engagement_order_id_fkey"
            columns: ["engagement_order_id"]
            isOneToOne: false
            referencedRelation: "engagement_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_order_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_orders: {
        Row: {
          base_quantity: number
          bundle_id: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          is_organic_mode: boolean | null
          link: string
          order_number: number
          peak_hours_enabled: boolean | null
          status: string | null
          total_price: number
          updated_at: string | null
          user_id: string
          variance_percent: number | null
        }
        Insert: {
          base_quantity: number
          bundle_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_organic_mode?: boolean | null
          link: string
          order_number?: number
          peak_hours_enabled?: boolean | null
          status?: string | null
          total_price: number
          updated_at?: string | null
          user_id: string
          variance_percent?: number | null
        }
        Update: {
          base_quantity?: number
          bundle_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_organic_mode?: boolean | null
          link?: string
          order_number?: number
          peak_hours_enabled?: boolean | null
          status?: string | null
          total_price?: number
          updated_at?: string | null
          user_id?: string
          variance_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_orders_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "engagement_bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_cron_tokens: {
        Row: {
          created_at: string
          name: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          name: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          name?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          completion_locked_at: string | null
          created_at: string | null
          current_count: number | null
          delivered_count: number | null
          drip_interval: number | null
          drip_interval_unit: string | null
          drip_quantity_per_run: number | null
          drip_runs: number | null
          error_message: string | null
          id: string
          is_drip_feed: boolean | null
          is_organic_mode: boolean | null
          last_synced_at: string | null
          link: string
          max_observed_count: number | null
          order_number: number
          peak_hours_enabled: boolean | null
          price: number
          progress_percentage: number | null
          provider_order_id: string | null
          quantity: number
          remaining_count: number | null
          remains: number | null
          service_id: string | null
          start_count: number | null
          status: string | null
          target_count: number | null
          updated_at: string | null
          user_id: string
          variance_percent: number | null
        }
        Insert: {
          completion_locked_at?: string | null
          created_at?: string | null
          current_count?: number | null
          delivered_count?: number | null
          drip_interval?: number | null
          drip_interval_unit?: string | null
          drip_quantity_per_run?: number | null
          drip_runs?: number | null
          error_message?: string | null
          id?: string
          is_drip_feed?: boolean | null
          is_organic_mode?: boolean | null
          last_synced_at?: string | null
          link: string
          max_observed_count?: number | null
          order_number?: number
          peak_hours_enabled?: boolean | null
          price: number
          progress_percentage?: number | null
          provider_order_id?: string | null
          quantity: number
          remaining_count?: number | null
          remains?: number | null
          service_id?: string | null
          start_count?: number | null
          status?: string | null
          target_count?: number | null
          updated_at?: string | null
          user_id: string
          variance_percent?: number | null
        }
        Update: {
          completion_locked_at?: string | null
          created_at?: string | null
          current_count?: number | null
          delivered_count?: number | null
          drip_interval?: number | null
          drip_interval_unit?: string | null
          drip_quantity_per_run?: number | null
          drip_runs?: number | null
          error_message?: string | null
          id?: string
          is_drip_feed?: boolean | null
          is_organic_mode?: boolean | null
          last_synced_at?: string | null
          link?: string
          max_observed_count?: number | null
          order_number?: number
          peak_hours_enabled?: boolean | null
          price?: number
          progress_percentage?: number | null
          provider_order_id?: string | null
          quantity?: number
          remaining_count?: number | null
          remains?: number | null
          service_id?: string | null
          start_count?: number | null
          status?: string | null
          target_count?: number | null
          updated_at?: string | null
          user_id?: string
          variance_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      organic_run_schedule: {
        Row: {
          base_quantity: number
          completed_at: string | null
          created_at: string | null
          engagement_order_item_id: string | null
          error_message: string | null
          id: string
          last_status_check: string | null
          max_retries: number
          next_attempt_at: string | null
          order_id: string | null
          peak_multiplier: number | null
          provider_account_id: string | null
          provider_account_name: string | null
          provider_charge: number | null
          provider_order_id: string | null
          provider_remains: number | null
          provider_response: Json | null
          provider_start_count: number | null
          provider_status: string | null
          quantity_to_send: number
          retry_count: number | null
          rotation_lock_key: string | null
          run_number: number
          scheduled_at: string
          started_at: string | null
          status: string | null
          variance_applied: number | null
        }
        Insert: {
          base_quantity: number
          completed_at?: string | null
          created_at?: string | null
          engagement_order_item_id?: string | null
          error_message?: string | null
          id?: string
          last_status_check?: string | null
          max_retries?: number
          next_attempt_at?: string | null
          order_id?: string | null
          peak_multiplier?: number | null
          provider_account_id?: string | null
          provider_account_name?: string | null
          provider_charge?: number | null
          provider_order_id?: string | null
          provider_remains?: number | null
          provider_response?: Json | null
          provider_start_count?: number | null
          provider_status?: string | null
          quantity_to_send: number
          retry_count?: number | null
          rotation_lock_key?: string | null
          run_number: number
          scheduled_at: string
          started_at?: string | null
          status?: string | null
          variance_applied?: number | null
        }
        Update: {
          base_quantity?: number
          completed_at?: string | null
          created_at?: string | null
          engagement_order_item_id?: string | null
          error_message?: string | null
          id?: string
          last_status_check?: string | null
          max_retries?: number
          next_attempt_at?: string | null
          order_id?: string | null
          peak_multiplier?: number | null
          provider_account_id?: string | null
          provider_account_name?: string | null
          provider_charge?: number | null
          provider_order_id?: string | null
          provider_remains?: number | null
          provider_response?: Json | null
          provider_start_count?: number | null
          provider_status?: string | null
          quantity_to_send?: number
          retry_count?: number | null
          rotation_lock_key?: string | null
          run_number?: number
          scheduled_at?: string
          started_at?: string | null
          status?: string | null
          variance_applied?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organic_run_schedule_engagement_order_item_id_fkey"
            columns: ["engagement_order_item_id"]
            isOneToOne: false
            referencedRelation: "engagement_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organic_run_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organic_run_schedule_provider_account_id_fkey"
            columns: ["provider_account_id"]
            isOneToOne: false
            referencedRelation: "provider_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      oxapay_deposits: {
        Row: {
          amount_inr: number
          amount_usd: number
          created_at: string
          credited: boolean
          id: string
          order_id: string
          pay_currency: string | null
          payment_url: string | null
          raw_payload: Json | null
          status: string
          track_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_inr: number
          amount_usd: number
          created_at?: string
          credited?: boolean
          id?: string
          order_id: string
          pay_currency?: string | null
          payment_url?: string | null
          raw_payload?: Json | null
          status?: string
          track_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_inr?: number
          amount_usd?: number
          created_at?: string
          credited?: boolean
          id?: string
          order_id?: string
          pay_currency?: string | null
          payment_url?: string | null
          raw_payload?: Json | null
          status?: string
          track_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      oxapay_webhook_events: {
        Row: {
          amount_match: boolean | null
          credit_result: Json | null
          event_hash: string
          expected_amount: number | null
          headers: Json | null
          http_method: string | null
          id: string
          notes: string | null
          order_id: string | null
          pay_currency: string | null
          payload: Json | null
          processed: boolean
          raw_body: string | null
          received_amount: number | null
          received_at: string
          signature_expected: string | null
          signature_received: string | null
          signature_valid: boolean
          source_ip: string | null
          status: string | null
          track_id: string | null
          tx_hash: string | null
          user_agent: string | null
        }
        Insert: {
          amount_match?: boolean | null
          credit_result?: Json | null
          event_hash: string
          expected_amount?: number | null
          headers?: Json | null
          http_method?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          pay_currency?: string | null
          payload?: Json | null
          processed?: boolean
          raw_body?: string | null
          received_amount?: number | null
          received_at?: string
          signature_expected?: string | null
          signature_received?: string | null
          signature_valid?: boolean
          source_ip?: string | null
          status?: string | null
          track_id?: string | null
          tx_hash?: string | null
          user_agent?: string | null
        }
        Update: {
          amount_match?: boolean | null
          credit_result?: Json | null
          event_hash?: string
          expected_amount?: number | null
          headers?: Json | null
          http_method?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          pay_currency?: string | null
          payload?: Json | null
          processed?: boolean
          raw_body?: string | null
          received_amount?: number | null
          received_at?: string
          signature_expected?: string | null
          signature_received?: string | null
          signature_valid?: boolean
          source_ip?: string | null
          status?: string | null
          track_id?: string | null
          tx_hash?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          global_markup_percent: number
          id: string
          maintenance_mode: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          global_markup_percent?: number
          id?: string
          maintenance_mode?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          global_markup_percent?: number
          id?: string
          maintenance_mode?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      popup_ads: {
        Row: {
          created_at: string
          description: string
          enabled: boolean
          ends_at: string | null
          id: string
          last_force_trigger: string | null
          skip_after_seconds: number
          starts_at: string | null
          title: string
          updated_at: string
          version: number
          video_layout: string
          youtube_video_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          enabled?: boolean
          ends_at?: string | null
          id?: string
          last_force_trigger?: string | null
          skip_after_seconds?: number
          starts_at?: string | null
          title?: string
          updated_at?: string
          version?: number
          video_layout?: string
          youtube_video_id?: string
        }
        Update: {
          created_at?: string
          description?: string
          enabled?: boolean
          ends_at?: string | null
          id?: string
          last_force_trigger?: string | null
          skip_after_seconds?: number
          starts_at?: string | null
          title?: string
          updated_at?: string
          version?: number
          video_layout?: string
          youtube_video_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          api_key: string | null
          avatar_url: string | null
          banned_at: string | null
          banned_reason: string | null
          created_at: string | null
          currency: string | null
          email: string
          full_name: string | null
          id: string
          is_banned: boolean
          is_organic_mode_default: boolean | null
          organic_ratios: Json | null
          telegram_id: string | null
          telegram_username: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          api_key?: string | null
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          created_at?: string | null
          currency?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_banned?: boolean
          is_organic_mode_default?: boolean | null
          organic_ratios?: Json | null
          telegram_id?: string | null
          telegram_username?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          api_key?: string | null
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_banned?: boolean
          is_organic_mode_default?: boolean | null
          organic_ratios?: Json | null
          telegram_id?: string | null
          telegram_username?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      provider_accounts: {
        Row: {
          api_key: string
          api_url: string
          balance: number | null
          balance_checked_at: string | null
          balance_currency: string | null
          cooldown_until: string | null
          created_at: string | null
          delivery_multiplier: number
          id: string
          is_active: boolean | null
          last_balance_error: string | null
          last_error: string | null
          last_error_at: string | null
          last_low_balance_alert_at: string | null
          last_used_at: string | null
          low_balance_threshold: number
          name: string
          priority: number | null
          provider_id: string
          updated_at: string | null
        }
        Insert: {
          api_key: string
          api_url: string
          balance?: number | null
          balance_checked_at?: string | null
          balance_currency?: string | null
          cooldown_until?: string | null
          created_at?: string | null
          delivery_multiplier?: number
          id?: string
          is_active?: boolean | null
          last_balance_error?: string | null
          last_error?: string | null
          last_error_at?: string | null
          last_low_balance_alert_at?: string | null
          last_used_at?: string | null
          low_balance_threshold?: number
          name: string
          priority?: number | null
          provider_id: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          api_url?: string
          balance?: number | null
          balance_checked_at?: string | null
          balance_currency?: string | null
          cooldown_until?: string | null
          created_at?: string | null
          delivery_multiplier?: number
          id?: string
          is_active?: boolean | null
          last_balance_error?: string | null
          last_error?: string | null
          last_error_at?: string | null
          last_low_balance_alert_at?: string | null
          last_used_at?: string | null
          low_balance_threshold?: number
          name?: string
          priority?: number | null
          provider_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      providers: {
        Row: {
          api_key: string
          api_url: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          api_key: string
          api_url: string
          created_at?: string | null
          id: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          api_url?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      razorpay_webhook_events: {
        Row: {
          event_id: string
          event_type: string | null
          id: string
          payload: Json | null
          payment_id: string | null
          processed_at: string
        }
        Insert: {
          event_id: string
          event_type?: string | null
          id?: string
          payload?: Json | null
          payment_id?: string | null
          processed_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string | null
          id?: string
          payload?: Json | null
          payment_id?: string | null
          processed_at?: string
        }
        Relationships: []
      }
      rotation_alert_state: {
        Row: {
          alert_key: string
          last_alerted_at: string
          last_count: number
          resolved_at: string | null
        }
        Insert: {
          alert_key: string
          last_alerted_at?: string
          last_count?: number
          resolved_at?: string | null
        }
        Update: {
          alert_key?: string
          last_alerted_at?: string
          last_count?: number
          resolved_at?: string | null
        }
        Relationships: []
      }
      service_provider_mapping: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          provider_account_id: string | null
          provider_service_id: string
          service_id: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider_account_id?: string | null
          provider_service_id: string
          service_id?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider_account_id?: string | null
          provider_service_id?: string
          service_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_provider_mapping_provider_account_id_fkey"
            columns: ["provider_account_id"]
            isOneToOne: false
            referencedRelation: "provider_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_provider_mapping_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          cancel_allowed: string | null
          category: string
          created_at: string | null
          description: string | null
          drip_feed_enabled: boolean | null
          drop_type: string | null
          id: string
          is_active: boolean | null
          last_price_sync_at: string | null
          last_price_sync_error: string | null
          last_price_sync_status: string | null
          max_quantity: number
          min_quantity: number
          name: string
          price: number
          provider_id: string | null
          provider_service_id: string
          quality: string | null
          refill: string | null
          speed: string | null
          start_time: string | null
          updated_at: string | null
        }
        Insert: {
          cancel_allowed?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          drip_feed_enabled?: boolean | null
          drop_type?: string | null
          id?: string
          is_active?: boolean | null
          last_price_sync_at?: string | null
          last_price_sync_error?: string | null
          last_price_sync_status?: string | null
          max_quantity?: number
          min_quantity?: number
          name: string
          price?: number
          provider_id?: string | null
          provider_service_id: string
          quality?: string | null
          refill?: string | null
          speed?: string | null
          start_time?: string | null
          updated_at?: string | null
        }
        Update: {
          cancel_allowed?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          drip_feed_enabled?: boolean | null
          drop_type?: string | null
          id?: string
          is_active?: boolean | null
          last_price_sync_at?: string | null
          last_price_sync_error?: string | null
          last_price_sync_status?: string | null
          max_quantity?: number
          min_quantity?: number
          name?: string
          price?: number
          provider_id?: string | null
          provider_service_id?: string
          quality?: string | null
          refill?: string | null
          speed?: string | null
          start_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_requests: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          message: string | null
          phone: string
          plan_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone: string
          plan_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string
          plan_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          plan_type: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan_type?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan_type?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      support_ticket_events: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          status: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          status: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          status?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          attachments: Json
          category: string | null
          created_at: string | null
          id: string
          message: string
          order_id: string | null
          priority: string | null
          status: string | null
          status_changed_at: string
          subject: string
          ticket_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attachments?: Json
          category?: string | null
          created_at?: string | null
          id?: string
          message: string
          order_id?: string | null
          priority?: string | null
          status?: string | null
          status_changed_at?: string
          subject: string
          ticket_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attachments?: Json
          category?: string | null
          created_at?: string | null
          id?: string
          message?: string
          order_id?: string | null
          priority?: string | null
          status?: string | null
          status_changed_at?: string
          subject?: string
          ticket_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          order_id: string | null
          payment_method: string | null
          payment_reference: string | null
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_reconciliation_reports: {
        Row: {
          created_at: string
          id: string
          mismatch_count: number
          mismatches: Json
          run_at: string
          total_drift: number
          wallets_checked: number
        }
        Insert: {
          created_at?: string
          id?: string
          mismatch_count?: number
          mismatches?: Json
          run_at?: string
          total_drift?: number
          wallets_checked?: number
        }
        Update: {
          created_at?: string
          id?: string
          mismatch_count?: number
          mismatches?: Json
          run_at?: string
          total_drift?: number
          wallets_checked?: number
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          profile_id: string | null
          total_deposited: number | null
          total_spent: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          profile_id?: string | null
          total_deposited?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          profile_id?: string | null
          total_deposited?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zapupi_deposits: {
        Row: {
          amount_inr: number
          amount_usd: number | null
          created_at: string
          credited: boolean
          credited_at: string | null
          gateway_response: Json | null
          id: string
          last_verify_at: string | null
          last_verify_error: string | null
          next_verify_at: string | null
          order_id: string
          payment_url: string | null
          status: string
          txn_id: string | null
          updated_at: string
          user_id: string
          utr: string | null
          verify_attempts: number
        }
        Insert: {
          amount_inr: number
          amount_usd?: number | null
          created_at?: string
          credited?: boolean
          credited_at?: string | null
          gateway_response?: Json | null
          id?: string
          last_verify_at?: string | null
          last_verify_error?: string | null
          next_verify_at?: string | null
          order_id: string
          payment_url?: string | null
          status?: string
          txn_id?: string | null
          updated_at?: string
          user_id: string
          utr?: string | null
          verify_attempts?: number
        }
        Update: {
          amount_inr?: number
          amount_usd?: number | null
          created_at?: string
          credited?: boolean
          credited_at?: string | null
          gateway_response?: Json | null
          id?: string
          last_verify_at?: string | null
          last_verify_error?: string | null
          next_verify_at?: string | null
          order_id?: string
          payment_url?: string | null
          status?: string
          txn_id?: string | null
          updated_at?: string
          user_id?: string
          utr?: string | null
          verify_attempts?: number
        }
        Relationships: []
      }
      zapupi_webhook_events: {
        Row: {
          amount_match: boolean | null
          credit_result: Json | null
          event_key: string
          expected_amount: number | null
          headers: Json | null
          http_method: string | null
          id: string
          order_id: string
          payload: Json | null
          processed: boolean | null
          raw_body: string | null
          received_amount: number | null
          received_at: string
          source: string
          source_ip: string | null
          status: string | null
          txn_id: string | null
          user_agent: string | null
          utr: string | null
          verification_notes: string | null
        }
        Insert: {
          amount_match?: boolean | null
          credit_result?: Json | null
          event_key: string
          expected_amount?: number | null
          headers?: Json | null
          http_method?: string | null
          id?: string
          order_id: string
          payload?: Json | null
          processed?: boolean | null
          raw_body?: string | null
          received_amount?: number | null
          received_at?: string
          source?: string
          source_ip?: string | null
          status?: string | null
          txn_id?: string | null
          user_agent?: string | null
          utr?: string | null
          verification_notes?: string | null
        }
        Update: {
          amount_match?: boolean | null
          credit_result?: Json | null
          event_key?: string
          expected_amount?: number | null
          headers?: Json | null
          http_method?: string | null
          id?: string
          order_id?: string
          payload?: Json | null
          processed?: boolean | null
          raw_body?: string | null
          received_amount?: number | null
          received_at?: string
          source?: string
          source_ip?: string | null
          status?: string | null
          txn_id?: string | null
          user_agent?: string | null
          utr?: string | null
          verification_notes?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      providers_public: {
        Row: {
          api_url: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          api_url?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          api_url?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_orders_missing_debit: {
        Row: {
          amt: number | null
          created_at: string | null
          id: string | null
          kind: string | null
          order_number: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_ban_user_and_cancel: {
        Args: { p_reason?: string; p_target_user_id: string }
        Returns: Json
      }
      admin_unban_user: { Args: { p_target_user_id: string }; Returns: Json }
      api_rate_limit_hit: {
        Args: {
          p_bucket_key: string
          p_limit: number
          p_window_seconds: number
        }
        Returns: Json
      }
      cancel_order_with_refund: {
        Args: { p_actor: string; p_is_admin: boolean; p_order_id: string }
        Returns: Json
      }
      cleanup_old_completed_engagement_orders: { Args: never; Returns: Json }
      credit_wallet_oxapay: { Args: { p_order_id: string }; Returns: Json }
      credit_wallet_zapupi: {
        Args: {
          p_gateway_response?: Json
          p_order_id: string
          p_txn_id?: string
          p_utr?: string
        }
        Returns: Json
      }
      debit_wallet_for_order: {
        Args: {
          p_amount: number
          p_description?: string
          p_engagement_order_id?: string
          p_order_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      export_auth_users: {
        Args: never
        Returns: {
          aud: string
          created_at: string
          email: string
          email_confirmed_at: string
          encrypted_password: string
          id: string
          is_super_admin: boolean
          last_sign_in_at: string
          phone: string
          raw_app_meta_data: Json
          raw_user_meta_data: Json
          role: string
          updated_at: string
        }[]
      }
      export_auth_users_for_backup: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          email: string
          email_confirmed_at: string
          encrypted_password: string
          id: string
          last_sign_in_at: string
          phone: string
          raw_app_meta_data: Json
          raw_user_meta_data: Json
        }[]
      }
      get_admin_dashboard_stats: { Args: never; Returns: Json }
      get_admin_users_summary: { Args: never; Returns: Json }
      get_due_engagement_run_ids: {
        Args: { p_limit?: number }
        Returns: {
          id: string
        }[]
      }
      get_due_engagement_run_ids_v2: {
        Args: { p_limit: number }
        Returns: {
          id: string
        }[]
      }
      get_or_create_bot_user: {
        Args: { _full_name?: string; _telegram_id: string }
        Returns: string
      }
      get_provider_topup_breakdown: {
        Args: never
        Returns: {
          pending_quantity: number
          pending_runs: number
          pending_user_usd: number
          provider_id: string
          provider_name: string
          service_category: string
          service_id: string
          service_name: string
        }[]
      }
      get_provider_topup_plan: {
        Args: never
        Returns: {
          markup_percent: number
          pending_runs: number
          pending_user_usd: number
          provider_id: string
          provider_name: string
        }[]
      }
      get_public_markup: { Args: never; Returns: number }
      get_top_pending_users: {
        Args: { p_limit?: number }
        Returns: {
          email: string
          full_name: string
          pending_orders: number
          pending_value_usd: number
          total_deposited: number
          total_spent: number
          user_id: string
          wallet_balance: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_maintenance_mode: { Args: never; Returns: boolean }
      is_user_banned: { Args: { _user_id: string }; Returns: boolean }
      pg_advisory_xact_lock: { Args: { key: number }; Returns: undefined }
      reconcile_wallets: { Args: never; Returns: Json }
      reschedule_organic_run: {
        Args: { p_quantity: number; p_run_id: string; p_scheduled_at: string }
        Returns: Json
      }
      rotate_my_api_key: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
