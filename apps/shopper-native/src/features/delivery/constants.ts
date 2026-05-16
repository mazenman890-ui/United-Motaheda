/**
 * Delivery constants.
 *
 * Cairo-only for the v1 launch. When Phase 4 introduces real geofencing
 * + branch selection, replace these values with computed lookups against
 * the logistics service — every consumer reads from this module so no
 * downstream screen needs to change.
 */

export const SUPPORTED_GOVERNORATE = {
  id:    "cairo",
  ar:    "القاهرة",
  en:    "Cairo",
  label: "القاهرة فقط حالياً",
} as const;

/** Threshold above which delivery becomes free (EGP). */
export const FREE_DELIVERY_THRESHOLD = 200;

/** Standard delivery fee for orders below the free-delivery threshold (EGP). */
export const STANDARD_DELIVERY_FEE = 25;

/** Estimated delivery window in minutes. */
export const DELIVERY_ETA = { min: 30, max: 60 } as const;
