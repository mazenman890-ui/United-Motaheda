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

export async function signUp(email: string, password: string, name: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  if (!data.user) throw new Error("لم يتم إنشاء الحساب، يرجى المحاولة مجدداً");
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
