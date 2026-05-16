/**
 * Delivery quote hook.
 *
 * v1 (this file): subtotal-threshold pricing, Cairo-only, synchronous.
 * v2 (Phase 4):   geofenced per-branch quotes from `logisticsApi`.
 *                 Replace the implementation here; the hook signature
 *                 and `DeliveryQuote` type stay identical so no consumer
 *                 needs to change.
 */

import { useMemo } from "react";
import {
  DELIVERY_ETA,
  FREE_DELIVERY_THRESHOLD,
  STANDARD_DELIVERY_FEE,
} from "./constants";
import type { DeliveryQuote, DeliveryQuoteInput } from "./types";

export function useDeliveryQuote(input: DeliveryQuoteInput): DeliveryQuote {
  return useMemo<DeliveryQuote>(() => {
    const subtotal = Math.max(0, input.subtotal);
    const isFree = subtotal >= FREE_DELIVERY_THRESHOLD;
    const cost = isFree ? 0 : STANDARD_DELIVERY_FEE;

    return {
      cost,
      eta: { min: DELIVERY_ETA.min, max: DELIVERY_ETA.max },
      isDeliverable: true,
      isFree,
      amountToFreeDelivery: isFree ? 0 : Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal),
      isLoading: false,
    };
  }, [input.subtotal]);
}
