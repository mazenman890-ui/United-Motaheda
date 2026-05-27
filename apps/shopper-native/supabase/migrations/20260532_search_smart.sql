-- ============================================================================
-- Migration: 20260532_search_smart.sql
--
-- Upgrades search_products with professional-grade fuzzy matching:
--
--   1. word_similarity() — partial word matching so "panad" finds "panadol"
--      and "brufen" finds "brufen 400".
--
--   2. websearch_to_tsquery — handles natural language queries including
--      quoted phrases ("panadol extra"), minus exclusions, and is safer
--      than plainto_tsquery on unexpected input.
--
--   3. Multi-signal ranking formula:
--        • Exact code / barcode match → rank 1000 (always first)
--        • ts_rank_cd full-text (cover density — prefers compact matches)
--        • similarity()      (whole-string trigram — existing)
--        • word_similarity()  (partial / substring — NEW)
--        • category similarity (light weight)
--
--   4. unaccented ILIKE fallback with both raw and unaccented query variants
--      so Arabic-normalised input from the client still hits Name_Ar ILIKE.
--
--   5. GIN index on search_vector is confirmed (added if missing).
--
-- Safe to run multiple times — all DDL is CREATE OR REPLACE / IF NOT EXISTS.
-- ============================================================================

-- ─── 1. Ensure extensions ───────────────────────────────────────────────────
create extension if not exists pg_trgm  with schema public;
create extension if not exists unaccent with schema public;

-- ─── 2. GIN index on search_vector (idempotent) ─────────────────────────────
create index if not exists idx_products_search_vector
  on public.products using gin(search_vector);

-- GiST index on Name_En for fast trigram + word_similarity on the name column
create index if not exists idx_products_name_en_trgm
  on public.products using gist("Name_En" gist_trgm_ops);

create index if not exists idx_products_name_ar_trgm
  on public.products using gist("Name_Ar" gist_trgm_ops);

-- ─── 3. Rebuild search_products ─────────────────────────────────────────────
drop function if exists public.search_products(text,text,boolean,numeric,numeric,text,int,int);

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
  v_uq     text;       -- unaccented version of v_q (for ilike + trgm)
  v_tsq    tsquery;
  v_limit  int  := least(greatest(coalesce(p_limit, 24), 1), 100);
  v_offset int  := greatest(coalesce(p_offset, 0), 0);
begin
  if v_q is not null then
    v_uq := unaccent(v_q);

    -- websearch_to_tsquery is safer than plainto_tsquery — handles '+', '"…"',
    -- '-term' gracefully.  Fall back to plainto_tsquery if input somehow fails.
    begin
      v_tsq := websearch_to_tsquery('simple', v_uq);
    exception when others then
      begin
        v_tsq := plainto_tsquery('simple', v_uq);
      exception when others then
        v_tsq := null;
      end;
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
          -- ── Exact code / barcode → always surfaces first ─────────────────
          case
            when p."Code"    ilike v_q  then 1000.0
            when p."Barcode" ilike v_q  then 1000.0
            when p."Code"    ilike v_uq then  999.0
            when p."Barcode" ilike v_uq then  999.0
            else 0.0
          end

          -- ── Full-text rank (cover density — favours compact matches) ─────
          + case
              when v_tsq is not null and p.search_vector is not null
              then ts_rank_cd(p.search_vector, v_tsq) * 2.5
              else 0.0
            end

          -- ── Whole-string trigram similarity ─────────────────────────────
          + 1.2 * greatest(
              coalesce(similarity(coalesce(p."Name_Ar", ''), v_uq), 0),
              coalesce(similarity(coalesce(p."Name_En", ''), v_uq), 0)
            )

          -- ── Word / partial similarity (NEW) — "panad" → "panadol" ───────
          -- word_similarity(needle, haystack): how well needle fits any
          -- substring of haystack. Operator <%  is its threshold alias.
          + 0.9 * greatest(
              coalesce(word_similarity(v_uq, coalesce(p."Name_Ar", '')), 0),
              coalesce(word_similarity(v_uq, coalesce(p."Name_En", '')), 0)
            )

          -- ── Category light signal ────────────────────────────────────────
          + 0.15 * greatest(
              coalesce(similarity(coalesce(p."Category_Name",    ''), v_uq), 0),
              coalesce(similarity(coalesce(p."Category_Name_En", ''), v_uq), 0)
            )
        )
      end as rnk
    from public.products p
    where coalesce(p.is_active, true) = true

      -- ── Category filter ──────────────────────────────────────────────────
      and (
        p_category is null
        or p."Category_Name"    =     p_category
        or p."Category_Name"    ilike p_category
        or p."Category_Name_En" ilike p_category
      )

      -- ── Stock filter ─────────────────────────────────────────────────────
      and (not p_in_stock or coalesce(p."Stock", 0) > 0)

      -- ── Price filters ────────────────────────────────────────────────────
      and (p_min_price is null or p."Price" >= p_min_price)
      and (p_max_price is null or p."Price" <= p_max_price)

      -- ── Text matching: 6 complementary strategies ────────────────────────
      and (
        v_q is null

        -- 1. Full-text vector (highest precision)
        or (v_tsq is not null and p.search_vector is not null
            and p.search_vector @@ v_tsq)

        -- 2. Whole-string trigram (standard fuzzy)
        or p."Name_Ar" %  v_uq
        or p."Name_En" %  v_uq

        -- 3. Word / partial trigram (NEW — "panad" ∈ "panadol")
        or v_uq <% p."Name_Ar"
        or v_uq <% p."Name_En"

        -- 4. ILIKE substring — raw query (handles Arabic direct input)
        or p."Name_Ar"          ilike '%' || v_q  || '%'
        or p."Name_En"          ilike '%' || v_q  || '%'

        -- 5. ILIKE substring — unaccented (handles normalised Arabic from client)
        or p."Name_Ar"          ilike '%' || v_uq || '%'
        or p."Name_En"          ilike '%' || v_uq || '%'

        -- 6. Code / barcode prefix
        or p."Code"             ilike v_q || '%'
        or p."Barcode"          ilike v_q || '%'

        -- 7. Category substring
        or p."Category_Name"    ilike '%' || v_q || '%'
        or p."Category_Name_En" ilike '%' || v_q || '%'
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
    -- Default (relevance): exact code match → FTS+trgm rank → recency
    c.rnk desc,
    c.id  desc
  limit  v_limit
  offset v_offset;
end;
$$;

revoke all    on function public.search_products(text,text,boolean,numeric,numeric,text,int,int) from public;
grant execute on function public.search_products(text,text,boolean,numeric,numeric,text,int,int) to anon, authenticated;

-- ─── 4. Notify PostgREST ────────────────────────────────────────────────────
notify pgrst, 'reload schema';
