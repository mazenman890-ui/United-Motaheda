/**
 * usePrescriptions — Zustand selector layer.
 *
 * Screens read from Zustand for instant, persisted, offline-capable access.
 * Network hydration is the job of `usePrescriptionsQuery`.
 */

import {
  usePrescriptionsStore,
  type Prescription,
  type RefillRequest,
} from "@/stores/prescriptionsStore";

export function usePrescriptions(): Prescription[] {
  return usePrescriptionsStore((s) => s.prescriptions);
}

export function useActivePrescriptions(): Prescription[] {
  return usePrescriptionsStore((s) =>
    s.prescriptions.filter((p) => p.status !== "expired"),
  );
}

export function useExpiringPrescriptions(): Prescription[] {
  return usePrescriptionsStore((s) =>
    s.prescriptions.filter((p) => p.status === "expiring"),
  );
}

export function usePrescription(id: string | undefined): Prescription | undefined {
  return usePrescriptionsStore((s) =>
    id ? s.prescriptions.find((p) => p.id === id) : undefined,
  );
}

export function useRefills(): RefillRequest[] {
  return usePrescriptionsStore((s) => s.refills);
}

export function useRefillsForPrescription(prescriptionId: string): RefillRequest[] {
  return usePrescriptionsStore((s) =>
    s.refills.filter((r) => r.prescriptionId === prescriptionId),
  );
}
