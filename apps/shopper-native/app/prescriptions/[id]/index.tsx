/**
 * Prescription detail — Day-5.5 placeholder.
 *
 * // HANDOFF: deviated — the real detail screen isn't in the explicit 21-day
 * // list; it's composed later in §7 (RxCard hero + history + refill button).
 * // This stub exists only so taps from the list route resolve cleanly. The
 * // drug name renders from the store via usePrescription(id) so QA can
 * // verify the param wiring without waiting for the real page.
 */

import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ComingSoonScreen } from "@/shared/components";
import { usePrescription } from "@/features/prescriptions";

export default function Page(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rx     = usePrescription(id);

  return (
    <ComingSoonScreen
      title={rx?.name ?? "وصفة"}
      subtitle={rx
        ? `${rx.dose} · ${rx.doctor}`
        : "تفاصيل الوصفة قيد التطوير"}
      icon="medkit-outline"
    />
  );
}
