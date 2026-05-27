/**
 * useCancelGiftRedemption — user-initiated cancellation of a still-reserved
 * gift redemption. Server refunds points + decrements gift_inventory.reserved.
 */

import { useCallback } from "react";
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { releaseGift } from "../api/loyaltyApi";
import { newIdempotencyKey } from "../api/idempotency";
import { loyaltyKeys } from "../api/queryKeys";
import type { ReleaseGiftResponse } from "../types";

export interface UseCancelGiftInput {
  redemptionId: string;
  reason:       string;
}

interface InternalInput extends UseCancelGiftInput {
  idempotencyKey: string;
}

export interface UseCancelGiftReturn
  extends Omit<UseMutationResult<ReleaseGiftResponse, Error, InternalInput>, "mutate" | "mutateAsync"> {
  cancel:      (input: UseCancelGiftInput) => void;
  cancelAsync: (input: UseCancelGiftInput) => Promise<ReleaseGiftResponse>;
}

export function useCancelGiftRedemption(): UseCancelGiftReturn {
  const qc = useQueryClient();

  const m = useMutation<ReleaseGiftResponse, Error, InternalInput>({
    mutationFn: ({ redemptionId, reason, idempotencyKey }) =>
      releaseGift({ redemptionId, reason, idempotencyKey }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: loyaltyKeys.balance() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.giftCatalog() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.redemptions() });
    },
  });

  const cancel = useCallback(
    (input: UseCancelGiftInput) => m.mutate({ ...input, idempotencyKey: newIdempotencyKey() }),
    [m],
  );
  const cancelAsync = useCallback(
    (input: UseCancelGiftInput) => m.mutateAsync({ ...input, idempotencyKey: newIdempotencyKey() }),
    [m],
  );

  const { mutate: _m, mutateAsync: _ma, ...rest } = m;
  return { ...rest, cancel, cancelAsync };
}
