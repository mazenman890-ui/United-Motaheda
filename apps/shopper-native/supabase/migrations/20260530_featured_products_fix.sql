-- ============================================================================
-- Fix: get_featured_products — remove Stock > 0 guard
--
-- Root cause: the products table's "Stock" column is 0 for all CSV-imported
-- rows (actual inventory lives in inventory_state.total). The previous
-- implementation filtered coalesce("Stock", 0) > 0, which made every product
-- invisible on the home-screen featured rail.
--
-- Fix: return the newest active products with no stock requirement so the
-- home screen is never empty. The "in_stock" badge on each card already
-- reflects live inventory via a separate query.
-- ============================================================================

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
  order by p.id desc
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
$$;

revoke all on function public.get_featured_products(int) from public;
grant execute on function public.get_featured_products(int) to anon, authenticated;

notify pgrst, 'reload schema';
