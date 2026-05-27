-- ============================================================================
-- Inventory integrity — atomic mutation RPCs.
--
-- The same architectural rules as the loyalty RPCs (slice 3):
--   * SECURITY DEFINER with `set search_path = public, pg_catalog`
--   * pg_advisory_xact_lock per product_id serialises same-product writes
--   * Idempotency: `idempotency_key UNIQUE` on inventory_reservations + a
--     server-side cache check rejects replays
--   * Append-only stock_movements ledger for every state transition
--   * No-oversell check constraint catches any bug at the row level
--
-- All RPCs are callable by authenticated users for their OWN reservations;
-- commit/release on a reservation that isn't yours (and you're not admin)
-- → 42501 forbidden.
-- ============================================================================

-- ─── 0. Internal helpers ────────────────────────────────────────────────────

create or replace function public._inventory_lock(p_product_id text)
returns void
language sql
security definer
set search_path = public, pg_catalog
as $$
  select pg_advisory_xact_lock(hashtext('inv-product:' || p_product_id));
$$;

create or replace function public._inventory_ensure_state(p_product_id text)
returns public.inventory_state
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_row    public.inventory_state%rowtype;
  v_stock  integer;
begin
  select * into v_row from public.inventory_state
    where product_id = p_product_id for update;
  if found then return v_row; end if;

  -- Lazy init from products."Stock". If the product doesn't exist, refuse.
  select greatest(coalesce("Stock", 0)::integer, 0) into v_stock
    from public.products where id::text = p_product_id;
  if v_stock is null then
    raise exception using errcode = '23503', message = 'product_not_found';
  end if;

  insert into public.inventory_state (product_id, total)
    values (p_product_id, v_stock)
    on conflict (product_id) do nothing;

  select * into v_row from public.inventory_state
    where product_id = p_product_id for update;
  return v_row;
end;
$$;

-- ─── 1. validate_inventory (read-only) ──────────────────────────────────────

create or replace function public.validate_inventory(
  p_product_id   text,
  p_requested    integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_state public.inventory_state%rowtype;
  v_avail integer;
begin
  if p_requested is null or p_requested <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_quantity');
  end if;
  select * into v_state from public.inventory_state where product_id = p_product_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'product_not_found');
  end if;
  v_avail := v_state.total - v_state.reserved - v_state.committed;
  return jsonb_build_object(
    'ok',        v_avail >= p_requested,
    'available', greatest(v_avail, 0),
    'reserved',  v_state.reserved,
    'committed', v_state.committed,
    'total',     v_state.total
  );
end;
$$;

revoke all on function public.validate_inventory(text, integer) from public;
grant execute on function public.validate_inventory(text, integer) to anon, authenticated;

-- ─── 2. reserve_inventory ──────────────────────────────────────────────────

create or replace function public.reserve_inventory(
  p_product_id        text,
  p_quantity          integer,
  p_reservation_kind  text,
  p_reservation_ref   text,
  p_idempotency_key   text,
  p_expires_in_secs   integer default 900
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id    uuid := auth.uid();
  v_state      public.inventory_state%rowtype;
  v_existing   public.inventory_reservations%rowtype;
  v_res_id     uuid;
  v_available  integer;
  v_expires    timestamptz;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception using errcode = '22023', message = 'invalid_quantity';
  end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 16 then
    raise exception using errcode = '22023', message = 'idempotency_key_required';
  end if;
  if p_reservation_kind is null
     or p_reservation_kind not in ('cart','order','gift_redemption','manual') then
    raise exception using errcode = '22023', message = 'invalid_kind';
  end if;

  -- Idempotency: a previous successful call returns the same reservation.
  select * into v_existing from public.inventory_reservations
    where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'reservation_id', v_existing.id,
      'product_id',     v_existing.product_id,
      'quantity',       v_existing.quantity,
      'state',          v_existing.state,
      'expires_at',     v_existing.expires_at,
      'replay',         true
    );
  end if;

  perform public._inventory_lock(p_product_id);
  v_state := public._inventory_ensure_state(p_product_id);

  v_available := v_state.total - v_state.reserved - v_state.committed;
  if v_available < p_quantity then
    raise exception using
      errcode = '22023',
      message = format('insufficient_stock|available=%s|requested=%s', v_available, p_quantity);
  end if;

  v_expires := now() + make_interval(secs => greatest(coalesce(p_expires_in_secs, 900), 30));

  insert into public.inventory_reservations (
    product_id, user_id, quantity, state, reservation_kind, reservation_ref,
    idempotency_key, expires_at
  ) values (
    p_product_id, v_user_id, p_quantity, 'reserved', p_reservation_kind, p_reservation_ref,
    p_idempotency_key, v_expires
  ) returning id into v_res_id;

  update public.inventory_state
     set reserved = reserved + p_quantity
   where product_id = p_product_id;

  insert into public.stock_movements (
    product_id, delta_reserved, total_after, reserved_after, committed_after,
    kind, reservation_id, actor_id, idempotency_key
  ) values (
    p_product_id, p_quantity, v_state.total, v_state.reserved + p_quantity, v_state.committed,
    'reserve', v_res_id, v_user_id, p_idempotency_key
  );

  return jsonb_build_object(
    'reservation_id', v_res_id,
    'product_id',     p_product_id,
    'quantity',       p_quantity,
    'state',          'reserved',
    'expires_at',     v_expires,
    'available_after', v_available - p_quantity,
    'replay',         false
  );
