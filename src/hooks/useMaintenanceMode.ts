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
    staleTime: 15_000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Fallback poll: realtime events are RLS-filtered, so non-admin clients
    // may not receive the UPDATE payload. 30s keeps the switch effective.
    refetchInterval: 30_000,
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
