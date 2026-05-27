-- ============================================================================
-- Orders schema — move orders from client-only AsyncStorage to Supabase.
--
-- Until now `useOrderStore` persisted orders to AsyncStorage only. Signing
-- out wiped them; signing in elsewhere couldn't see them; regulators and
-- delivery service had no record. This migration moves orders to the
-- canonical source of truth (Supabase) and lets the client treat its local
-- store as a cache.
--
-- Items + address are stored as jsonb on the order row (single-table design,
-- avoids a join on every fetch). Money in *_cents per project convention.
-- Status is an enum matching the existing client-side OrderStatus union.
--
-- Idempotent (safe to re-run): every CREATE is guarded by IF NOT EXISTS
-- or wrapped in a pg_constraint / pg_policies check.
-- ============================================================================

-- ─── 1. Status enum ─────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum ('pending','processing','shipped','delivered','cancelled');
  end if;
end $$;

-- ─── 2. orders table ────────────────────────────────────────────────────────
create table if not exists public.orders (
  -- client-generated id (e.g., "ORD-1779136039085"); kept text rather than
  -- uuid so existing local orders can be migrated in-place without losing
  -- their reference number.
  id              text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),

  -- Snapshot of items at order time. Schema:
  --   [{ productId, name, price, quantity, imageUrl? }, ...]
  items           jsonb not null,

  -- Snapshot of delivery address at order time. Schema:
  --   { name, phone, city, street, building?, floor?, notes? }
  address         jsonb not null,

  subtotal_cents  integer not null check (subtotal_cents >= 0),
  delivery_cents  integer not null check (delivery_cents >= 0),
  total_cents     integer not null check (total_cents    >= 0),

  status          order_status not null default 'pending'
);

create index if not exists orders_user_idx on public.orders (user_id, created_at desc);

-- ─── 3. RLS ─────────────────────────────────────────────────────────────────
alter table public.orders enable row level security;

-- Read own.
drop policy if exists "orders owner read" on public.orders;
create policy "orders owner read"
  on public.orders for select using (auth.uid() = user_id);

-- Insert own.
drop policy if exists "orders owner insert" on public.orders;
create policy "orders owner insert"
  on public.orders for insert with check (auth.uid() = user_id);

-- Cancel-only update (mirrors refill_requests pattern): client can flip
-- status to 'cancelled' on in-flight orders. Forward status transitions
-- (pending → processing → shipped → delivered) happen server-side via
-- service_role. Once an order is shipped/delivered, the client cannot
-- change anything.
drop policy if exists "orders owner cancel" on public.orders;
create policy "orders owner cancel"
  on public.orders for update
  using (auth.uid() = user_id and status in ('pending','processing'))
  with check (auth.uid() = user_id and status = 'cancelled');
