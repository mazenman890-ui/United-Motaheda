/**
 * Manual Rx-number lookup — MOCK.
 *
 * Returns a pharmacy-side record stub matching what a real API would yield
 * (everything except the local-store fields `id`, `userId`, `addedAt`,
 * `updatedAt`, which are stamped at insert time).
 *
 * Stable interface: when a real Supabase RPC / external pharmacy API lands,
 * swap the body of `mockLookup` only — call sites stay untouched.
 *
 * // HANDOFF: deviated — single hard-coded match for now (47820094 →
 * // ميتفورمين). Real lookup wires to a server-side function in a future
 * // ticket once the pharmacy API contract is signed off.
 */

import type { Prescription } from "@/stores/prescriptionsStore";

/** Fields a lookup can resolve. Anything not in this list is stamped locally. */
export type RxLookupResult = Pick<
  Prescription,
  "name" | "dose" | "refills" | "nextRefill" | "doctor" | "status" | "isControlled" | "schedule"
>;

const LOOKUP_DELAY_MS = 400;

export async function mockLookup(rxNumber: string): Promise<RxLookupResult | null> {
  await new Promise<void>((resolve) => setTimeout(resolve, LOOKUP_DELAY_MS));

  if (rxNumber === "47820094") {
    return {
      name:       "ميتفورمين 500 ملغ",
      dose:       "قرص واحد · مرتين يومياً",
      refills:    2,
      nextRefill: "خلال 4 أيام",
      doctor:     "د. ب. تشين",
      status:     "active",
    };
  }
  return null;
}
