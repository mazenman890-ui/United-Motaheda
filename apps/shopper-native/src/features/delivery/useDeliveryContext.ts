/**
 * useDeliveryContext — unified delivery pricing source.
 *
 * Mirrors the web canonical `useDeliveryContext` (apps/shopper-web/
 * src/app/hooks/useDeliveryContext.ts) so Cart, CartDrawer, and Checkout
 * all produce IDENTICAL delivery quotes for the same cart + location
 * state. Eliminates the prior drift where Cart screen used a local
 * hardcoded `25 EGP` fallback while CartDrawer + Checkout went through
 * `useDeliveryQuote`.
 *
 * Pipeline:
 *
 *   cart subtotal ─┐
 *                  ├──► useDeliveryQuote ──► DeliveryQuote
 *   location ──────┤      (branch-aware Haversine,
 *   (coords +      │       Cairo bounds, threshold,
 *    branch id +   │       primary-branch fallback)
 *    address) ────┘
 *
 * Reactivity:
 *   - Recomputes when cart items change (productId/quantity).
 *   - Recomputes when coords change (GPS update OR address selection).
 *   - Recomputes when selectedBranchId changes (explicit branch pick).
 *   - Recomputes when default-address city changes (legacy fallback).
 *
 * Stability:
 *   - The returned object reference is stable across renders that don't
 *     change the underlying values (memoised by `useDeliveryQuote`).
 *   - Per-field zustand selectors prevent unnecessary re-renders.
 *
 * Usage:
 *
 *   const delivery = useDeliveryContext();
 *   const pricing  = useMemo(
 *     () => createCheckoutPricing(lines, { shippingFee: delivery.cost }),
 *     [lines, delivery.cost],
 *   );
 */

import { useMemo } from "react";
import { useCartStore } from "@/stores/cart";
import { useAddressStore } from "@/features/addresses";
import { useDeliveryQuote } from "./useDeliveryQuote";
import { useLocationState } from "./locationStore";
import type { DeliveryQuote } from "./types";

export interface DeliveryContext extends DeliveryQuote {
  /** Live cart subtotal that fed the quote — exposed for screens that
   *  want to display "أضف X ج.م لتوصيل مجاني" without re-summing. */
  subtotal: number;
  /** True when no address/coords/branch yet — pricing falls back to
   *  primary-branch flat-rate. Useful for the cart screen's empty hint. */
  isResolvedFromContext: boolean;
}

export function useDeliveryContext(): DeliveryContext {
  // ── Cart subtotal ───────────────────────────────────────────────────────
  // Live, reactive — re-runs whenever a line item changes.
  const subtotal = useCartStore((s) => s.subtotal());

  // ── Location state (zustand persist) ────────────────────────────────────
  // Per-field selectors — re-render only when the field actually changes.
  const coordinates      = useLocationState((s) => s.coordinates);
  const selectedBranchId = useLocationState((s) => s.selectedBranchId);
  const selectedArea     = useLocationState((s) => s.selectedArea);

  // ── Default address fallback ────────────────────────────────────────────
  // When the user hasn't granted GPS yet but has a default saved address,
  // use its lat/lng + city for the quote. This is what makes the cart
  // tab show real branch-aware pricing for returning users.
  const defaultAddress = useAddressStore((s) =>
    s.addresses.find((a) => a.is_default) ?? s.addresses[0] ?? null,
  );

  const effectiveCoords = useMemo(() => {
    if (coordinates) return coordinates;
    if (defaultAddress && typeof defaultAddress.lat === "number" && typeof defaultAddress.lng === "number") {
      return { lat: defaultAddress.lat, lng: defaultAddress.lng };
    }
    return null;
  }, [coordinates, defaultAddress]);

  const effectiveCity = useMemo(() => {
    if (selectedArea) return selectedArea;
    return defaultAddress?.city;
  }, [selectedArea, defaultAddress?.city]);

  // ── Delegate to the canonical quote engine ──────────────────────────────
  const quote = useDeliveryQuote({
    subtotal,
    branchId:       selectedBranchId,
    customerCoords: effectiveCoords,
    address:        effectiveCity ? { city: effectiveCity } : undefined,
  });

  return useMemo<DeliveryContext>(() => ({
    ...quote,
    subtotal,
    isResolvedFromContext: !!(selectedBranchId || effectiveCoords || effectiveCity),
  }), [quote, subtotal, selectedBranchId, effectiveCoords, effectiveCity]);
}
