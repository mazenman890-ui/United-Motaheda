"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryStatusSchema = exports.DeliveryReasonCodeSchema = exports.DeliveryQuoteRequestSchema = exports.EtaSchema = exports.CartSnapshotSchema = exports.CartSnapshotItemSchema = void 0;
const zod_1 = require("zod");
const branch_1 = require("./branch");
const geo_1 = require("./geo");
exports.CartSnapshotItemSchema = zod_1.z.object({
    productId: zod_1.z.string().min(1),
    quantity: zod_1.z.number().int().positive(),
    unitPrice: zod_1.z.number().finite().nonnegative(),
    code: zod_1.z.string().optional(),
    name: zod_1.z.string().optional(),
});
exports.CartSnapshotSchema = zod_1.z.object({
    items: zod_1.z.array(exports.CartSnapshotItemSchema),
    itemCount: zod_1.z.number().int().nonnegative(),
    subtotal: zod_1.z.number().finite().nonnegative(),
});
exports.EtaSchema = zod_1.z.object({
    minMinutes: zod_1.z.number().int().nonnegative(),
    maxMinutes: zod_1.z.number().int().nonnegative(),
});
exports.DeliveryQuoteRequestSchema = zod_1.z.object({
    coordinates: geo_1.CoordinatesSchema,
    cart: exports.CartSnapshotSchema,
    requestedBranchId: zod_1.z.string().min(1).optional(),
});
exports.DeliveryReasonCodeSchema = zod_1.z.enum([
    "OK",
    "NO_COORDINATES",
    "NO_BRANCH",
    "OUT_OF_ZONE",
    "OUT_OF_CAIRO",
    "UNEXPECTED_ERROR",
]);
exports.DeliveryStatusSchema = zod_1.z.object({
    isDeliverable: zod_1.z.boolean(),
    cost: zod_1.z.number().finite().nonnegative().nullable(),
    currency: zod_1.z.literal("EGP"),
    eta: exports.EtaSchema.nullable(),
    branch: branch_1.BranchSchema.nullable(),
    distanceKm: zod_1.z.number().finite().nonnegative().nullable(),
    assignmentToken: zod_1.z.string().min(1).nullable(),
    quoteToken: zod_1.z.string().min(1).nullable(),
    zoneId: zod_1.z.string().nullable(),
    reasonCode: exports.DeliveryReasonCodeSchema,
    breakdown: zod_1.z
        .object({
        baseFee: zod_1.z.number().finite().nonnegative(),
        surgeMultiplier: zod_1.z.number().finite().positive(),
        freeDeliveryApplied: zod_1.z.boolean(),
    })
        .optional(),
    updatedAt: zod_1.z.string().min(1),
});
//# sourceMappingURL=delivery.js.map