import { supabase } from "@/lib/supabase";

export interface AuthUser {
  id:    string;
  email: string;
  name?: string;
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const user = data.user;
  return {
    id:    user.id,
    email: user.email ?? "",
    name:  user.user_metadata?.name as string | undefined,
  };
}

export async function signUp(
  email: string,
  password: string,
  name: string,
  phone?: string,
): Promise<AuthUser> {
  const phoneClean = phone?.replace(/\D/g, "").slice(0, 11) || undefined;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        phone: phoneClean,
      },
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error("لم يتم إنشاء الحساب، يرجى المحاولة مجدداً");

  // Best-effort profile upsert. The on_auth_user_created trigger handles this
  // normally; this is a safety net for environments where the trigger is
  // disabled. Failures are swallowed — the auth account is already created.
  try {
    await supabase.from("profiles").upsert(
      {
        id: data.user.id,
        email: data.user.email ?? "",
        full_name: name,
        phone: phoneClean,
        phone_verified: false,
        role: "customer",
        status: "Active",
      },
      { onConflict: "id", ignoreDuplicates: false },
    );
  } catch (e) {
    if (__DEV__) console.warn("[auth] profile upsert failed:", e);
  }

  return {
    id:    data.user.id,
    email: data.user.email ?? "",
    name,
  };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<AuthUser | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  return {
    id:    user.id,
    email: user.email ?? "",
    name:  user.user_metadata?.name as string | undefined,
  };
}
