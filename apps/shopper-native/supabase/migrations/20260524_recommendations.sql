-- ============================================================================
-- Recommendations — additive RPCs.
--
-- Two starting feeds:
--   * get_related_products(p_product_id, p_limit) — same-category recommendations
--     excluding the seed product. Orders by stock-then-id-desc so newer in-stock
--     items rise; older or out-of-stock ones sink without being filtered out.
--   * get_trending_products(p_category, p_limit) — newest in-stock items
--     globally or scoped to a category. Cheap, cache-friendly.
--
-- Both return the same row shape as get_featured_products so the existing
-- normaliseSearchRow path on the client is reused.
--
-- When a ranker (CTR-based, embedding-based, ML scoring) is added later, it
-- becomes a third RPC that returns the same shape; consumers swap by changing
-- the hook name, not the data layer.
-- ============================================================================

create or replace function public.get_related_products(
  p_product_id text,
  p_limit      int default 12
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
  image_url         text
)
language sql
stable
security invoker
set search_path = public
as $$
  with seed as (
    select "Category_Name" as cat
    from public.products
    where id::text = p_product_id
  )
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
  from public.products p, seed
  where p.is_active = true
    and p."Category_Name" = seed.cat
    and p.id::text <> p_product_id
  -- in-stock items first, then newest
  order by (p."Stock" > 0) desc, p.id desc
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
$$;

revoke all on function public.get_related_products(text, int) from public;
grant execute on function public.get_related_products(text, int) to anon, authenticated;

create or replace function public.get_trending_products(
  p_category text default null,
  p_limit    int  default 12
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
  image_url         text
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
  where p.is_active = true
    and p."Stock" > 0
    and (p_category is null or p."Category_Name" = p_category)
  order by p.id desc
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
$$;

revoke all on function public.get_trending_products(text, int) from public;
grant execute on function public.get_trending_products(text, int) to anon, authenticated;
