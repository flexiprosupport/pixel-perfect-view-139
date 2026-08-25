import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: 'none' | 'monthly' | 'lifetime' | 'trial';
  status: 'inactive' | 'active' | 'expired' | 'cancelled';
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface SubscriptionRequest {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  plan_type: 'monthly' | 'lifetime';
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export function useSubscription() {
  const { user } = useAuth();

  const { data: subscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
        return null;
      }

      return data as Subscription | null;
    },
    enabled: !!user,
  });

  const { data: pendingRequest, isLoading: isLoadingRequest } = useQuery({
    queryKey: ['subscription-requests', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('subscription_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching request:', error);
        return null;
      }

      return data as SubscriptionRequest | null;
    },
    enabled: !!user,
  });

  const hasActiveSubscription = subscription?.status === 'active' && subscription?.plan_type !== 'trial';
  const isSubscriptionExpired = subscription?.status === 'expired';
  const hasPendingRequest = !!pendingRequest;
  const isTrial = subscription?.plan_type === 'trial' && subscription?.status === 'active';
  const trialDaysRemaining = null;

  return {
    subscription,
    pendingRequest,
    hasActiveSubscription,
    isSubscriptionExpired,
    hasPendingRequest,
    isTrial,
    trialDaysRemaining,
    isLoading: isLoadingSubscription || isLoadingRequest,
  };
}
