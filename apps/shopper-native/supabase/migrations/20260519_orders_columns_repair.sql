-- ============================================================================
-- Repair: ensure public.orders has every column the app expects.
--
-- Symptom this fixes:
--   PGRST204: "Could not find the 'address' column of 'orders' in the schema cache"
--   (returned by the REST API when posting a new order)
--
-- Root cause: an `orders` table existed in the DB before our schema migration
-- ran. `CREATE TABLE IF NOT EXISTS` skipped, leaving the existing table's
-- columns in place — which don't match what the app sends.
--
-- This file adds every missing column via ALTER TABLE ADD COLUMN IF NOT
-- EXISTS (idempotent + safe on a table with existing rows; new columns are
-- nullable so adding them doesn't violate any constraints). Then we tell
-- PostgREST to reload its schema cache so the new columns are visible to
-- the REST API immediately.
--
-- Run AFTER: 20260519_orders_enum_repair.sql, 20260519_orders_schema.sql
-- ============================================================================

-- ─── 1. Add missing columns ────────────────────────────────────────────────
alter table public.orders add column if not exists user_id        uuid;
alter table public.orders add column if not exists created_at     timestamptz default now();
alter table public.orders add column if not exists items          jsonb;
alter table public.orders add column if not exists address        jsonb;
alter table public.orders add column if not exists subtotal_cents integer;
alter table public.orders add column if not exists delivery_cents integer;
alter table public.orders add column if not exists total_cents    integer;
alter table public.orders add column if not exists status         order_status default 'pending';

-- ─── 2. Add FK on user_id if not already present ────────────────────────────
-- (the column may have been added without its FK during a prior partial run)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_user_id_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- ─── 3. Indexes ─────────────────────────────────────────────────────────────
create index if not exists orders_user_idx
  on public.orders (user_id, created_at desc);

-- ─── 4. Make sure RLS is on + the three policies exist ──────────────────────
-- (idempotent — drops if present then recreates so behavior is deterministic)
alter table public.orders enable row level security;

drop policy if exists "orders owner read" on public.orders;
create policy "orders owner read"
  on public.orders for select using (auth.uid() = user_id);

drop policy if exists "orders owner insert" on public.orders;
create policy "orders owner insert"
  on public.orders for insert with check (auth.uid() = user_id);

drop policy if exists "orders owner cancel" on public.orders;
create policy "orders owner cancel"
  on public.orders for update
  using      (auth.uid() = user_id and status in ('pending','processing'))
  with check (auth.uid() = user_id and status = 'cancelled');

-- ─── 5. Reload PostgREST schema cache so new columns are exposed via REST ──
-- Without this, the REST API can return stale "column not found in schema
-- cache" errors for up to 10 minutes after schema changes.
notify pgrst, 'reload schema';
