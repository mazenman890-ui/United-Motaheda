/**
 * useRequestRefill — React Query mutation that places a refill request.
 *
 * Pattern: optimistically write into the Zustand store via
 * `requestRefill()`, POST to Supabase, on success refresh the bundle so the
 * server-issued id/eta/status replace the optimistic stub.
 *
 * Failure path: roll the optimistic record back via `cancelRefill` (sets its
 * status to 'cancelled' so the user still sees what they tried to do), and
 * surface the error to the caller.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  usePrescriptionsStore,
  type RefillDelivery,
  type RefillRequest,
} from "@/stores/prescriptionsStore";

export interface RequestRefillInput {
  prescriptionId: string;
  delivery:       RefillDelivery;
  pharmacyId:     string;
}

interface PlacedRefill {
  optimistic: RefillRequest;
}

export function useRequestRefill(userId: string | undefined): {
  requestRefill: (input: RequestRefillInput) => Promise<RefillRequest>;
  isPending:     boolean;
  error:         Error | null;
} {
  const queryClient = useQueryClient();
  const optimistic  = usePrescriptionsStore((s) => s.requestRefill);
  const cancel      = usePrescriptionsStore((s) => s.cancelRefill);

  const mutation = useMutation<PlacedRefill, Error, RequestRefillInput>({
    mutationFn: async (input) => {
      // 1. Optimistic local write — UI updates instantly.
      const local = optimistic(input);

      // 2. Network write.
      const { error } = await supabase.from("refill_requests").insert({
        prescription_id: input.prescriptionId,
        user_id:         userId,
        delivery:        input.delivery,
        pharmacy_id:     input.pharmacyId,
        status:          "pending",
      });

      if (error) {
        cancel(local.id);
        throw error;
      }

      return { optimistic: local };
    },
    onSuccess: () => {
      // Refresh from server to get authoritative id/eta/status.
      queryClient.invalidateQueries({ queryKey: ["prescriptions", userId] });
    },
  });

  return {
    requestRefill: async (input) => {
      const res = await mutation.mutateAsync(input);
      return res.optimistic;
    },
    isPending: mutation.isPending,
    error:     mutation.error,
  };
}
