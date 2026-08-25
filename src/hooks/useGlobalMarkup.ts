import { useCallback } from 'react';

/**
 * Global markup removed — pricing is now controlled per-bundle-item via
 * `bundle_items.price_per_k`. This hook is kept as a no-op identity shim so
 * existing call sites keep compiling without behaviour change.
 */
export function useGlobalMarkup() {
  const applyMarkup = useCallback((basePrice: number): number => basePrice, []);
  return { markupPercent: 0, applyMarkup, isLoading: false };
}
