import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type TransactionFilter = 'all' | 'deposit' | 'withdrawal' | 'order' | 'refund';

export function useTransactions(filter: TransactionFilter = 'all') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['transactions', user?.id, filter],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter !== 'all') {
        query = query.eq('type', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 15000,
  });
}
