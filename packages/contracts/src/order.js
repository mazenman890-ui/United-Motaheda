"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateOrderResultSchema = exports.OrderItemSnapshotSchema = exports.CreateOrderRequestSchema = exports.CheckoutConflictSchema = void 0;
const zod_1 = require("zod");
const geo_1 = require("./geo");
const delivery_1 = require("./delivery");
exports.CheckoutConflictSchema = zod_1.z.object({
    productId: zod_1.z.string().min(1),
    code: zod_1.z.enum(["out_of_stock", "price_changed", "unavailable", "invalid_line"]),
    message: zod_1.z.string().min(1),
    availableQuantity: zod_1.z.number().int().positive().optional(),
    currentUnitPrice: zod_1.z.number().finite().nonnegative().optional(),
});
exports.CreateOrderRequestSchema = zod_1.z.object({
    idempotencyKey: zod_1.z.string().min(1),
    customerName: zod_1.z.string().min(1),
    customerPhone: zod_1.z.string().min(1),
    address: zod_1.z.string().min(1),
    coordinates: geo_1.CoordinatesSchema,
    cart: delivery_1.CartSnapshotSchema,
    quoteToken: zod_1.z.string().min(1),
    assignmentToken: zod_1.z.string().min(1),
    paymentMethod: zod_1.z.string().min(1),
    note: zod_1.z.string().optional(),
    branchId: zod_1.z.string().min(1),
    expectedPricing: zod_1.z.object({
        subtotal: zod_1.z.number().finite().nonnegative(),
        discount: zod_1.z.number().finite().nonnegative(),
        tax: zod_1.z.number().finite().nonnegative(),
        deliveryFee: zod_1.z.number().finite().nonnegative(),
        total: zod_1.z.number().finite().nonnegative(),
    }),
});
exports.OrderItemSnapshotSchema = zod_1.z.object({
    productId: zod_1.z.string().min(1),
    quantity: zod_1.z.number().int().positive(),
    unitPrice: zod_1.z.number().finite().nonnegative(),
    name: zod_1.z.string().min(1),
});
exports.CreateOrderResultSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1),
    createdAt: zod_1.z.string().min(1),
    status: zod_1.z.string().min(1),
    paymentStatus: zod_1.z.string().min(1),
    paymentReference: zod_1.z.string().nullable().optional(),
    idempotentReplay: zod_1.z.boolean().optional(),
    conflicts: zod_1.z.array(exports.CheckoutConflictSchema),
});
//# sourceMappingURL=order.js.map