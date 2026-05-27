/**
 * PharmacyBootstrap — single mount point for all pharmacy-domain hydration.
 *
 * Composes:
 *   - usePrescriptionsQuery — fetches prescriptions + refill_requests
 *   - useHealthProfileQuery — fetches allergies/conditions/dependents/insurance
 *
 * Plus a __DEV__-only seed: if either store is empty on a dev build, hydrate
 * with HANDOFF-shaped mock data so screens have content to render against.
 * The dev seed never runs in production bundles.
 *
 * Mount once in app/_layout.tsx inside AuthProvider + QueryClientProvider.
 */

import { useEffect } from "react";
import { useAuth } from "@/features/auth";
import { usePrescriptionsStore } from "@/stores/prescriptionsStore";
import { useHealthProfileStore } from "@/stores/healthProfileStore";
import { useOrderStore } from "@/stores/orders";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";
import { usePaymentStore } from "@/features/payment/store";
import { usePrescriptionsQuery } from "@/features/prescriptions";
import { useHealthProfileQuery } from "@/features/health-profile";
import {
  seedPrescriptions,
  seedRefillRequests,
} from "@/features/prescriptions/lib/mockSeed";
import {
  seedAllergies,
  seedConditions,
  seedDependents,
  seedInsuranceCards,
} from "@/features/health-profile/lib/mockSeed";

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

  // Dev seeds — only run when the corresponding store is empty.
  const hydrateRx       = usePrescriptionsStore((s) => s.hydrate);
  const hasRx           = usePrescriptionsStore((s) => s.prescriptions.length > 0);
  const hydrateProfile  = useHealthProfileStore((s) => s.hydrate);
  const hasProfileData  = useHealthProfileStore(
    (s) => s.allergies.length + s.conditions.length + s.dependents.length + s.insurance.length > 0,
  );

  useEffect(() => {
    if (!__DEV__) return;
    const devUserId = user?.id ?? "dev-user";

    if (!hasRx) {
      hydrateRx(seedPrescriptions(devUserId), seedRefillRequests());
    }
    if (!hasProfileData) {
      hydrateProfile({
        allergies:  seedAllergies(),
        conditions: seedConditions(),
        dependents: seedDependents(),
        insurance:  seedInsuranceCards(),
      });
    }
  }, [hasRx, hasProfileData, hydrateRx, hydrateProfile, user?.id]);

  return null;
}
