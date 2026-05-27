/**
 * Dev-mode mock seed for the health-profile store.
 *
 * Drug names + condition labels mirror the prototype's data.jsx but in Arabic.
 */

import type {
  Allergy,
  Condition,
  Dependent,
  InsuranceCard,
} from "@/stores/healthProfileStore";

const NOW = (): string => new Date().toISOString();

export function seedAllergies(): Allergy[] {
  return [
    {
      id:       "seed-al-1",
      name:     "البنسلين",
      severity: "severe",
      reaction: "تأق · شرى",
      notes:    "تم رصدها عام 2019 — يُتجنّب أي بيتا-لاكتام",
      addedAt:  NOW(),
    },
    {
      id:       "seed-al-2",
      name:     "أدوية السلفا",
      severity: "moderate",
      reaction: "طفح جلدي · حكة",
      addedAt:  NOW(),
    },
    {
      id:       "seed-al-3",
      name:     "اللاتكس",
      severity: "mild",
      reaction: "احمرار موضعي",
      addedAt:  NOW(),
    },
  ];
}

export function seedConditions(): Condition[] {
  return [
    { id: "seed-co-1", name: "سكري النوع الثاني",    since: "2019", managed: true,  notes: "متابعة شهرية" },
    { id: "seed-co-2", name: "ارتفاع ضغط الدم",      since: "2021", managed: true                        },
    { id: "seed-co-3", name: "ارتفاع الكوليسترول",   since: "2022", managed: false                       },
  ];
}

export function seedDependents(): Dependent[] {
  return [
    {
      id:           "seed-dp-1",
      name:         "ليلى سامي",
      relationship: "Spouse",
      dob:          "1988-04-12",
      rxIds:        [],
      colorHex:     "#0A9A8C",
    },
    {
      id:           "seed-dp-2",
      name:         "أحمد سامي",
      relationship: "Child",
      dob:          "2014-09-03",
      rxIds:        [],
      colorHex:     "#7C3AED",
    },
    {
      id:           "seed-dp-3",
      name:         "نادية حسن",
      relationship: "Parent",
      dob:          "1954-01-20",
      rxIds:        [],
      colorHex:     "#D97706",
    },
  ];
}

export function seedInsuranceCards(): InsuranceCard[] {
  return [
    {
      id:              "seed-in-1",
      carrier:         "أكسا للتأمين الطبي",
      plan:            "PPO Choice Plus",
      memberId:        "AXA-984321",
      groupNumber:     "GR-22014",
      rxBin:           "610502",
      pcn:             "ADV",
      copayGeneric:    15,
      copayBrand:      40,
      deductibleMet:   620,
      deductibleTotal: 1500,
      isPrimary:       true,
      addedAt:         NOW(),
    },
  ];
}
