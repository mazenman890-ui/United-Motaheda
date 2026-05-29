/**
 * Branches API service.
 *
 * v3: fetches from the Railway backend (same DB as web) so the app and
 *     website always show the exact same branches and delivery zones.
 *     Falls back to the static seed data on any network failure.
 */

import { railwayApi } from "@/lib/railwayApi";
import { BRANCHES } from "./data";
import type { Branch } from "./types";

function mapRailwayBranch(row: {
  id: string;
  nameAr: string;
  nameEn: string;
  governorate: string;
  area: string;
  lat: number;
  lng: number;
  isActive: boolean;
}): Branch | null {
  if (!Number.isFinite(row.lat) || !Number.isFinite(row.lng)) return null;
  return {
    id:              row.id,
    nameAr:          row.nameAr,
    nameEn:          row.nameEn,
    fullNameAr:      row.nameAr,
    fullNameEn:      row.nameEn,
    addressAr:       "",
    addressEn:       "",
    phones:          [],
    hoursAr:         "",
    hoursEn:         "",
    lat:             row.lat,
    lng:             row.lng,
    mapZoom:         16,
    isPrimary:       row.id === "gardenia",
    governorate:     (row.governorate as Branch["governorate"]) ?? "Cairo",
    area:            row.area ?? "",
    deliveryEnabled: row.isActive ?? true,
  };
}

export async function fetchBranches(): Promise<Branch[]> {
  try {
    const rows = await railwayApi.listBranches();
    if (!rows?.length) return [...BRANCHES];

    const mapped = rows
      .map(mapRailwayBranch)
      .filter((b): b is Branch => b !== null);

    return mapped.length > 0 ? mapped : [...BRANCHES];
  } catch {
    // Railway unreachable → use static seed so the UI never blocks
    return [...BRANCHES];
  }
}
