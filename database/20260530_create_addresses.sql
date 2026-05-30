-- ─── addresses table ─────────────────────────────────────────────────────────
-- Stores delivery addresses for authenticated users.
-- Each user can have multiple addresses; exactly one can be is_default = true.

create table if not exists public.addresses (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  label            text not null,
  recipient_name   text not null,
  phone            text not null,
  city             text not null,
  district         text not null,
  street           text not null,
  building         text not null,
  floor            text,
  apartment        text,
  landmark         text,
  lat              double precision,
  lng              double precision,
  is_default       boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index if not exists addresses_user_id_idx
  on public.addresses (user_id);

create index if not exists addresses_user_default_idx
  on public.addresses (user_id, is_default desc);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.addresses enable row level security;

-- Users can only see their own addresses
create policy "addresses: select own"
  on public.addresses for select
  using (auth.uid() = user_id);

-- Users can only insert addresses for themselves
create policy "addresses: insert own"
  on public.addresses for insert
  with check (auth.uid() = user_id);

-- Users can only update their own addresses
create policy "addresses: update own"
  on public.addresses for update
  using (auth.uid() = user_id);

-- Users can only delete their own addresses
create policy "addresses: delete own"
  on public.addresses for delete
  using (auth.uid() = user_id);

-- ─── updated_at trigger ───────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger addresses_updated_at
  before update on public.addresses
  for each row execute function public.set_updated_at();
