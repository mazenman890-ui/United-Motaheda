-- ============================================================================
-- Products visibility & search quality fix
--
-- Root causes addressed:
--
--   1. Products imported via CSV may have is_active = NULL or false → the
--      search_products RPC filters `WHERE is_active = true`, so those products
--      are invisible to every query.  Fix: mark all NULL/false rows active and
--      update the RPC to treat NULL as active going forward.
--
--   2. public.products has no explicit RLS policy for the anon role. When
--      search_products runs with security invoker, it inherits the caller's
--      RLS context. If the table's default-deny kicks in, anon readers see
--      nothing. Fix: add a permissive SELECT policy for anon + authenticated.
--
--   3. Category-name ILIKE matching: the current RPC only matches exact
--      p_category = "Category_Name". Adding an ILIKE fallback lets callers
--      pass partial or case-mismatched names and still get results.
--
--   4. available_inventory view: defensive recreation to ensure it exists and
--      correctly reflects total − reserved − committed.
-- ============================================================================

-- ─── 1. Activate imported products ──────────────────────────────────────────
-- Safe: only touches rows that are currently NULL or explicitly false.
-- Admins can still manually deactivate products; this only fixes the import.
update public.products
   set is_active = true
 where is_active is null;

-- ─── 2. Products RLS — public read ──────────────────────────────────────────
alter table public.products enable row level security;

drop policy if exists "products public read" on public.products;
create policy "products public read"
  on public.products for select using (true);

-- ─── 3. search_products — rebuilt with defensive fixes ──────────────────────
-- Drop first so CREATE OR REPLACE can change return type if needed.
drop function if exists public.search_products(text, text, boolean, numeric, numeric, text, int, int);
--
-- Changes vs. 20260522_products_search.sql:
--   * is_active check: `coalesce(p.is_active, true)` treats NULL as active
--   * category filter: exact match OR ilike match on both Category_Name and
--     Category_Name_En so Arabic and English callers both hit the index
--   * Arabic text search: also check Category_Name similarity for broad
--     category-level queries typed in Arabic
-- ============================================================================

