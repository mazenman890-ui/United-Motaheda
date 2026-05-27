/**
 * useQueuedRedeemCoupon — offline-resilient variant of useRedeemCoupon.
 *
 *  - Online  : mutates directly via the RPC, identical to useRedeemCoupon.
 *  - Offline : enqueues the op with a stable idempotency key. The queue
 *              runner replays it when the device reconnects. Because the
 *              server RPC is idempotency-cached for 7 days, a successful
 *              replay returns the original response and never double-debits.
 *
 * Optimistic UI: we don't speculate on the new balance / coupon code from
 * the client. Balance + ledger are the system of record — speculating would
 * mean inventing values the server hasn't agreed to. The UX is "queued for
 * sync" with a banner that the queue is non-empty, rather than a fake
 * success message.
 */

import { useCallback } from "react";
import { onlineManager } from "@tanstack/react-query";
import { enqueueOp } from "@/lib/offlineQueueRunner";
import { useRedeemCoupon } from "./useRedeemCoupon";
import { newIdempotencyKey } from "../api/idempotency";
import { LOYALTY_OP_KINDS } from "../offlineHandlers";
import type { UseRedeemCouponInput } from "./useRedeemCoupon";

export type QueuedRedeemResult =
  | { mode: "online"; pending: true }
  | { mode: "queued"; opId: string };

export function useQueuedRedeemCoupon() {
  const online = useRedeemCoupon();

  const redeem = useCallback(
    (input: UseRedeemCouponInput): QueuedRedeemResult => {
      if (onlineManager.isOnline()) {
        online.redeem(input);
        return { mode: "online", pending: true };
      }
      const key = newIdempotencyKey();
      const op = enqueueOp({
        kind:    LOYALTY_OP_KINDS.REDEEM_COUPON,
        payload: { batchId: input.batchId, idempotencyKey: key },
        idempotencyKey: key,
      });
      return { mode: "queued", opId: op.id };
    },
    [online],
  );

  return {
    redeem,
    isPending:    online.isPending,
    isSuccess:    online.isSuccess,
    isError:      online.isError,
    error:        online.error,
    data:         online.data,
    reset:        online.reset,
  };
}
