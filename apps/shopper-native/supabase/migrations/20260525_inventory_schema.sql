-- ============================================================================
-- Inventory integrity — schema + RLS.
--
-- The products table has had a Stock column from day one, but the app
-- previously read it directly + decremented it client-side (no server-side
-- reservation). That allowed two parallel checkouts of the last unit to
-- both succeed → overselling.
--
-- This migration moves stock to a proper reservation model:
--
--   inventory_state           — per-product (total/reserved/committed) with
--                               a NO-OVERSELL check constraint.
--   inventory_reservations    — individual reservation rows; state machine
--                               reserved → committed/released/expired.
--   stock_movements           — append-only ledger of every state change.
--
-- The products.Stock column STAYS. inventory_state is initialised from it
-- (and the trigger keeps them in sync going forward). Catalog reads can
-- continue to use products.Stock; reservation flows go through the RPCs.
--
-- Companion: 20260525_inventory_rpcs.sql adds the atomic mutation RPCs.
-- ============================================================================

-- ─── 1. inventory_state — current accounting per product ────────────────────
-- `total` mirrors products."Stock". `reserved` reflects active cart/order
-- holds. `committed` reflects sold-and-not-yet-shipped. Available = total -
-- reserved - committed. The no-oversell check guarantees this never goes
-- negative regardless of which RPC modified it.

create table if not exists public.inventory_state (
  product_id   text primary key,
  total        integer not null check (total >= 0),
  reserved     integer not null default 0 check (reserved >= 0),
  committed    integer not null default 0 check (committed >= 0),
  version      int not null default 0,
  updated_at   timestamptz not null default now(),
  constraint inventory_state_no_oversell
    check (reserved + committed <= total)
);
create index if not exists inventory_state_low_idx
  on public.inventory_state ((total - reserved - committed));

alter table public.inventory_state enable row level security;
drop policy if exists "inventory_state public read" on public.inventory_state;
create policy "inventory_state public read"
  on public.inventory_state for select using (true);
-- INTENTIONAL: no INSERT/UPDATE/DELETE policy. RPCs only.

-- Backfill inventory_state from products. Idempotent thanks to on-conflict.
insert into public.inventory_state (product_id, total)
  select p.id::text, greatest(coalesce(p."Stock", 0)::integer, 0)
    from public.products p
   where p.is_active = true
   on conflict (product_id) do nothing;

-- ─── 2. inventory_reservations — individual reservation rows ────────────────
-- One row per cart-line reservation. Aggregated quantity (not one row per
-- unit) so a "5 of X" cart line is a single reservation row.
--
-- State machine:
--   reserved  ──commit_inventory──▶ committed
--   reserved  ──release_inventory─▶ released
--   reserved  ──(cron)─────────────▶ expired      (when expires_at < now())
--   committed ──reverse────────────▶ released     (admin / order cancel)
--
-- expires_at default is 15 minutes — long enough for a slow checkout, short
-- enough that abandoned carts don't park stock indefinitely.

create table if not exists public.inventory_reservations (
  id                uuid primary key default gen_random_uuid(),
  product_id        text not null,
  user_id           uuid references auth.users(id) on delete set null,
  quantity          integer not null check (quantity > 0),
  state             text not null check (state in (
    'reserved','committed','released','expired'
  )) default 'reserved',
  reservation_kind  text not null check (reservation_kind in (
    'cart','order','gift_redemption','manual'
  )),
  reservation_ref   text,
  order_id          text references public.orders(id) on delete set null,
  idempotency_key   text not null,
  expires_at        timestamptz not null default (now() + interval '15 minutes'),
  reserved_at       timestamptz not null default now(),
  committed_at      timestamptz,
  released_at       timestamptz,
  metadata          jsonb not null default '{}'::jsonb
);

create unique index if not exists inventory_reservations_idem_uniq
  on public.inventory_reservations (idempotency_key);
