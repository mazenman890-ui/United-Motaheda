import { z } from "zod";
export declare const CartSnapshotItemSchema: z.ZodObject<{
    productId: z.ZodString;
    quantity: z.ZodNumber;
    unitPrice: z.ZodNumber;
    code: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const CartSnapshotSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        productId: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
        code: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    itemCount: z.ZodNumber;
    subtotal: z.ZodNumber;
}, z.core.$strip>;
export type CartSnapshot = z.infer<typeof CartSnapshotSchema>;
export declare const EtaSchema: z.ZodObject<{
    minMinutes: z.ZodNumber;
    maxMinutes: z.ZodNumber;
}, z.core.$strip>;
export declare const DeliveryQuoteRequestSchema: z.ZodObject<{
    coordinates: z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
    }, z.core.$strip>;
    cart: z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            productId: z.ZodString;
            quantity: z.ZodNumber;
            unitPrice: z.ZodNumber;
            code: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        itemCount: z.ZodNumber;
        subtotal: z.ZodNumber;
    }, z.core.$strip>;
    requestedBranchId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type DeliveryQuoteRequest = z.infer<typeof DeliveryQuoteRequestSchema>;
export declare const DeliveryReasonCodeSchema: z.ZodEnum<{
    OK: "OK";
    NO_COORDINATES: "NO_COORDINATES";
    NO_BRANCH: "NO_BRANCH";
    OUT_OF_ZONE: "OUT_OF_ZONE";
    OUT_OF_CAIRO: "OUT_OF_CAIRO";
    UNEXPECTED_ERROR: "UNEXPECTED_ERROR";
}>;
export type DeliveryReasonCode = z.infer<typeof DeliveryReasonCodeSchema>;
export declare const DeliveryStatusSchema: z.ZodObject<{
    isDeliverable: z.ZodBoolean;
    cost: z.ZodNullable<z.ZodNumber>;
    currency: z.ZodLiteral<"EGP">;
    eta: z.ZodNullable<z.ZodObject<{
        minMinutes: z.ZodNumber;
        maxMinutes: z.ZodNumber;
    }, z.core.$strip>>;
    branch: z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        nameAr: z.ZodString;
        nameEn: z.ZodString;
        governorate: z.ZodLiteral<"Cairo">;
        area: z.ZodString;
        lat: z.ZodNumber;
        lng: z.ZodNumber;
        mapEmbedSrc: z.ZodOptional<z.ZodString>;
        isActive: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    distanceKm: z.ZodNullable<z.ZodNumber>;
    assignmentToken: z.ZodNullable<z.ZodString>;
    quoteToken: z.ZodNullable<z.ZodString>;
    zoneId: z.ZodNullable<z.ZodString>;
    reasonCode: z.ZodEnum<{
        OK: "OK";
        NO_COORDINATES: "NO_COORDINATES";
        NO_BRANCH: "NO_BRANCH";
        OUT_OF_ZONE: "OUT_OF_ZONE";
        OUT_OF_CAIRO: "OUT_OF_CAIRO";
        UNEXPECTED_ERROR: "UNEXPECTED_ERROR";
    }>;
    breakdown: z.ZodOptional<z.ZodObject<{
        baseFee: z.ZodNumber;
        surgeMultiplier: z.ZodNumber;
        freeDeliveryApplied: z.ZodBoolean;
    }, z.core.$strip>>;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;
