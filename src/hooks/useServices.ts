import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Service } from '@/lib/supabase';

const SERVICES_CACHE_KEY = 'whopautopilot_services_cache_v2';
const SERVICES_CACHE_TTL = 2 * 60 * 1000; // 2 minutes localStorage cache — keeps prices fresh

/** Read services from localStorage if still fresh */
function getCachedServices(): Service[] | null {
  try {
    const raw = localStorage.getItem(SERVICES_CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > SERVICES_CACHE_TTL) {
      localStorage.removeItem(SERVICES_CACHE_KEY);
      return null;
    }
    return data as Service[];
  } catch {
    return null;
  }
}

/** Save services to localStorage */
function setCachedServices(data: Service[]) {
  try {
    localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* quota exceeded - ignore */ }
}

/**
 * Fetches active services with the global admin markup applied to prices.
 * Uses a 30-min localStorage cache to drastically reduce Supabase DB queries.
 */
export function useServices() {
  const { data: rawServices, isLoading: servicesLoading, ...rest } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      // Try localStorage first — avoids a DB round-trip
      const cached = getCachedServices();
      if (cached) return cached;

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });
      
      if (error) throw error;
      const services = data as Service[];
      setCachedServices(services);
      return services;
    },
    staleTime: 60 * 1000,        // 1 min React Query staleness
    gcTime: 30 * 60 * 1000,      // 30 min cache retention
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Global markup removed — services.price is the final per-1000 USD price.
  const services = useMemo(() => rawServices, [rawServices]);

  return { 
    services, 
    isLoading: servicesLoading,
    markupPercent: 0,
    ...rest 
  };
}
