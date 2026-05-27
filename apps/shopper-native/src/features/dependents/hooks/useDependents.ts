/**
 * Dependents — Zustand reads + RQ optimistic mutations.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  useHealthProfileStore,
  type Dependent,
  type DependentRelation,
} from "@/stores/healthProfileStore";

export function useDependents(): Dependent[] {
  return useHealthProfileStore((s) => s.dependents);
}

export interface AddDependentInput {
  name:         string;
  relationship: DependentRelation;
  dob:          string;
  colorHex?:    string;
}

export function useAddDependent(userId: string | undefined): {
  addDependent: (input: AddDependentInput) => Promise<Dependent>;
  isPending:    boolean;
  error:        Error | null;
} {
  const qc       = useQueryClient();
  const addLocal = useHealthProfileStore((s) => s.addDependent);
  const rmLocal  = useHealthProfileStore((s) => s.removeDependent);

  const mutation = useMutation<Dependent, Error, AddDependentInput>({
    mutationFn: async (input) => {
      const local = addLocal(input);
      const { error } = await supabase.from("dependents").insert({
        user_id:      userId,
        name:         input.name,
        relationship: input.relationship,
        dob:          input.dob,
        color_hex:    input.colorHex,
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
    addDependent: (input) => mutation.mutateAsync(input),
    isPending:    mutation.isPending,
    error:        mutation.error,
  };
}

export function useRemoveDependent(userId: string | undefined): {
  removeDependent: (id: string) => Promise<void>;
  isPending:       boolean;
  error:           Error | null;
} {
  const qc      = useQueryClient();
  const rmLocal = useHealthProfileStore((s) => s.removeDependent);

  const mutation = useMutation<void, Error, { id: string; prior: Dependent | undefined }>({
    mutationFn: async ({ id }) => {
      rmLocal(id);
      const { error } = await supabase.from("dependents").delete().eq("id", id);
      if (error) throw error;
    },
    onError: (_e, vars) => {
      if (vars.prior) {
        useHealthProfileStore.setState((s) => ({
          dependents: [...s.dependents, vars.prior as Dependent],
        }));
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["healthProfile", userId] }),
  });

  return {
    removeDependent: async (id) => {
      const prior = useHealthProfileStore.getState().dependents.find((d) => d.id === id);
      await mutation.mutateAsync({ id, prior });
    },
    isPending: mutation.isPending,
    error:     mutation.error,
  };
}
