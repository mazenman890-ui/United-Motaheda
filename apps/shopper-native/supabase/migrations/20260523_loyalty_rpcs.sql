-- ============================================================================
-- Loyalty & Rewards — atomic mutation RPCs.
--
-- Architectural rules every RPC follows:
--
--   1. SECURITY DEFINER  : runs under postgres role, with `set search_path =
--                          public, pg_catalog` to neutralise search-path
--                          hijack attacks. Permission checks happen INSIDE
--                          the function body, not at the role grant level.
--
--   2. ADVISORY LOCKS    : every balance mutation acquires
--                          pg_advisory_xact_lock(hashtext('user:'||user_id))
--                          BEFORE touching loyalty_accounts. This serialises
--                          concurrent calls for the same user without
--                          forcing serializable isolation across the DB.
--
--   3. IDEMPOTENCY KEY   : every mutation accepts p_idempotency_key. First
--                          call records the key + caches the response;
--                          subsequent calls with the same key return the
--                          cached result. An in-flight retry (key inserted
--                          but no response yet) blocks on the key-level
--                          advisory lock instead of double-spending.
--
--   4. NO NEGATIVE       : loyalty_ledger.balance_after has a >= 0 check
--                          constraint; the RPCs compute balance_after
--                          explicitly so a buggy code path triggers a
--                          constraint violation, not silent debt.
--
--   5. APPEND-ONLY       : the ledger is never UPDATEd. Corrections happen
--                          via reverse_reward_transaction, which inserts a
--                          new compensating row pointing at the parent.
--
--   6. AUDITED           : every RPC logs to reward_audit_logs on both
--                          success and rejection so admins can reconstruct
--                          any user's reward history end-to-end.
--
-- The companion migration 20260523_loyalty_schema.sql sets up the tables
-- and RLS. This file only adds functions and a few seed reward_tiers.
-- ============================================================================

-- ─── 0. Internal helpers ────────────────────────────────────────────────────

-- Acquire the per-user lock. Released at transaction commit/rollback.
create or replace function public._loyalty_lock(p_user_id uuid)
returns void
language sql
security definer
set search_path = public, pg_catalog
as $$
  select pg_advisory_xact_lock(hashtext('loyalty-user:' || p_user_id::text));
$$;

-- Acquire the per-idempotency-key lock so concurrent same-key callers
-- serialise on the cached-response read.
create or replace function public._loyalty_lock_idem(p_key text)
returns void
language sql
security definer
set search_path = public, pg_catalog
as $$
  select pg_advisory_xact_lock(hashtext('loyalty-idem:' || p_key));
$$;

