-- ============================================================================
-- Sync phone verification from auth.users → public.profiles.
--
-- Problem this solves:
--   Supabase Auth handles SMS OTP verification server-side. On success it
--   sets `auth.users.phone` and `auth.users.phone_confirmed_at`. It does
--   NOT touch `public.profiles` — that's our table, our responsibility.
--   Without this trigger, `profiles.phone_verified` stays false forever
--   even after the user successfully verifies their phone, and any
--   checkout / order flow gated on that flag is permanently broken.
--
-- Behavior:
--   - Fires on UPDATE of auth.users when phone OR phone_confirmed_at change
--   - Mirrors the new phone + verification status into public.profiles
--   - Wrapped in EXCEPTION so a failed mirror (e.g., the user's chosen phone
--     is already in another profile via the UNIQUE constraint) does NOT
--     block the underlying auth update. The auth side still succeeds; only
--     the profile mirror is skipped, with a warning in the DB log.
--
-- SECURITY DEFINER + search_path locked per Supabase recommendation.
-- ============================================================================

create or replace function public.sync_profile_phone_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (NEW.phone is distinct from OLD.phone)
     or (NEW.phone_confirmed_at is distinct from OLD.phone_confirmed_at) then

    update public.profiles
       set phone          = nullif(NEW.phone, ''),
           phone_verified = (NEW.phone_confirmed_at is not null)
     where id = NEW.id;
  end if;
  return NEW;

exception when others then
  -- Never let a profile-sync failure break auth.users.update — that
  -- would block legitimate verification flows. Log + continue.
  raise warning 'sync_profile_phone_from_auth: % (sqlstate %)', sqlerrm, sqlstate;
  return NEW;
end $$;

alter function public.sync_profile_phone_from_auth() owner to postgres;

drop trigger if exists on_auth_user_phone_updated on auth.users;
create trigger on_auth_user_phone_updated
  after update of phone, phone_confirmed_at on auth.users
  for each row execute function public.sync_profile_phone_from_auth();

-- ─── Backfill existing users ────────────────────────────────────────────────
-- For accounts that already verified before this trigger existed, sync now.
-- Safe to re-run: idempotent on no-op rows.
update public.profiles p
   set phone          = nullif(u.phone, ''),
       phone_verified = (u.phone_confirmed_at is not null)
  from auth.users u
 where u.id = p.id
   and (
     p.phone is distinct from nullif(u.phone, '')
     or p.phone_verified is distinct from (u.phone_confirmed_at is not null)
   )
   -- Only backfill rows where the phone isn't already taken by another
   -- profile (avoid the unique-constraint conflict).
   and not exists (
     select 1 from public.profiles p2
     where p2.id <> p.id and p2.phone is not distinct from nullif(u.phone, '')
   );
