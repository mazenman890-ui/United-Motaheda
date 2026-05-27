/**
 * Phone OTP (SMS verification).
 *
 * Two flows are supported:
 *
 *   1. Add/change phone on an already-signed-in user (signup → verify):
 *        await sendPhoneOtp(phone)          // updateUser({ phone })
 *        await verifyPhoneOtp(phone, code)  // type: "phone_change"
 *
 *   2. Sign-in via phone-only (used at checkout if user has never linked):
 *        await sendPhoneOtp(phone, { signIn: true })   // signInWithOtp
 *        await verifyPhoneOtp(phone, code, { signIn: true })  // type: "sms"
 *
 * Egyptian numbers are normalized to E.164 (+20...) before reaching Supabase
 * / Twilio. Acceptable input shapes:
 *   - "01XXXXXXXXX" (11 digits, leading 0)  → "+201XXXXXXXXX"
 *   - "1XXXXXXXXX"  (10 digits, no leading 0) → "+201XXXXXXXXX"
 *   - "+201XXXXXXXXX" (already E.164)        → unchanged
 *
 * Supabase Auth → Phone is configured server-side (Twilio provider). The
 * 6-digit code is sent via SMS; default TTL in Supabase is 60 seconds but
 * commonly raised to 10–15 minutes via dashboard config. UI assumes 15 min.
 */

import { supabase } from "@/lib/supabase";

export const OTP_TTL_SECONDS = 15 * 60;       // 15 min — match Supabase dashboard
export const OTP_RESEND_COOLDOWN_SECONDS = 60; // anti-abuse + matches Twilio rate limits

/**
 * Master switch for phone verification across the whole app.
 *
 *   true  → every gated flow (post-signup OTP, checkout phone-verify gate)
 *           sends a real SMS and blocks until verified. This is the
 *           production-correct behavior.
 *
 *   false → ALL phone OTP flows are skipped client-side:
 *             - signup never opens the verify-phone screen
 *             - checkout treats the phone as if it were verified and
 *               places the order without an SMS round-trip
 *           The Supabase / Twilio config can be in any state — no SMS is
 *           ever requested while the flag is off, so trial-account limits
 *           and the EG alphanumeric sender approval don't matter.
 *
 * Flip this to `true` once:
 *   1. The Twilio account is upgraded out of trial.
 *   2. The Egyptian Alphanumeric Sender ID is approved and attached to
 *      the Verify Service.
 *   3. Supabase Auth → Providers → Phone is wired to that service.
 *
 * Nothing else needs to change — every consumer reads from this constant.
 */
export const PHONE_VERIFICATION_ENABLED = false;

export interface SendOtpOptions {
  /** True = signInWithOtp (phone-only auth). False/undefined = updateUser
   *  (link phone to existing email session). Default: false. */
  signIn?: boolean;
}

export interface VerifyOtpOptions {
  /** Must match the `signIn` value used in sendPhoneOtp for this phone. */
  signIn?: boolean;
}

/**
 * Normalize an EG phone to +201XXXXXXXXX. Returns null on invalid input.
 * Centralised so the modal, the register flow, and the checkout flow all
 * agree on the wire format.
 */
export function normalizeEgyptianPhone(raw: string): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return null;

  // Already includes country code: "20..." or coming from "+20..."
  if (digits.startsWith("20") && digits.length === 12) {
    const rest = digits.slice(2); // "1XXXXXXXXX"
    if (!/^1[0125]\d{8}$/.test(rest)) return null;
    return `+${digits}`;
  }

  // Leading-zero local form: "01XXXXXXXXX"
  if (digits.startsWith("0") && digits.length === 11) {
    const rest = digits.slice(1); // "1XXXXXXXXX"
    if (!/^1[0125]\d{8}$/.test(rest)) return null;
    return `+20${rest}`;
  }

  // No-leading-zero local form: "1XXXXXXXXX"
  if (digits.length === 10) {
    if (!/^1[0125]\d{8}$/.test(digits)) return null;
    return `+20${digits}`;
  }

  return null;
}

/** Display-format an E.164 EG phone with the last 3 digits visible:
 *  "+201001234567" → "•••• •••• 567". Avoids leaking the full number into
 *  toast / banner copy. */
export function maskPhoneForDisplay(e164: string): string {
  const digits = (e164 ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "•••";
  const last3 = digits.slice(-3);
  return `•••• •••• ${last3}`;
}

export interface OtpError extends Error {
  /** Best-guess category for UI mapping. */
  kind: "rate_limit" | "invalid_code" | "expired" | "invalid_phone" | "network" | "unknown";
}

function asOtpError(e: unknown, kindHint?: OtpError["kind"]): OtpError {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  let kind: OtpError["kind"] = kindHint ?? "unknown";
  const lower = msg.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("too many"))    kind = "rate_limit";
  else if (lower.includes("expired") || lower.includes("expired"))   kind = "expired";
  else if (lower.includes("invalid") && lower.includes("code"))      kind = "invalid_code";
  else if (lower.includes("invalid") && lower.includes("phone"))     kind = "invalid_phone";
  else if (lower.includes("network") || lower.includes("fetch"))     kind = "network";

  const err = new Error(msg || "OTP error") as OtpError;
  err.kind = kind;
  return err;
}

/**
 * Send a 6-digit SMS code to `phone`. Returns the E.164-normalized phone
 * so the caller can store it for the subsequent verify call.
 */
export async function sendPhoneOtp(phone: string, opts: SendOtpOptions = {}): Promise<string> {
  const e164 = normalizeEgyptianPhone(phone);
  if (!e164) {
    const err = new Error("invalid Egyptian phone") as OtpError;
    err.kind = "invalid_phone";
    throw err;
  }

  if (opts.signIn) {
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
    if (error) throw asOtpError(error);
  } else {
    const { error } = await supabase.auth.updateUser({ phone: e164 });
    if (error) throw asOtpError(error);
  }

  return e164;
}

/**
 * Verify a 6-digit code. Must be called with the same `signIn` flag value
 * used when sending. On success: in signIn=false flow, the user's profile
 * row gains `phone` (and your trigger / app should set `phone_verified=true`);
 * in signIn=true flow, the user is now signed in and a fresh session is set.
 */
export async function verifyPhoneOtp(
  phone: string,
  code: string,
  opts: VerifyOtpOptions = {},
): Promise<void> {
  const e164 = normalizeEgyptianPhone(phone);
  if (!e164) {
    const err = new Error("invalid Egyptian phone") as OtpError;
    err.kind = "invalid_phone";
    throw err;
  }
  const token = (code ?? "").replace(/\D/g, "");
  if (token.length !== 6) {
    const err = new Error("code must be 6 digits") as OtpError;
    err.kind = "invalid_code";
    throw err;
  }

  const type = opts.signIn ? "sms" : "phone_change";
  const { error } = await supabase.auth.verifyOtp({ phone: e164, token, type });
  if (error) throw asOtpError(error);
}
