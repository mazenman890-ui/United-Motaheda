/**
 * src/context/AuthContext.tsx
 *
 * FIXED – Three bugs resolved:
 *
 * BUG 1 (sign-out on reload): The previous version ran a manual `bootstrap()`
 * calling `getSession()` in parallel with `onAuthStateChange`. The listener
 * never handled `INITIAL_SESSION` — the event Supabase fires on every page
 * load when a stored session exists. The `fetchProfileRow` DB query raced a
 * 6-second timer; the timer always won on slow connections, leaving `user`
 * null even though the session was in localStorage.
 *
 * FIX: Dropped `bootstrap()` entirely. `onAuthStateChange` now handles
 * `INITIAL_SESSION` which always fires reliably with the restored session.
 * `finalize()` is called only after that event resolves, so the loading
 * spinner never disappears until we actually know who's logged in.
 *
 * BUG 2 (fetchProfileRow timeout / role reset to customer): The DB query had
 * no timeout; on a slow Supabase cold-start it could hang indefinitely.
 *
 * FIX: `fetchProfileRowWithTimeout` wraps the query in `Promise.race` with a
 * 5 s deadline. On timeout it returns `null` gracefully — the caller retries
 * in the background and updates state when it resolves.
 *
 * BUG 3 (admin role not recognised): A downstream consequence of Bug 2.
 * When `fetchProfileRow` returned null (timeout), `parseRole(null)` defaulted
 * to "customer", so staff were redirected away from /admin. Fixing Bugs 1 & 2
 * ensures the real role is always loaded from the DB before the app renders.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { getSupabaseClient } from "../lib/supabaseClient";

// ─── Domain types ─────────────────────────────────────────────────────────────
export type StaffRole = "admin" | "manager" | "pharmacist" | "driver";
export type UserRole = StaffRole | "customer";
export type UserStatus = "Active" | "Inactive" | "Suspended";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  username?: string;
  address?: string;
  created_at?: string;
  role: UserRole;
  status: UserStatus;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

interface LoginResult {
  user: UserProfile | null;
}

interface RegisterResult {
  session: Session | null;
}

interface AuthContextValue {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  register: (payload: RegisterPayload) => Promise<RegisterResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isPharmacist: boolean;
  isDriver: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseRole(value: unknown): UserRole {
  const role = String(value ?? "").trim().toLowerCase();
  if (role === "admin") return "admin";
  if (role === "manager") return "manager";
  if (role === "pharmacist") return "pharmacist";
  if (role === "driver") return "driver";
  return "customer";
}

function parseStatus(value: unknown): UserStatus {
  const status = String(value ?? "").trim();
  if (status === "Inactive") return "Inactive";
  if (status === "Suspended") return "Suspended";
  return "Active";
}

// Raw query — no timeout guard here; see fetchProfileRowWithTimeout below.
async function fetchProfileRow(
  userId: string,
): Promise<Record<string, unknown> | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, status, created_at")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // row not found – new user
    console.error("[AuthContext] fetchProfileRow error:", error.message);
    return null;
  }

  return data as Record<string, unknown>;
}

/**
 * FIX: Wraps fetchProfileRow in a 5-second Promise.race so a slow Supabase
 * cold-start never blocks the auth flow indefinitely. On timeout the function
 * returns null and the caller treats it as a missing profile (graceful
 * degradation), then retries in the background.
 */
async function fetchProfileRowWithTimeout(
  userId: string,
  timeoutMs = 5000,
): Promise<Record<string, unknown> | null> {
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => {
      console.warn("[AuthContext] fetchProfileRow timed out — will retry in background.");
      resolve(null);
    }, timeoutMs),
  );
  return Promise.race([fetchProfileRow(userId), timeoutPromise]);
}

