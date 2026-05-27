/**
 * Inventory — zod schemas mirroring the RPC + table contracts.
 *
 * `available_inventory` is the read-time projection used for catalog UI.
 * `InventoryReservation` is the user-scoped reservation row.
 */

import { z } from "zod";

export const Uuid = z.string().uuid();

export const AvailabilityState = z.enum(["in_stock", "low", "out_of_stock"]);
export type AvailabilityState = z.infer<typeof AvailabilityState>;

export const AvailableInventorySchema = z.object({
  product_id:    z.string(),
  total:         z.coerce.number().int().nonnegative(),
  reserved:      z.coerce.number().int().nonnegative(),
  committed:     z.coerce.number().int().nonnegative(),
  available:     z.coerce.number().int(),
  availability:  AvailabilityState,
  updated_at:    z.string(),
  name_ar:       z.string().nullable(),
  name_en:       z.string().nullable(),
  category_name: z.string().nullable(),
});
export type AvailableInventory = z.infer<typeof AvailableInventorySchema>;

export const ValidateInventoryResultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok:        z.literal(true),
    available: z.coerce.number().int().nonnegative(),
    reserved:  z.coerce.number().int().nonnegative(),
    committed: z.coerce.number().int().nonnegative(),
    total:     z.coerce.number().int().nonnegative(),
  }),
  z.object({
    ok:        z.literal(false),
    reason:    z.string(),
    available: z.coerce.number().int().optional(),
    reserved:  z.coerce.number().int().optional(),
    committed: z.coerce.number().int().optional(),
    total:     z.coerce.number().int().optional(),
  }),
]);
export type ValidateInventoryResult = z.infer<typeof ValidateInventoryResultSchema>;

export const ReservationState = z.enum(["reserved", "committed", "released", "expired"]);
export type ReservationState = z.infer<typeof ReservationState>;

export const ReservationKind = z.enum(["cart", "order", "gift_redemption", "manual"]);
export type ReservationKind = z.infer<typeof ReservationKind>;

export const ReserveResponseSchema = z.object({
  reservation_id:  Uuid,
  product_id:      z.string(),
  quantity:        z.coerce.number().int().positive(),
  state:           ReservationState,
  expires_at:      z.string(),
  available_after: z.coerce.number().int().optional(),
  replay:          z.boolean(),
});
export type ReserveResponse = z.infer<typeof ReserveResponseSchema>;

export const ReleaseResponseSchema = z.object({
  reservation_id: Uuid,
  state:          ReservationState,
  product_id:     z.string().optional(),
  released:       z.coerce.number().int().optional(),
  replay:         z.boolean().optional(),
});
export type ReleaseResponse = z.infer<typeof ReleaseResponseSchema>;

export const CommitResponseSchema = z.object({
  reservation_id: Uuid,
  state:          ReservationState,
  order_id:       z.string(),
  committed:      z.coerce.number().int().optional(),
  replay:         z.boolean().optional(),
});
export type CommitResponse = z.infer<typeof CommitResponseSchema>;

export const ExtendResponseSchema = z.object({
  reservation_id: Uuid,
  expires_at:     z.string(),
  state:          ReservationState,
});
export type ExtendResponse = z.infer<typeof ExtendResponseSchema>;
