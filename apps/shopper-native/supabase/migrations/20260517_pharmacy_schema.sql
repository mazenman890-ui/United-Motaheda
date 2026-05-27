-- ============================================================================
-- United Pharmacies — pharmacy module schema
-- Source: HANDOFF.md §6
-- Notes:
--   * FK dependency order: pharmacies, dependents → prescriptions →
--     refill_requests, medication_reminders → dose_logs.
--     Independent tables (allergies, conditions, insurance_cards,
--     drug_interactions) live at the bottom; trigger applied last.
--   * All money in *_cents integer (no float).
--   * RLS on every user-scoped table; pharmacies and drug_interactions are
--     public-read references.
-- ============================================================================

-- ─── Enums ─────────────────────────────────────────────────────────────────
create type rx_status            as enum ('ready','active','expiring','expired');
create type refill_status        as enum ('pending','preparing','ready','on_the_way','delivered','cancelled');
create type refill_delivery      as enum ('same_day','standard','pickup');
create type reminder_freq        as enum ('daily','weekly','custom');
create type allergy_severity     as enum ('mild','moderate','severe');
create type dependent_rel        as enum ('Spouse','Child','Parent','Sibling','Other');
create type interaction_severity as enum ('mild','moderate','severe');

-- ─── 1. pharmacies (public read; referenced by refill_requests) ────────────
create table public.pharmacies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text not null,
  lat         numeric(10, 7),
  lng         numeric(10, 7),
  phone       text,
  hours_json  jsonb,
  services    text[],
  rating      numeric(3, 2),
  is_open     boolean not null default true,
  created_at  timestamptz not null default now()
);
create index pharmacies_geo_idx on public.pharmacies (lat, lng);

alter table public.pharmacies enable row level security;
create policy "pharmacies public read"
  on public.pharmacies for select using (true);

-- ─── 2. dependents (referenced by prescriptions, reminders) ────────────────
create table public.dependents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  relationship  dependent_rel not null,
  dob           date not null,
  color_hex     text,
  created_at    timestamptz not null default now()
);
create index dependents_user_idx on public.dependents (user_id);

alter table public.dependents enable row level security;
create policy "dependents owner all"
  on public.dependents for all using (auth.uid() = user_id);

-- ─── 3. prescriptions ──────────────────────────────────────────────────────
create table public.prescriptions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  dependent_id      uuid references public.dependents(id) on delete set null,
  name              text not null,
  dose              text not null,
  refills           integer not null default 0 check (refills >= 0),
  next_refill       timestamptz,
  doctor            text,
  status            rx_status not null default 'active',
  is_controlled     boolean not null default false,
  dea_schedule      smallint check (dea_schedule between 2 and 5),
  rx_number         text unique,
  original_pharmacy text,
  added_at          timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index prescriptions_user_idx   on public.prescriptions (user_id);
create index prescriptions_status_idx on public.prescriptions (user_id, status);

alter table public.prescriptions enable row level security;
create policy "prescriptions owner read"
  on public.prescriptions for select using (auth.uid() = user_id);
create policy "prescriptions owner insert"
  on public.prescriptions for insert with check (auth.uid() = user_id);
create policy "prescriptions owner update"
  on public.prescriptions for update using (auth.uid() = user_id);