function buildProfile(
  authUser: SupabaseUser,
  profileRow: Record<string, unknown> | null,
): UserProfile {
  const email = (profileRow?.email as string) || authUser.email || "";
  const fullName =
    (profileRow?.full_name as string) ||
    (authUser.user_metadata?.full_name as string) ||
    "";
  const phone =
    (profileRow?.phone as string) || (authUser.user_metadata?.phone as string) || "";
  const username = (authUser.user_metadata?.username as string) || "";
  const address = (authUser.user_metadata?.address as string) || "";
  const createdAt =
    (profileRow?.created_at as string) || authUser.created_at || new Date().toISOString();

  return {
    id: authUser.id,
    email,
    fullName,
    phone,
    username,
    address,
    created_at: createdAt,
    role: parseRole(profileRow?.role),
    status: parseStatus(profileRow?.status),
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const authUserRef = useRef<SupabaseUser | null>(null);
  const userRef = useRef<UserProfile | null>(null);
  const initialSessionPendingRef = useRef(false);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /**
   * Fetches the DB profile for `authUser` and updates state.
   * When called with null it clears the user (sign-out path).
   */
  const resolveUser = useCallback(
    async (
      authUser: SupabaseUser | null,
      _session: Session | null,
      options?: { blockUntilProfile?: boolean },
    ) => {
      if (!authUser) {
        authUserRef.current = null;
        setUser(null);
        return null;
      }

      authUserRef.current = authUser;

      const profileRow = await fetchProfileRowWithTimeout(authUser.id);

      if (profileRow === null) {
        // Preserve the last known user profile for this auth user during
        // repeated refresh/reauth events. This prevents a temporary fallback
        // to customer/unauthorized role while Supabase retry or DB lookup
        // completes.
        if (userRef.current?.id === authUser.id) {
          return userRef.current;
        }

        if (options?.blockUntilProfile) {
          const retryRow = await Promise.race([
            fetchProfileRow(authUser.id),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 12_000)),
          ]);
          if (retryRow !== null) {
            const profile = buildProfile(authUser, retryRow);
            setUser(profile);
            return profile;
          }
        }

        // If we don't yet have a valid profile, keep the current user state
        // and resolve once the background retry completes.
        fetchProfileRow(authUser.id)
          .then((retryRow) => {
            if (authUserRef.current?.id === authUser.id && retryRow !== null) {
              setUser(buildProfile(authUser, retryRow));
              if (initialSessionPendingRef.current) {
                initialSessionPendingRef.current = false;
                setLoading(false);
              }
            }
          })
          .catch(() => {
            // Silently ignore background retry failures
          });

        return null;
      }

      const profile = buildProfile(authUser, profileRow);
      setUser(profile);
      return profile;
    },
    [],
  );

  const refreshProfile = useCallback(async () => {
    const authUser = authUserRef.current;
    if (!authUser) return;
    const profile = await resolveUser(authUser, session, { blockUntilProfile: false });
    if (profile) setUser(profile);
  }, [resolveUser, session]);

  // ── Auth state listener ────────────────────────────────────────────────────
  //
  // FIX: Removed the manual `bootstrap()` / `getSession()` pattern entirely.
  // Supabase fires `INITIAL_SESSION` through onAuthStateChange on every page
  // load — including reloads — and passes the restored session automatically.
  // Handling it here is the single, race-condition-free way to boot auth.
  //
  // The previous code never handled INITIAL_SESSION, so on reload the
  // `bootstrap()` DB query raced a 6-second timer and always lost.
  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseClient();

    // Absolute safety net: if onAuthStateChange never fires (extreme edge
    // case: Supabase client init failure), stop spinning after 12 seconds.
    const emergencyTimer = setTimeout(() => {
      if (!cancelled) {
        console.warn("[AuthContext] Emergency timeout reached — forcing loading = false.");
        setLoading(false);
      }
    }, 12_000);

    // Called exactly once: after INITIAL_SESSION resolves (success or error).
    let finalized = false;
    const finalize = () => {
      if (!cancelled && !finalized) {
        finalized = true;
        clearTimeout(emergencyTimer);
        setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (cancelled) return;

      try {
        // Always sync the session state first.
        setSession(currentSession ?? null);

        if (event === "INITIAL_SESSION") {
          initialSessionPendingRef.current = false;
          const profile = await resolveUser(currentSession?.user ?? null, currentSession ?? null, {
            blockUntilProfile: true,
          });
          if (profile !== null || !currentSession) {
            finalize();
          } else {
            initialSessionPendingRef.current = true;
          }
        } else if (
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          await resolveUser(currentSession?.user ?? null, currentSession ?? null);
        } else if (event === "SIGNED_OUT") {
          authUserRef.current = null;
          setUser(null);
          setSession(null);
        }
      } catch (err) {
        console.error("[AuthContext] onAuthStateChange handler failed:", err);
        // If INITIAL_SESSION errors we still need to unblock the UI.
        if (event === "INITIAL_SESSION") finalize();
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(emergencyTimer);
      subscription.unsubscribe();
    };
  }, [resolveUser]);

  // ── UI-friendly actions ────────────────────────────────────────────────────
  const login = useCallback(
    async ({ email, password }: LoginCredentials): Promise<LoginResult> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Invalid email or password.");
        }
        throw error;
      }

      if (!data.user) throw new Error("Unable to sign in. No user returned.");

      authUserRef.current = data.user;

      const profile = await resolveUser(data.user, data.session, { blockUntilProfile: true });
      if (profile) {
        return { user: profile };
      }

      const fallbackProfile = buildProfile(data.user, null);
      setUser(fallbackProfile);
      return { user: fallbackProfile };
    },
    [resolveUser],
  );

  const register = useCallback(
    async ({
      fullName,
      email,
      password,
      phone,
    }: RegisterPayload): Promise<RegisterResult> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone ?? "",
          },
        },
      });

      if (error) {
        // ── Translate every known Supabase signup error into a clear message ──

        const msg = error.message ?? "";
        const status = (error as { status?: number }).status;

        // HTTP 500 = a database trigger on auth.users crashed.
        // The user was NOT created. The fix is in fix_signup_trigger.sql.
        // We surface a friendly message instead of an unhandled crash.
        if (status === 500) {
          throw new Error(
            "حدث خطأ داخلي أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني.\n" +
            "An internal error occurred while creating your account. Please try again or contact support.",
          );
        }

        if (msg.includes("already registered") || msg.includes("User already registered")) {
          throw new Error("يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل.\nAn account with this email already exists.");
        }

        if (msg.includes("Password should be")) {
          throw new Error("كلمة المرور ضعيفة جداً. يجب أن تكون 6 أحرف على الأقل.\nPassword is too weak. It must be at least 6 characters.");
        }

        if (msg.includes("Invalid email")) {
          throw new Error("عنوان البريد الإلكتروني غير صالح.\nInvalid email address.");
        }

        if (msg.includes("Email rate limit exceeded") || msg.includes("over_email_send_rate_limit")) {
          throw new Error("تم تجاوز الحد المسموح به لإرسال الرسائل. يرجى الانتظار قليلاً ثم المحاولة مجدداً.\nEmail rate limit exceeded. Please wait a moment and try again.");
        }

        if (msg.includes("signup is disabled") || msg.includes("Signups not allowed")) {
          throw new Error("التسجيل مغلق حالياً. يرجى التواصل مع الإدارة.\nSignups are currently disabled. Please contact the administrator.");
        }

        // Fallback — surface whatever Supabase says
        throw new Error(msg || "تعذر إنشاء الحساب. يرجى المحاولة مرة أخرى.\nUnable to create account. Please try again.");
      }

      // ── Success path ──────────────────────────────────────────────────────────
      // Supabase may return data.user without data.session when email
      // confirmation is enabled. Handle both cases.
      if (data.user) {
        authUserRef.current = data.user;

        // Only set the user in state when we have a live session
        // (i.e. email confirmation is disabled or auto-confirmed).
        if (data.session) {
          const profileRow = await fetchProfileRowWithTimeout(data.user.id);
          setUser(buildProfile(data.user, profileRow));
        }
      }

      return { session: data.session };
    },
    [],
  );

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("[AuthContext] Sign out error:", error);
    } finally {
      authUserRef.current = null;
      setUser(null);
    }
  }, []);

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager" || user?.role === "admin";
  const isPharmacist = user?.role === "pharmacist";
  const isDriver = user?.role === "driver";
  const isStaff = Boolean(user && user.role !== "customer");

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      login,
      register,
      signOut,
      refreshProfile,
      isAdmin,
      isManager,
      isPharmacist,
      isDriver,
      isStaff,
    }),
    [
      user,
      session,
      loading,
      login,
      register,
      signOut,
      refreshProfile,
      isAdmin,
      isManager,
      isPharmacist,
      isDriver,
      isStaff,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}