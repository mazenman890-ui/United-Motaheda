/**
 * Checkout API service — ported from shopper-web's shopperCheckoutApi.ts.
 *
 * Differences from web:
 *  - Uses the shared @/lib/supabase client (RN async-storage backed).
 *  - Network error patterns expanded for RN's fetch failure messages
 *    ("Network request failed" in addition to "Failed to fetch").
 *  - Persistence payload bridge is omitted — order syncing belongs to
 *    a separate orders feature (next phase).
 */

import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { CheckoutRequestError } from "./errors";
import type {
  CheckoutConflict,
  CheckoutSubmitCommand,
  CreateOrderResult,
} from "./types";

const EDGE_FUNCTION_NAME = "create-order";
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const { data, error } = await supabase.functions.invoke<EdgeFunctionResponse>(
      EDGE_FUNCTION_NAME,
      {
        body: command,
        signal: controller.signal,
      },
    );

    clearTimeout(timer);

    if (error) {
      if (error instanceof FunctionsHttpError) {
        const httpStatus = error.context?.status as number | undefined;
        let message = `Order service error (HTTP ${httpStatus ?? "?"})`;
        let conflicts: CheckoutConflict[] = [];
        let shouldRefreshCatalog = false;

        try {
          const body = (await error.context?.json?.()) as {
            error?: string;
            code?: string;
            conflicts?: CheckoutConflict[];
            shouldRefreshCatalog?: boolean;
          } | null;

          if (body?.error) message = body.error;
          if (Array.isArray(body?.conflicts)) conflicts = body.conflicts;
          if (body?.shouldRefreshCatalog) shouldRefreshCatalog = true;
        } catch {
          // body wasn't JSON
        }

        if (
          httpStatus === 403 &&
          (message.toLowerCase().includes("profile not found") ||
            message.toLowerCase().includes("profile"))
        ) {
          throw new CheckoutRequestError(
            "لم يتم العثور على ملفك الشخصي. يرجى تسجيل الخروج وإعادة تسجيل الدخول ثم المحاولة مرة أخرى.\n" +
              "Your account profile was not found. Please sign out and sign back in, then try again.",
            [],
            false,
            "AUTH",
            false,
          );
        }

        if (httpStatus === 401 || httpStatus === 403) {
          throw new CheckoutRequestError(
            "انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى.\n" +
              "Your session has expired. Please sign in again.",
            [],
            false,
            "AUTH",
            false,
          );
        }

        throw new CheckoutRequestError(
          message,
          conflicts,
          shouldRefreshCatalog,
          conflicts.length > 0 ? "CONFLICT" : "FUNCTION_ERROR",
          false,
        );
      }

      if (error instanceof FunctionsRelayError) {
        throw new CheckoutRequestError(
          "خدمة الطلبات غير متاحة مؤقتاً. يرجى المحاولة بعد قليل.",
          [],
          false,
          "NETWORK",
          true,
        );
      }

      if (error instanceof FunctionsFetchError) {
        throw new CheckoutRequestError(
          "تعذر إرسال الطلب بسبب مشكلة في الشبكة. تحقق من اتصالك وأعد المحاولة.",
          [],
          false,
          "NETWORK",
          true,
        );
      }

      throw new CheckoutRequestError(
        (error as { message?: string }).message ?? "Unexpected error submitting order.",
        [],
        false,
        "FUNCTION_ERROR",
        false,
      );
    }

    if (!data?.order?.id || !data?.order?.created_at) {
      throw new CheckoutRequestError(
        "استجابة غير مكتملة من خدمة الطلبات. يرجى المحاولة مرة أخرى.",
        [],
        false,
        "BAD_RESPONSE",
        false,
      );
    }

    return {
      orderId: data.order.id,
      createdAt: data.order.created_at,
      status: data.order.status ?? "pending",
      paymentStatus: data.order.payment_status ?? "pending",
      paymentReference: data.order.payment_reference ?? null,
      idempotentReplay: data.order.idempotent_replay ?? false,
      conflicts: data.conflicts ?? [],
    };
  } catch (error) {
    clearTimeout(timer);

    if (error instanceof CheckoutRequestError) throw error;

    // Aborted (timeout) — RN doesn't always preserve the AbortError name
    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.message === "Aborted")
    ) {
      throw new CheckoutRequestError(
        "انتهت مهلة الاتصال. تحقق من اتصالك وأعد المحاولة.",
        [],
        false,
        "TIMEOUT",
        true,
      );
    }

    if (error instanceof TypeError && isNetworkErrorMessage(error.message)) {
      throw new CheckoutRequestError(
        "تعذر الوصول إلى خدمة الطلبات. تحقق من اتصالك بالإنترنت.",
        [],
        false,
        "NETWORK",
        true,
      );
    }

    throw new CheckoutRequestError(
      error instanceof Error
        ? error.message
        : "تعذر إرسال الطلب حالياً. يرجى المحاولة مرة أخرى.",
      [],
      false,
      "UNKNOWN",
      false,
    );
  }
}
