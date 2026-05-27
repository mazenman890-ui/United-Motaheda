/**
 * Loyalty queue handlers — registered once at module load.
 *
 * The server RPCs are already idempotent (slice 3), so re-running an op
 * after a transient failure returns the cached response from the first
 * call rather than a second debit. That property is what makes
 * enqueue-while-offline safe.
 */

import { queryClient } from "@/lib/queryClient";
import { registerQueueHandler } from "@/lib/offlineQueue";
import { redeemCoupon, redeemGift, applyCouponCheckout, releaseGift } from "./api/loyaltyApi";
import { loyaltyKeys } from "./api/queryKeys";
import type { RedemptionAddress } from "./types";

export const LOYALTY_OP_KINDS = {
  REDEEM_COUPON:  "loyalty.redeem_coupon",
  REDEEM_GIFT:    "loyalty.redeem_gift",
  APPLY_COUPON:   "loyalty.apply_coupon_checkout",
  RELEASE_GIFT:   "loyalty.release_gift",
} as const;

// Payload shapes are persisted to MMKV so they must stay JSON-serialisable.

export interface RedeemCouponPayload {
  batchId:        string;
  idempotencyKey: string;
}
registerQueueHandler<RedeemCouponPayload>(
  LOYALTY_OP_KINDS.REDEEM_COUPON,
  async (payload) => {
    await redeemCoupon(payload);
    queryClient.invalidateQueries({ queryKey: loyaltyKeys.balance() });
    queryClient.invalidateQueries({ queryKey: loyaltyKeys.userCoupons() });
    queryClient.invalidateQueries({ queryKey: loyaltyKeys.couponBatches() });
  },
);

export interface RedeemGiftPayload {
  giftId:         string;
  address:        RedemptionAddress;
  idempotencyKey: string;
}
registerQueueHandler<RedeemGiftPayload>(
  LOYALTY_OP_KINDS.REDEEM_GIFT,
  async (payload) => {
    await redeemGift(payload);
    queryClient.invalidateQueries({ queryKey: loyaltyKeys.balance() });
    queryClient.invalidateQueries({ queryKey: loyaltyKeys.giftCatalog() });
    queryClient.invalidateQueries({ queryKey: loyaltyKeys.redemptions() });
  },
);

export interface ApplyCouponPayload {
  code:           string;
  orderId:        string;
  idempotencyKey: string;
}
registerQueueHandler<ApplyCouponPayload>(
  LOYALTY_OP_KINDS.APPLY_COUPON,
  async (payload) => {
    await applyCouponCheckout(payload);
    queryClient.invalidateQueries({ queryKey: loyaltyKeys.userCoupons() });
  },
);

export interface ReleaseGiftPayload {
  redemptionId:   string;
  reason:         string;
  idempotencyKey: string;
}
registerQueueHandler<ReleaseGiftPayload>(
  LOYALTY_OP_KINDS.RELEASE_GIFT,
  async (payload) => {
    await releaseGift(payload);
    queryClient.invalidateQueries({ queryKey: loyaltyKeys.balance() });
    queryClient.invalidateQueries({ queryKey: loyaltyKeys.redemptions() });
  },
);
