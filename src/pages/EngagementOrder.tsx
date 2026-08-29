import { useState, useMemo, useEffect, useCallback, useRef, memo } from "react";
import { useNavigate } from "@/lib/router-compat";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PlatformSelector } from "@/components/engagement/PlatformSelector";
import { QuantitySelector } from "@/components/engagement/QuantitySelector";
import { EngagementTypeCard } from "@/components/engagement/EngagementTypeCard";
import { DeliveryPreview } from "@/components/engagement/DeliveryPreview";
import { LiveGrowthChart } from "@/components/engagement/LiveGrowthChart";
import { DrawableGrowthChart } from "@/components/engagement/DrawableGrowthChart";
import { PageMeta } from "@/components/seo/PageMeta";
import {
  EngagementType,
  EngagementConfig,
  DEFAULT_RATIOS,
  DEFAULT_ORGANIC_SETTINGS,
  EngagementBundle,
  BundleItem
} from "@/lib/engagement-types";
import {
  ControlPoint,
  DrawModeState,
  createInitialPoints,
  curveToSchedule,
  calculateQuantitiesFromCurve,
} from "@/lib/curve-to-schedule";
import { Loader2, Rocket, Link as LinkIcon, Wallet, RefreshCw, Brain, Percent, HelpCircle, ArrowDown, Sparkles, Clock, Shuffle, Shield, TrendingUp, Eye, Heart, MessageCircle, Bookmark, Share2 } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useDebounce } from "@/hooks/useDebounce";
import { FullOrganicConfig } from "@/lib/organic-algorithm";

type EngagementConfigs = Record<string, EngagementConfig>;

// All possible engagement types - will be filtered based on bundle
const ALL_ENGAGEMENT_TYPES: EngagementType[] = ['views', 'likes', 'comments', 'saves', 'shares', 'reposts', 'followers', 'subscribers', 'watch_hours', 'retweets'];

// Local formatPrice for micro-transactions (USD-only raw formatting)
const formatPriceRaw = (price: number): string => {
  if (price === 0) return '0.00';
  if (price >= 0.01) return price.toFixed(2);
  if (price >= 0.0001) return price.toFixed(4);
  if (price >= 0.000001) return price.toFixed(6);
  return price.toFixed(8);
};

