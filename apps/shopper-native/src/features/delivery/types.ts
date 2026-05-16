/**
 * Delivery quote contract. Phase 4 (logistics integration) will preserve
 * this surface and swap the internal implementation with a Supabase /
 * Edge Function call returning geofenced per-branch quotes.
 */

export interface DeliveryQuote {
  /** Delivery fee in EGP. 0 when free. */
  cost: number;
  /** ETA window in minutes. */
  eta: { min: number; max: number };
  /** True when delivery is supported for the given address. */
  isDeliverable: boolean;
  /** True when fee was waived due to subtotal threshold. */
  isFree: boolean;
  /** EGP remaining to qualify for free delivery; 0 when already free. */
  amountToFreeDelivery: number;
  /** True while the quote is being computed (network call, geofencing). */
  isLoading: boolean;
}

export interface DeliveryQuoteInput {
  subtotal: number;
  /** Reserved for Phase 4: street/region/lat-lng inputs. */
  address?: {
    city?: string;
    streetName?: string;
  };
}
