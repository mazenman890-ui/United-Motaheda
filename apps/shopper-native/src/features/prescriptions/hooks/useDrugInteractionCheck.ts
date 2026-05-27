/**
 * useDrugInteractionCheck — interaction-safety hook stub.
 *
 * Spec: HANDOFF.md §4.1. Wired into screens now so the call sites exist;
 * implementation lands on Day 16 with the interaction.tsx route.
 *
 * Until then this always resolves to `null` — meaning "no known interaction"
 * — so screens can opt-in without branching on hook readiness.
 *
 * // HANDOFF: stub — return value will become the matched drug_interactions
 * // row once we wire the public-read query in Day 16.
 */

import type { InteractionSeverity, DrugRef } from "@/shared/components";

export interface InteractionMatch {
  severity:  InteractionSeverity;
  drugA:     DrugRef;
  drugB:     DrugRef;
  summary:   string;
  detail?:   string;
  watchFor?: string[];
}

export interface UseDrugInteractionCheckResult {
  match:     InteractionMatch | null;
  isLoading: boolean;
}

/** Stub. Always returns `{ match: null, isLoading: false }`. */
export function useDrugInteractionCheck(
  _candidateDrug: string | undefined,
  _activeDrugs:   readonly string[],
): UseDrugInteractionCheckResult {
  return { match: null, isLoading: false };
}
