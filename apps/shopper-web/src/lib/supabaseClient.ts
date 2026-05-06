import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "../app/env";

// Changed: supabaseConfigError now checks only Supabase-specific env vars
// directly instead of routing through getPublicEnvValidationErrors().
//
// Previously, getPublicEnvValidationErrors() included a check for
// VITE_GOOGLE_SHEETS_API_URL. When that var was absent the first validation
// error was used as supabaseConfigError, which forced `supabase` to null and
// made every getSupabaseClient() call throw – silently breaking catalog fetches
// even though the Supabase credentials were perfectly valid.
const supabaseConfigError: string | null =
  !publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey
    ? "Supabase authentication is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
    : null;

export const supabase: SupabaseClient | null = supabaseConfigError
  ? null
  : createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "united-pharmacies-auth",
      },
    });

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      supabaseConfigError ?? "Supabase client is unavailable.",
    );
  }

  return supabase;
}

export function getSupabaseConfigError(): string | null {
  return supabaseConfigError;
}