-- ============================================================================
-- Cart + Wishlist + Payment preference — move from AsyncStorage to Supabase.
--
-- Before: cart, wishlist, and preferred payment method were local-only and
-- vanished on sign-out / wipe. Now they're server-backed with RLS, so
-- signing back in restores them, and they sync across devices.
--
-- Design:
--   - cart_items + wishlist_items: one row per (user, product). Unique
--     constraint enforces no duplicates. product_snapshot jsonb keeps a copy
--     of the product fields needed to render offline (name, price, image_url,
--     category) so we don't have to join against the products table on every
--     fetch.
--   - profiles.preferred_payment_method: a simple text column with a check
--     constraint pinning it to the known payment method types. Saves a whole
--     extra table for a single scalar field.
--
-- Idempotent: every CREATE / ALTER is guarded.
-- ============================================================================

-- ─── 1. cart_items ──────────────────────────────────────────────────────────
create table if not exists public.cart_items (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  product_id        text not null,
  quantity          integer not null check (quantity > 0),
  product_snapshot  jsonb not null,
  updated_at        timestamptz not null default now()
);

-- One row per (user, product); subsequent adds upsert into quantity.
create unique index if not exists cart_items_user_product_uniq
  on public.cart_items (user_id, product_id);

create index if not exists cart_items_user_idx
  on public.cart_items (user_id, updated_at desc);

alter table public.cart_items enable row level security;

drop policy if exists "cart_items owner all" on public.cart_items;
create policy "cart_items owner all"
  on public.cart_items for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── 2. wishlist_items ──────────────────────────────────────────────────────
create table if not exists public.wishlist_items (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  product_id        text not null,
  product_snapshot  jsonb not null,
  added_at          timestamptz not null default now()
);

create unique index if not exists wishlist_items_user_product_uniq
  on public.wishlist_items (user_id, product_id);

create index if not exists wishlist_items_user_idx
  on public.wishlist_items (user_id, added_at desc);

alter table public.wishlist_items enable row level security;

drop policy if exists "wishlist_items owner all" on public.wishlist_items;
create policy "wishlist_items owner all"
  on public.wishlist_items for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── 3. profiles.preferred_payment_method ───────────────────────────────────
-- A single scalar lives on profiles; no need for a dedicated table.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'preferred_payment_method'
  ) then
    alter table public.profiles
      add column preferred_payment_method text
        check (preferred_payment_method in ('cod', 'instapay', 'vodafone_cash'))
        default 'cod';
  end if;
end $$;
