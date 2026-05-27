/**
 * useApplyCouponAtCheckout — server-side coupon consumption.
 *
 * Wraps apply_coupon_checkout. Caller passes a confirmed code + the freshly
 * minted order_id; the RPC marks the coupon consumed and bumps
 * coupon_batches.redeemed_count atomically. Idempotent so a network retry
 * on a sketchy mobile connection cannot double-consume.
 */

import { useCallback } from "react";
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { applyCouponCheckout } from "../api/loyaltyApi";
import { newIdempotencyKey } from "../api/idempotency";
import { loyaltyKeys } from "../api/queryKeys";
import type { ApplyCouponResponse } from "../types";

export interface UseApplyCouponInput {
  code:    string;
  orderId: string;
}

interface InternalInput extends UseApplyCouponInput {
  idempotencyKey: string;
}

export interface UseApplyCouponReturn
  extends Omit<UseMutationResult<ApplyCouponResponse, Error, InternalInput>, "mutate" | "mutateAsync"> {
  apply:      (input: UseApplyCouponInput) => void;
  applyAsync: (input: UseApplyCouponInput) => Promise<ApplyCouponResponse>;
}

export function useApplyCouponAtCheckout(): UseApplyCouponReturn {
  const qc = useQueryClient();

  const m = useMutation<ApplyCouponResponse, Error, InternalInput>({
    mutationFn: ({ code, orderId, idempotencyKey }) =>
      applyCouponCheckout({ code, orderId, idempotencyKey }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: loyaltyKeys.userCoupons() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.couponBatches() });
    },
  });

  const apply = useCallback(
    (input: UseApplyCouponInput) => m.mutate({ ...input, idempotencyKey: newIdempotencyKey() }),
    [m],
  );
  const applyAsync = useCallback(
    (input: UseApplyCouponInput) => m.mutateAsync({ ...input, idempotencyKey: newIdempotencyKey() }),
    [m],
  );

  const { mutate: _m, mutateAsync: _ma, ...rest } = m;
  return { ...rest, apply, applyAsync };
}
