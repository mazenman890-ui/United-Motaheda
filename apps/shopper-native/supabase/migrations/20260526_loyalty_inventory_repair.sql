-- ============================================================================
-- Repair migration — fixes bugs caught by `supabase db lint --linked` on
-- the previously-applied slice 2/3/6 RPCs.
--
-- Why a repair migration instead of editing the originals:
--   * The 20260522–20260525 migrations are already recorded in the live DB's
--     migration history. Editing their text retroactively would create drift
--     between source and prod that supabase migration repair can't easily
--     reconcile.
--   * The standard Postgres pattern for fixing a deployed function is to
--     DROP + CREATE OR REPLACE here, in a new migration, with the canonical
--     final body. The historical record stays intact.
--
-- Fixes:
--   1. search_products             — cast rank result to ::real (return type
--                                    declared real, expression returned double).
--   2. redeem_points_for_coupon    — replace gen_random_bytes() (pgcrypto, not
--                                    enabled) with gen_random_uuid() (built-in).
--   3. get_loyalty_balance         — drop the STABLE marker; the function
--                                    INSERTs into anti_fraud_events on drift.
--   4. process_cashback_reward     — accept orders.id as uuid (the live orders
--                                    table has uuid id, not text — the 2026-05-19
--                                    schema migration was skipped by an existing
--                                    table that pre-dated it).
--   5. apply_coupon_checkout       — same: p_order_id is uuid.
--   6. create_referral_reward      — same: p_referee_first_order_id is uuid.
--   7. commit_inventory            — same: p_order_id is uuid.
--
-- Column repairs (only if needed — guarded with do $$ blocks):
--   * coupons.consumed_order_id          → uuid (already uuid in live DB; nop)
--   * referral_rewards.referee_first_order_id → uuid (already uuid; nop)
--   * inventory_reservations.order_id    → uuid (already uuid; nop)
--
-- The function bodies below are the canonical versions. After this
-- migration the lint should report zero errors in our code.
-- ============================================================================

-- ─── Make sure pgcrypto is available even though we no longer rely on
--     gen_random_bytes(). Belt-and-suspenders: future migrations should not
--     have to enable it.
create extension if not exists pgcrypto;

