/**
 * Geofencing primitives for Cairo-only delivery.
 *
 * Pure functions, no React, no Supabase. Used by the delivery quote
 * engine and any UI that needs to validate coordinates / find the
 * nearest branch.
 *
 * Phase 4.x can replace this with PostGIS-backed queries — the surface
 * (signatures, return shapes) is stable.
 */

import type { Branch } from "./branches/types";

/**
 * Approximate Cairo Governorate bounding box (WGS84).
 * Covers urban Cairo + Giza overflow zones we currently service.
 */
export const CAIRO_BOUNDS = {
  north: 30.2200,
  south: 29.9000,
  east:  31.6500,
  west:  31.1000,
} as const;

/** Default delivery radius from a branch in kilometers. */
export const DEFAULT_BRANCH_RADIUS_KM = 12;

export interface Coordinates {
  lat: number;
  lng: number;
}

export function hasValidCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined,
): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

/**
 * Haversine distance between two WGS84 points, in kilometers.
 * Source: https://en.wikipedia.org/wiki/Haversine_formula
 */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const R = 6371; // Earth radius in km
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const c = sinDLat * sinDLat + sinDLng * sinDLng * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(c)));
}

export function isWithinCairo(point: Coordinates): boolean {
  return (
    point.lat >= CAIRO_BOUNDS.south &&
    point.lat <= CAIRO_BOUNDS.north &&
    point.lng >= CAIRO_BOUNDS.west &&
    point.lng <= CAIRO_BOUNDS.east
  );
}

export interface NearestBranchResult {
  branch:     Branch;
  distanceKm: number;
  withinRadius: boolean;
}

/**
 * Find the closest delivery-enabled branch to a point.
 * Returns `null` when no candidate branches are provided.
 */
export function findNearestBranch(
  point: Coordinates,
  branches: readonly Branch[],
  radiusKm: number = DEFAULT_BRANCH_RADIUS_KM,
): NearestBranchResult | null {
  const candidates = branches.filter((b) => b.deliveryEnabled && hasValidCoordinates(b.lat, b.lng));
  if (candidates.length === 0) return null;

  let best: NearestBranchResult | null = null;

  for (const branch of candidates) {
    const d = distanceKm(point, { lat: branch.lat, lng: branch.lng });
    if (!best || d < best.distanceKm) {
      best = {
        branch,
        distanceKm: d,
        withinRadius: d <= radiusKm,
      };
    }
  }

  return best;
}

/**
 * Sort branches by ascending distance from a point.
 */
export function sortBranchesByDistance(
  point: Coordinates,
  branches: readonly Branch[],
): Array<{ branch: Branch; distanceKm: number }> {
  return [...branches]
    .filter((b) => hasValidCoordinates(b.lat, b.lng))
    .map((branch) => ({
      branch,
      distanceKm: distanceKm(point, { lat: branch.lat, lng: branch.lng }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