create index if not exists inventory_reservations_product_state_idx
  on public.inventory_reservations (product_id, state);
create index if not exists inventory_reservations_user_idx
  on public.inventory_reservations (user_id, reserved_at desc);
create index if not exists inventory_reservations_expire_idx
  on public.inventory_reservations (expires_at) where state = 'reserved';
create index if not exists inventory_reservations_order_idx
  on public.inventory_reservations (order_id) where order_id is not null;

alter table public.inventory_reservations enable row level security;
drop policy if exists "inventory_reservations owner read" on public.inventory_reservations;
create policy "inventory_reservations owner read"
  on public.inventory_reservations for select
  using (auth.uid() = user_id or public.is_admin());
-- INTENTIONAL: no write policy. RPCs only.

-- ─── 3. stock_movements — append-only ledger ────────────────────────────────
-- Every change to inventory_state writes a row here, with stock_after
-- enforced non-negative. Drift between sum(movements.delta) and the
-- inventory_state row is an integrity signal — log it; don't auto-correct.

create table if not exists public.stock_movements (
  id              uuid primary key default gen_random_uuid(),
  product_id      text not null,
  delta_total     integer not null default 0,
  delta_reserved  integer not null default 0,
  delta_committed integer not null default 0,
  total_after     integer not null check (total_after >= 0),
  reserved_after  integer not null check (reserved_after >= 0),
  committed_after integer not null check (committed_after >= 0),
  kind            text not null check (kind in (
    'reserve','release','commit','restock','adjust','rollback','expire'
  )),
  reservation_id  uuid references public.inventory_reservations(id) on delete set null,
  actor_id        uuid references auth.users(id) on delete set null,
  idempotency_key text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  constraint stock_movements_no_negative_after
    check (reserved_after + committed_after <= total_after)
);
create index if not exists stock_movements_product_time_idx
  on public.stock_movements (product_id, created_at desc);
create index if not exists stock_movements_kind_idx
  on public.stock_movements (kind, created_at desc);
create index if not exists stock_movements_reservation_idx
  on public.stock_movements (reservation_id) where reservation_id is not null;

alter table public.stock_movements enable row level security;
drop policy if exists "stock_movements admin read" on public.stock_movements;
create policy "stock_movements admin read"
  on public.stock_movements for select using (public.is_admin());
-- Owners can read movements that reference their own reservations.
drop policy if exists "stock_movements owner via reservation" on public.stock_movements;
create policy "stock_movements owner via reservation"
  on public.stock_movements for select
  using (
    reservation_id is not null and exists (
      select 1 from public.inventory_reservations r
      where r.id = reservation_id and r.user_id = auth.uid()
    )
  );

-- ─── 4. updated_at trigger for inventory_state ─────────────────────────────
create or replace function public.inventory_state_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.version    := old.version + 1;
  return new;
end;
$$;
drop trigger if exists inventory_state_touch_trg on public.inventory_state;
create trigger inventory_state_touch_trg
  before update on public.inventory_state
  for each row execute function public.inventory_state_touch();

-- ─── 5. View — available_inventory ────────────────────────────────────────
-- Convenience view for catalog reads that want the authoritative "what can
-- I sell right now" number. Joins inventory_state with products so callers
-- get name + category in the same row.

create or replace view public.available_inventory as
  select
    i.product_id,
    i.total,
    i.reserved,
    i.committed,
    (i.total - i.reserved - i.committed)        as available,
    case
      when i.total - i.reserved - i.committed <= 0 then 'out_of_stock'
      when i.total - i.reserved - i.committed <= 3 then 'low'
      else 'in_stock'
    end                                          as availability,
    i.updated_at,
    p."Name_Ar"        as name_ar,
    p."Name_En"        as name_en,
    p."Category_Name"  as category_name
  from public.inventory_state i
  left join public.products p on p.id::text = i.product_id;

grant select on public.available_inventory to anon, authenticated;
