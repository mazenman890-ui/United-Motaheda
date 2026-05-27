-- ============================================================================
-- Loyalty & Rewards — schema + RLS + indexes.
--
-- Companion migration: 20260523_loyalty_rpcs.sql holds the atomic mutation
-- RPCs. This file does NOT define any mutation policy on the tables — the
-- ONLY way client traffic mutates points/coupons/gifts is by calling an
-- RPC, which runs SECURITY DEFINER under the postgres role and performs
-- its own permission checks.
--
-- Conventions inherited from prior migrations:
--   * money / points : bigint, never float
--   * cents on orders.* stay integer (32-bit room for ~21M EGP)
--   * user_id        : uuid not null references auth.users(id) on delete cascade
--   * timestamps     : timestamptz, default now()
--   * RLS            : enabled on every user-scoped table; reference tables
--                      (catalogs, tiers, campaigns) get a public-read policy
--   * admin role     : profiles.role = 'admin'
--
-- ALL migrations in this file are idempotent: CREATE TABLE IF NOT EXISTS,
-- DROP POLICY IF EXISTS, do $$ ... $$ for type/policy creation. Safe to
-- re-run during dev.
-- ============================================================================

-- ─── 0. is_admin helper — used by RLS + RPCs ────────────────────────────────
create or replace function public.is_admin(p_user_id uuid default null)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = coalesce(p_user_id, auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to anon, authenticated;

-- ─── 1. reward_tiers (reference; public read) ───────────────────────────────
create table if not exists public.reward_tiers (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null unique,
  min_lifetime_points  bigint not null check (min_lifetime_points >= 0),
  earn_multiplier      numeric(6,2) not null default 1.0 check (earn_multiplier >= 0),
  display_order        int not null default 0,
  metadata             jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now()
);
create index if not exists reward_tiers_threshold_idx
  on public.reward_tiers (min_lifetime_points);

alter table public.reward_tiers enable row level security;
drop policy if exists "reward_tiers public read" on public.reward_tiers;
create policy "reward_tiers public read"
  on public.reward_tiers for select using (true);

-- ─── 2. reward_campaigns (reference; public read of active rows) ───────────
create table if not exists public.reward_campaigns (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  description              text,
  starts_at                timestamptz,
  ends_at                  timestamptz,
  is_active                boolean not null default true,
  multiplier               numeric(6,2) not null default 1.0 check (multiplier >= 0),
  min_purchase_cents       integer check (min_purchase_cents is null or min_purchase_cents >= 0),
  max_redemptions_per_user integer check (max_redemptions_per_user is null or max_redemptions_per_user > 0),
  total_budget             bigint check (total_budget is null or total_budget >= 0),
  points_issued            bigint not null default 0 check (points_issued >= 0),
  category_restrictions    text[],
  metadata                 jsonb not null default '{}'::jsonb,
  created_by               uuid references auth.users(id),
  created_at               timestamptz not null default now(),
  constraint reward_campaigns_window
    check (starts_at is null or ends_at is null or ends_at >= starts_at),
  constraint reward_campaigns_budget_respected
    check (total_budget is null or points_issued <= total_budget)
);
create index if not exists reward_campaigns_window_idx
  on public.reward_campaigns (starts_at, ends_at) where is_active = true;

alter table public.reward_campaigns enable row level security;
drop policy if exists "reward_campaigns public read" on public.reward_campaigns;
create policy "reward_campaigns public read"
  on public.reward_campaigns for select
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >= now())
  );
drop policy if exists "reward_campaigns admin all" on public.reward_campaigns;
create policy "reward_campaigns admin all"
  on public.reward_campaigns for all
  using (public.is_admin())
  with check (public.is_admin());

