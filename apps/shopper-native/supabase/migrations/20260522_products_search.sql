-- ============================================================================
-- Products — enterprise search & filter infrastructure
--
-- The products table itself was provisioned via the Supabase dashboard; this
-- migration is additive only. It does NOT recreate the table.
--
-- Adds:
--   * pg_trgm + unaccent extensions
--   * search_vector tsvector column with weighted A/B/C terms
--   * trigger to maintain search_vector on insert/update
--   * GIN index on the tsvector (full-text search)
--   * per-column trigram GIN indexes (fuzzy/typo matching, ilike acceleration)
--   * partial + compound B-tree indexes for the hottest filter paths
--   * search_products(...) RPC — paginated, ranked, cap-enforced
--
-- Column names follow the existing PascalCase products schema:
--   id, "Code", "Barcode", "Name", "Name_Ar", "Name_En", "Price", "Stock",
--   "Category_Name", "Category_Name_En", is_active, image_url
-- ============================================================================

-- ─── 1. Extensions ──────────────────────────────────────────────────────────
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- ─── 2. Search vector column ────────────────────────────────────────────────
alter table public.products
  add column if not exists search_vector tsvector;

-- The trigger function uses `simple` (no stemmer) because the catalogue is
-- bilingual (Arabic + English) and no postgres stemmer covers both well.
-- Trigram + tsvector together give us recall (typo tolerance) AND precision
-- (token-level ranking).
create or replace function public.products_search_vector_update()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', unaccent(coalesce(new."Name", ''))),            'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new."Name_Ar", ''))),         'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new."Name_En", ''))),         'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new."Code", ''))),            'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new."Barcode", ''))),         'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new."Category_Name", ''))),    'C') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new."Category_Name_En", ''))), 'C');
  return new;
end;
$$;

drop trigger if exists products_search_vector_trg on public.products;
create trigger products_search_vector_trg
  before insert or update of
    "Name", "Name_Ar", "Name_En", "Code", "Barcode",
    "Category_Name", "Category_Name_En"
  on public.products
  for each row execute function public.products_search_vector_update();

-- One-time backfill. Uses the same vector composition the trigger does.
update public.products
   set search_vector =
     setweight(to_tsvector('simple', unaccent(coalesce("Name", ''))),            'A') ||
     setweight(to_tsvector('simple', unaccent(coalesce("Name_Ar", ''))),         'A') ||
     setweight(to_tsvector('simple', unaccent(coalesce("Name_En", ''))),         'A') ||
     setweight(to_tsvector('simple', unaccent(coalesce("Code", ''))),            'B') ||
     setweight(to_tsvector('simple', unaccent(coalesce("Barcode", ''))),         'B') ||
     setweight(to_tsvector('simple', unaccent(coalesce("Category_Name", ''))),    'C') ||
     setweight(to_tsvector('simple', unaccent(coalesce("Category_Name_En", ''))), 'C');

-- ─── 3. Indexes ─────────────────────────────────────────────────────────────

-- Full-text: drives search_vector @@ ts_query lookups.
create index if not exists products_search_vector_gin
  on public.products using gin (search_vector);

-- Trigram per column — accelerates ILIKE + similarity() lookups on the
-- columns users actually type into the search box. We index the raw columns
-- (not unaccented) so ilike on the original text remains index-supported.
create index if not exists products_name_ar_trgm
  on public.products using gin ("Name_Ar" gin_trgm_ops);
create index if not exists products_name_en_trgm
  on public.products using gin ("Name_En" gin_trgm_ops);
create index if not exists products_name_trgm
  on public.products using gin ("Name" gin_trgm_ops);
create index if not exists products_code_trgm
  on public.products using gin ("Code" gin_trgm_ops);
create index if not exists products_barcode_trgm
  on public.products using gin ("Barcode" gin_trgm_ops);

-- Compound index for category browsing sorted by price (the dominant grid
-- query). Partial on is_active = true — saves ~5–15% on index size depending
-- on how many products are hidden.
create index if not exists products_cat_price_active_idx
  on public.products ("Category_Name", "Price")
  where is_active = true;

-- Newest-first listing within a category (default sort).
create index if not exists products_cat_id_active_idx
  on public.products ("Category_Name", id desc)
  where is_active = true;

-- Featured / homepage: newest in-stock products across the whole catalog.
create index if not exists products_in_stock_id_idx
  on public.products (id desc)
  where is_active = true and "Stock" > 0;

-- Lookup by code / barcode (scanner flows) — both columns are not unique
-- in this dataset, so partial indexes scoped to active rows keep them tight.
create index if not exists products_code_active_idx
  on public.products ("Code")
  where is_active = true;
create index if not exists products_barcode_active_idx
  on public.products ("Barcode")
  where is_active = true;

-- ─── 4. search_products RPC ─────────────────────────────────────────────────
-- Single entry point that callers use for both browse and search. Server-side
-- ranking + filtering means the client never paginates over a hot result set.
--
-- security_invoker: respects the caller's RLS context. We do not bypass it.
-- stable: result depends only on input args + table state, no side effects.

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
    v_uq := lower(unaccent(v_q));
    PERFORM set_config('pg_trgm.similarity_threshold', '0.15', true);
    -- plainto_tsquery is lenient with punctuation/operators — safe to feed
    -- user input directly.
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
      (case
        when v_q is null then 0::real
        else (
          (case when p."Code" = v_q or p."Barcode" = v_q then 1000 else 0 end)
          + (case when p."Name" ilike v_q || '%' or p."Name_Ar" ilike v_q || '%' or p."Name_En" ilike v_q || '%' then 500 else 0 end)
          + ts_rank(p.search_vector, v_tsq) * 10
          + 0.5 * similarity(coalesce(p."Name", ''), v_uq)
          + 0.4 * similarity(coalesce(p."Name_Ar", ''), v_uq)
          + 0.3 * similarity(coalesce(p."Name_En", ''), v_uq)
          + 0.2 * similarity(coalesce(p."Code", ''), v_uq)
          + 0.2 * similarity(coalesce(p."Barcode", ''), v_uq)
        )
      end)::real as rnk
    from public.products p
    where p.is_active = true
      and (p_category  is null or p."Category_Name" = p_category)
      and (not p_in_stock or p."Stock" > 0)
      and (p_min_price is null or p."Price" >= p_min_price)
      and (p_max_price is null or p."Price" <= p_max_price)
      and (
        v_q is null
        or p.search_vector @@ v_tsq
        or p."Name"     % v_uq
        or p."Name_Ar"  % v_uq
        or p."Name_En"  % v_uq
        or p."Code"     % v_uq
        or p."Barcode"  % v_uq
        or p."Name"     ilike '%' || v_q || '%'
        or p."Name_Ar"  ilike '%' || v_q || '%'
        or p."Name_En"  ilike '%' || v_q || '%'
        or p."Code"     ilike v_q || '%'
        or p."Barcode"  ilike v_q || '%'
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

-- ─── 5. featured / discounted helpers ──────────────────────────────────────
-- Tight, single-purpose helpers for the homepage. Featured = newest in-stock.
-- Discounted is a stub for when the schema grows a discount column; today it
-- delegates to featured to keep the contract stable.

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
  where p.is_active = true and p."Stock" > 0
  order by p.id desc
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
$$;

revoke all on function public.get_featured_products(int) from public;
grant execute on function public.get_featured_products(int) to anon, authenticated;