-- ─── 4. refill_requests ────────────────────────────────────────────────────
create table public.refill_requests (
  id                uuid primary key default gen_random_uuid(),
  prescription_id   uuid not null references public.prescriptions(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  delivery          refill_delivery not null default 'standard',
  status            refill_status   not null default 'pending',
  pharmacy_id       uuid references public.pharmacies(id),
  tracking_number   text,
  total_cents       integer not null default 0,
  copay_cents       integer not null default 0,
  insurance_cents   integer not null default 0,
  eta               timestamptz,
  placed_at         timestamptz not null default now(),
  delivered_at      timestamptz
);
create index refill_user_idx on public.refill_requests (user_id, placed_at desc);

alter table public.refill_requests enable row level security;
create policy "refill_requests owner read"
  on public.refill_requests for select using (auth.uid() = user_id);
create policy "refill_requests owner insert"
  on public.refill_requests for insert with check (auth.uid() = user_id);
-- Status transitions (pending → preparing → ready → on_the_way → delivered)
-- happen server-side via service_role. The one client-allowed mutation is
-- user-initiated cancellation, and only while the order is still in-flight
-- (pending or preparing). Once the pharmacist has pulled it (ready) or
-- handed it to the courier (on_the_way), cancellation has to go through
-- support, not the app — matches real-world pharmacy ops.
create policy "refill_requests owner cancel"
  on public.refill_requests for update
  using (auth.uid() = user_id and status in ('pending', 'preparing'))
  with check (auth.uid() = user_id and status = 'cancelled');

-- ─── 5. medication_reminders ───────────────────────────────────────────────
create table public.medication_reminders (
  id              uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  dependent_id    uuid references public.dependents(id) on delete set null,
  time_of_day     time not null,
  frequency       reminder_freq not null default 'daily',
  days_of_week    smallint[],
  dose_note       text,
  enabled         boolean not null default true,
  created_at      timestamptz not null default now()
);
create index reminders_user_idx on public.medication_reminders (user_id, enabled);

alter table public.medication_reminders enable row level security;
create policy "medication_reminders owner all"
  on public.medication_reminders for all using (auth.uid() = user_id);

-- ─── 6. dose_logs (append-only) ────────────────────────────────────────────
create table public.dose_logs (
  id              uuid primary key default gen_random_uuid(),
  reminder_id     uuid references public.medication_reminders(id) on delete set null,
  prescription_id uuid not null references public.prescriptions(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  taken_at        timestamptz not null default now(),
  scheduled_for   timestamptz,
  skipped         boolean not null default false,
  notes           text
);
create index dose_logs_user_idx on public.dose_logs (user_id, taken_at desc);

alter table public.dose_logs enable row level security;
create policy "dose_logs owner read"
  on public.dose_logs for select using (auth.uid() = user_id);
create policy "dose_logs owner insert"
  on public.dose_logs for insert with check (auth.uid() = user_id);

-- ─── 7. allergies ──────────────────────────────────────────────────────────
create table public.allergies (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  severity    allergy_severity not null default 'moderate',
  reaction    text,
  notes       text,
  added_at    timestamptz not null default now()
);
create index allergies_user_idx on public.allergies (user_id);

alter table public.allergies enable row level security;
create policy "allergies owner all"
  on public.allergies for all using (auth.uid() = user_id);

-- ─── 8. conditions ─────────────────────────────────────────────────────────
create table public.conditions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  since       date,
  managed     boolean not null default true,
  notes       text,
  added_at    timestamptz not null default now()
);
create index conditions_user_idx on public.conditions (user_id);

alter table public.conditions enable row level security;
create policy "conditions owner all"
  on public.conditions for all using (auth.uid() = user_id);

-- ─── 9. insurance_cards ────────────────────────────────────────────────────
create table public.insurance_cards (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  carrier                text not null,
  plan                   text,
  member_id              text not null,
  group_number           text,
  rx_bin                 text,
  pcn                    text,
  copay_generic_cents    integer,
  copay_brand_cents      integer,
  deductible_met_cents   integer not null default 0,
  deductible_total_cents integer,
  is_primary             boolean not null default false,
  added_at               timestamptz not null default now()
);
create unique index insurance_one_primary
  on public.insurance_cards (user_id) where is_primary = true;

alter table public.insurance_cards enable row level security;
create policy "insurance_cards owner all"
  on public.insurance_cards for all using (auth.uid() = user_id);

-- ─── 10. drug_interactions (public read reference) ─────────────────────────
-- No updated_at: this is a reference table reloaded en bloc from RxNorm/FDB;
-- per-row update tracking is meaningless. Reload timestamp lives in the
-- ingestion job, not the row.
--
-- Canonical ordering (drug_a < drug_b alphabetic) is enforced by check
-- constraint so a single index on (drug_a, drug_b) covers all lookups.
-- App code MUST normalize the pair before INSERT and before SELECT — see
-- src/features/prescriptions/lib/drugPair.ts (lands on Day 16).
create table public.drug_interactions (
  id          uuid primary key default gen_random_uuid(),
  drug_a      text not null,
  drug_b      text not null,
  severity    interaction_severity not null,
  summary     text not null,
  detail      text,
  watch_for   text[],
  source      text,
  unique (drug_a, drug_b),
  check (drug_a < drug_b)
);
-- The unique(drug_a, drug_b) constraint auto-creates an index that covers
-- drug_a lookups (leftmost prefix). Only drug_b needs its own index for the
-- "what interacts with X?" query when X happens to live in column B.
create index interactions_drug_b_idx on public.drug_interactions (drug_b);

alter table public.drug_interactions enable row level security;
create policy "drug_interactions public read"
  on public.drug_interactions for select using (true);

-- ─── 11. updated_at trigger ────────────────────────────────────────────────
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger prescriptions_updated_at
  before update on public.prescriptions
  for each row execute function public.set_updated_at();
