/**
 * webPaymentApi.ts — Handles payment proof upload and order payment patching
 * for the web checkout flow (Vodafone Cash / InstaPay manual transfers).
 */

import { getSupabaseClient } from "../lib/supabaseClient";

const BUCKET = "payment-receipts";
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export type ManualPaymentMethod = "instapay" | "vodafone";

export function isManualPaymentMethod(method: string): method is ManualPaymentMethod {
  return method === "instapay" || method === "vodafone";
}

/**
 * Uploads a payment receipt image to Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadWebPaymentReceipt(
  userId: string,
  file: File,
): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("حجم الملف أكبر من 10 ميجابايت. يرجى اختيار صورة أصغر.");
  }

  const ext = file.type === "image/png" ? "png" : "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;

  const supabase = getSupabaseClient();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`تعذّر رفع الإيصال: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Patches an existing order with payment proof details after it's been created.
 * Used as a fallback if the Edge Function didn't persist them.
 */
export async function patchWebOrderManualPayment(
  orderId: string,
  transferNumber: string,
  paymentProofUrl: string,
  paymentMethod: ManualPaymentMethod,
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("orders")
    .update({
      transfer_number: transferNumber.trim(),
      payment_proof_url: paymentProofUrl,
      payment_method: paymentMethod,
      payment_status: "pending_verification",
      status: "pending_payment",
    })
    .eq("id", orderId);

  if (error) {
    throw new Error(`تعذّر حفظ بيانات التحويل: ${error.message}`);
  }
}
