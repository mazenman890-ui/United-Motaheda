/**
 * Payment preference — read/write `profiles.preferred_payment_method`.
 *
 * A single scalar column on the existing `profiles` table; no dedicated
 * table. Read at sign-in to set the cart's default; write on change.
 */

import { supabase } from "@/lib/supabase";
import { timed } from "@/lib/devTiming";
import type { PaymentMethodType } from "./types";

interface ProfileRow {
  preferred_payment_method: PaymentMethodType | null;
}

export async function fetchPreferredPayment(userId: string): Promise<PaymentMethodType | null> {
  const { data, error } = await timed(
    "payment:fetchPreferredPayment",
    () =>
      supabase
        .from("profiles")
        .select("preferred_payment_method")
        .eq("id", userId)
        .single(),
  );
  if (error) {
    // Profile row missing (very rare — trigger should have created it) or
    // network failure. Either way, fall back to null so the store uses its
    // local default.
    return null;
  }
  return (data as ProfileRow | null)?.preferred_payment_method ?? null;
}

export async function setPreferredPayment(
  userId: string,
  method: PaymentMethodType,
): Promise<void> {
  const { error } = await timed(
    "payment:setPreferredPayment",
    () =>
      supabase
        .from("profiles")
        .update({ preferred_payment_method: method })
        .eq("id", userId),
  );
  if (error) throw error;
}
