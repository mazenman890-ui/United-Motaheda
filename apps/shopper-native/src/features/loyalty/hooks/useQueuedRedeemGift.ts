/**
 * useQueuedRedeemGift — offline-resilient variant of useRedeemGift.
 *
 * Online:
 *   - Calls the RPC directly (idempotency key generated once per intent).
 *
 * Offline:
 *   - Enqueues the operation with a stable idempotency key.
 *   - The offline queue runner replays it when the device reconnects.
 *
 * NOTE:
 * We intentionally do NOT optimistically subtract points on the client while
 * offline. Balance + ledger are the source of truth; the UX should be "queued"
 * rather than "success".
 */
 
import { useCallback } from "react";
import { onlineManager } from "@tanstack/react-query";
import { enqueueOp } from "@/lib/offlineQueueRunner";
import { useRedeemGift } from "./useRedeemGift";
import { newIdempotencyKey } from "../api/idempotency";
import { LOYALTY_OP_KINDS } from "../offlineHandlers";
import type { UseRedeemGiftInput } from "./useRedeemGift";
 
export type QueuedRedeemGiftResult =
  | { mode: "online"; pending: true }
  | { mode: "queued"; opId: string };
 
export function useQueuedRedeemGift() {
  const online = useRedeemGift();
 
  const redeem = useCallback(
    (input: UseRedeemGiftInput): QueuedRedeemGiftResult => {
      if (onlineManager.isOnline()) {
        online.redeem(input);
        return { mode: "online", pending: true };
      }
 
      const key = newIdempotencyKey();
      const op = enqueueOp({
        kind: LOYALTY_OP_KINDS.REDEEM_GIFT,
        payload: {
          giftId:         input.giftId,
          address:        input.address,
          idempotencyKey: key,
        },
        idempotencyKey: key,
      });
      return { mode: "queued", opId: op.id };
    },
    [online],
  );
 
  return {
    redeem,
    // online mutation surface
    isPending: online.isPending,
    isSuccess: online.isSuccess,
    isError:   online.isError,
    error:     online.error,
    data:      online.data,
    reset:     online.reset,
  };
}

