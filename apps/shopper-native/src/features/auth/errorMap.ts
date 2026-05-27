/**
 * Map Supabase auth errors → Arabic user-facing messages.
 *
 * Default-case behavior: surface the raw error message rather than swallow
 * it (the previous "حدث خطأ" catch-all hid the real cause from users and made
 * support tickets impossible to triage). In __DEV__ the caller should also
 * console.warn the full error object.
 */

export function authErrorToArabic(err: unknown): string {
  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();

  // Email already registered
  if (msg.includes("already registered") || msg.includes("user already") || msg.includes("duplicate")) {
    return "هذا البريد مسجّل مسبقاً. سجّل دخولك بدلاً من ذلك.";
  }

  // Weak password (Supabase default min is 6; project may have stricter)
  if (msg.includes("password") && (msg.includes("short") || msg.includes("weak") || msg.includes("least"))) {
    return "كلمة المرور ضعيفة جداً. استخدم 6 أحرف على الأقل، مع مزيج من الأرقام والحروف.";
  }

  // Invalid email format
  if (msg.includes("invalid email") || msg.includes("email format") || msg.includes("invalid_email")) {
    return "صيغة البريد الإلكتروني غير صحيحة.";
  }

  // Rate-limited
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "محاولات كثيرة في وقت قصير. انتظر دقيقة وحاول مجدداً.";
  }

  // Email confirmation pending
  if (msg.includes("email not confirmed") || msg.includes("confirmation")) {
    return "تحقق من بريدك الإلكتروني وأكّد الحساب قبل تسجيل الدخول.";
  }

  // Network / fetch failures
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) {
    return "تعذّر الاتصال بالخادم. تحقق من اتصال الإنترنت وحاول مجدداً.";
  }

  // Invalid credentials (sign-in path)
  if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
    return "البريد أو كلمة المرور غير صحيحين.";
  }

  // Fall through — return raw message so support can diagnose.
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "حدث خطأ غير متوقع. حاول مرة أخرى أو تواصل مع الدعم.";
}
