import { z } from "zod";
export declare const CheckoutConflictSchema: z.ZodObject<{
    productId: z.ZodString;
    code: z.ZodEnum<{
        out_of_stock: "out_of_stock";
        price_changed: "price_changed";
        unavailable: "unavailable";
        invalid_line: "invalid_line";
    }>;
    message: z.ZodString;
    availableQuantity: z.ZodOptional<z.ZodNumber>;
    currentUnitPrice: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type CheckoutConflict = z.infer<typeof CheckoutConflictSchema>;
export declare const CreateOrderRequestSchema: z.ZodObject<{
    idempotencyKey: z.ZodString;
    customerName: z.ZodString;
    customerPhone: z.ZodString;
    address: z.ZodString;
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
    quoteToken: z.ZodString;
    assignmentToken: z.ZodString;
    paymentMethod: z.ZodString;
    note: z.ZodOptional<z.ZodString>;
    branchId: z.ZodString;
    expectedPricing: z.ZodObject<{
        subtotal: z.ZodNumber;
        discount: z.ZodNumber;
        tax: z.ZodNumber;
        deliveryFee: z.ZodNumber;
        total: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;
export declare const OrderItemSnapshotSchema: z.ZodObject<{
    productId: z.ZodString;
    quantity: z.ZodNumber;
    unitPrice: z.ZodNumber;
    name: z.ZodString;
}, z.core.$strip>;
export declare const CreateOrderResultSchema: z.ZodObject<{
    orderId: z.ZodString;
    createdAt: z.ZodString;
    status: z.ZodString;
    paymentStatus: z.ZodString;
    paymentReference: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    idempotentReplay: z.ZodOptional<z.ZodBoolean>;
    conflicts: z.ZodArray<z.ZodObject<{
        productId: z.ZodString;
        code: z.ZodEnum<{
            out_of_stock: "out_of_stock";
            price_changed: "price_changed";
            unavailable: "unavailable";
            invalid_line: "invalid_line";
        }>;
        message: z.ZodString;
        availableQuantity: z.ZodOptional<z.ZodNumber>;
        currentUnitPrice: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type CreateOrderResult = z.infer<typeof CreateOrderResultSchema>;