export default function EngagementOrder() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, isAdmin, wallet, refreshWallet } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatPrice, rates } = useCurrency();
  // Pricing now comes from bundle_items.price_per_k (admin-controlled per type).

  // Realtime: when admin changes bundle/service pricing, refresh user view instantly.
  useEffect(() => {
    const channel = supabase
      .channel('pricing-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bundle_items' }, () => {
        queryClient.invalidateQueries({ queryKey: ['bundles'] });
        queryClient.invalidateQueries({ queryKey: ['all-bundles-with-items'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'engagement_bundles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['bundles'] });
        queryClient.invalidateQueries({ queryKey: ['all-bundles-with-items'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        queryClient.invalidateQueries({ queryKey: ['bundles'] });
        queryClient.invalidateQueries({ queryKey: ['all-active-services'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Form State
  const [platform, setPlatform] = useState('instagram');
  const [link, setLink] = useState('');
  const [baseQuantity, setBaseQuantity] = useState(10000);
  // Debounce base quantity for expensive recalculations
  const debouncedBaseQuantity = useDebounce(baseQuantity, 200);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [previewSchedules, setPreviewSchedules] = useState<Record<string, { scheduled_at: string; quantity_to_send: number; base_quantity: number; variance_applied: number; peak_multiplier: number }[]>>({});

  // Draw mode state for custom curve editing
  const [drawModeState, setDrawModeState] = useState<DrawModeState>({
    isEnabled: false,
    activeType: null,
    points: {} as Record<EngagementType, ControlPoint[]>,
  });

  // Engagement configs - initialize empty, will be populated when bundle loads
  const [engagements, setEngagements] = useState<EngagementConfigs>({});

  // Track per-type user-edited quantities so auto-ratio sync doesn't overwrite them.
  // Once a user manually edits a type's quantity, it stays locked to their value
  // regardless of base quantity changes — they can edit each type independently.
  const userEditedQtyRef = useRef<Set<EngagementType>>(new Set());

  // Local settings toggles (defaulted from localStorage)
  const [isOrganicMode, setIsOrganicMode] = useState(true);
  const [isAutoRatios, setIsAutoRatios] = useState(true);
  // User-saved custom ratios from Settings page (stored in localStorage)
  const [userSavedRatios, setUserSavedRatios] = useState<Record<string, number> | null>(null);

  // Sync with localStorage on load
  useEffect(() => {
    try {
      const savedOrganic = localStorage.getItem('organic_settings');
      if (savedOrganic) {
        const parsed = JSON.parse(savedOrganic);
        if (typeof parsed.isOrganicMode === 'boolean') setIsOrganicMode(parsed.isOrganicMode);
        if (parsed.ratios) setUserSavedRatios(parsed.ratios);
      }
    } catch { /* ignore */ }
  }, []);


  // Fetch ALL active bundles WITH items to know which platforms are available
  const { data: allBundles } = useQuery({
    queryKey: ['all-bundles-with-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('engagement_bundles')
        .select(`
          platform,
          items:bundle_items(id, service_id)
        `)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  // Get unique platforms that have active bundles with engagement items
  const availablePlatforms = useMemo(() => {
    console.log('[EngagementOrder] allBundles:', allBundles);
    if (!allBundles) return [];
    // Show platforms that have at least one bundle with items configured
    const platforms = allBundles
      .filter(b => b.items && b.items.length > 0)
      .map(b => b.platform);
    const result = [...new Set(platforms)];
    console.log('[EngagementOrder] availablePlatforms:', result);
    return result;
  }, [allBundles]);

  // Auto-select first available platform if current selection has no bundles
  useEffect(() => {
    if (availablePlatforms.length > 0 && !availablePlatforms.includes(platform)) {
      setPlatform(availablePlatforms[0]);
    }
  }, [availablePlatforms, platform]);

  // Fetch bundles for selected platform
  const { data: bundles, isLoading: bundlesLoading } = useQuery({
    queryKey: ['bundles', platform],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('engagement_bundles')
        .select(`
          *,
          items:bundle_items(
            *,
            service:services(id, name, price, min_quantity, max_quantity)
          )
        `)
        .eq('platform', platform)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as (EngagementBundle & { items: (BundleItem & { service: any })[] })[];
    },
    enabled: !!platform && availablePlatforms.includes(platform),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Get active engagement types from bundle
  const activeEngagementTypes = useMemo<EngagementType[]>(() => {
    if (!bundles || bundles.length === 0) return [];
    const bundle = bundles[0];
    if (!bundle?.items) return [];
    // Return unique engagement types sorted by preferred order
    const types = bundle.items
      .map(item => item.engagement_type as EngagementType);
    const uniqueTypes = [...new Set(types)];

    const PREFERRED_ORDER: Record<string, number> = {
      views: 1,
      likes: 2,
      comments: 3,
      shares: 4,
      reposts: 5,
      saves: 6,
    };

    return uniqueTypes.sort((a, b) => (PREFERRED_ORDER[a] || 99) - (PREFERRED_ORDER[b] || 99));
  }, [bundles]);

  // Base per-type quantities (used as "100%" reference for draw-mode scaling)
  // Use debounced value for expensive calculations
  const baseTypeQuantities = useMemo(() => {
    const base: Record<EngagementType, number> = {} as Record<EngagementType, number>;
    activeEngagementTypes.forEach((type) => {
      // Use user's custom ratio if available from localStorage, else fallback to default
      const userRatio = userSavedRatios?.[type];
      const ratio = typeof userRatio === 'number' ? userRatio : DEFAULT_RATIOS[type];
      base[type] = Math.round(debouncedBaseQuantity * (ratio / 100));
    });
    return base;
  }, [debouncedBaseQuantity, activeEngagementTypes, userSavedRatios]);
  // Fetch ALL active services as fallback for price lookup
  const { data: allServices } = useQuery({
    queryKey: ['all-active-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, price, min_quantity, max_quantity, category')
        .eq('is_active', true)
        .order('price', { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Get service prices from bundle — with auto-match fallback for unlinked items
  const servicePrices = useMemo(() => {
    if (!bundles || bundles.length === 0) return {};
    const bundle = bundles[0];
    if (!bundle?.items) return {};

    // Keywords to match engagement types in service names
    const typeKeywords: Record<string, string[]> = {
      views: ['view'],
      likes: ['like'],
      comments: ['comment'],
      saves: ['save'],
      shares: ['share'],
      reposts: ['repost'],
      followers: ['follow'],
      subscribers: ['subscrib'],
      watch_hours: ['watch'],
      retweets: ['retweet'],
    };

    const prices: Record<string, { pricePerK: number; serviceId: string | null; minQuantity: number }> = {};
    bundle.items.forEach(item => {
      const keywords = typeKeywords[item.engagement_type] || [item.engagement_type];
      const platName = platform.toLowerCase();
      const matchingServices = (allServices || []).filter(s => {
        const name = s.name?.toLowerCase() || '';
        const cat = s.category?.toLowerCase() || '';
        const matchesPlatform = name.includes(platName) || cat.includes(platName);
        const matchesType = keywords.some(kw => name.includes(kw));
        return matchesPlatform && matchesType;
      });
      const positiveMins = matchingServices.map(s => s.min_quantity ?? 0).filter(n => n > 0);
      const lowestMatchedMin = positiveMins.length > 0 ? Math.min(...positiveMins) : undefined;

      // PRIORITY 0: admin-set per-bundle-item price overrides everything
      const manualPricePerK = typeof item.price_per_k === 'number' && item.price_per_k > 0
        ? Number(item.price_per_k)
        : null;

      // 1) Try the linked service first, but show the lowest provider minimum across the rotation pool
      if (item.service && (manualPricePerK !== null || item.service.price > 0)) {
        prices[item.engagement_type] = {
          pricePerK: manualPricePerK ?? item.service.price,
          serviceId: item.service.id,
          minQuantity: lowestMatchedMin ?? item.service.min_quantity,
        };
        return;
      }

      // 2) Fallback: auto-match from all active services by platform + engagement type
      if (allServices && allServices.length > 0) {
        const matches = matchingServices.filter(s => s.price > 0);

        if (matches.length > 0) {
          // Cheapest service for pricing
          const match = matches.reduce((a, b) => (a.price <= b.price ? a : b));
          // Lowest min across all matching providers (router can rotate)
          const lowestMin = Math.min(...matches.map(s => s.min_quantity ?? 0).filter(n => n > 0));
          prices[item.engagement_type] = {
            pricePerK: manualPricePerK ?? match.price,
            serviceId: match.id,
            minQuantity: Number.isFinite(lowestMin) ? lowestMin : match.min_quantity,
          };
          return;
        }
      }

      // 3) Even if linked but price=0, still register the service for order routing
      if (item.service) {
        prices[item.engagement_type] = {
          pricePerK: manualPricePerK ?? item.service.price,
          serviceId: item.service.id,
          minQuantity: lowestMatchedMin ?? item.service.min_quantity,
        };
        return;
      }

      // 4) No linked service and no auto-match, but admin set a manual price → still register
      if (manualPricePerK !== null) {
        prices[item.engagement_type] = {
          pricePerK: manualPricePerK,
          serviceId: null,
          minQuantity: lowestMatchedMin ?? 0,
        };
      }
    });
    // Enforce platform minimum of 100 for views regardless of provider.
    // Pricing for views (and every other type) comes from bundle_items.price_per_k
    // set by the admin — no hardcoded overrides.
    if (prices['views']) {
      prices['views'] = {
        ...prices['views'],
        minQuantity: Math.max(100, prices['views'].minQuantity || 0),
      };
    }
    return prices;
  }, [bundles, allServices, platform, rates]);

  // Update engagement configs when bundle or base quantity changes
  // Use debounced value to prevent excessive recalculations
  useEffect(() => {
    if (!bundles || bundles.length === 0) return;

    const bundle = bundles[0];
    if (!bundle?.items) return;

    // Get all engagement types from bundle items
    const bundleTypes = bundle.items
      .map(item => item.engagement_type as EngagementType);

    const uniqueBundleTypes = [...new Set(bundleTypes)];

    setEngagements((prev) => {
      const updated: EngagementConfigs = {};

      uniqueBundleTypes.forEach((type) => {
        // If auto-ratios is OFF, only enable 'views' by default
        const isEnabledByDefault = isAutoRatios || type === 'views';

        // Use user's custom ratio if available from localStorage, else fallback to default
        const userRatio = userSavedRatios?.[type];
        const ratioPercent = typeof userRatio === 'number' ? userRatio : (DEFAULT_RATIOS[type] ?? 1);

        const ratioQuantity = Math.round(debouncedBaseQuantity * (ratioPercent / 100));

        const serviceData = servicePrices[type];

        // Respect user's base quantity exactly — no auto bump to provider minimum.
        // If it's below provider min, the per-card warning will appear.
        const quantity = ratioQuantity;

        const isUserEdited = userEditedQtyRef.current.has(type);
        const finalQuantity = isUserEdited && prev[type]
          ? prev[type].quantity
          : ((isAutoRatios || !prev[type]) ? quantity : prev[type].quantity);
        const finalPrice = serviceData
          ? (finalQuantity / 1000) * serviceData.pricePerK
          : prev[type]?.price ?? 0;

        updated[type] = {
          type,
          enabled: prev[type] ? prev[type].enabled : isEnabledByDefault,
          quantity: finalQuantity,
          price: finalPrice,
          serviceId: serviceData?.serviceId ?? prev[type]?.serviceId ?? null,
          minQuantity: serviceData?.minQuantity ?? prev[type]?.minQuantity,
          // Per-type organic settings
          timeLimitHours: prev[type]?.timeLimitHours ?? DEFAULT_ORGANIC_SETTINGS.timeLimitHours,
          variancePercent: prev[type]?.variancePercent ?? DEFAULT_ORGANIC_SETTINGS.variancePercent,
          peakHoursEnabled: prev[type]?.peakHoursEnabled ?? DEFAULT_ORGANIC_SETTINGS.peakHoursEnabled,
        };
      });
      return updated;
    });
  }, [debouncedBaseQuantity, bundles, servicePrices, userSavedRatios, isAutoRatios]);

  const handleEngagementChange = useCallback((type: EngagementType, config: EngagementConfig) => {
    setEngagements(prev => {
      const prevQty = prev[type]?.quantity;
      if (prevQty !== undefined && config.quantity !== prevQty) {
        userEditedQtyRef.current.add(type);
      }
      return { ...prev, [type]: config };
    });
    // Reset draw mode when user manually changes quantity
    if (drawModeState.isEnabled) {
      setDrawModeState(prev => ({
        ...prev,
        points: {
          ...prev.points,
          [type]: createInitialPoints(type, config.quantity),
        },
      }));
    }
  }, [drawModeState.isEnabled]);

  // Real-time: when user drags curve, update quantities instantly (and schedule updates automatically)
  useEffect(() => {
    if (!drawModeState.isEnabled) return;

    const nextQuantities = calculateQuantitiesFromCurve(drawModeState.points, baseTypeQuantities);

    setEngagements((prev) => {
      let changed = false;
      const updated: EngagementConfigs = { ...prev };

      Object.keys(prev).forEach((type) => {
        const engType = type as EngagementType;
        const desired = nextQuantities[engType];
        if (typeof desired !== 'number' || Number.isNaN(desired)) return;

        // Clamp to provider/service minimum if present
        const min = updated[engType]?.minQuantity ?? 0;
        const clamped = min > 0 ? Math.max(min, desired) : desired;

        if (clamped === updated[engType]?.quantity) return;

        const prevQty = updated[engType]?.quantity || 0;
        const pricePerK = prevQty > 0 ? ((updated[engType]?.price || 0) * 1000) / prevQty : 0;

        updated[engType] = {
          ...updated[engType],
          quantity: clamped,
          price: pricePerK > 0 ? (clamped / 1000) * pricePerK : updated[engType]?.price || 0,
        };
        changed = true;
      });

      return changed ? updated : prev;
    });
  }, [drawModeState.isEnabled, drawModeState.points, baseTypeQuantities]);

  // Handle curve change from drawable chart (end-of-drag / preset / reset)
  const handleCurveChange = useCallback((type: EngagementType, points: ControlPoint[]) => {
    // Update the draw mode state with new points
    setDrawModeState(prev => ({
      ...prev,
      points: { ...prev.points, [type]: points },
    }));
    // Refresh key kept for any downstream reset behavior
    setPreviewRefreshKey(k => k + 1);
  }, []);

  const handleScheduleChange = useCallback((payload: {
    schedules: FullOrganicConfig[];
    customQuantities: Record<string, number>;
  }) => {
    const nextSchedules = payload.schedules.reduce((acc, schedule) => {
      acc[schedule.engagementType] = schedule.runs.map((run) => {
        const runId = `${schedule.engagementType}-${run.runNumber}`;
        const quantity = payload.customQuantities[runId] ?? run.quantity;

        return {
          scheduled_at: run.scheduledAt.toISOString(),
          quantity_to_send: quantity,
          base_quantity: quantity,
          variance_applied: run.varianceApplied,
          peak_multiplier: run.peakMultiplier,
        };
      });

      return acc;
    }, {} as Record<string, { scheduled_at: string; quantity_to_send: number; base_quantity: number; variance_applied: number; peak_multiplier: number }[]>);

    setPreviewSchedules(nextSchedules);
  }, []);

  // Calculate totals
  const totalPrice = useMemo(() => {
    return Object.values(engagements)
      .filter(e => e.enabled)
      .reduce((sum, e) => sum + e.price, 0);
  }, [engagements]);

  const totalEngagements = useMemo(() => {
    return Object.values(engagements)
      .filter(e => e.enabled)
      .reduce((sum, e) => sum + e.quantity, 0);
  }, [engagements]);

  // Place order mutation
  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!link.trim()) throw new Error('Please enter a valid link');

      // Strong client-side validation
      if (!wallet) {
        throw new Error('Wallet not found. Please refresh the page.');
      }

      if (wallet.balance < totalPrice) {
        throw new Error(
          `Insufficient balance! You need ${formatPrice(totalPrice)} but only have ${formatPrice(wallet.balance)}. Please add funds.`
        );
      }

      if (totalPrice <= 0) {
        throw new Error('Invalid order total. Please select engagement types.');
      }

      // Prevent non-2xx failures from provider min-quantity rules
      const belowMin = Object.entries(engagements)
        .filter(([_, config]) => config.enabled)
        .filter(([_, config]) => (config.minQuantity ?? 0) > 0)
        .filter(([_, config]) => config.quantity < (config.minQuantity ?? 0))
        .map(([type, config]) => ({
          type,
          quantity: config.quantity,
          min: config.minQuantity as number,
        }));

      if (belowMin.length > 0) {
        const first = belowMin[0];
        throw new Error(
          `${first.type} quantity ${first.quantity} is below minimum ${first.min}. Increase Base Quantity or edit that type.`
        );
      }

      const bundle = bundles?.[0];

      const result = await placeOrder({
        data: {
          bundle_id: bundle?.id ?? null,
          link: link.trim(),
          base_quantity: baseQuantity,
          is_organic_mode: isOrganicMode,
          engagements: Object.entries(engagements)
            .filter(([_, config]) => config.enabled)
            .map(([type, config]) => {
              let effectiveTimeLimit = config.timeLimitHours;
              if (effectiveTimeLimit === -1) effectiveTimeLimit = 0;

              const scheduledRuns = previewSchedules[type]?.map((run, index) => ({
                scheduled_at: run.scheduled_at,
                quantity_to_send: Math.max(1, Math.round(run.quantity_to_send)),
                base_quantity: Math.max(1, Math.round(run.base_quantity)),
                variance_applied: run.variance_applied,
                peak_multiplier: run.peak_multiplier,
                run_number: index + 1,
              }));

              return {
                type,
                quantity: Math.round(config.quantity),
                service_id: config.serviceId ?? null,
                time_limit_hours: effectiveTimeLimit,
                variance_percent: config.variancePercent,
                peak_hours_enabled: config.peakHoursEnabled,
                scheduled_runs: scheduledRuns,
              };
            }),
        },
      });

      // Fire the first due run immediately (best effort).
      try {
        await executeRuns({ data: { limit: 25 } });
      } catch {
        // scheduler will pick it up on the next tick
      }

      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "🚀 Order Placed!",
        description: `Order #${data.order_number} created. ${formatPrice(totalPrice)} deducted.`,
      });
      // Immediately refresh wallet from auth context
      refreshWallet();
      queryClient.invalidateQueries({ queryKey: ['engagement-orders'] });
      navigate('/engagement-orders');
    },
    onError: (error: Error) => {
      toast({
        title: "Order Failed",
        description: error.message,
        variant: "destructive",
      });
      // Refresh wallet to show updated balance
      refreshWallet();
    },
  });

  // INSTANT RENDER - No loading state blocking UI
  // Redirect happens via useEffect in DashboardLayout if not authenticated

  if (!user && !authLoading) {
    navigate('/auth');
    return null;
  }

  // Check if user can afford the order
  const canAfford = wallet && wallet.balance > 0 && wallet.balance >= totalPrice;

  // Detect platform from link for validation
  const detectPlatformFromLink = (url: string): string | null => {
    const lower = url.toLowerCase();
    if (lower.includes('instagram.com') || lower.includes('instagr.am')) return 'instagram';
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
    if (lower.includes('tiktok.com')) return 'tiktok';
    if (lower.includes('twitter.com') || lower.includes('x.com')) return 'twitter';
    if (lower.includes('facebook.com') || lower.includes('fb.com')) return 'facebook';
    return null;
  };

  // Handle order button click - SUBSCRIPTION FIRST, then BALANCE
  const handlePlaceOrder = () => {
    // Wait for bundles to load
    if (bundlesLoading) {
      toast({
        title: "Loading...",
        description: "Please wait while services load.",
      });
      return;
    }

    // Basic validation first
    if (!link.trim()) {
      toast({
        title: "Link Required",
        description: "Please enter a valid link.",
        variant: "destructive",
      });
      return;
    }

    // NEW: Detect platform from link and validate it matches selected platform
    const detectedPlatform = detectPlatformFromLink(link);
    if (detectedPlatform && detectedPlatform !== platform) {
      toast({
        title: "⚠️ Platform Mismatch",
        description: `You selected ${platform.toUpperCase()}, but the link is for ${detectedPlatform.toUpperCase()}. Please select the correct platform.`,
        variant: "destructive",
      });
      return;
    }

    // NEW: Check if the selected platform has services configured
    if (activeEngagementTypes.length === 0) {
      toast({
        title: "❌ Services Not Available",
        description: `No services are configured for ${platform.toUpperCase()} yet. Please contact Admin.`,
        variant: "destructive",
      });
      return;
    }

    // NEW: Double check that all enabled engagements have service IDs
    const missingServiceEngagements = Object.entries(engagements)
      .filter(([_, config]) => config.enabled && !config.serviceId)
      .map(([type]) => type);

    if (missingServiceEngagements.length > 0) {
      toast({
        title: "❌ Service Configuration Error",
        description: `${missingServiceEngagements.join(', ')} services are not configured. This order cannot be sent to provider.`,
        variant: "destructive",
      });
      return;
    }

    // NEW: Block orders where any enabled engagement type has zero price
    const zeroPriceEngagements = Object.entries(engagements)
      .filter(([_, config]) => config.enabled && config.price <= 0)
      .map(([type]) => type);

    if (zeroPriceEngagements.length > 0) {
      toast({
        title: "⚠️ Pricing Error",
        description: `${zeroPriceEngagements.join(', ')} has $0.00 price. Service pricing may not be configured correctly. Please contact support.`,
        variant: "destructive",
      });
      return;
    }

    // Admin gets free access - no subscription or balance required
    if (isAdmin) {
      placeOrderMutation.mutate();
      return;
    }


    // STEP 2: After subscription is confirmed, check balance
    if (!wallet || wallet.balance <= 0) {
      toast({
        title: "🚫 No Balance",
        description: "Your account has no balance. Please add funds first!",
        variant: "destructive",
      });
      navigate('/wallet');
      return;
    }

    if (!canAfford) {
      toast({
        title: "💰 Insufficient Balance",
        description: `Your wallet has ${formatPrice(wallet?.balance || 0)}. This order requires ${formatPrice(totalPrice)}. Please add funds!`,
        variant: "destructive",
      });
      navigate('/wallet');
      return;
    }

    placeOrderMutation.mutate();
  };

  return (
    <DashboardLayout>
      <PageMeta title="New Engagement Order" description="Place a natural, AI-organic engagement order — Instagram, YouTube, or TikTok views, likes, and comments delivered on a real growth curve." canonicalPath="/engagement-order" noIndex />
      <div className="max-w-5xl mx-auto px-2 sm:px-6 lg:px-8 space-y-3 sm:space-y-6 pb-8">
        {/* Header with gradient - Compact on mobile */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl p-2.5 sm:p-4 lg:p-5" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1D4ED8 55%, #2563EB 100%)', boxShadow: '0 8px 32px rgba(37,99,235,.25)' }}>
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(8px)' }}>
                <Rocket className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-white" />
              </div>
            </div>
            <h1 className="text-sm sm:text-xl lg:text-2xl font-bold text-white mb-0.5 tracking-tight">
              Organic Full Engagement
            </h1>
            <p className="text-[10px] sm:text-sm max-w-lg mx-auto leading-snug" style={{ color: 'rgba(255,255,255,.7)' }}>
              One link → All engagement types with organic settings
            </p>
          </div>
          <div className="absolute top-0 right-0 w-32 sm:w-48 h-32 sm:h-48 bg-gradient-to-bl from-white/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 sm:w-36 h-24 sm:h-36 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl" />
        </div>

        {/* AI Automation Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-6">
          <Card className={cn(
            "glass-card border-2 transition-all duration-300 relative overflow-hidden",
            isOrganicMode ? "border-[#2563EB]/40 bg-[#2563EB]/5 shadow-[0_0_30px_rgba(37,99,235,0.1)]" : "border-border"
          )}>
            <CardContent className="p-2.5 sm:p-4 flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className={cn(
                  "w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-all shadow-inner shrink-0",
                  isOrganicMode ? "bg-[#2563EB] text-white" : "bg-secondary text-muted-foreground"
                )}>
                  <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <h3 className="text-[13px] sm:text-sm font-black text-foreground tracking-tight">AI Organic Algorithm</h3>
                    <Badge variant="outline" className={cn(
                      "text-[8px] sm:text-[9px] font-black uppercase tracking-wider border-none px-1.5 py-0 whitespace-nowrap",
                      isOrganicMode ? "bg-[#2563EB] text-white" : "bg-muted text-muted-foreground"
                    )}>
                      {isOrganicMode ? "ON" : "OFF"}
                    </Badge>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium mb-1.5">AI generates UNIQUE organic patterns for each order automatically</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="bg-[#2563EB]/10 text-[8px] sm:text-[9px] text-[#1D4ED8] border-[#2563EB]/20 font-bold py-0 px-1.5">✓ Unique S-curve</Badge>
                    <Badge variant="outline" className="bg-[#2563EB]/10 text-[8px] sm:text-[9px] text-[#1D4ED8] border-[#2563EB]/20 font-bold py-0 px-1.5">✓ Random variance</Badge>
                    <Badge variant="outline" className="bg-[#2563EB]/10 text-[8px] sm:text-[9px] text-[#1D4ED8] border-[#2563EB]/20 font-bold py-0 px-1.5">✓ Anti-bot</Badge>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2 shrink-0 scale-90 sm:scale-100">
                <Switch
                  checked={isOrganicMode}
                  onCheckedChange={(val) => {
                    setIsOrganicMode(val);
                    if (val) setIsAutoRatios(false); // turn off the other
                  }}
                  className="data-[state=checked]:bg-[#2563EB]"
                />
              </div>
            </CardContent>
          </Card>

          <Card className={cn(
            "glass-card border-2 transition-all duration-300 relative overflow-hidden",
            isAutoRatios ? "border-[#60A5FA]/40 bg-[#60A5FA]/5 shadow-[0_0_30px_rgba(96,165,250,0.12)]" : "border-border"
          )}>
            <CardContent className="p-2.5 sm:p-4 flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className={cn(
                  "w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-all shadow-inner shrink-0",
                  isAutoRatios ? "bg-[#2563EB] text-white" : "bg-secondary text-muted-foreground"
                )}>
                  <Percent className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <h3 className="text-[13px] sm:text-sm font-black text-foreground tracking-tight">AI Smart Ratios</h3>
                    <Badge variant="outline" className={cn(
                      "text-[8px] sm:text-[9px] font-black uppercase tracking-wider border-none px-1.5 py-0 whitespace-nowrap",
                      isAutoRatios ? "bg-[#2563EB] text-white" : "bg-muted text-muted-foreground"
                    )}>
                      {isAutoRatios ? "AUTO" : "MANUAL"}
                    </Badge>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium mb-1.5">AI automatically calculates organic engagement ratios</p>
                  <div className="flex flex-wrap gap-1">
                    {isAutoRatios ? (
                      <Badge variant="outline" className="bg-[#2563EB]/10 text-[8px] sm:text-[9px] text-[#1D4ED8] border-[#2563EB]/20 font-bold py-0 px-1.5 italic">Optimized for algorithms</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-[8px] sm:text-[9px] text-amber-500 border-amber-500/20 font-bold py-0 px-1.5">Customized by User</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2 shrink-0 scale-90 sm:scale-100">
                <Switch
                  checked={isAutoRatios}
                  onCheckedChange={(val) => {
                    setIsAutoRatios(val);
                    if (val) setIsOrganicMode(false); // turn off the other
                  }}
                  className="data-[state=checked]:bg-[#2563EB]"
                />
              </div>
            </CardContent>
          </Card>
        </div>{/* end AI Automation Toggles grid */}

        {/* Platform Selector */}
        <Card className="glass-card border-2 border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-foreground/10 flex items-center justify-center">
                <Rocket className="h-3.5 w-3.5 text-foreground" />
              </div>
              <Label className="text-sm font-bold tracking-tight text-foreground">Select Platform</Label>
              <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Pick one</span>
            </div>
            <PlatformSelector
              selected={platform}
              onSelect={setPlatform}
              availablePlatforms={availablePlatforms}
            />
          </CardContent>
        </Card>

        {/* Link Input */}
        <Card className="glass-card border-2 border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-foreground/10 flex items-center justify-center">
                <LinkIcon className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
              </div>
              <Label className="text-base sm:text-lg font-bold tracking-tight text-foreground">Video/Post Link</Label>
            </div>
            <Input
              placeholder={`https://${platform}.com/...`}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="h-12 sm:h-14 text-base sm:text-lg rounded-xl border-2 border-border focus:border-foreground bg-secondary text-foreground font-medium placeholder:text-muted-foreground transition-all"
            />
          </CardContent>
        </Card>

        {/* Base Quantity */}
        <Card className="glass-card border-2 border-border">
          <CardContent className="p-4 sm:p-6">
            <QuantitySelector
              value={baseQuantity}
              onChange={setBaseQuantity}
              min={100}
              max={1000000}
            />
          </CardContent>
        </Card>

        {/* Engagement Types with Per-Type Settings */}
        <div className="space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between px-1 gap-2">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">Engagement Breakdown</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">
                Customize organic settings per type
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="relative inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-success/40 bg-success/10 text-success hover:bg-success/15 transition-colors"
                    aria-label="How organic engagement works"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                    </span>
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">How it works</span>
                    <span className="sm:hidden">Guide</span>
                    <ArrowDown className="h-3 w-3 animate-bounce" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[320px] sm:w-[380px] p-0 overflow-hidden">
                  <div className="p-4 bg-gradient-to-br from-success/15 via-success/5 to-transparent border-b border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-4 w-4 text-success" />
                      <h3 className="text-sm font-bold text-foreground">How Full Engagement Works</h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      One link → views, likes, comments, saves & shares — delivered like real humans.
                    </p>
                  </div>
                  <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                    {[
                      { icon: LinkIcon, title: 'Paste your post link', desc: 'Instagram reel, post or YouTube — one link triggers all engagement types.' },
                      { icon: Eye, title: 'Pick what you want', desc: 'Toggle Views, Likes, Comments, Saves, Shares. Set quantity per type or use the bundle.' },
                      { icon: Brain, title: 'AI plans organic delivery', desc: 'S-curve schedule splits each type into 5–15 runs with ±50% qty variance — no two batches identical.' },
                      { icon: Clock, title: 'Smart timing', desc: 'Peak hours (6–10 PM IST) get 1.5× boost. Night slows down. ±5min jitter on every run.' },
                      { icon: Shuffle, title: 'Multi-provider rotation', desc: 'Each run auto-routes to the best available provider for that type — quality stays high.' },
                      { icon: TrendingUp, title: 'Maintained, not dumped', desc: 'Engagement keeps trickling over hours so your post looks consistently active — not spiked.' },
                      { icon: Shield, title: '100% account safe', desc: 'Randomized patterns + human-like pacing = undetectable. Zero ban risk.' },
                    ].map((s, i) => (
                      <div key={s.title} className="flex gap-2.5">
                        <div className="shrink-0 w-7 h-7 rounded-lg bg-success/10 text-success flex items-center justify-center font-bold text-[11px]">
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <s.icon className="h-3 w-3 text-success" />
                            <p className="text-[12px] font-bold text-foreground">{s.title}</p>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-snug">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 p-2.5 rounded-lg bg-muted/50 border border-border">
                      <p className="text-[11px] text-foreground leading-snug">
                        <strong>Pro tip:</strong> Tap <span className="font-mono px-1 py-0.5 bg-background rounded border border-border text-[10px]">Settings</span> on each card below to fine-tune delivery time, number of runs and variance per engagement type.
                      </p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <span className="text-xs sm:text-sm bg-foreground text-background px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold">
                {bundlesLoading ? (
                  <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> ...</span>
                ) : (
                  `${Object.values(engagements).filter(e => e.enabled).length} active`
                )}
              </span>
            </div>
          </div>
          <div className="grid gap-3 sm:gap-4">
            {activeEngagementTypes.map(type => (
              engagements[type] && (
                <EngagementTypeCard
                  key={type}
                  type={type}
                  config={engagements[type]}
                  baseQuantity={baseQuantity}
                  onChange={(config) => handleEngagementChange(type, config)}
                  minQuantity={engagements[type]?.minQuantity}
                  customCurvePoints={drawModeState.isEnabled ? drawModeState.points[type] : undefined}
                  pricePerK={servicePrices[type]?.pricePerK}
                  previewSchedule={previewSchedules[type]}
                />
              )
            ))}
          </div>
        </div>

        {/* Drawable Growth Chart - Interactive curve editing */}
        {activeEngagementTypes.length > 0 && (
          <DrawableGrowthChart
            engagements={engagements as Record<EngagementType, EngagementConfig>}
            onCurveChange={handleCurveChange}
            drawModeState={drawModeState}
            onDrawModeChange={setDrawModeState}
          />
        )}

        {/* Live Growth Chart - Real-time visualization (shown when not drawing) */}
        {!drawModeState.isEnabled && activeEngagementTypes.length > 0 && (
          <LiveGrowthChart
            engagements={engagements as Record<EngagementType, EngagementConfig>}
            refreshKey={previewRefreshKey}
            onRefresh={() => setPreviewRefreshKey(k => k + 1)}
            platform={platform as 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook'}
          />
        )}

        {/* Delivery Timeline Preview - Detailed schedule */}
        {activeEngagementTypes.length > 0 && (
          <DeliveryPreview
            engagements={engagements as Record<EngagementType, EngagementConfig>}
            refreshKey={previewRefreshKey}
            platform={platform as 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook'}
            customCurvePoints={drawModeState.isEnabled ? drawModeState.points : undefined}
            onScheduleChange={handleScheduleChange}
          />
        )}

        {/* Order Summary - Compact on mobile */}
        <Card className="glass-card border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1 sm:space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">{formatPrice(totalPrice)}</span>
                  <span className="text-muted-foreground text-xs sm:text-sm">total</span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {totalEngagements.toLocaleString()} engagements • {Object.values(engagements).filter(e => e.enabled).length} types
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <div className="text-left sm:text-right p-2.5 sm:p-3 rounded-xl bg-secondary/50">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                    <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    <span>Balance: {formatPrice(wallet?.balance || 0)}</span>
                  </div>
                  {!canAfford && totalPrice > 0 && (
                    <p className="text-[10px] sm:text-xs text-destructive mt-1">
                      Insufficient balance
                    </p>
                  )}
                </div>

                <Button
                  size="lg"
                  onClick={handlePlaceOrder}
                  disabled={!link.trim() || placeOrderMutation.isPending || bundlesLoading}
                  className="h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg font-bold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-300"
                >
                  {placeOrderMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : bundlesLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Place Order — {formatPrice(totalPrice)}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </DashboardLayout>
  );
}
