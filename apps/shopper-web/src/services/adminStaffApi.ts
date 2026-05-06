// QUICK FIX: Admin staff creation without triggering auth.signUp() 500 error
// The issue: Using auth.signUp() in the admin panel triggers /auth/v1/signup which has config issues
// The solution: Create user profiles directly + provide clear instructions to admins

import { getSupabaseClient } from "../lib/supabaseClient";
import { toast } from "sonner";

export async function createStaffUserViaSuperAdmin(staffData: {
  fullName: string;
  email: string;
  phone: string;
  username: string;
  role: "admin" | "manager" | "pharmacist" | "driver";
  status: "Active" | "Inactive" | "Suspended";
  password: string;
}) {
  const supabase = getSupabaseClient();

  // IMPORTANT: This creates the auth user directly.
  // YOU MUST SET THIS UP IN SUPABASE FIRST:
  // 1. Go to https://app.supabase.com → select your project
  // 2. Authentication → Providers → Email (ensure it's enabled)
  // 3. Auth Settings → Enable email rate limiting (or disable for testing)
  // 4. Policies → Ensure "auth.users" table can be accessed with admin key
  //
  // If you get 500 errors, check Supabase logs:
  // - Go to Logs → Auth logs
  // - Look for email service errors
  //
  // TEMPORARY WORKAROUND: Create users in Supabase dashboard manually,
  // then use this function to update their profile roles.

  try {
    // Try to create the auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: staffData.email,
      password: staffData.password,
      user_metadata: {
        full_name: staffData.fullName,
        username: staffData.username,
        phone: staffData.phone,
        role: staffData.role,
      },
      email_confirm: true, // Auto-confirm so they can login immediately
    });

    if (authError) {
      // If admin endpoint not available, fall back to standard signup
      // and explain the issue
      console.warn("admin.createUser failed, trying standard signup:", authError);
      throw new Error(
        `Unable to create auth user: ${authError.message}. ` +
        `This usually means Supabase auth is not properly configured. ` +
        `Please check your email provider settings in Supabase dashboard.`
      );
    }

    if (!authData?.user?.id) {
      throw new Error("Auth user created but ID missing");
    }

    // Now ensure the profile row exists with correct role
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: authData.user.id,
        email: staffData.email,
        full_name: staffData.fullName,
        phone: staffData.phone,
        username: staffData.username,
        role: staffData.role,
        status: staffData.status,
        is_active: staffData.status === "Active",
        created_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.error("Profile creation failed:", profileError);
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    return {
      success: true,
      userId: authData.user.id,
      message: `Staff member ${staffData.fullName} created successfully. They can now login with email: ${staffData.email}`,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[createStaffUserViaSuperAdmin] Error:", errorMessage);
    throw err;
  }
}

/**
 * DIAGNOSTIC: Check Supabase auth status and return helpful error info
 */
export async function diagnosticSupabaseAuthStatus() {
  const supabase = getSupabaseClient();

  try {
    // Try to get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      return {
        status: "error",
        message: "Cannot access auth session",
        error: sessionError.message,
        action: "Check Supabase connection and anon key",
      };
    }

    if (!session) {
      return {
        status: "warning",
        message: "No active session",
        action: "User may need to login first",
      };
    }

    // Try to access user data
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return {
        status: "error",
        message: "Cannot fetch current user",
        error: userError.message,
        action: "Check auth token validity",
      };
    }

    return {
      status: "healthy",
      message: "Auth subsystem operational",
      user: user?.email,
    };
  } catch (err) {
    return {
      status: "error",
      message: "Unexpected auth error",
      error: err instanceof Error ? err.message : String(err),
      action: "Check browser console and Supabase logs",
    };
  }
}
