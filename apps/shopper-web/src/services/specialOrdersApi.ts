import { z } from "zod";
import { getSupabaseClient } from "../lib/supabaseClient";

export type SpecialOrderPayload = {
  productName: string;
  notes: string;
  quantity: number | null;
  userId: string | null;
  requesterName: string;
  requesterPhone: string;
  requesterEmail: string;
};

export type SpecialOrderStatus =
  | "submitted"
  | "reviewing"
  | "fulfilled"
  | "cancelled";

export type SpecialOrderRequest = {
  id: string;
  createdAt: string;
  productName: string;
  notes: string;
  quantity: number | null;
  requesterName: string;
  requesterPhone: string;
  requesterEmail: string;
  status: SpecialOrderStatus;
  userId: string | null;
  updatedAt: string | null;
};

export const SPECIAL_ORDER_TABLE = "special_order_requests";

const egyptianPhoneSchema = z
  .string()
  .trim()
  .regex(/^01[0125]\d{8}$/, "Please enter a valid Egyptian mobile number.");

const specialOrderSchema = z.object({
  productName: z.string().trim().min(2, "Product name is required."),
  notes: z.string().trim().max(500, "Notes must be 500 characters or fewer.").default(""),
  quantity: z
    .number()
    .int("Quantity must be a whole number.")
    .positive("Quantity must be greater than zero.")
    .nullable(),
  userId: z.string().trim().uuid().nullable(),
  requesterName: z.string().trim().min(3, "Full name is required."),
  requesterPhone: egyptianPhoneSchema,
  requesterEmail: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .or(z.literal(""))
    .default(""),
});

function normalizeRequest(row: {
  id: string;
  created_at: string;
  product_name: string;
  notes: string | null;
  quantity: number | null;
  requester_name: string | null;
  requester_phone: string | null;
  requester_email: string | null;
  status: string | null;
  user_id: string | null;
  updated_at?: string | null;
}): SpecialOrderRequest {
  return {
    id: row.id,
    createdAt: row.created_at,
    productName: row.product_name,
    notes: row.notes ?? "",
    quantity: row.quantity,
    requesterName: row.requester_name ?? "",
    requesterPhone: row.requester_phone ?? "",
    requesterEmail: row.requester_email ?? "",
    status:
      row.status === "reviewing"
      || row.status === "fulfilled"
      || row.status === "cancelled"
        ? row.status
        : "submitted",
    userId: row.user_id,
    updatedAt: row.updated_at ?? null,
  };
}

function getSpecialOrdersClient() {
  return getSupabaseClient();
}

function mapRealtimeRecord(record: Record<string, unknown>): SpecialOrderRequest | null {
  if (
    typeof record.id !== "string"
    || typeof record.created_at !== "string"
    || typeof record.product_name !== "string"
  ) {
    return null;
  }

  return normalizeRequest({
    id: record.id,
    created_at: record.created_at,
    product_name: record.product_name,
    notes: typeof record.notes === "string" ? record.notes : null,
    quantity:
      typeof record.quantity === "number"
      ? record.quantity
      : typeof record.quantity === "string" && record.quantity.trim()
        ? Number(record.quantity)
        : null,
    requester_name:
      typeof record.requester_name === "string" ? record.requester_name : null,
    requester_phone:
      typeof record.requester_phone === "string" ? record.requester_phone : null,
    requester_email:
      typeof record.requester_email === "string" ? record.requester_email : null,
    status: typeof record.status === "string" ? record.status : null,
    user_id: typeof record.user_id === "string" ? record.user_id : null,
    updated_at: typeof record.updated_at === "string" ? record.updated_at : null,
  });
}

export async function submitSpecialOrder(payload: SpecialOrderPayload) {
  const parsed = specialOrderSchema.safeParse({
    ...payload,
    quantity:
      typeof payload.quantity === "number" && Number.isFinite(payload.quantity)
        ? payload.quantity
        : null,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Special order payload is invalid.");
  }

  const request = parsed.data;
  const supabase = getSpecialOrdersClient();
  const { data, error } = await supabase
    .from(SPECIAL_ORDER_TABLE)
    .insert({
      user_id: request.userId,
      product_name: request.productName,
      notes: request.notes || null,
      quantity: request.quantity,
      requester_name: request.requesterName,
      requester_phone: request.requesterPhone,
      requester_email: request.requesterEmail || null,
      status: "submitted",
    })
    .select(
      "id, created_at, updated_at, product_name, notes, quantity, requester_name, requester_phone, requester_email, status, user_id",
    )
    .single();

  if (error) {
    throw error;
  }

  return normalizeRequest(data);
}

export async function fetchSpecialOrderRequests() {
  const supabase = getSpecialOrdersClient();
  const { data, error } = await supabase
    .from(SPECIAL_ORDER_TABLE)
    .select(
      "id, created_at, updated_at, product_name, notes, quantity, requester_name, requester_phone, requester_email, status, user_id",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(normalizeRequest);
}

export async function updateSpecialOrderStatus(
  requestId: string,
  status: SpecialOrderStatus,
): Promise<SpecialOrderRequest> {
  const supabase = getSpecialOrdersClient();
  const { data, error } = await supabase
    .from(SPECIAL_ORDER_TABLE)
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select(
      "id, created_at, updated_at, product_name, notes, quantity, requester_name, requester_phone, requester_email, status, user_id",
    )
    .single();

  if (error) {
    throw error;
  }

  return normalizeRequest(data);
}

export function subscribeToSpecialOrderRequests(
  onChange: (event: "INSERT" | "UPDATE" | "DELETE", request: SpecialOrderRequest | null) => void,
) {
  const supabase = getSpecialOrdersClient();
  const channel = supabase
    .channel("special-order-requests")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: SPECIAL_ORDER_TABLE },
      (payload) => {
        const record =
          payload.eventType === "DELETE"
            ? mapRealtimeRecord((payload.old as Record<string, unknown>) ?? {})
            : mapRealtimeRecord((payload.new as Record<string, unknown>) ?? {});

        onChange(payload.eventType, record);
      },
    )
    .subscribe();

  return {
    channel,
    unsubscribe: async () => {
      await supabase.removeChannel(channel);
    },
  };
}
