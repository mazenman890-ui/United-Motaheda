/**
 * Conditions — Zustand reads + RQ optimistic mutations.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  useHealthProfileStore,
  type Condition,
} from "@/stores/healthProfileStore";

export function useConditions(): Condition[] {
  return useHealthProfileStore((s) => s.conditions);
}

export interface AddConditionInput {
  name:    string;
  since:   string;
  managed: boolean;
  notes?:  string;
}

export function useAddCondition(userId: string | undefined): {
  addCondition: (input: AddConditionInput) => Promise<Condition>;
  isPending:    boolean;
  error:        Error | null;
} {
  const qc       = useQueryClient();
  const addLocal = useHealthProfileStore((s) => s.addCondition);
  const rmLocal  = useHealthProfileStore((s) => s.removeCondition);

  const mutation = useMutation<Condition, Error, AddConditionInput>({
    mutationFn: async (input) => {
      const local = addLocal(input);
      const { error } = await supabase.from("conditions").insert({
        user_id: userId,
        name:    input.name,
        since:   input.since || null,
        managed: input.managed,
        notes:   input.notes,
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
    addCondition: (input) => mutation.mutateAsync(input),
    isPending:    mutation.isPending,
    error:        mutation.error,
  };
}

export function useRemoveCondition(userId: string | undefined): {
  removeCondition: (id: string) => Promise<void>;
  isPending:       boolean;
  error:           Error | null;
} {
  const qc      = useQueryClient();
  const rmLocal = useHealthProfileStore((s) => s.removeCondition);

  const mutation = useMutation<void, Error, { id: string; prior: Condition | undefined }>({
    mutationFn: async ({ id }) => {
      rmLocal(id);
      const { error } = await supabase.from("conditions").delete().eq("id", id);
      if (error) throw error;
    },
    onError: (_e, vars) => {
      if (vars.prior) {
        useHealthProfileStore.setState((s) => ({
          conditions: [...s.conditions, vars.prior as Condition],
        }));
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["healthProfile", userId] }),
  });

  return {
    removeCondition: async (id) => {
      const prior = useHealthProfileStore.getState().conditions.find((c) => c.id === id);
      await mutation.mutateAsync({ id, prior });
    },
    isPending: mutation.isPending,
    error:     mutation.error,
  };
}
