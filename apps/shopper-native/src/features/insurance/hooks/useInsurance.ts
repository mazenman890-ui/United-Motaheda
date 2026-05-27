/**
 * Insurance — Zustand reads + RQ optimistic mutations.
 *
 * The `setPrimaryInsurance` mutation is unusual: it must flip exactly one
 * row's is_primary=true and all others to false, atomically. The DB-side
 * `insurance_one_primary` partial unique index will reject a parallel write
 * of two true rows, so we do the flip in two steps inside a single mutation.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  useHealthProfileStore,
  type InsuranceCard,
} from "@/stores/healthProfileStore";

const unitsToCents = (units: number | undefined): number | null =>
  units == null ? null : Math.round(units * 100);

export function useInsurance(): InsuranceCard[] {
  return useHealthProfileStore((s) => s.insurance);
}

export function usePrimaryInsurance(): InsuranceCard | undefined {
  return useHealthProfileStore((s) => s.insurance.find((c) => c.isPrimary));
}

export interface AddInsuranceInput {
  carrier:         string;
  plan:            string;
  memberId:        string;
  groupNumber:     string;
  rxBin:           string;
  pcn:             string;
  copayGeneric?:   number;
  copayBrand?:     number;
  deductibleMet?:  number;
  deductibleTotal?: number;
  isPrimary:       boolean;
}

export function useAddInsurance(userId: string | undefined): {
  addInsurance: (input: AddInsuranceInput) => Promise<InsuranceCard>;
  isPending:    boolean;
  error:        Error | null;
} {
  const qc       = useQueryClient();
  const addLocal = useHealthProfileStore((s) => s.addInsurance);
  const rmLocal  = useHealthProfileStore((s) => s.removeInsurance);

  const mutation = useMutation<InsuranceCard, Error, AddInsuranceInput>({
    mutationFn: async (input) => {
      const local = addLocal({
        ...input,
        copayGeneric:    input.copayGeneric    ?? 0,
        copayBrand:      input.copayBrand      ?? 0,
        deductibleMet:   input.deductibleMet   ?? 0,
        deductibleTotal: input.deductibleTotal ?? 0,
      });
      const { error } = await supabase.from("insurance_cards").insert({
        user_id:                userId,
        carrier:                input.carrier,
        plan:                   input.plan,
        member_id:              input.memberId,
        group_number:           input.groupNumber,
        rx_bin:                 input.rxBin,
        pcn:                    input.pcn,
        copay_generic_cents:    unitsToCents(input.copayGeneric),
        copay_brand_cents:      unitsToCents(input.copayBrand),
        deductible_met_cents:   unitsToCents(input.deductibleMet) ?? 0,
        deductible_total_cents: unitsToCents(input.deductibleTotal),
        is_primary:             input.isPrimary,
      });
      if (error) {
        rmLocal(local.id);
        throw error;
      }
      return local;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["healthProfile", userId] }),
  });

  return {
    addInsurance: (input) => mutation.mutateAsync(input),
    isPending:    mutation.isPending,
    error:        mutation.error,
  };
}

export function useRemoveInsurance(userId: string | undefined): {
  removeInsurance: (id: string) => Promise<void>;
  isPending:       boolean;
  error:           Error | null;
} {
  const qc      = useQueryClient();
  const rmLocal = useHealthProfileStore((s) => s.removeInsurance);

  const mutation = useMutation<void, Error, { id: string; prior: InsuranceCard | undefined }>({
    mutationFn: async ({ id }) => {
      rmLocal(id);
      const { error } = await supabase.from("insurance_cards").delete().eq("id", id);
      if (error) throw error;
    },
    onError: (_e, vars) => {
      if (vars.prior) {
        useHealthProfileStore.setState((s) => ({
          insurance: [...s.insurance, vars.prior as InsuranceCard],
        }));
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["healthProfile", userId] }),
  });

  return {
    removeInsurance: async (id) => {
      const prior = useHealthProfileStore.getState().insurance.find((c) => c.id === id);
      await mutation.mutateAsync({ id, prior });
    },
    isPending: mutation.isPending,
    error:     mutation.error,
  };
}

export function useSetPrimaryInsurance(userId: string | undefined): {
  setPrimary: (id: string) => Promise<void>;
  isPending:  boolean;
  error:      Error | null;
} {
  const qc       = useQueryClient();
  const setLocal = useHealthProfileStore((s) => s.setPrimaryInsurance);

  const mutation = useMutation<void, Error, { id: string; prior: InsuranceCard[] }>({
    mutationFn: async ({ id }) => {
      setLocal(id);
      // Two-step to satisfy the insurance_one_primary partial unique index:
      // first clear all primaries for this user, then mark the chosen one.
      if (!userId) throw new Error("missing userId");

      const clear = await supabase
        .from("insurance_cards")
        .update({ is_primary: false })
        .eq("user_id", userId)
        .eq("is_primary", true);
      if (clear.error) throw clear.error;

      const set = await supabase
        .from("insurance_cards")
        .update({ is_primary: true })
        .eq("id", id);
      if (set.error) throw set.error;
    },
    onError: (_e, vars) => {
      // Restore prior is_primary distribution.
      useHealthProfileStore.setState({ insurance: vars.prior });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["healthProfile", userId] }),
  });

  return {
    setPrimary: async (id) => {
      const prior = useHealthProfileStore.getState().insurance;
      await mutation.mutateAsync({ id, prior });
    },
    isPending: mutation.isPending,
    error:     mutation.error,
  };
}
