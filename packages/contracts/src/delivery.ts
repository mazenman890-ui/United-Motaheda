import { z } from "zod";
import { BranchSchema } from "./branch";
import { CoordinatesSchema } from "./geo";

export const CartSnapshotItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().finite().nonnegative(),
  code: z.string().optional(),
  name: z.string().optional(),
});

export const CartSnapshotSchema = z.object({
  items: z.array(CartSnapshotItemSchema),
  itemCount: z.number().int().nonnegative(),
  subtotal: z.number().finite().nonnegative(),
});

export type CartSnapshot = z.infer<typeof CartSnapshotSchema>;

export const EtaSchema = z.object({
  minMinutes: z.number().int().nonnegative(),
  maxMinutes: z.number().int().nonnegative(),
});

export const DeliveryQuoteRequestSchema = z.object({
  coordinates: CoordinatesSchema,
  cart: CartSnapshotSchema,
  requestedBranchId: z.string().min(1).optional(),
});

export type DeliveryQuoteRequest = z.infer<typeof DeliveryQuoteRequestSchema>;

export const DeliveryReasonCodeSchema = z.enum([
  "OK",
  "NO_COORDINATES",
  "NO_BRANCH",
  "OUT_OF_ZONE",
  "OUT_OF_CAIRO",
  "UNEXPECTED_ERROR",
]);

export type DeliveryReasonCode = z.infer<typeof DeliveryReasonCodeSchema>;

export const DeliveryStatusSchema = z.object({
  isDeliverable: z.boolean(),
  cost: z.number().finite().nonnegative().nullable(),
  currency: z.literal("EGP"),
  eta: EtaSchema.nullable(),
  branch: BranchSchema.nullable(),
  distanceKm: z.number().finite().nonnegative().nullable(),
  assignmentToken: z.string().min(1).nullable(),
  quoteToken: z.string().min(1).nullable(),
  zoneId: z.string().nullable(),
  reasonCode: DeliveryReasonCodeSchema,
  breakdown: z
    .object({
      baseFee: z.number().finite().nonnegative(),
      surgeMultiplier: z.number().finite().positive(),
      freeDeliveryApplied: z.boolean(),
    })
    .optional(),
  updatedAt: z.string().min(1),
});

export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;
