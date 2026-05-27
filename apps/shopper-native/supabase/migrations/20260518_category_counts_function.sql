-- ============================================================================
-- get_category_counts() — server-side aggregate to replace client-side counting.
--
-- Before: shopper-native pulled up to 2000 rows from products on every home
-- screen mount, then counted categories client-side. With 52K products this
-- (a) was incomplete — categories outside the 2000-row sample showed count 0,
-- making most of them look empty, and (b) caused the home-screen lag the user
-- reported.
--
-- After: a single RPC returns one row per non-empty category with exact
-- product_count and in_stock_count. ~30 rows × ~100 bytes vs 2000 rows × ~200.
--
-- Function is `stable` (deterministic for a given snapshot) and
-- `security invoker` (respects caller's RLS context). Granted to anon +
-- authenticated so the home screen works pre-login.
-- ============================================================================

create or replace function public.get_category_counts()
returns table (
  category_name      text,
  category_name_en   text,
  product_count      integer,
  in_stock_count     integer
)
language sql
stable
security invoker
as $$
  select
    p."Category_Name"                                                  as category_name,
    coalesce(max(nullif(trim(p."Category_Name_En"), '')), p."Category_Name") as category_name_en,
    count(*)::int                                                      as product_count,
    count(*) filter (where p."Stock" > 0)::int                         as in_stock_count
  from public.products p
  where p.is_active = true
    and p."Category_Name" is not null
    and length(trim(p."Category_Name")) >= 2
  group by p."Category_Name"
  order by count(*) desc;
$$;

grant execute on function public.get_category_counts() to anon, authenticated;