-- ============================================================================
-- 1. search_products  — cast rank to real
-- ============================================================================
-- DROP first because the previous function body returned double precision
-- (the rank expression wasn't explicitly cast to real). CREATE OR REPLACE
-- alone cannot change the inferred return type.
drop function if exists public.search_products(text, text, boolean, numeric, numeric, text, int, int);

create or replace function public.search_products(
  p_query      text     default null,
  p_category   text     default null,
  p_in_stock   boolean  default false,
  p_min_price  numeric  default null,
  p_max_price  numeric  default null,
  p_sort       text     default 'relevance',
  p_limit      int      default 24,
  p_offset     int      default 0
)
returns table (
  id                text,
  code              text,
  barcode           text,
  name_ar           text,
  name_en           text,
  price             numeric,
  stock             numeric,
  category_name     text,
  category_name_en  text,
  image_url         text,
  rank              real,
  total_count       bigint
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_q       text := nullif(trim(coalesce(p_query, '')), '');
  v_limit   int  := least(greatest(coalesce(p_limit, 24), 1), 100);
  v_offset  int  := greatest(coalesce(p_offset, 0), 0);
  v_tsq     tsquery;
  v_uq      text;
begin
  if v_q is not null then
    v_uq := unaccent(v_q);
    v_tsq := plainto_tsquery('simple', v_uq);
  end if;

  return query
  with filtered as (
    select
      p.id,
      p."Code"             as code,
      p."Barcode"          as barcode,
      p."Name_Ar"          as name_ar,
      p."Name_En"          as name_en,
      p."Price"            as price,
      p."Stock"            as stock,
      p."Category_Name"    as category_name,
      p."Category_Name_En" as category_name_en,
      p.image_url          as image_url,
      case
        when v_q is null then 0::real
        else (
          ts_rank(p.search_vector, v_tsq)
          + 0.5 * similarity(coalesce(p."Name_Ar", ''), v_uq)
          + 0.3 * similarity(coalesce(p."Name_En", ''), v_uq)
        )::real
      end as rnk
    from public.products p
    where p.is_active = true
      and (p_category  is null or p."Category_Name" = p_category)
      and (not p_in_stock or p."Stock" > 0)
      and (p_min_price is null or p."Price" >= p_min_price)
      and (p_max_price is null or p."Price" <= p_max_price)
      and (
        v_q is null
        or p.search_vector @@ v_tsq
        or p."Name_Ar"  % v_uq
        or p."Name_En"  % v_uq
        or p."Code"     ilike v_q || '%'
        or p."Barcode"  ilike v_q || '%'
      )
  ),
  counted as (
    select f.*, count(*) over () as total_count
      from filtered f
  )
  select
    c.id::text,
    c.code,
    c.barcode,
    c.name_ar,
    c.name_en,
    c.price,
    c.stock,
    c.category_name,
    c.category_name_en,
    c.image_url,
    c.rnk,
    c.total_count
  from counted c
  order by
    case when p_sort = 'price_asc'  then c.price end asc  nulls last,
    case when p_sort = 'price_desc' then c.price end desc nulls last,
    case when p_sort = 'name_asc'   then c.name_ar end asc nulls last,
    case when p_sort = 'newest'     then c.id end desc nulls last,
    c.rnk desc,
    c.id desc
  limit v_limit
  offset v_offset;
end;
$$;

-- ============================================================================
-- 2. redeem_points_for_coupon — use gen_random_uuid() for code (no pgcrypto
--    dependency) AND replace %rowtype declarations with explicit fields.
--
--    Why explicit fields:
--      Some Postgres clients (notably older Supabase Studio SQL Editor
--      sessions) misreport a missing-row-type error as
--      `relation "_batch" does not exist` when %rowtype can't be resolved
--      at function-compile time. Explicit field declarations sidestep the
--      issue entirely — no other table lookup is performed at compile time.
-- ============================================================================
drop function if exists public.redeem_points_for_coupon(uuid, text);

create or replace function public.redeem_points_for_coupon(
  p_batch_id         uuid,
  p_idempotency_key  text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $redeem_coupon$
declare
  v_user_id          uuid := auth.uid();

  -- Explicit fields instead of public.coupon_batches%rowtype.
  v_b_id             uuid;
  v_b_name           text;
  v_b_is_active      boolean;
  v_b_expires_at     timestamptz;
  v_b_total_supply   integer;
  v_b_issued_count   integer;
  v_b_points_cost    bigint;

  -- Loyalty account fields we actually use.
  v_acc_balance      bigint;
  v_acc_frozen_at    timestamptz;

  v_code             text;
  v_coupon_id        uuid;
  v_ledger_id        uuid;
  v_new_balance      bigint;
  v_cached           jsonb;
  v_result           jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  v_cached := public._loyalty_idempotency_begin(p_idempotency_key, 'redeem_points_for_coupon', v_user_id);
  if v_cached is not null then return v_cached; end if;

  perform public._loyalty_lock(v_user_id);

  -- Lock the batch row + read only the columns we need.
  select id, name, is_active, expires_at, total_supply, issued_count, points_cost
    into  v_b_id, v_b_name, v_b_is_active, v_b_expires_at, v_b_total_supply, v_b_issued_count, v_b_points_cost
    from public.coupon_batches
   where id = p_batch_id
     for update;
  if v_b_id is null then
    perform public._loyalty_audit(v_user_id, 'rpc_reject', 'redeem_points_for_coupon',
      false, jsonb_build_object('batch_id', p_batch_id), 'batch_not_found');
    raise exception using errcode = '23503', message = 'batch_not_found';
  end if;
  if not v_b_is_active then
    raise exception using errcode = '22023', message = 'batch_inactive';
  end if;
  if v_b_expires_at is not null and v_b_expires_at < now() then
    raise exception using errcode = '22023', message = 'batch_expired';
  end if;
  if v_b_total_supply is not null and v_b_issued_count >= v_b_total_supply then
    raise exception using errcode = '22023', message = 'batch_exhausted';
  end if;

  -- Ensure account exists; then read only what we need from it.
  perform public._loyalty_ensure_account(v_user_id);
  select balance, frozen_at
    into v_acc_balance, v_acc_frozen_at
    from public.loyalty_accounts
   where user_id = v_user_id
     for update;
  if v_acc_frozen_at is not null then
    raise exception using errcode = '42501', message = 'account_frozen';
  end if;
  if v_acc_balance < v_b_points_cost then
    raise exception using errcode = '22023', message = 'insufficient_balance';
  end if;

  v_new_balance := v_acc_balance - v_b_points_cost;

  insert into public.loyalty_ledger (
    user_id, delta, balance_after, kind, source, source_ref,
    idempotency_key, created_by, metadata
  ) values (
    v_user_id,
    -v_b_points_cost,
    v_new_balance,
    'redeem',
    'coupon_redeem',
    p_batch_id::text,
    p_idempotency_key,
    v_user_id,
    jsonb_build_object('batch_name', v_b_name)
  ) returning id into v_ledger_id;

  update public.loyalty_accounts
     set balance           = v_new_balance,
         lifetime_redeemed = lifetime_redeemed + v_b_points_cost
   where user_id = v_user_id;

  -- 12-char uppercase hex code from gen_random_uuid (built-in, no pgcrypto).
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  insert into public.coupons (
    batch_id, user_id, code, state, issued_ledger_id, expires_at
  ) values (
    p_batch_id,
    v_user_id,
    v_code,
    'issued',
    v_ledger_id,
    v_b_expires_at
  ) returning id into v_coupon_id;

  update public.coupon_batches
     set issued_count = issued_count + 1
   where id = p_batch_id;

  v_result := jsonb_build_object(
    'coupon_id',  v_coupon_id,
    'code',       v_code,
    'balance',    v_new_balance,
    'expires_at', v_b_expires_at,
    'ledger_id',  v_ledger_id
  );
  perform public._loyalty_idempotency_end(p_idempotency_key, v_result);
  perform public._loyalty_audit(v_user_id, 'rpc_call', 'redeem_points_for_coupon', true, v_result);

  return v_result;
end;
$redeem_coupon$;

revoke all on function public.redeem_points_for_coupon(uuid, text) from public;
grant execute on function public.redeem_points_for_coupon(uuid, text) to authenticated;

-- ============================================================================
-- 3. get_loyalty_balance — remove STABLE so INSERT into anti_fraud_events
--    is permitted. The function is still safe to call read-mostly; only
--    drift triggers the insert.
-- ============================================================================
drop function if exists public.get_loyalty_balance();

create or replace function public.get_loyalty_balance()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id  uuid := auth.uid();
  v_account  public.loyalty_accounts%rowtype;
  v_sum      bigint;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  select * into v_account from public.loyalty_accounts where user_id = v_user_id;
  if not found then
    return jsonb_build_object(
      'balance', 0, 'lifetime_earned', 0, 'lifetime_redeemed', 0,
      'tier_id', null, 'frozen', false
    );
  end if;

  select coalesce(sum(delta), 0) into v_sum
    from public.loyalty_ledger where user_id = v_user_id;
  if v_sum <> v_account.balance then
    insert into public.anti_fraud_events (user_id, event_kind, severity, payload, auto_action)
      values (v_user_id, 'impossible_balance', 'critical',
              jsonb_build_object('account_balance', v_account.balance, 'ledger_sum', v_sum),
              'flagged');
  end if;

  return jsonb_build_object(
    'balance',           v_account.balance,
    'lifetime_earned',   v_account.lifetime_earned,
    'lifetime_redeemed', v_account.lifetime_redeemed,
    'tier_id',           v_account.tier_id,
    'frozen',            v_account.frozen_at is not null,
    'version',           v_account.version
  );
end;
$$;

-- ============================================================================
-- 4. process_cashback_reward — p_order_id is uuid (matches the live orders.id)
-- ============================================================================
-- Drop the broken text-typed signature so the new uuid-typed one is the only one.
drop function if exists public.process_cashback_reward(uuid, text, text);

create or replace function public.process_cashback_reward(
  p_user_id          uuid,
  p_order_id         uuid,
  p_idempotency_key  text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_order_total bigint;
  v_order_user  uuid;
  v_account     public.loyalty_accounts%rowtype;
  v_tier_mult   numeric(6,2) := 1.0;
  v_camp_mult   numeric(6,2) := 1.0;
  v_base_points bigint;
  v_total_points bigint;
  v_cached      jsonb;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  select total_cents, user_id into v_order_total, v_order_user
    from public.orders where id = p_order_id;
  if not found then
    raise exception using errcode = '23503', message = 'order_not_found';
  end if;
  if v_order_user <> p_user_id then
    raise exception using errcode = '22023', message = 'order_user_mismatch';
  end if;

  v_cached := public._loyalty_idempotency_begin(p_idempotency_key, 'process_cashback_reward', p_user_id);
  if v_cached is not null then return v_cached; end if;

  perform public._loyalty_lock(p_user_id);
  v_account := public._loyalty_ensure_account(p_user_id);

  if v_account.tier_id is not null then
    select earn_multiplier into v_tier_mult
      from public.reward_tiers where id = v_account.tier_id;
  end if;

  select coalesce(max(multiplier), 1.0) into v_camp_mult
    from public.reward_campaigns
   where is_active = true
     and (starts_at is null or starts_at <= now())
     and (ends_at   is null or ends_at   >= now());

  v_base_points  := floor(v_order_total / 100.0);
  v_total_points := floor(v_base_points * v_tier_mult * v_camp_mult);

  if v_total_points <= 0 then
    perform public._loyalty_idempotency_end(
      p_idempotency_key,
      jsonb_build_object('ledger_id', null, 'balance', v_account.balance, 'amount', 0)
    );
    return jsonb_build_object('ledger_id', null, 'balance', v_account.balance, 'amount', 0);
  end if;

  return public.earn_loyalty_points(
    p_user_id,
    v_total_points,
    'order_cashback',
    p_order_id::text,
    p_idempotency_key || ':earn'
  );
end;
$$;

revoke all on function public.process_cashback_reward(uuid, uuid, text) from public;
grant execute on function public.process_cashback_reward(uuid, uuid, text) to authenticated;

-- ============================================================================
-- 5. apply_coupon_checkout — p_order_id is uuid
-- ============================================================================
drop function if exists public.apply_coupon_checkout(text, text, text);

create or replace function public.apply_coupon_checkout(
  p_code             text,
  p_order_id         uuid,
  p_idempotency_key  text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id  uuid := auth.uid();
  v_coupon   public.coupons%rowtype;
  v_cached   jsonb;
  v_result   jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  v_cached := public._loyalty_idempotency_begin(p_idempotency_key, 'apply_coupon_checkout', v_user_id);
  if v_cached is not null then return v_cached; end if;

  select * into v_coupon from public.coupons
    where code = upper(trim(p_code))
    for update;
  if not found then
    raise exception using errcode = '23503', message = 'coupon_not_found';
  end if;
  if v_coupon.state <> 'issued' then
    raise exception using errcode = '22023', message = 'already_' || v_coupon.state;
  end if;
  if v_coupon.user_id is not null and v_coupon.user_id <> v_user_id then
    raise exception using errcode = '42501', message = 'wrong_owner';
  end if;
  if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
    raise exception using errcode = '22023', message = 'expired';
  end if;

  update public.coupons
     set state             = 'consumed',
         consumed_at       = now(),
         consumed_order_id = p_order_id,
         user_id           = v_user_id
   where id = v_coupon.id;

  update public.coupon_batches
     set redeemed_count = redeemed_count + 1
   where id = v_coupon.batch_id;

  v_result := jsonb_build_object(
    'coupon_id', v_coupon.id,
    'batch_id',  v_coupon.batch_id,
    'order_id',  p_order_id,
    'state',     'consumed'
  );
  perform public._loyalty_idempotency_end(p_idempotency_key, v_result);
  perform public._loyalty_audit(v_user_id, 'rpc_call', 'apply_coupon_checkout', true, v_result);

  return v_result;
end;
$$;

revoke all on function public.apply_coupon_checkout(text, uuid, text) from public;
grant execute on function public.apply_coupon_checkout(text, uuid, text) to authenticated;

-- ============================================================================
-- 6. create_referral_reward — p_referee_first_order_id is uuid
-- ============================================================================
drop function if exists public.create_referral_reward(uuid, uuid, text, bigint, text);

create or replace function public.create_referral_reward(
  p_referrer_id            uuid,
  p_referee_id             uuid,
  p_referee_first_order_id uuid,
  p_points                 bigint,
  p_idempotency_key        text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_ledger_id   uuid;
  v_referral_id uuid;
  v_existing    uuid;
  v_earn        jsonb;
  v_cached      jsonb;
  v_result      jsonb;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_referrer_id = p_referee_id then
    raise exception using errcode = '22023', message = 'self_referral';
  end if;
  if p_points is null or p_points <= 0 then
    raise exception using errcode = '22023', message = 'points_must_be_positive';
  end if;

  v_cached := public._loyalty_idempotency_begin(p_idempotency_key, 'create_referral_reward', p_referrer_id);
  if v_cached is not null then return v_cached; end if;

  perform pg_advisory_xact_lock(hashtext('referral-referee:' || p_referee_id::text));

  select id into v_existing from public.referral_rewards where referee_id = p_referee_id;
  if v_existing is not null then
    raise exception using errcode = '23505', message = 'referee_already_rewarded';
  end if;

  v_earn := public.earn_loyalty_points(
    p_referrer_id,
    p_points,
    'referral',
    p_referee_id::text,
    p_idempotency_key || ':earn'
  );
  v_ledger_id := (v_earn ->> 'ledger_id')::uuid;

  insert into public.referral_rewards (
    referrer_id, referee_id, referee_first_order_id, points_granted, ledger_id
  ) values (
    p_referrer_id, p_referee_id, p_referee_first_order_id, p_points, v_ledger_id
  ) returning id into v_referral_id;

  v_result := jsonb_build_object(
    'referral_id', v_referral_id,
    'ledger_id',   v_ledger_id,
    'points',      p_points
  );
  perform public._loyalty_idempotency_end(p_idempotency_key, v_result);
  perform public._loyalty_audit(p_referrer_id, 'rpc_call', 'create_referral_reward', true, v_result);

  return v_result;
end;
$$;

revoke all on function public.create_referral_reward(uuid, uuid, uuid, bigint, text) from public;
grant execute on function public.create_referral_reward(uuid, uuid, uuid, bigint, text) to authenticated;

-- ============================================================================
-- 7. commit_inventory — p_order_id is uuid
-- ============================================================================
drop function if exists public.commit_inventory(uuid, text, text);

create or replace function public.commit_inventory(
  p_reservation_id   uuid,
  p_order_id         uuid,
  p_idempotency_key  text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id    uuid := auth.uid();
  v_res        public.inventory_reservations%rowtype;
  v_state      public.inventory_state%rowtype;
  v_order_user uuid;
begin
  if p_idempotency_key is null or length(p_idempotency_key) < 16 then
    raise exception using errcode = '22023', message = 'idempotency_key_required';
  end if;

  select * into v_res from public.inventory_reservations
    where id = p_reservation_id for update;
  if not found then
    raise exception using errcode = '23503', message = 'reservation_not_found';
  end if;

  if v_res.user_id <> v_user_id and not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  if v_res.state = 'committed' and v_res.order_id = p_order_id then
    return jsonb_build_object(
      'reservation_id', v_res.id,
      'state',          'committed',
      'order_id',       p_order_id,
      'replay',         true
    );
  end if;
  if v_res.state <> 'reserved' then
    raise exception using errcode = '22023', message = 'state_' || v_res.state || '_not_committable';
  end if;

  select user_id into v_order_user from public.orders where id = p_order_id;
  if not found then
    raise exception using errcode = '23503', message = 'order_not_found';
  end if;
  if v_order_user <> v_res.user_id then
    raise exception using errcode = '22023', message = 'order_user_mismatch';
  end if;

  perform public._inventory_lock(v_res.product_id);
  v_state := public._inventory_ensure_state(v_res.product_id);

  update public.inventory_reservations
     set state        = 'committed',
         committed_at = now(),
         order_id     = p_order_id
   where id = v_res.id;

  update public.inventory_state
     set reserved  = greatest(reserved  - v_res.quantity, 0),
         committed = committed + v_res.quantity
   where product_id = v_res.product_id;

  insert into public.stock_movements (
    product_id, delta_reserved, delta_committed,
    total_after, reserved_after, committed_after,
    kind, reservation_id, actor_id, idempotency_key,
    metadata
  ) values (
    v_res.product_id, -v_res.quantity, v_res.quantity,
    v_state.total,
    greatest(v_state.reserved - v_res.quantity, 0),
    v_state.committed + v_res.quantity,
    'commit', v_res.id, v_user_id, p_idempotency_key,
    jsonb_build_object('order_id', p_order_id)
  );

  return jsonb_build_object(
    'reservation_id', v_res.id,
    'state',          'committed',
    'order_id',       p_order_id,
    'committed',      v_res.quantity,
    'replay',         false
  );
end;
$$;

revoke all on function public.commit_inventory(uuid, uuid, text) from public;
grant execute on function public.commit_inventory(uuid, uuid, text) to authenticated;
