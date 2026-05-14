import { supabase } from "@/lib/supabase";

export interface NativeProduct {
  id:              string;
  code:            string;
  barcode:         string;
  name:            string;
  nameAr?:         string;
  nameEn?:         string;
  price:           number;
  stock:           number;
  inStock:         boolean;
  category:        string;
  categoryName:    string;
  categoryNameEn:  string;
  imageUrl?:       string;
}

export interface NativeCategory {
  id:      string;
  name:    string;
  nameEn:  string;
  count:   number;
}

export interface ProductFilters {
  search?:     string;
  categoryId?: string;
  inStock?:    boolean;
  minPrice?:   number;
  maxPrice?:   number;
  sortBy?:     "price_asc" | "price_desc" | "name_asc" | "newest";
  page?:       number;
  pageSize?:   number;
}

export interface PageResult {
  products:    NativeProduct[];
  totalCount:  number;
  hasNextPage: boolean;
  currentPage: number;
}

const PAGE_SIZE = 24;

function normalize(row: Record<string, unknown>): NativeProduct {
  return {
    id:             String(row.id ?? ""),
    code:           String(row.Code ?? ""),
    barcode:        String(row.Barcode ?? ""),
    name:           String(row.Name_Ar ?? row.Name_En ?? ""),
    nameAr:         row.Name_Ar as string | undefined,
    nameEn:         row.Name_En as string | undefined,
    price:          Number(row.Price ?? 0),
    stock:          Number(row.Stock ?? 0),
    inStock:        Boolean(row.is_active) && Number(row.Stock ?? 0) > 0,
    category:       String(row.Category_Name ?? ""),
    categoryName:   String(row.Category_Name ?? ""),
    categoryNameEn: String(row.Category_Name_En ?? ""),
    imageUrl:       row.image_url as string | undefined,
  };
}

export async function fetchProducts(filters: ProductFilters = {}): Promise<PageResult> {
  const { search, categoryId, inStock, minPrice, maxPrice, sortBy, page = 1, pageSize = PAGE_SIZE } = filters;
  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  let q = supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("is_active", true)
    .range(from, to);

  if (categoryId)         q = q.eq("Category_Name", categoryId);
  if (inStock === true)   q = q.gt("Stock", 0);
  if (minPrice !== undefined) q = q.gte("Price", minPrice);
  if (maxPrice !== undefined) q = q.lte("Price", maxPrice);

  if (search?.trim()) {
    const s = search.trim().replace(/[%_]/g, "\\$&");
    q = q.or(`Name_Ar.ilike.%${s}%,Name_En.ilike.%${s}%,Code.ilike.%${s}%`);
  }

  switch (sortBy) {
    case "price_asc":  q = q.order("Price", { ascending: true });  break;
    case "price_desc": q = q.order("Price", { ascending: false }); break;
    case "name_asc":   q = q.order("Name_Ar", { ascending: true }); break;
    default:           q = q.order("id", { ascending: false });
  }

  const { data, count, error } = await q;
  if (error) throw error;

  const totalCount = count ?? 0;
  return {
    products:    (data ?? []).map(normalize),
    totalCount,
    hasNextPage: to < totalCount - 1,
    currentPage: page,
  };
}

export async function fetchProductById(id: string): Promise<NativeProduct | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return normalize(data as Record<string, unknown>);
}

function isValidCategoryName(name: string): boolean {
  if (!name || name.trim().length < 2) return false;
  if (/�/.test(name)) return false;
  if (/^\?+$/.test(name)) return false;
  if (/^[\s\W\d]+$/.test(name)) return false;
  if (!/[؀-ۿa-zA-Z]/.test(name)) return false;
  return true;
}

export async function fetchCategories(): Promise<NativeCategory[]> {
  const { data, error } = await supabase
    .from("products")
    .select("Category_Name, Category_Name_En")
    .eq("is_active", true);
  if (error) return [];

  const map = new Map<string, NativeCategory>();
  for (const row of (data ?? []) as Array<{ Category_Name: string; Category_Name_En: string }>) {
    const rawName = (row.Category_Name ?? "").trim();
    if (!isValidCategoryName(rawName)) continue;
    const existing = map.get(rawName);
    if (existing) {
      existing.count++;
    } else {
      const nameEn = (row.Category_Name_En ?? "").trim() || rawName;
      map.set(rawName, { id: rawName, name: rawName, nameEn, count: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export async function fetchFeaturedProducts(limit = 8): Promise<NativeProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .gt("Stock", 0)
    .order("id", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(normalize);
}
