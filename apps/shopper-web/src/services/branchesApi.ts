import { getApiClient } from "@pharmacy/api-client";
import type { Branch } from "@pharmacy/contracts";

export type ApiBranch = Branch;

// ─── Real United Pharmacies branches (fallback when API is unreachable) ───────
//
// These are the actual 5 branches. Coordinates and names match
// apps/shopper-native/src/features/delivery/branches/data.ts exactly.

const FALLBACK_BRANCHES: Branch[] = [
  {
    id:          "gardenia",
    nameAr:      "صيدليات المتحدة - جاردينيا",
    nameEn:      "United Pharmacies - Gardenia",
    governorate: "Cairo",
    area:        "القاهرة الجديدة",
    lat:         30.0827,
    lng:         31.3853,
    isActive:    true,
  },
  {
    id:          "maadi",
    nameAr:      "صيدليات المتحدة - شارع فلسطين",
    nameEn:      "United Pharmacies - Palestine Street",
    governorate: "Cairo",
    area:        "المعادي",
    lat:         30.0146,
    lng:         31.2824,
    isActive:    true,
  },
  {
    id:          "nasr-city-hay-asher",
    nameAr:      "صيدليات المتحدة - الحي العاشر",
    nameEn:      "United Pharmacies - Al Hay Al Asher",
    governorate: "Cairo",
    area:        "مدينة نصر",
    lat:         30.0485,
    lng:         31.3533,
    isActive:    true,
  },
  {
    id:          "zahraa-gomhoureya",
    nameAr:      "صيدليات المتحدة - زهراء الجمهورية",
    nameEn:      "United Pharmacies - Zahraa El Gomhoureya",
    governorate: "Cairo",
    area:        "مدينة نصر",
    lat:         30.0650,
    lng:         31.3780,
    isActive:    true,
  },
  {
    id:          "zahraa-madinet-nasr",
    nameAr:      "صيدليات المتحدة - مدينة نصر",
    nameEn:      "United Pharmacies - Nasr City",
    governorate: "Cairo",
    area:        "مدينة نصر",
    lat:         30.0520,
    lng:         31.3550,
    isActive:    true,
  },
];

export async function fetchBranches(): Promise<Branch[]> {
  try {
    const branches = await getApiClient().listBranches();
    return branches.length > 0 ? branches : FALLBACK_BRANCHES;
  } catch {
    return FALLBACK_BRANCHES;
  }
}

export { FALLBACK_BRANCHES };
