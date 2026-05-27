-- ============================================================================
-- Fix: search quality + stock accuracy
--
-- Problems solved:
--
--   1. pg_trgm / unaccent not guaranteed to be active → enable them.
--
--   2. search_vector backfill only updated NULL/empty rows; products that
--      already had a stale vector were never refreshed → force full rebuild.
--
--   3. products."Stock" = 0 for all CSV rows; real stock is in
--      inventory_state.total − reserved − committed → sync it now and add a
--      trigger so future inventory changes propagate automatically.
--
--   4. search_products only used pg_trgm % operator; if that operator had no
--      hit (short query, low trigram overlap), the product was invisible even
--      though the name contained the query → add ILIKE fallback on Name_En /
--      Name_Ar so a simple substring match always works.
-- ============================================================================

-- ─── 1. Required extensions ─────────────────────────────────────────────────
create extension if not exists pg_trgm  with schema public;
create extension if not exists unaccent with schema public;

-- ─── 2. Sync Stock from inventory_state (one-time bulk update) ──────────────
update public.products p
set    "Stock" = coalesce((
         select greatest(i.total - i.reserved - i.committed, 0)
         from   public.inventory_state i
         where  i.product_id = p.id::text
         limit  1
       ), 0);

-- ─── 3. Trigger: keep products."Stock" live as inventory changes ─────────────
create or replace function public.fn_sync_product_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set    "Stock" = greatest(new.total - new.reserved - new.committed, 0)
  where  id::text = new.product_id;
  return new;
end;
$$;

drop trigger if exists trg_sync_product_stock on public.inventory_state;
create trigger trg_sync_product_stock
  after insert or update of total, reserved, committed
  on    public.inventory_state
  for each row
  execute function public.fn_sync_product_stock();

-- ─── 4. Full search_vector rebuild (ALL rows, not just NULL) ────────────────
update public.products
set search_vector =
  setweight(to_tsvector('simple', unaccent(coalesce("Name_Ar",          ''))), 'A') ||
  setweight(to_tsvector('simple', unaccent(coalesce("Name_En",          ''))), 'A') ||
  setweight(to_tsvector('simple', unaccent(coalesce("Code",             ''))), 'B') ||
  setweight(to_tsvector('simple', unaccent(coalesce("Barcode",          ''))), 'B') ||
  setweight(to_tsvector('simple', unaccent(coalesce("Category_Name",    ''))), 'C') ||
  setweight(to_tsvector('simple', unaccent(coalesce("Category_Name_En", ''))), 'C');

-- ─── 5. Rebuild search_products — ILIKE name fallback + live stock ───────────
drop function if exists public.search_products(text, text, boolean, numeric, numeric, text, int, int);

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
  v_q      text := nullif(trim(coalesce(p_query, '')), '');
  v_limit  int  := least(greatest(coalesce(p_limit, 24), 1), 100);
  v_offset int  := greatest(coalesce(p_offset, 0), 0);
  v_tsq    tsquery;
  v_uq     text;
begin
  if v_q is not null then
    v_uq  := unaccent(v_q);
    -- plainto_tsquery is safe on any input; empty string → null guard below
    v_tsq := case
               when length(trim(v_uq)) > 0
               then plainto_tsquery('simple', v_uq)
             end;
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
      p.image_url,
      case
        when v_q is null then 0::real
        else (
          -- full-text rank (0 when no vector or no tsquery)
          case when v_tsq is not null and p.search_vector is not null
               then ts_rank(p.search_vector, v_tsq) else 0 end
          -- trigram similarity — primary fuzzy signal
          + 0.5 * similarity(coalesce(p."Name_Ar", ''), v_uq)
          + 0.3 * similarity(coalesce(p."Name_En", ''), v_uq)
          + 0.1 * similarity(coalesce(p."Category_Name", ''), v_uq)
        )
      end as rnk
    from public.products p
    where coalesce(p.is_active, true) = true
      -- ── category filter ────────────────────────────────────────────────
      and (
        p_category is null
        or p."Category_Name"    =     p_category
        or p."Category_Name"    ilike p_category
        or p."Category_Name_En" ilike p_category
      )
      -- ── stock filter (uses synced "Stock" column) ──────────────────────
      and (not p_in_stock or coalesce(p."Stock", 0) > 0)
      -- ── price filters ──────────────────────────────────────────────────
      and (p_min_price is null or p."Price" >= p_min_price)
      and (p_max_price is null or p."Price" <= p_max_price)
      -- ── text search: tsvector  OR  trigram  OR  ilike fallback ─────────
      and (
        v_q is null
        -- tsvector full-text
        or (v_tsq is not null and p.search_vector is not null
            and p.search_vector @@ v_tsq)
        -- trigram fuzzy (pg_trgm)
        or p."Name_Ar"           %  v_uq
        or p."Name_En"           %  v_uq
        -- ilike substring fallback (always works, even without tsvector)
        or p."Name_Ar"           ilike '%' || v_q || '%'
        or p."Name_En"           ilike '%' || v_q || '%'
        -- code / barcode prefix
        or p."Code"              ilike v_q || '%'
        or p."Barcode"           ilike v_q || '%'
        -- category text
        or p."Category_Name"     ilike '%' || v_q || '%'
        or p."Category_Name_En"  ilike '%' || v_q || '%'
      )
  ),
  counted as (
    select f.*, count(*) over () as total_count
    from   filtered f
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
    case when p_sort = 'price_asc'  then c.price   end asc  nulls last,
    case when p_sort = 'price_desc' then c.price   end desc nulls last,
    case when p_sort = 'name_asc'   then c.name_ar end asc  nulls last,
    case when p_sort = 'newest'     then c.id      end desc nulls last,
    c.rnk desc,
    c.id  desc
  limit  v_limit
  offset v_offset;
end;
$$;

revoke all   on function public.search_products(text,text,boolean,numeric,numeric,text,int,int) from public;
grant execute on function public.search_products(text,text,boolean,numeric,numeric,text,int,int) to anon, authenticated;

-- ─── 6. Ensure get_category_counts reflects real stock ───────────────────────
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

revoke all   on function public.get_category_counts() from public;
grant execute on function public.get_category_counts() to anon, authenticated;

-- ─── 7. Notify PostgREST ─────────────────────────────────────────────────────
notify pgrst, 'reload schema';
