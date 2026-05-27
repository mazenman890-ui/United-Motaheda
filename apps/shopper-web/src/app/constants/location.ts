/** Governorates served by the delivery fleet. */
export const SERVED_GOVERNORATES = ["القاهرة", "الجيزة"] as const;
export type ServedGovernorate = typeof SERVED_GOVERNORATES[number];

/** Legacy constant kept for back-compat; prefer SERVED_GOVERNORATES. */
export const GOVERNORATE_LOCK = "Cairo" as const;

/**
 * Flat delivery fee shown when we cannot yet calculate a dynamic quote
 * (location permission not granted, API not reachable, etc.).
 * Keeps the checkout usable even without geolocation.
 */
export const DEFAULT_DELIVERY_FEE = 20;