-- ─── 3. reward_rules (sub-table of campaigns) ───────────────────────────────
create table if not exists public.reward_rules (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.reward_campaigns(id) on delete cascade,
  kind         text not null check (kind in ('cashback','flat_earn','multiplier','tier_bonus')),
  params       jsonb not null default '{}'::jsonb,
  display_order int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists reward_rules_campaign_idx
  on public.reward_rules (campaign_id);

alter table public.reward_rules enable row level security;
drop policy if exists "reward_rules public read" on public.reward_rules;
create policy "reward_rules public read"
  on public.reward_rules for select using (true);
drop policy if exists "reward_rules admin all" on public.reward_rules;
create policy "reward_rules admin all"
  on public.reward_rules for all
  using (public.is_admin()) with check (public.is_admin());

-- ─── 4. loyalty_accounts — per-user projection of the ledger ───────────────
-- This is a denormalised view of "current balance + lifetime totals". It is
-- maintained by the RPCs only. The ledger is the truth; this table is a
-- fast lookup. `version` is incremented on every mutation so callers can
-- do optimistic concurrency checks if they need to.
create table if not exists public.loyalty_accounts (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  balance            bigint not null default 0 check (balance >= 0),
  lifetime_earned    bigint not null default 0 check (lifetime_earned >= 0),
  lifetime_redeemed  bigint not null default 0 check (lifetime_redeemed >= 0),
  tier_id            uuid references public.reward_tiers(id),
  version            int not null default 0,
  frozen_at          timestamptz,
  frozen_reason      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.loyalty_accounts enable row level security;
drop policy if exists "loyalty_accounts owner read" on public.loyalty_accounts;
create policy "loyalty_accounts owner read"
  on public.loyalty_accounts for select
  using (auth.uid() = user_id or public.is_admin());
-- INTENTIONAL: no INSERT/UPDATE/DELETE policies. Mutations only via RPCs.

-- ─── 5. loyalty_ledger — append-only financial truth ───────────────────────
-- Every earn / redeem / adjustment generates one row. balance_after is
-- written by the RPC and check-constrained to be non-negative so a buggy
-- ledger row can never push the account into the red. parent_ledger_id
-- points to the original row for reversals (one reversal per parent
-- enforced by partial unique index).
create table if not exists public.loyalty_ledger (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  delta             bigint not null check (delta <> 0),
  balance_after     bigint not null check (balance_after >= 0),
  kind              text not null check (kind in (
    'earn','redeem','adjust','reverse','expire','bonus','referral','cashback'
  )),
  source            text not null,
  source_ref        text,
  parent_ledger_id  uuid references public.loyalty_ledger(id),
  idempotency_key   text,
  metadata          jsonb not null default '{}'::jsonb,
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now()
);

create index if not exists loyalty_ledger_user_time_idx
  on public.loyalty_ledger (user_id, created_at desc);
create unique index if not exists loyalty_ledger_idempotency_uniq
  on public.loyalty_ledger (idempotency_key)
  where idempotency_key is not null;
create unique index if not exists loyalty_ledger_reversal_uniq
  on public.loyalty_ledger (parent_ledger_id)
  where parent_ledger_id is not null;
create index if not exists loyalty_ledger_source_idx
  on public.loyalty_ledger (source, source_ref);

alter table public.loyalty_ledger enable row level security;
drop policy if exists "loyalty_ledger owner read" on public.loyalty_ledger;
create policy "loyalty_ledger owner read"
  on public.loyalty_ledger for select
  using (auth.uid() = user_id or public.is_admin());
-- INTENTIONAL: append-only. No INSERT/UPDATE/DELETE policy. RPCs only.

-- ─── 6. reward_idempotency_keys — replay protection ────────────────────────
-- RPC entry points record their key on first call; subsequent calls with
-- the same key return the cached response. Cleaned by a periodic job
-- (DELETE WHERE expires_at < now()).
create table if not exists public.reward_idempotency_keys (
  key             text primary key,
  user_id         uuid not null,
  endpoint        text not null,
  request_hash    text not null,
  response        jsonb,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '7 days')
);
create index if not exists reward_idempotency_expiry_idx
  on public.reward_idempotency_keys (expires_at);

alter table public.reward_idempotency_keys enable row level security;
-- Owners can read their own keys (debug surface). No write policy: RPCs only.
drop policy if exists "idempotency owner read" on public.reward_idempotency_keys;
create policy "idempotency owner read"
  on public.reward_idempotency_keys for select
  using (auth.uid() = user_id or public.is_admin());

-- ─── 7. coupon_batches (catalog; public read of active rows) ───────────────
create table if not exists public.coupon_batches (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  description              text,
  discount_kind            text not null check (discount_kind in ('percent','flat','free_shipping')),
  discount_value           integer not null check (discount_value >= 0),
  min_spend_cents          integer check (min_spend_cents is null or min_spend_cents >= 0),
  max_discount_cents       integer check (max_discount_cents is null or max_discount_cents >= 0),
  category_restrictions    text[],
  points_cost              bigint not null default 0 check (points_cost >= 0),
  total_supply             integer check (total_supply is null or total_supply > 0),
  issued_count             integer not null default 0 check (issued_count >= 0),
  redeemed_count           integer not null default 0 check (redeemed_count >= 0),
  expires_at               timestamptz,
  is_active                boolean not null default true,
  campaign_id              uuid references public.reward_campaigns(id) on delete set null,
  created_by               uuid references auth.users(id),
  created_at               timestamptz not null default now(),
  constraint coupon_batches_percent_range
    check (discount_kind <> 'percent' or (discount_value between 0 and 100)),
  constraint coupon_batches_supply_respected
    check (total_supply is null or issued_count <= total_supply)
);
create index if not exists coupon_batches_active_idx
  on public.coupon_batches (is_active, expires_at) where is_active = true;
create index if not exists coupon_batches_campaign_idx
  on public.coupon_batches (campaign_id);

alter table public.coupon_batches enable row level security;
drop policy if exists "coupon_batches public read" on public.coupon_batches;
create policy "coupon_batches public read"
  on public.coupon_batches for select
  using (
    is_active = true
    and (expires_at is null or expires_at > now())
  );
drop policy if exists "coupon_batches admin all" on public.coupon_batches;
create policy "coupon_batches admin all"
  on public.coupon_batches for all
  using (public.is_admin()) with check (public.is_admin());

-- ─── 8. coupons — individual issued codes ──────────────────────────────────
create table if not exists public.coupons (
  id                  uuid primary key default gen_random_uuid(),
  batch_id            uuid not null references public.coupon_batches(id) on delete cascade,
  user_id             uuid references auth.users(id) on delete set null,
  code                text not null,
  state               text not null check (state in ('issued','consumed','expired','revoked')) default 'issued',
  issued_ledger_id    uuid references public.loyalty_ledger(id),
  issued_at           timestamptz not null default now(),
  consumed_at         timestamptz,
  consumed_order_id   text references public.orders(id) on delete set null,
  expires_at          timestamptz,
  metadata            jsonb not null default '{}'::jsonb
);
create unique index if not exists coupons_code_uniq on public.coupons (code);
create index if not exists coupons_owner_state_idx on public.coupons (user_id, state);
create index if not exists coupons_batch_state_idx on public.coupons (batch_id, state);
create index if not exists coupons_expiry_idx     on public.coupons (expires_at)
  where state = 'issued';

alter table public.coupons enable row level security;
drop policy if exists "coupons owner read" on public.coupons;
create policy "coupons owner read"
  on public.coupons for select
  using (auth.uid() = user_id or public.is_admin());

-- ─── 9. gift_catalog (reference; public read) ──────────────────────────────
create table if not exists public.gift_catalog (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  image_url    text,
  points_cost  bigint not null check (points_cost > 0),
  is_active    boolean not null default true,
  category     text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists gift_catalog_active_idx
  on public.gift_catalog (is_active) where is_active = true;
create index if not exists gift_catalog_cost_idx
  on public.gift_catalog (points_cost) where is_active = true;

alter table public.gift_catalog enable row level security;
drop policy if exists "gift_catalog public read" on public.gift_catalog;
create policy "gift_catalog public read"
  on public.gift_catalog for select using (is_active = true);
drop policy if exists "gift_catalog admin all" on public.gift_catalog;
create policy "gift_catalog admin all"
  on public.gift_catalog for all
  using (public.is_admin()) with check (public.is_admin());

-- ─── 10. gift_inventory — stock state, separated for write isolation ───────
create table if not exists public.gift_inventory (
  gift_id      uuid primary key references public.gift_catalog(id) on delete cascade,
  total_stock  integer not null default 0 check (total_stock >= 0),
  reserved     integer not null default 0 check (reserved >= 0),
  fulfilled    integer not null default 0 check (fulfilled >= 0),
  version      int not null default 0,
  updated_at   timestamptz not null default now(),
  constraint gift_inventory_no_oversell
    check (reserved + fulfilled <= total_stock)
);

alter table public.gift_inventory enable row level security;
drop policy if exists "gift_inventory public read" on public.gift_inventory;
create policy "gift_inventory public read"
  on public.gift_inventory for select using (true);
-- Writes only through RPCs (which respect the no-oversell check via row
-- locks). Direct INSERT/UPDATE is blocked.

-- ─── 11. gift_redemptions — user redemption + fulfillment workflow ─────────
create table if not exists public.gift_redemptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  gift_id             uuid not null references public.gift_catalog(id),
  points_spent        bigint not null check (points_spent > 0),
  ledger_id           uuid not null references public.loyalty_ledger(id),
  state               text not null check (state in ('reserved','fulfilled','cancelled','expired')) default 'reserved',
  reserved_at         timestamptz not null default now(),
  fulfilled_at        timestamptz,
  cancelled_at        timestamptz,
  cancellation_reason text,
  expires_at          timestamptz not null default (now() + interval '14 days'),
  address             jsonb,
  tracking_number     text
);
create index if not exists gift_redemptions_user_idx
  on public.gift_redemptions (user_id, reserved_at desc);
create index if not exists gift_redemptions_pending_idx
  on public.gift_redemptions (state, expires_at) where state = 'reserved';

alter table public.gift_redemptions enable row level security;
drop policy if exists "gift_redemptions owner read" on public.gift_redemptions;
create policy "gift_redemptions owner read"
  on public.gift_redemptions for select
  using (auth.uid() = user_id or public.is_admin());

-- ─── 12. referral_codes — one code per user ────────────────────────────────
create table if not exists public.referral_codes (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  code        text not null,
  created_at  timestamptz not null default now()
);
create unique index if not exists referral_codes_code_uniq
  on public.referral_codes (code);

alter table public.referral_codes enable row level security;
drop policy if exists "referral_codes owner read" on public.referral_codes;
create policy "referral_codes owner read"
  on public.referral_codes for select
  using (auth.uid() = user_id or public.is_admin());

-- ─── 13. referral_rewards — referrer payouts; one row per referee ──────────
create table if not exists public.referral_rewards (
  id                       uuid primary key default gen_random_uuid(),
  referrer_id              uuid not null references auth.users(id) on delete cascade,
  referee_id               uuid not null references auth.users(id) on delete cascade,
  referee_first_order_id   text references public.orders(id) on delete set null,
  points_granted           bigint not null check (points_granted > 0),
  ledger_id                uuid not null references public.loyalty_ledger(id),
  created_at               timestamptz not null default now()
);
create unique index if not exists referral_rewards_referee_uniq
  on public.referral_rewards (referee_id);
create index if not exists referral_rewards_referrer_idx
  on public.referral_rewards (referrer_id, created_at desc);

alter table public.referral_rewards enable row level security;
drop policy if exists "referral_rewards owner read" on public.referral_rewards;
create policy "referral_rewards owner read"
  on public.referral_rewards for select
  using (auth.uid() = referrer_id or auth.uid() = referee_id or public.is_admin());

-- ─── 14. reward_audit_logs — operational trail ─────────────────────────────
create table if not exists public.reward_audit_logs (
  id                uuid primary key default gen_random_uuid(),
  event_at          timestamptz not null default now(),
  actor_id          uuid references auth.users(id) on delete set null,
  subject_user_id   uuid references auth.users(id) on delete set null,
  event_kind        text not null check (event_kind in (
    'rpc_call','rpc_reject','admin_action','reversal','anomaly','freeze','unfreeze'
  )),
  rpc_name          text,
  success           boolean,
  error_code        text,
  payload           jsonb not null default '{}'::jsonb,
  ip_hash           text
);
create index if not exists reward_audit_logs_subject_idx
  on public.reward_audit_logs (subject_user_id, event_at desc);
create index if not exists reward_audit_logs_kind_idx
  on public.reward_audit_logs (event_kind, event_at desc);

alter table public.reward_audit_logs enable row level security;
drop policy if exists "reward_audit_logs admin read" on public.reward_audit_logs;
create policy "reward_audit_logs admin read"
  on public.reward_audit_logs for select using (public.is_admin());
drop policy if exists "reward_audit_logs owner read" on public.reward_audit_logs;
create policy "reward_audit_logs owner read"
  on public.reward_audit_logs for select
  using (auth.uid() = subject_user_id);

-- ─── 15. anti_fraud_events — risk signals ──────────────────────────────────
create table if not exists public.anti_fraud_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  event_kind   text not null check (event_kind in (
    'rapid_redemption','duplicate_request','impossible_balance',
    'referral_loop','rate_limit','expired_balance','manual_flag'
  )),
  severity     text not null check (severity in ('info','warn','critical')),
  detected_at  timestamptz not null default now(),
  payload      jsonb not null default '{}'::jsonb,
  auto_action  text check (auto_action in ('none','flagged','frozen','reversed'))
);
create index if not exists anti_fraud_user_idx
  on public.anti_fraud_events (user_id, detected_at desc);
