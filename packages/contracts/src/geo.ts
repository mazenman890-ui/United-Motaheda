import { z } from "zod";

export const CoordinatesSchema = z.object({
  lat: z.number().finite(),
  lng: z.number().finite(),
});

export type Coordinates = z.infer<typeof CoordinatesSchema>;

export const PolygonSchema = z.object({
  /**
   * Polygon ring as an ordered list of coordinates.
   * The ring is treated as closed implicitly (last → first edge).
   */
  points: z.array(CoordinatesSchema).min(3),
});

export type Polygon = z.infer<typeof PolygonSchema>;

/**
 * Even-odd (ray-casting) point-in-polygon predicate.
 * - Returns true when the point is strictly inside the polygon.
 * - Boundary handling: points exactly on an edge are treated as inside.
 */
export function pointInPolygon(point: Coordinates, polygon: Polygon): boolean {
  const pts = polygon.points;
  if (pts.length < 3) return false;

  // Fast edge check (boundary = inside)
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[j];
    const b = pts[i];
    const cross =
      (point.lat - a.lat) * (b.lng - a.lng) - (point.lng - a.lng) * (b.lat - a.lat);
    if (Math.abs(cross) > 1e-12) continue;
    const dot =
      (point.lng - a.lng) * (b.lng - a.lng) + (point.lat - a.lat) * (b.lat - a.lat);
    if (dot < 0) continue;
    const lenSq = (b.lng - a.lng) ** 2 + (b.lat - a.lat) ** 2;
    if (dot <= lenSq) return true;
  }

  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].lng;
    const yi = pts[i].lat;
    const xj = pts[j].lng;
    const yj = pts[j].lat;

    const intersects =
      yi > point.lat !== yj > point.lat
      && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

