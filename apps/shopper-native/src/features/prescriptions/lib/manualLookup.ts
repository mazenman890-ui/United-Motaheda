/**
 * Manual Rx-number lookup.
 *
 * There is no pharmacy lookup API yet — until the server-side contract is
 * signed off, every lookup resolves to "not found" and the screen guides the
 * user to the pharmacy's real support channel instead.
 *
 * Stable interface: when the real Supabase RPC / external pharmacy API lands,
 * swap the body of `lookupRxNumber` only — call sites stay untouched.
 *
 * History: this used to return a hard-coded fake prescription (metformin,
 * fictional doctor) for one magic number. Removed — a production medical app
 * must never fabricate prescription records, and the fake match could be
 * saved into the user's real prescription list.
 */

import type { Prescription } from "@/stores/prescriptionsStore";

/** Fields a lookup can resolve. Anything not in this list is stamped locally. */
export type RxLookupResult = Pick<
  Prescription,
  "name" | "dose" | "refills" | "nextRefill" | "doctor" | "status" | "isControlled" | "schedule"
>;

const LOOKUP_DELAY_MS = 400;

export async function lookupRxNumber(_rxNumber: string): Promise<RxLookupResult | null> {
  await new Promise<void>((resolve) => setTimeout(resolve, LOOKUP_DELAY_MS));
  return null;
}
