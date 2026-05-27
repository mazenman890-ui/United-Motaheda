/**
 * useRedeemCoupon — mutation hook that calls `redeem_points_for_coupon`.
 *
 * The idempotency key is part of the mutation variables, generated once
 * per .mutate() call inside the returned wrapper. React Query v5 retries
 * the same variables on transient failure, so the same key is replayed
 * to the server — which short-circuits to the cached response from the
 * first successful attempt instead of double-debiting.
 *
 * On success, invalidates balance + user coupons + coupon batches so the
 * UI shows the new code and updated balance immediately.
 */

import { useCallback } from "react";
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { redeemCoupon } from "../api/loyaltyApi";
import { newIdempotencyKey } from "../api/idempotency";
import { loyaltyKeys } from "../api/queryKeys";
import type { RedeemCouponResponse } from "../types";

export interface UseRedeemCouponInput {
  batchId: string;
}

interface InternalInput extends UseRedeemCouponInput {
  idempotencyKey: string;
}

export interface UseRedeemCouponReturn
  extends Omit<UseMutationResult<RedeemCouponResponse, Error, InternalInput>, "mutate" | "mutateAsync"> {
  redeem:      (input: UseRedeemCouponInput) => void;
  redeemAsync: (input: UseRedeemCouponInput) => Promise<RedeemCouponResponse>;
}

export function useRedeemCoupon(): UseRedeemCouponReturn {
  const qc = useQueryClient();

  const m = useMutation<RedeemCouponResponse, Error, InternalInput>({
    mutationFn: ({ batchId, idempotencyKey }) => redeemCoupon({ batchId, idempotencyKey }),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: loyaltyKeys.balance() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.userCoupons() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.couponBatches() });
    },
  });

  const redeem = useCallback(
    (input: UseRedeemCouponInput) => m.mutate({ ...input, idempotencyKey: newIdempotencyKey() }),
    [m],
  );
  const redeemAsync = useCallback(
    (input: UseRedeemCouponInput) => m.mutateAsync({ ...input, idempotencyKey: newIdempotencyKey() }),
    [m],
  );

  const { mutate: _m, mutateAsync: _ma, ...rest } = m;
  return { ...rest, redeem, redeemAsync };
}
