/**
 * Branches API service.
 *
 * v1: returns the seeded constant.
 * v2: attempts a Supabase fetch first; falls back to seed data on any
 *     failure so the UI never blocks on logistics infra.
 */

import { supabase } from "@/lib/supabase";
import { BRANCHES } from "./data";
import type { Branch } from "./types";

interface BranchRow {
  id:               string;
  name_ar:          string;
  name_en:          string;
  full_name_ar:     string | null;
  full_name_en:     string | null;
  address_ar:       string | null;
  address_en:       string | null;
  phones:           string[] | null;
  hours_ar:         string | null;
  hours_en:         string | null;
  lat:              number;
  lng:              number;
  map_zoom:         number | null;
  is_primary:       boolean | null;
  governorate:      string | null;
  area:             string | null;
  delivery_enabled: boolean | null;
}

function mapRow(row: BranchRow): Branch | null {
  if (!Number.isFinite(row.lat) || !Number.isFinite(row.lng)) return null;
  return {
    id:              row.id,
    nameAr:          row.name_ar,
    nameEn:          row.name_en,
    fullNameAr:      row.full_name_ar ?? row.name_ar,
    fullNameEn:      row.full_name_en ?? row.name_en,
    addressAr:       row.address_ar ?? "",
    addressEn:       row.address_en ?? "",
    phones:          row.phones ?? [],
    hoursAr:         row.hours_ar ?? "",
    hoursEn:         row.hours_en ?? "",
    lat:             row.lat,
    lng:             row.lng,
    mapZoom:         row.map_zoom ?? 16,
    isPrimary:       row.is_primary ?? false,
    governorate:     (row.governorate as Branch["governorate"]) ?? "Cairo",
    area:            row.area ?? "",
    deliveryEnabled: row.delivery_enabled ?? true,
  };
}

export async function fetchBranches(): Promise<Branch[]> {
  try {
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .order("is_primary", { ascending: false })
      .order("name_en", { ascending: true });

    if (error || !data?.length) return [...BRANCHES];

    const mapped = (data as BranchRow[])
      .map(mapRow)
      .filter((b): b is Branch => b !== null);

    return mapped.length > 0 ? mapped : [...BRANCHES];
  } catch {
    return [...BRANCHES];
  }
}