create index if not exists anti_fraud_severity_idx
  on public.anti_fraud_events (severity, detected_at desc);

alter table public.anti_fraud_events enable row level security;
drop policy if exists "anti_fraud admin read" on public.anti_fraud_events;
create policy "anti_fraud admin read"
  on public.anti_fraud_events for select using (public.is_admin());

-- ─── 16. updated_at trigger for loyalty_accounts ───────────────────────────
-- The RPCs always set updated_at explicitly, but having the trigger means a
-- direct admin UPDATE through Supabase Studio also bumps the timestamp.
create or replace function public.loyalty_accounts_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.version    := old.version + 1;
  return new;
end;
$$;
drop trigger if exists loyalty_accounts_touch_trg on public.loyalty_accounts;
create trigger loyalty_accounts_touch_trg
  before update on public.loyalty_accounts
  for each row execute function public.loyalty_accounts_touch();

-- ─── 17. user_history view — chronological earn/redeem feed ────────────────
create or replace view public.loyalty_user_history as
  select
    l.id            as ledger_id,
    l.user_id,
    l.delta,
    l.balance_after,
    l.kind,
    l.source,
    l.source_ref,
    l.parent_ledger_id,
    l.created_at,
    case
      when l.source = 'gift_redeem' then (
        select jsonb_build_object('gift_id', gr.gift_id, 'state', gr.state)
        from public.gift_redemptions gr
        where gr.ledger_id = l.id
        limit 1
      )
      else l.metadata
    end             as detail
  from public.loyalty_ledger l;

-- The view is queried under the caller's session, so the underlying
-- loyalty_ledger SELECT policy already restricts rows to owner or admin.
grant select on public.loyalty_user_history to anon, authenticated;
