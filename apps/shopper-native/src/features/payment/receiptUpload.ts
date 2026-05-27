/**
 * Upload payment receipt screenshots to Supabase Storage (receipts bucket).
 */

import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";
import { RECEIPTS_BUCKET } from "./constants";

export type PickReceiptResult =
  | { ok: true; localUri: string }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; message: string };

export async function pickPaymentReceiptImage(): Promise<PickReceiptResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return {
      ok:      false,
      cancelled: false,
      message: "يرجى السماح بالوصول إلى الصور لرفع إيصال التحويل.",
    };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes:    ["images"],
    allowsEditing: true,
    quality:       0.8,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return { ok: false, cancelled: true };
  }

  return { ok: true, localUri: result.assets[0].uri };
}

function mimeForUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
}

function extForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic") return "heic";
  return "jpg";
}

/**
 * Upload a local image URI to `{userId}/{timestamp}.{ext}` and return the public URL.
 */
export async function uploadPaymentReceipt(
  userId: string,
  localUri: string,
): Promise<string> {
  if (!userId) {
    throw new Error("يجب تسجيل الدخول لرفع إيصال التحويل.");
  }

  const mime = mimeForUri(localUri);
  const ext  = extForMime(mime);
  const path = `${userId}/${Date.now()}.${ext}`;

  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error("تعذّر قراءة صورة الإيصال.");
  }
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, blob, { contentType: mime, upsert: false });

  if (error) {
    throw new Error(error.message || "تعذّر رفع إيصال التحويل.");
  }

  const { data } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new Error("تعذّر الحصول على رابط الإيصال.");
  }
  return data.publicUrl;
}
