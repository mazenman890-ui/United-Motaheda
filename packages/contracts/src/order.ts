import { z } from "zod";
import { CoordinatesSchema } from "./geo.ts";
import { CartSnapshotSchema } from "./delivery.ts";

export const CheckoutConflictSchema = z.object({
  productId: z.string().min(1),
  code: z.enum(["out_of_stock", "price_changed", "unavailable", "invalid_line"]),
  message: z.string().min(1),
  availableQuantity: z.number().int().positive().optional(),
  currentUnitPrice: z.number().finite().nonnegative().optional(),
});

export type CheckoutConflict = z.infer<typeof CheckoutConflictSchema>;

export const CreateOrderRequestSchema = z.object({
  idempotencyKey: z.string().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  address: z.string().min(1),
  coordinates: CoordinatesSchema,
  cart: CartSnapshotSchema,
  quoteToken: z.string().min(1),
  assignmentToken: z.string().min(1),
  paymentMethod: z.string().min(1),
  note: z.string().optional(),
  branchId: z.string().min(1),
  expectedPricing: z.object({
    subtotal: z.number().finite().nonnegative(),
    discount: z.number().finite().nonnegative(),
    tax: z.number().finite().nonnegative(),
    deliveryFee: z.number().finite().nonnegative(),
    total: z.number().finite().nonnegative(),
  }),
});

export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

export const OrderItemSnapshotSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().finite().nonnegative(),
  name: z.string().min(1),
});

export const CreateOrderResultSchema = z.object({
  orderId: z.string().min(1),
  createdAt: z.string().min(1),
  status: z.string().min(1),
  paymentStatus: z.string().min(1),
  paymentReference: z.string().nullable().optional(),
  idempotentReplay: z.boolean().optional(),
  conflicts: z.array(CheckoutConflictSchema),
});

export type CreateOrderResult = z.infer<typeof CreateOrderResultSchema>;
