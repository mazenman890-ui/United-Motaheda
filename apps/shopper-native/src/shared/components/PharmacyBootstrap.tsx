/**
 * PharmacyBootstrap — single mount point for all pharmacy-domain hydration.
 *
 * Composes:
 *   - usePrescriptionsQuery — fetches prescriptions + refill_requests
 *   - useHealthProfileQuery — fetches allergies/conditions/dependents/insurance
 *
 * Mount once in app/_layout.tsx inside AuthProvider + QueryClientProvider.
 *
 * History: this used to also seed __DEV__-only mock prescriptions and health
 * records. Removed — the stores persist to AsyncStorage, so seeded medical
 * data (including a fake controlled-substance prescription) survived past the
 * dev session and could surface as real user data. Medical screens must only
 * ever show server data. The store persist migrations (v2) purge any
 * previously-seeded records from existing installs.
 */

import { useEffect } from "react";
import { useAuth } from "@/features/auth";
import { useOrderStore } from "@/stores/orders";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";
import { usePaymentStore } from "@/features/payment/store";
import { usePrescriptionsQuery } from "@/features/prescriptions";
import { useHealthProfileQuery } from "@/features/health-profile";

export function PharmacyBootstrap(): null {
  const { user } = useAuth();

  // Production hydration (Supabase → Zustand). Both queries are gated on user.
  usePrescriptionsQuery(user?.id);
  useHealthProfileQuery(user?.id);

  // Server-backed stores — all auth-aware. Each hydrate(userId) fetches
  // the user's data from Supabase on sign-in; passing null on sign-out
  // clears the local cache. Anonymous mode (userId=null + no prior auth)
  // loads from AsyncStorage as a fallback so cart/wishlist work pre-auth.
  const hydrateOrders   = useOrderStore   ((s) => s.hydrate);
  const hydrateCart     = useCartStore    ((s) => s.hydrate);
  const hydrateWishlist = useWishlistStore((s) => s.hydrate);
  const hydratePayment  = usePaymentStore ((s) => s.hydrate);

  useEffect(() => {
    const uid = user?.id ?? null;
    void hydrateOrders  (uid);
    void hydrateCart    (uid);
    void hydrateWishlist(uid);
    void hydratePayment (uid);
  }, [hydrateOrders, hydrateCart, hydrateWishlist, hydratePayment, user?.id]);

  return null;
}
