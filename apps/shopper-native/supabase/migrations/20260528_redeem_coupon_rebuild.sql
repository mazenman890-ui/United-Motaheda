-- ============================================================================
-- Rebuild public.redeem_points_for_coupon to eliminate the spurious
-- `relation "_batch" does not exist` error reported by some Postgres
-- clients when the original migration's `%rowtype` declaration could not
-- be resolved at compile time.
--
-- Changes vs the version installed by 20260526_loyalty_inventory_repair.sql:
--   * %rowtype declarations dropped in favour of explicit field columns,
--     so the function body compiles even if a client-side parser is
--     inspecting it in isolation from the surrounding schema.
--   * SELECT INTO targets are individual scalar variables; SELECT * is no
--     longer used. Bytes that look like `v_batch` cannot be mis-tokenised
--     by any client.
--   * Named dollar quoting ($redeem_coupon$ … $redeem_coupon$) — more
--     forgiving with copy-paste through tools that mangle bare $$ tags.
--   * gen_random_uuid() (built-in) for the 12-char code, not
--     gen_random_bytes (which needs pgcrypto and is not always available).
--
-- Behaviour is identical to the previous version: same atomicity, same
-- idempotency-key contract, same return shape. Pure refactor.
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

  -- Explicit batch row fields (no %rowtype).
  v_b_id             uuid;
  v_b_name           text;
  v_b_is_active      boolean;
  v_b_expires_at     timestamptz;
  v_b_total_supply   integer;
  v_b_issued_count   integer;
  v_b_points_cost    bigint;

  -- Explicit account fields (no %rowtype).
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

  perform public._loyalty_ensure_account(v_user_id);
  select balance, frozen_at
    into  v_acc_balance, v_acc_frozen_at
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
