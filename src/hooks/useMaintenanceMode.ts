import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useMaintenanceMode() {
  const queryClient = useQueryClient();

  const { data: isMaintenanceMode = false } = useQuery({
    queryKey: ['maintenance-mode'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_maintenance_mode');
      if (error) return false;
      return data ?? false;
    },
    staleTime: 60000, // Cache for 60s - realtime handles instant updates
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false, // Don't refetch on every component mount
    refetchOnWindowFocus: false,
  });

  // Realtime subscription for INSTANT updates - no polling needed
  useEffect(() => {
    const channel = supabase
      .channel('maintenance-mode-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'platform_settings',
        },
        (payload) => {
          const newMode = (payload.new as any)?.maintenance_mode ?? false;
          queryClient.setQueryData(['maintenance-mode'], newMode);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { isMaintenanceMode };
}
