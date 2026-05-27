-- ============================================================================
-- Fix signup: "Database error saving new user"
--
-- Root cause: the on_auth_user_created trigger calls handle_new_user(), which
-- INSERTs into public.profiles. That insert fails because:
--   (a) profiles.role / profiles.status are NOT NULL without defaults, and
--       the trigger function doesn't set them; or
--   (b) the trigger function isn't SECURITY DEFINER so RLS blocks the insert
--       from auth-context.
--
-- This migration is fully idempotent (safe to re-run) and addresses both.
-- It does NOT redefine the profiles table — we don't have its CREATE in the
-- repo, only ALTER. Defensive only.
-- ============================================================================

-- ─── 1. Safe defaults on profiles columns the trigger needs ────────────────
-- Wrapped in DO blocks because the columns may already have defaults, or may
-- not exist yet on a fresh clone. ALTER COLUMN SET DEFAULT is idempotent on
-- its own but errors if the column is missing.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) then
    alter table public.profiles alter column role set default 'customer';
    update public.profiles set role = 'customer' where role is null;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'status'
  ) then
    alter table public.profiles alter column status set default 'Active';
    update public.profiles set status = 'Active' where status is null;
  end if;
end $$;

-- ─── 2. Replace handle_new_user with a defensive version ───────────────────
-- Sets every common NOT NULL column explicitly so the insert succeeds
-- regardless of which constraint the original was tripping over.
-- SECURITY DEFINER so it bypasses RLS on profiles (runs as the function
-- owner, typically postgres).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name  text;
  v_phone text;
begin
  -- Pull name + phone from user_metadata if present; fall back to email prefix.
  v_name  := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'مستخدم'
  );
  v_phone := nullif(trim(new.raw_user_meta_data->>'phone'), '');

  -- Upsert so a pre-existing row (from a client-side upsert that ran first,
  -- or a retry) doesn't 409. Only sets columns that exist on every profiles
  -- schema variant we've seen; extras default at the table level.
  insert into public.profiles (id, email, full_name, phone, phone_verified)
  values (
    new.id,
    coalesce(new.email, ''),
    v_name,
    v_phone,
    false
  )
  on conflict (id) do update
    set email          = excluded.email,
        full_name      = coalesce(public.profiles.full_name, excluded.full_name),
        phone          = coalesce(public.profiles.phone,     excluded.phone),
        phone_verified = public.profiles.phone_verified;

  return new;

-- Crucially: never let an unexpected exception in this trigger block signup.
-- Log it and let auth.users.insert succeed; the client-side upsert in
-- src/features/auth/api.ts is a safety net for the profile row.
exception
  when others then
    raise warning 'handle_new_user failed: % (sqlstate %)', sqlerrm, sqlstate;
    return new;
end;
$$;

-- Owner / permissions — function must be owned by a role with write access to
-- profiles. postgres is the default Supabase owner.
alter function public.handle_new_user() owner to postgres;

-- ─── 3. Drop-and-recreate the trigger so behavior is deterministic ─────────
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
