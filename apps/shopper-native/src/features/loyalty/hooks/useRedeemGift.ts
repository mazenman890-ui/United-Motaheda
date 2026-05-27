/**
 * useRedeemGift — calls redeem_points_for_gift. Idempotency key generation
 * follows the same wrapper pattern as useRedeemCoupon: the key is part of
 * the mutation variables and is generated once per intent, so retries reuse
 * the same key and the server replays the cached response.
 */

import { useCallback } from "react";
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { redeemGift } from "../api/loyaltyApi";
import { newIdempotencyKey } from "../api/idempotency";
import { loyaltyKeys } from "../api/queryKeys";
import type { RedeemGiftResponse, RedemptionAddress } from "../types";

export interface UseRedeemGiftInput {
  giftId:  string;
  address: RedemptionAddress;
}

interface InternalInput extends UseRedeemGiftInput {
  idempotencyKey: string;
}

export interface UseRedeemGiftReturn
  extends Omit<UseMutationResult<RedeemGiftResponse, Error, InternalInput>, "mutate" | "mutateAsync"> {
  redeem:      (input: UseRedeemGiftInput) => void;
  redeemAsync: (input: UseRedeemGiftInput) => Promise<RedeemGiftResponse>;
}

export function useRedeemGift(): UseRedeemGiftReturn {
  const qc = useQueryClient();

  const m = useMutation<RedeemGiftResponse, Error, InternalInput>({
    mutationFn: ({ giftId, address, idempotencyKey }) =>
      redeemGift({ giftId, address, idempotencyKey }),
    retry:      2,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** (attempt - 1), 6_000),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: loyaltyKeys.balance() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.giftCatalog() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.redemptions() });
    },
  });

  const redeem = useCallback(
    (input: UseRedeemGiftInput) => m.mutate({ ...input, idempotencyKey: newIdempotencyKey() }),
    [m],
  );
  const redeemAsync = useCallback(
    (input: UseRedeemGiftInput) => m.mutateAsync({ ...input, idempotencyKey: newIdempotencyKey() }),
    [m],
  );

  const { mutate: _m, mutateAsync: _ma, ...rest } = m;
  return { ...rest, redeem, redeemAsync };
}