end;
$$;

revoke all on function public.reserve_inventory(text, integer, text, text, text, integer) from public;
grant execute on function public.reserve_inventory(text, integer, text, text, text, integer) to authenticated;

-- ─── 3. release_inventory ──────────────────────────────────────────────────

create or replace function public.release_inventory(
  p_reservation_id   uuid,
  p_reason           text,
  p_idempotency_key  text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id   uuid := auth.uid();
  v_res       public.inventory_reservations%rowtype;
  v_state     public.inventory_state%rowtype;
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

  -- Idempotent: already-released returns the same shape.
  if v_res.state = 'released' then
    return jsonb_build_object(
      'reservation_id', v_res.id,
      'state',          'released',
      'replay',         true
    );
  end if;
  if v_res.state <> 'reserved' then
    raise exception using errcode = '22023', message = 'state_' || v_res.state || '_not_releasable';
  end if;

  perform public._inventory_lock(v_res.product_id);
  v_state := public._inventory_ensure_state(v_res.product_id);

  update public.inventory_reservations
     set state       = 'released',
         released_at = now(),
         metadata    = metadata || jsonb_build_object('release_reason', p_reason)
   where id = v_res.id;

  update public.inventory_state
     set reserved = greatest(reserved - v_res.quantity, 0)
   where product_id = v_res.product_id;

  insert into public.stock_movements (
    product_id, delta_reserved, total_after, reserved_after, committed_after,
    kind, reservation_id, actor_id, idempotency_key, metadata
  ) values (
    v_res.product_id, -v_res.quantity,
    v_state.total,
    greatest(v_state.reserved - v_res.quantity, 0),
    v_state.committed,
    'release', v_res.id, v_user_id, p_idempotency_key,
    jsonb_build_object('reason', p_reason)
  );

  return jsonb_build_object(
    'reservation_id', v_res.id,
    'state',          'released',
    'product_id',     v_res.product_id,
    'released',       v_res.quantity,
    'replay',         false
  );
end;
$$;

revoke all on function public.release_inventory(uuid, text, text) from public;
grant execute on function public.release_inventory(uuid, text, text) to authenticated;

-- ─── 4. commit_inventory ───────────────────────────────────────────────────
-- Move a reservation from 'reserved' → 'committed' when its order is placed.
-- Decrements reserved + increments committed in inventory_state; the no-
-- oversell constraint guarantees committed never exceeds total.
--
-- The order must belong to the same user as the reservation (or caller is
-- admin). Idempotent: re-committing returns the existing committed state.

create or replace function public.commit_inventory(
  p_reservation_id   uuid,
  p_order_id         text,
  p_idempotency_key  text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id   uuid := auth.uid();
  v_res       public.inventory_reservations%rowtype;
  v_state     public.inventory_state%rowtype;
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

  -- Idempotent committed-replay.
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

  -- Verify the order exists and belongs to the same user.
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

revoke all on function public.commit_inventory(uuid, text, text) from public;
grant execute on function public.commit_inventory(uuid, text, text) to authenticated;

-- ─── 5. extend_reservation — keeps a long-checkout reservation alive ───────

create or replace function public.extend_reservation(
  p_reservation_id   uuid,
  p_extend_by_secs   integer default 600
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id    uuid := auth.uid();
  v_res        public.inventory_reservations%rowtype;
  v_new_exp    timestamptz;
begin
  if p_extend_by_secs is null or p_extend_by_secs <= 0 or p_extend_by_secs > 3600 then
    raise exception using errcode = '22023', message = 'invalid_extension_window';
  end if;

  select * into v_res from public.inventory_reservations
    where id = p_reservation_id for update;
  if not found then
    raise exception using errcode = '23503', message = 'reservation_not_found';
  end if;
  if v_res.user_id <> v_user_id and not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if v_res.state <> 'reserved' then
    raise exception using errcode = '22023', message = 'state_' || v_res.state || '_not_extendable';
  end if;

  v_new_exp := now() + make_interval(secs => p_extend_by_secs);
  update public.inventory_reservations
     set expires_at = v_new_exp
   where id = v_res.id;

  return jsonb_build_object(
    'reservation_id', v_res.id,
    'expires_at',     v_new_exp,
    'state',          'reserved'
  );
end;
$$;

revoke all on function public.extend_reservation(uuid, integer) from public;
grant execute on function public.extend_reservation(uuid, integer) to authenticated;

-- ─── 6. expire_stale_reservations — cron / admin reaper ────────────────────
-- Releases stock for any reservation whose expires_at has passed. Called by
-- a scheduled job (pg_cron / external cron). Safe to call frequently; the
-- per-product advisory lock prevents collision with live reserve_inventory
-- calls.

create or replace function public.expire_stale_reservations(p_batch_size int default 200)
returns int
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_count    int := 0;
  v_row      public.inventory_reservations%rowtype;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  for v_row in
    select * from public.inventory_reservations
    where state = 'reserved' and expires_at < now()
    order by expires_at asc
    limit greatest(coalesce(p_batch_size, 200), 1)
    for update skip locked
  loop
    perform public._inventory_lock(v_row.product_id);

    update public.inventory_reservations
       set state       = 'expired',
           released_at = now()
     where id = v_row.id;

    update public.inventory_state
       set reserved = greatest(reserved - v_row.quantity, 0)
     where product_id = v_row.product_id;

    insert into public.stock_movements (
      product_id, delta_reserved,
      total_after, reserved_after, committed_after,
      kind, reservation_id, metadata
    )
    select
      i.product_id, -v_row.quantity,
      i.total, i.reserved, i.committed,
      'expire', v_row.id,
      jsonb_build_object('expired_at', now(), 'reservation_kind', v_row.reservation_kind)
    from public.inventory_state i where i.product_id = v_row.product_id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.expire_stale_reservations(int) from public;
grant execute on function public.expire_stale_reservations(int) to authenticated;

-- ─── 7. rollback_committed — order cancellation path ───────────────────────
-- When an order is cancelled, its committed reservations need to be
-- released back to total stock. Admin-only because order cancellation
-- itself is a privileged transition (already gated server-side).

create or replace function public.rollback_committed_reservation(
  p_reservation_id   uuid,
  p_reason           text,
  p_idempotency_key  text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_res    public.inventory_reservations%rowtype;
  v_state  public.inventory_state%rowtype;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 16 then
    raise exception using errcode = '22023', message = 'idempotency_key_required';
  end if;

  select * into v_res from public.inventory_reservations
    where id = p_reservation_id for update;
  if not found then
    raise exception using errcode = '23503', message = 'reservation_not_found';
  end if;
  if v_res.state <> 'committed' then
    raise exception using errcode = '22023', message = 'state_' || v_res.state || '_not_rollbackable';
  end if;

  perform public._inventory_lock(v_res.product_id);
  v_state := public._inventory_ensure_state(v_res.product_id);

  update public.inventory_reservations
     set state       = 'released',
         released_at = now(),
         metadata    = metadata || jsonb_build_object('rollback_reason', p_reason)
   where id = v_res.id;

  update public.inventory_state
     set committed = greatest(committed - v_res.quantity, 0)
   where product_id = v_res.product_id;

  insert into public.stock_movements (
    product_id, delta_committed,
    total_after, reserved_after, committed_after,
    kind, reservation_id, actor_id, idempotency_key, metadata
  ) values (
    v_res.product_id, -v_res.quantity,
    v_state.total, v_state.reserved,
    greatest(v_state.committed - v_res.quantity, 0),
    'rollback', v_res.id, auth.uid(), p_idempotency_key,
    jsonb_build_object('reason', p_reason)
  );

  return jsonb_build_object(
    'reservation_id', v_res.id,
    'state',          'released',
    'restored',       v_res.quantity
  );
end;
$$;

revoke all on function public.rollback_committed_reservation(uuid, text, text) from public;
grant execute on function public.rollback_committed_reservation(uuid, text, text) to authenticated;
