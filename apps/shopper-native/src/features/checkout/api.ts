/**
 * Checkout API service — uses the shared Railway backend.
 *
 * Both the web and the native app now call the same Railway /orders endpoint,
 * guaranteeing consistent order creation, delivery fee calculation, and
 * zone validation across platforms.
 *
 * Fallback: if Railway is unreachable we re-throw a typed CheckoutRequestError
 * so the AppSheet can show an actionable error to the user.
 */

import { supabase } from "@/lib/supabase";
import { railwayApi, RailwayApiError } from "@/lib/railwayApi";
import { CheckoutRequestError } from "./errors";
import type {
  CheckoutConflict,
  CheckoutSubmitCommand,
  CreateOrderResult,
} from "./types";

const TIMEOUT_MS = 20_000;

interface EdgeFunctionResponse {
  order: {
    id: string;
    created_at: string;
    status?: string;
    payment_status?: string;
    payment_reference?: string | null;
    idempotent_replay?: boolean;
  };
  conflicts: CheckoutConflict[];
}

/**
 * Ensures a profiles row exists for the authenticated user before we call
 * the Edge Function. Self-heals users whose signup trigger was broken.
 *
 * Behavior (changed from prior silent-fail version):
 *   - select fails → log + still attempt upsert (RLS quirks shouldn't block
 *     a write attempt; if the row exists, on-conflict makes it a no-op)
 *   - upsert fails → THROW a typed CheckoutRequestError(code: "AUTH") so
 *     checkout shows a precise error instead of letting the Edge Function
 *     return a generic 403 "profile not found"
 *
 * Previously this function swallowed both kinds of failure in dev-only
 * console warnings, which meant users hit the misleading
 * "sign out and sign back in" UI even when the real problem was a NOT NULL
 * constraint or RLS policy needing attention.
 */
async function ensureUserProfile(command: CheckoutSubmitCommand): Promise<void> {
  const { userId, email, fullName, phone } = command.customer;
  if (!userId) return;

  // Step 1: probe for an existing row. We log selectError but DO NOT bail —
  // the upsert below would have worked even if the select failed (e.g.,
  // transient network blip, edge RLS denial on read-but-not-write).
  let exists = false;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (error && __DEV__) {
      console.warn("[checkout] ensureUserProfile select failed:", error.message);
    }
    exists = !!data;
  } catch (err) {
    if (__DEV__) console.warn("[checkout] ensureUserProfile select threw:", err);
  }

  if (exists) return;

  if (__DEV__) console.warn("[checkout] Profile row missing for user", userId, "— creating it.");

  // Step 2: upsert with the column set the handle_new_user trigger uses.
  // role / status / phone_verified have DB-level defaults from the
  // 20260518_fix_signup_trigger migration, so we don't need to set them
  // here (and shouldn't, to avoid trampling values the trigger may have set
  // for older accounts).
  const { error: upsertError } = await supabase.from("profiles").upsert(
    {
      id:        userId,
      email:     email ?? "",
      full_name: fullName,
      phone:     phone ?? null,
    },
    { onConflict: "id", ignoreDuplicates: false },
  );

  if (upsertError) {
    if (__DEV__) console.error("[checkout] ensureUserProfile upsert failed:", upsertError);
    // Surface a specific error instead of falling through to the Edge
    // Function's generic 403. The caller's catch block routes "AUTH" codes
    // to the user-facing error banner.
    throw new CheckoutRequestError(
      "تعذّر تهيئة ملفك الشخصي. حاول مجدداً أو تواصل مع الدعم.\n" +
        `Could not initialize your profile: ${upsertError.message}`,
      [],
      false,
      "AUTH",
      false,
    );
  }
}

function isNetworkErrorMessage(message: string | undefined): boolean {
  if (!message) return false;
  return (
    message === "Failed to fetch" ||
    message === "Network request failed" ||
    message === "Load failed" ||
    message.includes("network")
  );
}

export async function createCheckoutOrder(
  command: CheckoutSubmitCommand,
): Promise<CreateOrderResult> {
  await ensureUserProfile(command);

  const { customer, cart, address, pricing, note, coordinates, branchId, paymentMethod } =
    command as any;

  // Build the Railway request payload
  const railwayPayload = {
    idempotencyKey: command.idempotencyKey ?? `app-${Date.now()}`,
    customerName:   customer?.fullName  ?? command.customer?.fullName  ?? "",
    customerPhone:  customer?.phone     ?? command.customer?.phone     ?? "",
    address:        typeof address === "object" ? address : { formatted: String(address ?? "") },
    note:           note ?? "",
    coordinates:    coordinates ?? { lat: 30.0444, lng: 31.2357 },   // Cairo centre fallback
    branchId:       branchId ?? undefined,
    cart: {
      items: (cart?.items ?? []).map((item: any) => ({
        productId: item.productId ?? item.product_id,
        name:      item.name ?? item.productId ?? "",
        quantity:  item.quantity,
        unitPrice: item.unitPrice ?? item.unit_price ?? 0,
      })),
      subtotal: pricing?.subtotal ?? 0,
    },
    expectedPricing: {
      subtotal:    pricing?.subtotal    ?? 0,
      discount:    pricing?.discount    ?? 0,
      tax:         pricing?.tax         ?? 0,
      deliveryFee: pricing?.deliveryFee ?? pricing?.shipping ?? 0,
      total:       pricing?.total       ?? 0,
    },
    paymentMethod: paymentMethod ?? "cod",
  };

  try {
    const result = await railwayApi.createOrder(railwayPayload);

    return {
      orderId:          result.orderId,
      createdAt:        result.createdAt,
      status:           result.status ?? "pending",
      paymentStatus:    "pending",
      paymentReference: null,
      idempotentReplay: false,
      conflicts:        [],
    };
  } catch (error) {
    if (error instanceof CheckoutRequestError) throw error;

    if (error instanceof RailwayApiError) {
      if (error.code === "TIMEOUT") {
        throw new CheckoutRequestError(
          "انتهت مهلة الاتصال. تحقق من اتصالك وأعد المحاولة.",
          [], false, "TIMEOUT", true,
        );
      }
      if (error.code === "NETWORK") {
        throw new CheckoutRequestError(
          "تعذر الوصول إلى خدمة الطلبات. تحقق من اتصالك بالإنترنت.",
          [], false, "NETWORK", true,
        );
      }
      if (error.status === 401 || error.status === 403) {
        throw new CheckoutRequestError(
          "انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى.",
          [], false, "AUTH", false,
        );
      }
      throw new CheckoutRequestError(
        error.message ?? "تعذر إرسال الطلب حالياً.",
        [], false, "FUNCTION_ERROR", false,
      );
    }

    if (error instanceof TypeError && isNetworkErrorMessage((error as Error).message)) {
      throw new CheckoutRequestError(
        "تعذر الوصول إلى خدمة الطلبات. تحقق من اتصالك بالإنترنت.",
        [], false, "NETWORK", true,
      );
    }

    throw new CheckoutRequestError(
      error instanceof Error ? error.message : "تعذر إرسال الطلب حالياً.",
      [], false, "UNKNOWN", false,
    );
  }
}
