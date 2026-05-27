-- Step 2 of 2: columns, storage, RLS (run after 20260534 / step 1 is committed).

alter table public.orders add column if not exists payment_proof_url text;
alter table public.orders add column if not exists transfer_number    text;
alter table public.orders add column if not exists payment_status     text;

drop policy if exists "orders owner manual payment proof" on public.orders;
create policy "orders owner manual payment proof"
  on public.orders for update
  using (
    auth.uid() = user_id
    and status in ('pending', 'pending_payment', 'processing')
  )
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "receipts authenticated insert" on storage.objects;
create policy "receipts authenticated insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "receipts authenticated read own" on storage.objects;
create policy "receipts authenticated read own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "receipts public read" on storage.objects;
create policy "receipts public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'receipts');

drop policy if exists "orders owner cancel" on public.orders;
create policy "orders owner cancel"
  on public.orders for update
  using      (auth.uid() = user_id and status in ('pending', 'pending_payment', 'processing'))
  with check (auth.uid() = user_id and status = 'cancelled');

notify pgrst, 'reload schema';
