/**
 * Delivery quote contract.
 *
 * v1: subtotal-threshold pricing, Cairo-only.
 * v2 (this file): branch-aware quote that also exposes the selected branch
 *                 and distance. Old fields preserved — additive only.
 * v3 (future):    real logistics API with per-zone fees + live ETA.
 *                 Replace the hook internals; the contract is stable.
 */

import type { Branch } from "./branches/types";
import type { Coordinates } from "./geofencing";

export interface DeliveryQuote {
  /** Delivery fee in EGP. 0 when free. */
  cost: number;
  /** ETA window in minutes. */
  eta: { min: number; max: number };
  /** True when delivery is supported for the given address/branch. */
  isDeliverable: boolean;
  /** True when fee was waived due to subtotal threshold. */
  isFree: boolean;
  /** EGP remaining to qualify for free delivery; 0 when already free. */
  amountToFreeDelivery: number;
  /** True while the quote is being computed. */
  isLoading: boolean;
  /** Selected (or auto-detected nearest) branch — null when none chosen yet. */
  branch: Branch | null;
  /** Distance from customer to chosen branch in km, when known. */
  distanceKm: number | null;
  /** Soft warning surfaced to the UI when the address is outside service area. */
  outOfServiceMessage: string | null;
}

export interface DeliveryQuoteInput {
  subtotal: number;
  /** Explicit branch selection — overrides auto nearest-branch routing. */
  branchId?: string | null;
  /** Customer coordinates for nearest-branch + Cairo check, when available. */
  customerCoords?: Coordinates | null;
  /** Optional free-text city for legacy address forms (used only if no coords). */
  address?: {
    city?: string;
    streetName?: string;
  };
}
