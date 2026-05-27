-- ============================================================================
-- Backfill `public.profiles` for every auth.users row missing one.
--
-- Symptom this fixes:
--   "Your account profile was not found" at checkout.
--   Order placement returns 403 from create-order Edge Function.
--
-- Root cause: users signed up before the fixed `handle_new_user` trigger
-- (20260518_fix_signup_trigger.sql) was applied OR signups where the trigger
-- ran but encountered a NOT NULL constraint and silently failed. Either way,
-- those users have an auth.users row but no public.profiles row → Edge
-- Function can't authorize their orders.
--
-- This migration runs once, finds every orphan auth.users entry, and
-- inserts the corresponding profile row using the same column set the
-- trigger uses. Idempotent via `on conflict (id) do nothing`.
-- ============================================================================

-- Phone is intentionally NOT backfilled: profiles.phone has a UNIQUE
-- constraint, and a phone number in one user's auth.users metadata may
-- already be assigned to another profile (e.g., the user re-registered
-- after their first signup failed without a profile being created).
-- Leaving phone NULL lets affected users add it later from the profile
-- screen, or have it set during OTP verification on next checkout.
insert into public.profiles (id, email, full_name, phone_verified)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'name'),      ''),
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    split_part(coalesce(u.email, ''), '@', 1),
    'مستخدم'
  )                                                                 as full_name,
  false                                                              as phone_verified
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- Report how many rows were inserted (visible in the SQL editor result).
select
  (select count(*) from auth.users)                                   as auth_users_total,
  (select count(*) from public.profiles)                              as profiles_total,
  (select count(*) from auth.users u
     left join public.profiles p on p.id = u.id
     where p.id is null)                                              as still_missing;
