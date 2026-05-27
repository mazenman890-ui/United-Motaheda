-- ============================================================================
-- verify_migrations.sql — single-result-set diagnostic.
--
-- Paste into the Supabase SQL editor and run. Every row reports one migration
-- object and its observed status. The Supabase editor only shows the LAST
-- result set when you `SELECT` multiple times, so this version unions every
-- check into a single ordered result.
--
-- Expected after a clean apply of all pending migrations:
--   every row's status column = 'OK'
-- ============================================================================

with checks as (

  -- ── orders ─────────────────────────────────────────────────────────────────
  select 1 as ord, 'enum: order_status'                                  as object,
         case when exists (select 1 from pg_type where typname = 'order_status')
              then 'OK' else 'MISSING' end                               as status

  union all
  select 2, 'table: public.orders',
         case when exists (
           select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relname = 'orders'
         ) then 'OK' else 'MISSING' end

  union all
  select 3, 'rls enabled: public.orders',
         case when (
           select c.relrowsecurity from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relname = 'orders'
         ) then 'OK' else 'DISABLED' end

  union all
  select 4, 'policy: orders owner cancel (status pinned)',
         case when exists (
           select 1 from pg_policies
           where schemaname = 'public' and tablename = 'orders'
             and policyname = 'orders owner cancel'
         ) then 'OK' else 'MISSING' end

  -- ── cart + wishlist + payment preference ────────────────────────────────
  union all
  select 10, 'table: public.cart_items',
         case when exists (
           select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relname = 'cart_items'
         ) then 'OK' else 'MISSING' end

  union all
  select 11, 'rls enabled: public.cart_items',
         case when (
           select c.relrowsecurity from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relname = 'cart_items'
         ) then 'OK' else 'DISABLED' end

  union all
  select 12, 'unique index: cart_items (user_id, product_id)',
         case when exists (
           select 1 from pg_indexes
           where schemaname = 'public' and indexname = 'cart_items_user_product_uniq'
         ) then 'OK' else 'MISSING' end

  union all
  select 13, 'table: public.wishlist_items',
         case when exists (
           select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relname = 'wishlist_items'
         ) then 'OK' else 'MISSING' end

  union all
  select 14, 'rls enabled: public.wishlist_items',
         case when (
           select c.relrowsecurity from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relname = 'wishlist_items'
         ) then 'OK' else 'DISABLED' end

  union all
  select 15, 'unique index: wishlist_items (user_id, product_id)',
         case when exists (
           select 1 from pg_indexes
           where schemaname = 'public' and indexname = 'wishlist_items_user_product_uniq'
         ) then 'OK' else 'MISSING' end

  union all
  select 16, 'column: profiles.preferred_payment_method',
         case when exists (
           select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'profiles'
             and column_name = 'preferred_payment_method'
         ) then 'OK' else 'MISSING' end

  -- ── RPC: get_category_counts() ─────────────────────────────────────────────
  union all
  select 20, 'rpc: get_category_counts()',
         case when exists (
           select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'get_category_counts'
         ) then 'OK' else 'MISSING' end

  union all
  select 21, 'rpc grant: anon EXECUTE on get_category_counts',
         case when has_function_privilege('anon', 'public.get_category_counts()', 'EXECUTE')
              then 'OK' else 'MISSING' end

  union all
  select 22, 'rpc grant: authenticated EXECUTE on get_category_counts',
         case when has_function_privilege('authenticated', 'public.get_category_counts()', 'EXECUTE')
              then 'OK' else 'MISSING' end

  union all
  select 23, 'rpc returns rows',
         case when (select count(*) from public.get_category_counts()) > 0
              then 'OK' else 'EMPTY (no products)' end

  -- ── Signup trigger ─────────────────────────────────────────────────────────
  union all
  select 30, 'trigger: on_auth_user_created on auth.users',
         case when exists (
           select 1 from pg_trigger t
           join pg_class c on c.oid = t.tgrelid
           join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'auth' and c.relname = 'users'
             and t.tgname = 'on_auth_user_created'
         ) then 'OK' else 'MISSING' end

  union all
  select 31, 'function: public.handle_new_user',
         case when exists (
           select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'handle_new_user'
         ) then 'OK' else 'MISSING' end

  union all
  select 32, 'handle_new_user is SECURITY DEFINER',
         case when exists (
           select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'handle_new_user' and p.prosecdef = true
         ) then 'OK' else 'INSECURE (signup will fail)' end

  union all
  select 33, 'profiles.role has default',
         case when (
           select column_default from information_schema.columns
           where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
         ) is not null then 'OK' else 'MISSING (signup may fail)' end

  union all
  select 34, 'profiles.status has default',
         case when (
           select column_default from information_schema.columns
           where table_schema = 'public' and table_name = 'profiles' and column_name = 'status'
         ) is not null then 'OK' else 'MISSING (signup may fail)' end

  -- ── Pharmacy schema tables ───────────────────────────────────────────────
  union all
  select 40, 'table: public.prescriptions',
         case when exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                           where n.nspname = 'public' and c.relname = 'prescriptions')
              then 'OK' else 'MISSING' end

  union all
  select 41, 'table: public.refill_requests',
         case when exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                           where n.nspname = 'public' and c.relname = 'refill_requests')
              then 'OK' else 'MISSING' end

  union all
  select 42, 'table: public.medication_reminders',
         case when exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                           where n.nspname = 'public' and c.relname = 'medication_reminders')
              then 'OK' else 'MISSING' end

  union all
  select 43, 'table: public.allergies',
         case when exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                           where n.nspname = 'public' and c.relname = 'allergies')
              then 'OK' else 'MISSING' end

  union all
  select 44, 'table: public.dependents',
         case when exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                           where n.nspname = 'public' and c.relname = 'dependents')
              then 'OK' else 'MISSING' end

  union all
  select 45, 'table: public.insurance_cards',
         case when exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                           where n.nspname = 'public' and c.relname = 'insurance_cards')
              then 'OK' else 'MISSING' end

  union all
  select 46, 'table: public.drug_interactions',
         case when exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                           where n.nspname = 'public' and c.relname = 'drug_interactions')
              then 'OK' else 'MISSING' end

  union all
  select 47, 'policy: refill_requests owner cancel',
         case when exists (
           select 1 from pg_policies
           where schemaname = 'public' and tablename = 'refill_requests'
             and policyname = 'refill_requests owner cancel'
         ) then 'OK' else 'MISSING' end

  union all
  select 48, 'check: drug_interactions pair canonical (drug_a < drug_b)',
         case when exists (
           select 1 from pg_constraint
           where conrelid = 'public.drug_interactions'::regclass
             and contype  = 'c'
             and pg_get_constraintdef(oid) ilike '%drug_a%<%drug_b%'
         ) then 'OK' else 'MISSING' end

  union all
  select 49, 'index: insurance_one_primary (partial unique)',
         case when exists (
           select 1 from pg_indexes
           where schemaname = 'public' and indexname = 'insurance_one_primary'
         ) then 'OK' else 'MISSING' end

)
select object, status from checks order by ord;