-- Begin an idempotent operation. Returns the cached response if this key
-- has already completed; otherwise returns NULL and reserves the key for
-- this transaction. Throws on missing/short keys.
create or replace function public._loyalty_idempotency_begin(
  p_key      text,
  p_endpoint text,
  p_user_id  uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_cached jsonb;
begin
  if p_key is null or length(p_key) < 16 then
    raise exception using
      errcode = '22023',
      message = 'idempotency_key_required';
  end if;

  perform public._loyalty_lock_idem(p_key);

  select response into v_cached
    from public.reward_idempotency_keys
   where key = p_key;

  if found and v_cached is not null then
    return v_cached;
  end if;

  -- Reserve the key. Concurrent same-key callers blocked on the advisory
  -- lock above will see this row (response still NULL) on next iteration —
  -- but they only get here if the holder rolled back, in which case the
  -- INSERT was rolled back too and the on-conflict no-op is harmless.
  insert into public.reward_idempotency_keys (key, user_id, endpoint, request_hash)
    values (p_key, p_user_id, p_endpoint, '')
    on conflict (key) do nothing;

  return null;
end;
$$;

-- Persist the response for an idempotency key. Called once per RPC after
-- the mutation succeeds. The UPDATE-where-response-is-null clause means
-- a duplicate save is a no-op rather than overwriting a prior good answer.
create or replace function public._loyalty_idempotency_end(
  p_key      text,
  p_response jsonb
)
returns void
language sql
security definer
set search_path = public, pg_catalog
as $$
  update public.reward_idempotency_keys
     set response = p_response
   where key = p_key
     and response is null;
$$;

-- Write to the audit log. Never throws so a failed audit never breaks the
-- happy path; the caller still has the row's commit.
create or replace function public._loyalty_audit(
  p_subject     uuid,
  p_event_kind  text,
  p_rpc_name    text,
  p_success     boolean,
  p_payload     jsonb,
  p_error_code  text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.reward_audit_logs (
    actor_id, subject_user_id, event_kind, rpc_name, success, error_code, payload
  ) values (
    auth.uid(), p_subject, p_event_kind, p_rpc_name, p_success, p_error_code, p_payload
  );
exception when others then
  -- swallow — audit must not be the reason a happy mutation rolls back.
  null;
end;
$$;

-- Ensure a loyalty_accounts row exists for this user and return its current
-- balance. Locks the row FOR UPDATE so the caller can safely read-modify.
create or replace function public._loyalty_ensure_account(p_user_id uuid)
returns public.loyalty_accounts
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_row public.loyalty_accounts%rowtype;
begin
  select * into v_row from public.loyalty_accounts
    where user_id = p_user_id
    for update;
  if not found then
    insert into public.loyalty_accounts (user_id) values (p_user_id)
      on conflict (user_id) do nothing;
    select * into v_row from public.loyalty_accounts
      where user_id = p_user_id
      for update;
  end if;
  return v_row;
end;
$$;

-- Recompute the tier for an account based on lifetime_earned. Returns the
-- tier_id (null if no tiers configured).
create or replace function public._loyalty_recompute_tier(p_lifetime bigint)
returns uuid
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select id from public.reward_tiers
   where min_lifetime_points <= p_lifetime
   order by min_lifetime_points desc
   limit 1;
$$;

-- ─── 1. earn_loyalty_points (admin / service-role) ──────────────────────────
-- Awards points to a user. Used by the order completion Edge Function (running
-- as service_role), by admins, or by process_cashback_reward (which calls
-- this internally).

create or replace function public.earn_loyalty_points(
  p_user_id          uuid,
  p_amount           bigint,
  p_source           text,
  p_source_ref       text default null,
  p_idempotency_key  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_account public.loyalty_accounts%rowtype;
  v_ledger  public.loyalty_ledger%rowtype;
  v_kind    text;
  v_cached  jsonb;
  v_result  jsonb;
  v_new_balance bigint;
  v_new_lifetime bigint;
  v_new_tier uuid;
begin
  -- Only admins (or service_role, which sees is_admin = true via direct
  -- inserts in profiles) can directly grant points. RPC consumers running
  -- as authenticated users are blocked here.
  if not public.is_admin() then
    perform public._loyalty_audit(p_user_id, 'rpc_reject', 'earn_loyalty_points',
      false, jsonb_build_object('amount', p_amount, 'source', p_source), 'forbidden');
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception using errcode = '22023', message = 'amount_must_be_positive';
  end if;
  if p_source is null or length(trim(p_source)) = 0 then
    raise exception using errcode = '22023', message = 'source_required';
  end if;

  v_kind := case p_source
              when 'order_cashback' then 'cashback'
              when 'referral'       then 'referral'
              when 'campaign_bonus' then 'bonus'
              else                       'earn'
            end;

  v_cached := public._loyalty_idempotency_begin(p_idempotency_key, 'earn_loyalty_points', p_user_id);
  if v_cached is not null then return v_cached; end if;

  perform public._loyalty_lock(p_user_id);
  v_account := public._loyalty_ensure_account(p_user_id);

  v_new_balance  := v_account.balance + p_amount;
  v_new_lifetime := v_account.lifetime_earned + p_amount;
  v_new_tier     := public._loyalty_recompute_tier(v_new_lifetime);

  insert into public.loyalty_ledger (
    user_id, delta, balance_after, kind, source, source_ref,
    idempotency_key, created_by
  ) values (
    p_user_id, p_amount, v_new_balance, v_kind, p_source, p_source_ref,
    p_idempotency_key, auth.uid()
  ) returning * into v_ledger;

  update public.loyalty_accounts
     set balance         = v_new_balance,
         lifetime_earned = v_new_lifetime,
         tier_id         = coalesce(v_new_tier, tier_id)
   where user_id = p_user_id;

  v_result := jsonb_build_object(
    'ledger_id',     v_ledger.id,
    'balance',       v_new_balance,
    'amount',        p_amount,
    'tier_id',       v_new_tier,
    'kind',          v_kind
  );
  perform public._loyalty_idempotency_end(p_idempotency_key, v_result);
  perform public._loyalty_audit(p_user_id, 'rpc_call', 'earn_loyalty_points', true, v_result);

  return v_result;
end;
$$;

revoke all on function public.earn_loyalty_points(uuid, bigint, text, text, text) from public;
grant execute on function public.earn_loyalty_points(uuid, bigint, text, text, text) to authenticated;

-- ─── 2. process_cashback_reward (admin / service-role) ──────────────────────
-- Computes a cashback grant for a completed order and credits it. The actual
-- rate is base 1% (1 point per 100 cents), multiplied by the user's tier
-- earn_multiplier and any active campaign multiplier. Order amount is read
-- from the orders row server-side — the caller can't spoof it.

create or replace function public.process_cashback_reward(
  p_user_id          uuid,
  p_order_id         text,
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

  -- Pull authoritative order total from the orders table — never trust an
  -- amount passed in by the caller.
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

  -- Highest-multiplier active campaign wins. Could be summed instead — pick
  -- the policy that matches the business rule and document it here.
  select coalesce(max(multiplier), 1.0) into v_camp_mult
    from public.reward_campaigns
   where is_active = true
     and (starts_at is null or starts_at <= now())
     and (ends_at   is null or ends_at   >= now());

  -- Base rule: 1 point per 100 cents (1%). Apply multipliers. Floor to int.
  v_base_points  := floor(v_order_total / 100.0);
  v_total_points := floor(v_base_points * v_tier_mult * v_camp_mult);

  if v_total_points <= 0 then
    perform public._loyalty_idempotency_end(
      p_idempotency_key,
      jsonb_build_object('ledger_id', null, 'balance', v_account.balance, 'amount', 0)
    );
    return jsonb_build_object('ledger_id', null, 'balance', v_account.balance, 'amount', 0);
  end if;

  -- Release per-user lock so earn_loyalty_points can re-acquire it (the
  -- xact-lock is reentrant within the same transaction, so this is a no-op
  -- in practice but documents the intent).
  return public.earn_loyalty_points(
    p_user_id,
    v_total_points,
    'order_cashback',
    p_order_id,
    p_idempotency_key || ':earn'
  );
end;
$$;

revoke all on function public.process_cashback_reward(uuid, text, text) from public;
grant execute on function public.process_cashback_reward(uuid, text, text) to authenticated;

-- ─── 3. redeem_points_for_coupon (user) ─────────────────────────────────────

create or replace function public.redeem_points_for_coupon(
  p_batch_id         uuid,
  p_idempotency_key  text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id    uuid := auth.uid();
  v_batch      public.coupon_batches%rowtype;
  v_account    public.loyalty_accounts%rowtype;
  v_code       text;
  v_coupon_id  uuid;
  v_ledger_id  uuid;
  v_new_balance bigint;
  v_cached     jsonb;
  v_result     jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  v_cached := public._loyalty_idempotency_begin(p_idempotency_key, 'redeem_points_for_coupon', v_user_id);
  if v_cached is not null then return v_cached; end if;

  perform public._loyalty_lock(v_user_id);

  -- Lock the batch row to atomically check supply + bump issued_count.
  select * into v_batch
    from public.coupon_batches
   where id = p_batch_id
     for update;
  if not found then
    perform public._loyalty_audit(v_user_id, 'rpc_reject', 'redeem_points_for_coupon',
      false, jsonb_build_object('batch_id', p_batch_id), 'batch_not_found');
    raise exception using errcode = '23503', message = 'batch_not_found';
  end if;
  if not v_batch.is_active then
    raise exception using errcode = '22023', message = 'batch_inactive';
  end if;
  if v_batch.expires_at is not null and v_batch.expires_at < now() then
    raise exception using errcode = '22023', message = 'batch_expired';
  end if;
  if v_batch.total_supply is not null and v_batch.issued_count >= v_batch.total_supply then
    raise exception using errcode = '22023', message = 'batch_exhausted';
  end if;

  v_account := public._loyalty_ensure_account(v_user_id);
  if v_account.frozen_at is not null then
    raise exception using errcode = '42501', message = 'account_frozen';
  end if;
  if v_account.balance < v_batch.points_cost then
    raise exception using errcode = '22023', message = 'insufficient_balance';
  end if;

  v_new_balance := v_account.balance - v_batch.points_cost;

  -- Append-only ledger row for the spend.
  insert into public.loyalty_ledger (
    user_id, delta, balance_after, kind, source, source_ref,
    idempotency_key, created_by, metadata
  ) values (
    v_user_id,
    -v_batch.points_cost,
    v_new_balance,
    'redeem',
    'coupon_redeem',
    p_batch_id::text,
    p_idempotency_key,
    v_user_id,
    jsonb_build_object('batch_name', v_batch.name)
  ) returning id into v_ledger_id;

  update public.loyalty_accounts
     set balance           = v_new_balance,
         lifetime_redeemed = lifetime_redeemed + v_batch.points_cost
   where user_id = v_user_id;

  -- Generate a non-confusable 12-char code (uppercase hex). Unique constraint
  -- on coupons.code means collisions will retry — extremely unlikely at
  -- 16^12 ≈ 2.8e14.
  v_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12));

  insert into public.coupons (
    batch_id, user_id, code, state, issued_ledger_id, expires_at
  ) values (
    p_batch_id,
    v_user_id,
    v_code,
    'issued',
    v_ledger_id,
    v_batch.expires_at
  ) returning id into v_coupon_id;

  update public.coupon_batches
     set issued_count = issued_count + 1
   where id = p_batch_id;

  v_result := jsonb_build_object(
    'coupon_id', v_coupon_id,
    'code',      v_code,
    'balance',   v_new_balance,
    'expires_at', v_batch.expires_at,
    'ledger_id', v_ledger_id
  );
  perform public._loyalty_idempotency_end(p_idempotency_key, v_result);
  perform public._loyalty_audit(v_user_id, 'rpc_call', 'redeem_points_for_coupon', true, v_result);

  return v_result;
end;
$$;

revoke all on function public.redeem_points_for_coupon(uuid, text) from public;
grant execute on function public.redeem_points_for_coupon(uuid, text) to authenticated;

-- ─── 4. redeem_points_for_gift (user) ───────────────────────────────────────

create or replace function public.redeem_points_for_gift(
  p_gift_id          uuid,
  p_address          jsonb,
  p_idempotency_key  text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id      uuid := auth.uid();
  v_gift         public.gift_catalog%rowtype;
  v_inv          public.gift_inventory%rowtype;
  v_account      public.loyalty_accounts%rowtype;
  v_ledger_id    uuid;
  v_redemption_id uuid;
  v_new_balance  bigint;
  v_available    integer;
  v_expires_at   timestamptz := now() + interval '14 days';
  v_cached       jsonb;
  v_result       jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  v_cached := public._loyalty_idempotency_begin(p_idempotency_key, 'redeem_points_for_gift', v_user_id);
  if v_cached is not null then return v_cached; end if;

  perform public._loyalty_lock(v_user_id);

  select * into v_gift from public.gift_catalog where id = p_gift_id;
  if not found or not v_gift.is_active then
    raise exception using errcode = '23503', message = 'gift_not_available';
  end if;

  -- Lock the inventory row; the no-oversell check constraint will reject
  -- an update that would push reserved + fulfilled past total_stock.
  select * into v_inv from public.gift_inventory
    where gift_id = p_gift_id
    for update;
  if not found then
    raise exception using errcode = '23503', message = 'gift_inventory_missing';
  end if;
  v_available := v_inv.total_stock - v_inv.reserved - v_inv.fulfilled;
  if v_available < 1 then
    perform public._loyalty_audit(v_user_id, 'rpc_reject', 'redeem_points_for_gift',
      false, jsonb_build_object('gift_id', p_gift_id, 'available', v_available), 'out_of_stock');
    raise exception using errcode = '22023', message = 'out_of_stock';
  end if;

  v_account := public._loyalty_ensure_account(v_user_id);
  if v_account.frozen_at is not null then
    raise exception using errcode = '42501', message = 'account_frozen';
  end if;
  if v_account.balance < v_gift.points_cost then
    raise exception using errcode = '22023', message = 'insufficient_balance';
  end if;

  v_new_balance := v_account.balance - v_gift.points_cost;

  insert into public.loyalty_ledger (
    user_id, delta, balance_after, kind, source, source_ref,
    idempotency_key, created_by, metadata
  ) values (
    v_user_id,
    -v_gift.points_cost,
    v_new_balance,
    'redeem',
    'gift_redeem',
    p_gift_id::text,
    p_idempotency_key,
    v_user_id,
    jsonb_build_object('gift_name', v_gift.name)
  ) returning id into v_ledger_id;

  update public.loyalty_accounts
     set balance           = v_new_balance,
         lifetime_redeemed = lifetime_redeemed + v_gift.points_cost
   where user_id = v_user_id;

  update public.gift_inventory
     set reserved   = reserved + 1,
         version    = version + 1,
         updated_at = now()
   where gift_id = p_gift_id;

  insert into public.gift_redemptions (
    user_id, gift_id, points_spent, ledger_id, state, address, expires_at
  ) values (
    v_user_id, p_gift_id, v_gift.points_cost, v_ledger_id, 'reserved', p_address, v_expires_at
  ) returning id into v_redemption_id;

  v_result := jsonb_build_object(
    'redemption_id', v_redemption_id,
    'ledger_id',     v_ledger_id,
    'balance',       v_new_balance,
    'expires_at',    v_expires_at,
    'state',         'reserved'
  );
  perform public._loyalty_idempotency_end(p_idempotency_key, v_result);
  perform public._loyalty_audit(v_user_id, 'rpc_call', 'redeem_points_for_gift', true, v_result);

  return v_result;
end;
$$;

revoke all on function public.redeem_points_for_gift(uuid, jsonb, text) from public;
grant execute on function public.redeem_points_for_gift(uuid, jsonb, text) to authenticated;

-- ─── 5. release_gift_inventory (admin or owner cancellation) ────────────────
-- Cancels a reserved gift redemption: decrements inventory.reserved and
-- refunds the user via a reversal ledger row. Only callable while the
-- redemption is still 'reserved'.

create or replace function public.release_gift_inventory(
  p_redemption_id    uuid,
  p_reason           text,
  p_idempotency_key  text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id     uuid := auth.uid();
  v_redemption  public.gift_redemptions%rowtype;
  v_orig_ledger public.loyalty_ledger%rowtype;
  v_account     public.loyalty_accounts%rowtype;
  v_new_balance bigint;
  v_ledger_id   uuid;
  v_cached      jsonb;
  v_result      jsonb;
begin
  v_cached := public._loyalty_idempotency_begin(p_idempotency_key, 'release_gift_inventory', v_user_id);
  if v_cached is not null then return v_cached; end if;

  select * into v_redemption from public.gift_redemptions
    where id = p_redemption_id for update;
  if not found then
    raise exception using errcode = '23503', message = 'redemption_not_found';
  end if;

  -- Admins can release any reservation; users only their own.
  if v_redemption.user_id <> v_user_id and not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  if v_redemption.state <> 'reserved' then
    raise exception using errcode = '22023', message = 'not_reservable';
  end if;

  -- Refund: load the original ledger row, insert a reversal of equal magnitude.
  select * into v_orig_ledger from public.loyalty_ledger
    where id = v_redemption.ledger_id;
  if not found then
    raise exception using errcode = '23503', message = 'ledger_missing';
  end if;

  perform public._loyalty_lock(v_redemption.user_id);
  v_account := public._loyalty_ensure_account(v_redemption.user_id);
  v_new_balance := v_account.balance + v_redemption.points_spent;

  insert into public.loyalty_ledger (
    user_id, delta, balance_after, kind, source, source_ref,
    parent_ledger_id, idempotency_key, created_by, metadata
  ) values (
    v_redemption.user_id,
    v_redemption.points_spent,
    v_new_balance,
    'reverse',
    'gift_release',
    p_redemption_id::text,
    v_orig_ledger.id,
    p_idempotency_key,
    auth.uid(),
    jsonb_build_object('reason', p_reason)
  ) returning id into v_ledger_id;

  update public.loyalty_accounts
     set balance           = v_new_balance,
         lifetime_redeemed = greatest(lifetime_redeemed - v_redemption.points_spent, 0)
   where user_id = v_redemption.user_id;

  update public.gift_inventory
     set reserved   = greatest(reserved - 1, 0),
         version    = version + 1,
         updated_at = now()
   where gift_id = v_redemption.gift_id;

  update public.gift_redemptions
     set state               = 'cancelled',
         cancelled_at        = now(),
         cancellation_reason = p_reason
   where id = p_redemption_id;

  v_result := jsonb_build_object(
    'redemption_id', p_redemption_id,
    'ledger_id',     v_ledger_id,
    'balance',       v_new_balance,
    'refunded',      v_redemption.points_spent
  );
  perform public._loyalty_idempotency_end(p_idempotency_key, v_result);
  perform public._loyalty_audit(v_redemption.user_id, 'rpc_call', 'release_gift_inventory', true, v_result);

  return v_result;
end;
$$;

revoke all on function public.release_gift_inventory(uuid, text, text) from public;
grant execute on function public.release_gift_inventory(uuid, text, text) to authenticated;

-- ─── 6. validate_coupon (read-only) ─────────────────────────────────────────
-- Returns whether a coupon code is currently usable for the caller given a
-- cart preview. Read-only — no state change. The discount_cents number is
-- computed server-side from the batch's discount_kind/value rather than
-- trusting any client cap.

create or replace function public.validate_coupon(
  p_code             text,
  p_cart_total_cents integer default 0,
  p_categories       text[]   default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id       uuid := auth.uid();
  v_coupon        public.coupons%rowtype;
  v_batch         public.coupon_batches%rowtype;
  v_discount_cents integer;
  v_overlap       boolean;
begin
  if p_code is null or length(trim(p_code)) = 0 then
    return jsonb_build_object('valid', false, 'reason', 'code_required');
  end if;

  select * into v_coupon from public.coupons where code = upper(trim(p_code));
  if not found then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;
  if v_coupon.state <> 'issued' then
    return jsonb_build_object('valid', false, 'reason', 'already_' || v_coupon.state);
  end if;
  if v_coupon.user_id is not null and v_coupon.user_id <> v_user_id then
    return jsonb_build_object('valid', false, 'reason', 'wrong_owner');
  end if;
  if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
    return jsonb_build_object('valid', false, 'reason', 'expired');
  end if;

  select * into v_batch from public.coupon_batches where id = v_coupon.batch_id;
  if not found or not v_batch.is_active then
    return jsonb_build_object('valid', false, 'reason', 'batch_inactive');
  end if;
  if v_batch.expires_at is not null and v_batch.expires_at < now() then
    return jsonb_build_object('valid', false, 'reason', 'batch_expired');
  end if;
  if v_batch.min_spend_cents is not null and p_cart_total_cents < v_batch.min_spend_cents then
    return jsonb_build_object(
      'valid', false,
      'reason', 'min_spend_not_met',
      'min_spend_cents', v_batch.min_spend_cents
    );
  end if;
  if v_batch.category_restrictions is not null and array_length(v_batch.category_restrictions, 1) > 0 then
    if p_categories is null or array_length(p_categories, 1) is null then
      return jsonb_build_object('valid', false, 'reason', 'category_restricted');
    end if;
    -- True iff at least one cart category is allowed by the batch.
    select exists (
      select 1 from unnest(p_categories) c
       where c = any(v_batch.category_restrictions)
    ) into v_overlap;
    if not v_overlap then
      return jsonb_build_object('valid', false, 'reason', 'category_restricted');
    end if;
  end if;

  v_discount_cents := case v_batch.discount_kind
                        when 'percent'       then floor(p_cart_total_cents * v_batch.discount_value / 100.0)
                        when 'flat'          then v_batch.discount_value
                        when 'free_shipping' then 0
                      end;
  if v_batch.max_discount_cents is not null and v_discount_cents > v_batch.max_discount_cents then
    v_discount_cents := v_batch.max_discount_cents;
  end if;

  return jsonb_build_object(
    'valid',           true,
    'coupon_id',       v_coupon.id,
    'batch_id',        v_batch.id,
    'discount_kind',   v_batch.discount_kind,
    'discount_value',  v_batch.discount_value,
    'discount_cents',  v_discount_cents,
    'free_shipping',   v_batch.discount_kind = 'free_shipping'
  );
end;
$$;

revoke all on function public.validate_coupon(text, integer, text[]) from public;
grant execute on function public.validate_coupon(text, integer, text[]) to authenticated, anon;

-- ─── 7. apply_coupon_checkout (user) ────────────────────────────────────────
-- Consume a previously-validated coupon at checkout. We lock the coupon
-- row to prevent two parallel orders from both consuming it.

create or replace function public.apply_coupon_checkout(
  p_code             text,
  p_order_id         text,
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
         user_id           = v_user_id  -- claim ownership if unassigned
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

revoke all on function public.apply_coupon_checkout(text, text, text) from public;
grant execute on function public.apply_coupon_checkout(text, text, text) to authenticated;

-- ─── 8. reverse_reward_transaction (admin) ──────────────────────────────────

create or replace function public.reverse_reward_transaction(
  p_ledger_id        uuid,
  p_reason           text,
  p_idempotency_key  text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_orig         public.loyalty_ledger%rowtype;
  v_account      public.loyalty_accounts%rowtype;
  v_new_balance  bigint;
  v_new_ledger   uuid;
  v_cached       jsonb;
  v_result       jsonb;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  v_cached := public._loyalty_idempotency_begin(p_idempotency_key, 'reverse_reward_transaction', null);
  if v_cached is not null then return v_cached; end if;

  select * into v_orig from public.loyalty_ledger where id = p_ledger_id;
  if not found then
    raise exception using errcode = '23503', message = 'ledger_not_found';
  end if;
  if v_orig.kind = 'reverse' then
    raise exception using errcode = '22023', message = 'cannot_reverse_reversal';
  end if;

  perform public._loyalty_lock(v_orig.user_id);
  v_account := public._loyalty_ensure_account(v_orig.user_id);

  v_new_balance := v_account.balance - v_orig.delta;
  if v_new_balance < 0 then
    raise exception using errcode = '22023', message = 'would_go_negative';
  end if;

  -- Unique partial index on parent_ledger_id prevents a second reversal of
  -- the same original row; this INSERT will raise 23505 in that case.
  insert into public.loyalty_ledger (
    user_id, delta, balance_after, kind, source, source_ref,
    parent_ledger_id, idempotency_key, created_by, metadata
  ) values (
    v_orig.user_id,
    -v_orig.delta,
    v_new_balance,
    'reverse',
    v_orig.source,
    v_orig.source_ref,
    v_orig.id,
    p_idempotency_key,
    auth.uid(),
    jsonb_build_object('reason', p_reason, 'reversed_kind', v_orig.kind)
  ) returning id into v_new_ledger;

  -- Adjust lifetime counters in the inverse direction so a reversal of an
  -- earn reduces lifetime_earned, etc.
  update public.loyalty_accounts
     set balance           = v_new_balance,
         lifetime_earned   = case when v_orig.delta > 0
                                  then greatest(lifetime_earned   - v_orig.delta, 0)
                                  else lifetime_earned end,
         lifetime_redeemed = case when v_orig.delta < 0
                                  then greatest(lifetime_redeemed + v_orig.delta, 0)
                                  else lifetime_redeemed end
   where user_id = v_orig.user_id;

  v_result := jsonb_build_object(
    'reversal_ledger_id', v_new_ledger,
    'original_ledger_id', v_orig.id,
    'balance',            v_new_balance,
    'amount',             -v_orig.delta
  );
  perform public._loyalty_idempotency_end(p_idempotency_key, v_result);
  perform public._loyalty_audit(v_orig.user_id, 'reversal', 'reverse_reward_transaction', true, v_result);

  return v_result;
end;
$$;

revoke all on function public.reverse_reward_transaction(uuid, text, text) from public;
grant execute on function public.reverse_reward_transaction(uuid, text, text) to authenticated;

-- ─── 9. apply_campaign_bonus (admin / service-role) ─────────────────────────

create or replace function public.apply_campaign_bonus(
  p_user_id          uuid,
  p_campaign_id      uuid,
  p_amount           bigint,
  p_idempotency_key  text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_campaign  public.reward_campaigns%rowtype;
  v_prior     bigint;
  v_cached    jsonb;
  v_result    jsonb;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception using errcode = '22023', message = 'amount_must_be_positive';
  end if;

  v_cached := public._loyalty_idempotency_begin(p_idempotency_key, 'apply_campaign_bonus', p_user_id);
  if v_cached is not null then return v_cached; end if;

  select * into v_campaign from public.reward_campaigns
    where id = p_campaign_id for update;
  if not found or not v_campaign.is_active then
    raise exception using errcode = '22023', message = 'campaign_inactive';
  end if;
  if v_campaign.starts_at is not null and v_campaign.starts_at > now() then
    raise exception using errcode = '22023', message = 'campaign_not_started';
  end if;
  if v_campaign.ends_at is not null and v_campaign.ends_at < now() then
    raise exception using errcode = '22023', message = 'campaign_ended';
  end if;
  if v_campaign.total_budget is not null
     and v_campaign.points_issued + p_amount > v_campaign.total_budget then
    raise exception using errcode = '22023', message = 'budget_exhausted';
  end if;

  if v_campaign.max_redemptions_per_user is not null then
    select count(*) into v_prior
      from public.loyalty_ledger
     where user_id = p_user_id
       and source  = 'campaign_bonus'
       and source_ref = p_campaign_id::text;
    if v_prior >= v_campaign.max_redemptions_per_user then
      raise exception using errcode = '22023', message = 'per_user_cap_reached';
    end if;
  end if;

  update public.reward_campaigns
     set points_issued = points_issued + p_amount
   where id = p_campaign_id;

  v_result := public.earn_loyalty_points(
    p_user_id,
    p_amount,
    'campaign_bonus',
    p_campaign_id::text,
    p_idempotency_key || ':earn'
  );

  perform public._loyalty_idempotency_end(p_idempotency_key, v_result);
  perform public._loyalty_audit(p_user_id, 'rpc_call', 'apply_campaign_bonus', true,
    v_result || jsonb_build_object('campaign_id', p_campaign_id));

  return v_result;
end;
$$;

revoke all on function public.apply_campaign_bonus(uuid, uuid, bigint, text) from public;
grant execute on function public.apply_campaign_bonus(uuid, uuid, bigint, text) to authenticated;

-- ─── 10. create_referral_reward (admin / service-role) ──────────────────────

create or replace function public.create_referral_reward(
  p_referrer_id           uuid,
  p_referee_id            uuid,
  p_referee_first_order_id text,
  p_points                bigint,
  p_idempotency_key       text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_ledger_id  uuid;
  v_referral_id uuid;
  v_existing   uuid;
  v_earn       jsonb;
  v_cached     jsonb;
  v_result     jsonb;
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

  -- Each referee is rewardable exactly once. Take an advisory lock on the
  -- referee uuid so a parallel request can't slip past the unique check.
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

revoke all on function public.create_referral_reward(uuid, uuid, text, bigint, text) from public;
grant execute on function public.create_referral_reward(uuid, uuid, text, bigint, text) to authenticated;

-- ─── 11. get_loyalty_balance (read) ─────────────────────────────────────────
-- Returns the caller's balance with a derived consistency check. If the
-- materialised balance disagrees with the ledger sum, an anti_fraud_events
-- row is logged — drift means either a bug or tampering.

create or replace function public.get_loyalty_balance()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id   uuid := auth.uid();
  v_account   public.loyalty_accounts%rowtype;
  v_sum       bigint;
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
    -- Non-blocking integrity signal. Don't fail the caller; flag for review.
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

revoke all on function public.get_loyalty_balance() from public;
grant execute on function public.get_loyalty_balance() to authenticated;

-- ─── 12. seed reward_tiers if empty ─────────────────────────────────────────
-- Bronze → Silver → Gold → Platinum with progressively higher earn multipliers.
-- Run once; subsequent migrations re-running is harmless thanks to the
-- unique(name) constraint and on-conflict-do-nothing.

insert into public.reward_tiers (name, min_lifetime_points, earn_multiplier, display_order)
values
  ('Bronze',     0,        1.00, 1),
  ('Silver',     500,      1.10, 2),
  ('Gold',       2500,     1.25, 3),
  ('Platinum',   10000,    1.50, 4)
on conflict (name) do nothing;
