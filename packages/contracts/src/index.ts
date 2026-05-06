import { z } from "zod";

// --- 1. API Response Schemas ---
// الـ Schema اللي الموقع واقف عليها دلوقتي
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// --- 2. Enums & Status ---
export const DeliveryStatusSchema = z.enum([
  "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "OUT_FOR_DELIVERY"
]);
export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;

// --- 3. Branch & Delivery Zone ---
export const BranchSchema = z.object({
  id: z.string(),
  nameAr: z.string(),
  nameEn: z.string(),
  governorate: z.string(),
  area: z.string(),
  address: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
  isActive: z.boolean(),
});

export const DeliveryZoneSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  name: z.string(),
  polygon: z.any(),
  baseFee: z.number(),
  surgeMultiplier: z.number().nullable(),
});

// --- 4. Product & Medication ---
export const ProductSchema = z.object({
  id: z.string(),
  code: z.string(),
  nameAr: z.string(),
  nameEn: z.string(),
  price: z.number(),
  stock: z.number(),
  imageUrl: z.string().nullable(),
});

export const MedicationSchema = z.object({
  id: z.string(),
  productId: z.string(),
  prescriptionRequired: z.boolean(),
  dosageInformation: z.string().nullable(),
});

// --- 5. Order & Order Items ---
export const OrderItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  productId: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  name: z.string().nullable(),
});

export const OrderSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  address: z.string(),
  status: z.string(),
  total: z.number(),
  createdAt: z.date(),
});

// --- 6. Request Schemas ---
export const CreateOrderRequestSchema = z.object({
  customerName: z.string(),
  customerPhone: z.string(),
  address: z.string(),
  branchId: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number(),
    unitPrice: z.number()
  })),
  paymentMethod: z.enum(["CASH", "CARD"]),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  })
});

// تصدير الأنواع (Types)
export type Branch = z.infer<typeof BranchSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;