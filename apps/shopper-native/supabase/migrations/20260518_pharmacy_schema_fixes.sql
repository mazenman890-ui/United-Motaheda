-- ============================================================================
-- Pharmacy schema fixes (idempotent)
-- Some or all of these may already be in the DB depending on when the
-- previous migration was applied. Each statement is guarded so re-running
-- against an already-fixed DB is a no-op.
-- ============================================================================

-- 1. Refill-cancel policy (drop-and-recreate so behavior is deterministic)
drop policy if exists "refill_requests owner cancel" on public.refill_requests;
create policy "refill_requests owner cancel"
  on public.refill_requests for update
  using (auth.uid() = user_id and status in ('pending', 'preparing'))
  with check (auth.uid() = user_id and status = 'cancelled');

-- 2. Drop drug_interactions.updated_at if it still exists
alter table public.drug_interactions drop column if exists updated_at;

-- 3. Canonical pair ordering — only add if not already present
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'drug_interactions_pair_canonical'
      and conrelid = 'public.drug_interactions'::regclass
  ) then
    alter table public.drug_interactions
      add constraint drug_interactions_pair_canonical check (drug_a < drug_b);
  end if;
end $$;

-- 4. Reverse-pair lookup index (IF NOT EXISTS does the work)
create index if not exists interactions_drug_b_idx
  on public.drug_interactions (drug_b);
