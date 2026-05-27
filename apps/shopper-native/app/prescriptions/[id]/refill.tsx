/**
 * Refill flow — Day-10 placeholder.
 *
 * // HANDOFF: deviated — the real 3-step refill flow lands on Day 10
 * // (delivery select → review → confirm). This stub keeps the
 * // /prescriptions/[id]/refill route resolving so the list-row Refill
 * // CTA doesn't 404.
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
      title="إعادة الصرف"
      subtitle={rx
        ? `${rx.name} · ${rx.dose}`
        : "تدفق إعادة الصرف قيد التطوير"}
      icon="refresh-outline"
    />
  );
}
