/**
 * Dev-mode mock seed for the prescriptions store.
 *
 * Pulls drug names from the prototype's data.jsx (Metformin, Lisinopril,
 * Atorvastatin, etc.) in Arabic. Schema matches HANDOFF §5.1.
 *
 * Wired behind `__DEV__ && store.prescriptions.length === 0` in the root
 * layout — never seeds in production.
 */

import type {
  Prescription,
  RefillRequest,
} from "@/stores/prescriptionsStore";

const NOW = () => new Date().toISOString();

export function seedPrescriptions(userId: string): Prescription[] {
  return [
    {
      id:         "seed-rx-1",
      userId,
      name:       "ميتفورمين 500 مج",
      dose:       "قرص × 2 يومياً مع الطعام",
      refills:    3,
      nextRefill: "20 يوليو 2026",
      doctor:     "د. أحمد سامي",
      status:     "ready",
      addedAt:    NOW(),
      updatedAt:  NOW(),
    },
    {
      id:         "seed-rx-2",
      userId,
      name:       "ليزينوبريل 10 مج",
      dose:       "قرص واحد يومياً صباحاً",
      refills:    1,
      nextRefill: "خلال 4 أيام",
      doctor:     "د. منى رشاد",
      status:     "expiring",
      addedAt:    NOW(),
      updatedAt:  NOW(),
    },
    {
      id:         "seed-rx-3",
      userId,
      name:       "أتورفاستاتين 20 مج",
      dose:       "قرص واحد ليلاً",
      refills:    5,
      nextRefill: "10 أغسطس 2026",
      doctor:     "د. سامي ناصر",
      status:     "active",
      addedAt:    NOW(),
      updatedAt:  NOW(),
    },
    {
      id:           "seed-rx-4",
      userId,
      name:         "أوكسيكودون 5 مج",
      dose:         "قرص عند الحاجة، حد أقصى 4 يومياً",
      refills:      0,
      nextRefill:   "يتطلب وصفة جديدة",
      doctor:       "د. هالة كمال",
      status:       "expired",
      isControlled: true,
      schedule:     2,
      addedAt:      NOW(),
      updatedAt:    NOW(),
    },
  ];
}

export function seedRefillRequests(): RefillRequest[] {
  return [
    {
      id:               "seed-rf-1",
      prescriptionId:   "seed-rx-1",
      delivery:         "standard",
      status:           "preparing",
      total:            85,
      copay:            25,
      insuranceApplied: 60,
      pharmacyId:       "seed-ph-1",
      placedAt:         NOW(),
      eta:              "غداً قبل الساعة 5 م",
    },
  ];
}
