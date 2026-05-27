/**
 * Allergies — Zustand reads + RQ optimistic mutations.
 *
 * Same pattern as useRequestRefill: write locally first, then Supabase. On
 * failure roll the local record back (here: hard-delete the optimistic row,
 * since allergies have no audit trail need — unlike refills).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  useHealthProfileStore,
  type Allergy,
  type AllergySeverity,
} from "@/stores/healthProfileStore";

export function useAllergies(): Allergy[] {
  return useHealthProfileStore((s) => s.allergies);
}

export interface AddAllergyInput {
  name:     string;
  severity: AllergySeverity;
  reaction: string;
  notes?:   string;
}

export function useAddAllergy(userId: string | undefined): {
  addAllergy: (input: AddAllergyInput) => Promise<Allergy>;
  isPending:  boolean;
  error:      Error | null;
} {
  const qc       = useQueryClient();
  const addLocal = useHealthProfileStore((s) => s.addAllergy);
  const rmLocal  = useHealthProfileStore((s) => s.removeAllergy);

  const mutation = useMutation<Allergy, Error, AddAllergyInput>({
    mutationFn: async (input) => {
      const local = addLocal(input);
      const { error } = await supabase.from("allergies").insert({
        user_id:  userId,
        name:     input.name,
        severity: input.severity,
        reaction: input.reaction,
        notes:    input.notes,
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
    addAllergy: (input) => mutation.mutateAsync(input),
    isPending:  mutation.isPending,
    error:      mutation.error,
  };
}

export function useRemoveAllergy(userId: string | undefined): {
  removeAllergy: (id: string) => Promise<void>;
  isPending:     boolean;
  error:         Error | null;
} {
  const qc      = useQueryClient();
  const rmLocal = useHealthProfileStore((s) => s.removeAllergy);

  const mutation = useMutation<void, Error, { id: string; prior: Allergy | undefined }>({
    mutationFn: async ({ id }) => {
      rmLocal(id);
      const { error } = await supabase.from("allergies").delete().eq("id", id);
      if (error) throw error;
    },
    onError: (_e, vars) => {
      // Restore optimistic delete on failure.
      if (vars.prior) {
        useHealthProfileStore.setState((s) => ({
          allergies: [...s.allergies, vars.prior as Allergy],
        }));
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["healthProfile", userId] }),
  });

  return {
    removeAllergy: async (id) => {
      const prior = useHealthProfileStore.getState().allergies.find((a) => a.id === id);
      await mutation.mutateAsync({ id, prior });
    },
    isPending: mutation.isPending,
    error:     mutation.error,
  };
}
