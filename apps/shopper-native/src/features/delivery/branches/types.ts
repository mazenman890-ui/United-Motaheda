/**
 * Branch domain types — single source of truth for delivery branches.
 *
 * Phase 4 (v1): branches are seeded as a static constant (see data.ts).
 * Phase 4.x:    branches table on Supabase; `fetchBranches()` swaps to a
 *               query against `public.branches`. Consumers don't change.
 */

export type Governorate = "Cairo";

export interface Branch {
  id:              string;
  nameAr:          string;
  nameEn:          string;
  fullNameAr:      string;
  fullNameEn:      string;
  addressAr:       string;
  addressEn:       string;
  phones:          string[];
  hoursAr:         string;
  hoursEn:         string;
  /** WGS84 latitude. */
  lat:             number;
  /** WGS84 longitude. */
  lng:             number;
  /** Default map zoom level when this branch is focused. */
  mapZoom:         number;
  /** True for the flagship / main branch shown by default. */
  isPrimary:       boolean;
  governorate:     Governorate;
  /** Neighborhood/area display label. */
  area:            string;
  /** True when this branch accepts delivery orders. */
  deliveryEnabled: boolean;
  /** Optional pre-built Google Maps directions URL. */
  mapsDirectionsUrl?: string;
}
