/**
 * Active-prescription display sort: expiring (refill due) first so the user
 * sees what needs action; ready next (filled and waiting); then active
 * (general background). Within a tier, newer items first by `updatedAt`.
 */

import type { Prescription, RxStatus } from "@/stores/prescriptionsStore";

const TIER: Record<RxStatus, number> = {
  expiring: 0,
  ready:    1,
  active:   2,
  expired:  3, // never sorted here; expired rows are partitioned out before sort
};

export function sortActiveByStatus(rxs: readonly Prescription[]): Prescription[] {
  return [...rxs].sort((a, b) => {
    const tierDiff = TIER[a.status] - TIER[b.status];
    if (tierDiff !== 0) return tierDiff;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}