create or replace function public.search_products(
  p_query      text     default null,
  p_category   text     default null,
  p_in_stock   boolean  default false,
  p_min_price  numeric  default null,
  p_max_price  numeric  default null,
  p_sort       text     default 'relevance',
  p_limit      int      default 24,
  p_offset     int      default 0
)
returns table (
  id                text,
  code              text,
  barcode           text,
  name_ar           text,
  name_en           text,
  price             numeric,
  stock             numeric,
  category_name     text,
  category_name_en  text,
  image_url         text,
  rank              real,
  total_count       bigint
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_q       text := nullif(trim(coalesce(p_query, '')), '');
  v_limit   int  := least(greatest(coalesce(p_limit, 24), 1), 100);
  v_offset  int  := greatest(coalesce(p_offset, 0), 0);
  v_tsq     tsquery;
  v_uq      text;
begin
  if v_q is not null then
    v_uq := unaccent(v_q);
    v_tsq := plainto_tsquery('simple', v_uq);
  end if;

  return query
  with filtered as (
    select
      p.id,
      p."Code"             as code,
      p."Barcode"          as barcode,
      p."Name_Ar"          as name_ar,
      p."Name_En"          as name_en,
      p."Price"            as price,
      p."Stock"            as stock,
      p."Category_Name"    as category_name,
      p."Category_Name_En" as category_name_en,
      p.image_url          as image_url,
      case
        when v_q is null then 0::real
        else (
          ts_rank(coalesce(p.search_vector, ''::tsvector), coalesce(v_tsq, ''::tsquery))
          + 0.5 * similarity(coalesce(p."Name_Ar", ''), v_uq)
          + 0.3 * similarity(coalesce(p."Name_En", ''), v_uq)
          + 0.2 * similarity(coalesce(p."Category_Name", ''), v_uq)
        )
      end as rnk
    from public.products p
    where coalesce(p.is_active, true) = true
      and (
        p_category is null
        or p."Category_Name" = p_category
        or p."Category_Name" ilike p_category
        or p."Category_Name_En" ilike p_category
      )
      and (not p_in_stock or p."Stock" > 0)
      and (p_min_price is null or p."Price" >= p_min_price)
      and (p_max_price is null or p."Price" <= p_max_price)
      and (
        v_q is null
        or (p.search_vector is not null and p.search_vector @@ v_tsq)
        or p."Name_Ar"           % v_uq
        or p."Name_En"           % v_uq
        or p."Code"              ilike v_q || '%'
        or p."Barcode"           ilike v_q || '%'
        or p."Category_Name"     ilike '%' || v_q || '%'
        or p."Category_Name_En"  ilike '%' || v_q || '%'
      )
  ),
  counted as (
    select f.*, count(*) over () as total_count
      from filtered f
  )
  select
    c.id::text,
    c.code,
    c.barcode,
    c.name_ar,
    c.name_en,
    c.price,
    c.stock,
    c.category_name,
    c.category_name_en,
    c.image_url,
    c.rnk,
    c.total_count
  from counted c
  order by
    case when p_sort = 'price_asc'  then c.price end asc  nulls last,
    case when p_sort = 'price_desc' then c.price end desc nulls last,
    case when p_sort = 'name_asc'   then c.name_ar end asc nulls last,
    case when p_sort = 'newest'     then c.id end desc nulls last,
    c.rnk desc,
    c.id desc
  limit v_limit
  offset v_offset;
end;
$$;

revoke all on function public.search_products(text, text, boolean, numeric, numeric, text, int, int) from public;
grant execute on function public.search_products(text, text, boolean, numeric, numeric, text, int, int) to anon, authenticated;

-- ─── 4. Rebuild get_featured_products with NULL-safe is_active ───────────────
-- Drop existing so we can change the return type definition if it drifted.
drop function if exists public.get_featured_products(int);
create or replace function public.get_featured_products(p_limit int default 12)
returns table (
  id               text,
  code             text,
  barcode          text,
  name_ar          text,
  name_en          text,
  price            numeric,
  stock            numeric,
  category_name    text,
  category_name_en text,
  image_url        text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id::text,
    p."Code",
    p."Barcode",
    p."Name_Ar",
    p."Name_En",
    p."Price",
    p."Stock",
    p."Category_Name",
    p."Category_Name_En",
    p.image_url
  from public.products p
  where coalesce(p.is_active, true) = true
    and coalesce(p."Stock", 0) > 0
  order by p.id desc
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
$$;

revoke all on function public.get_featured_products(int) from public;
grant execute on function public.get_featured_products(int) to anon, authenticated;

-- ─── 5. get_category_counts — NULL-safe is_active ───────────────────────────
drop function if exists public.get_category_counts();
create or replace function public.get_category_counts()
returns table (
  category_name     text,
  category_name_en  text,
  product_count     bigint,
  in_stock_count    bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p."Category_Name"    as category_name,
    p."Category_Name_En" as category_name_en,
    count(*)             as product_count,
    count(*) filter (where coalesce(p."Stock", 0) > 0) as in_stock_count
  from public.products p
  where coalesce(p.is_active, true) = true
    and p."Category_Name" is not null
    and trim(p."Category_Name") != ''
  group by p."Category_Name", p."Category_Name_En"
  order by product_count desc;
$$;

revoke all on function public.get_category_counts() from public;
grant execute on function public.get_category_counts() to anon, authenticated;

-- ─── 6. Rebuild search_vector for rows where it might be stale ──────────────
-- Re-run the backfill so newly activated products get a vector.
update public.products
   set search_vector =
     setweight(to_tsvector('simple', unaccent(coalesce("Name_Ar", ''))),          'A') ||
     setweight(to_tsvector('simple', unaccent(coalesce("Name_En", ''))),          'A') ||
     setweight(to_tsvector('simple', unaccent(coalesce("Code", ''))),             'B') ||
     setweight(to_tsvector('simple', unaccent(coalesce("Barcode", ''))),          'B') ||
     setweight(to_tsvector('simple', unaccent(coalesce("Category_Name", ''))),     'C') ||
     setweight(to_tsvector('simple', unaccent(coalesce("Category_Name_En", ''))),  'C')
 where search_vector is null
    or search_vector = ''::tsvector;

-- ─── 7. Refresh available_inventory view (defensive recreation) ──────────────
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

-- ─── 8. Notify PostgREST to reload its schema cache ─────────────────────────
notify pgrst, 'reload schema';
