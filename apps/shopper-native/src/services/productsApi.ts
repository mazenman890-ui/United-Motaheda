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

// ─── Arabic normalization for smart search ──────────────────────────────────

function normalizeArabic(text: string): string {
  return text
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۤۧۨ-ۭ]/g, "")
    .replace(/[إأآٱا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .trim();
}

const KEYWORD_ALIASES: Record<string, string[]> = {
  "بنادول":    ["باراسيتامول", "بانادول", "panadol", "paracetamol"],
  "بانادول":   ["باراسيتامول", "بنادول", "panadol"],
  "باراستمول": ["باراسيتامول"],
  "بروفين":    ["إيبوبروفين", "ايبوبروفين", "ibuprofen", "brufen"],
  "اسبرين":    ["أسبيرين", "aspirin"],
  "فيتامين سي": ["فيتامين C", "vitamin c"],
  "فيتامين ج": ["فيتامين C", "vitamin c"],
  "انتينال":   ["نيفوروكسازيد", "antinal"],
  "اوجمنتين":  ["أموكسيسيلين", "augmentin", "amoxicillin"],
  "فلاجيل":    ["ميترونيدازول", "flagyl", "metronidazole"],
  "فولتارين":  ["ديكلوفيناك", "voltaren", "diclofenac"],
  "كونجستال":  ["congestal"],
  "سيتال":     ["باراسيتامول", "cetal"],
  "كيتوفان":   ["كيتوبروفين", "ketofan"],
  "ستربسلز":   ["strepsils"],
  "ابيمول":    ["باراسيتامول", "abimol"],
  "أمريزول":   ["ميترونيدازول", "amrizole"],
  "حساسية":    ["مضاد حساسية", "antihistamine", "zyrtec", "كلاريتين"],
  "ضغط":       ["ضغط الدم", "blood pressure"],
  "سكر":       ["سكر الدم", "diabetes", "جلوكوز"],
  "كحة":       ["سعال", "cough"],
  "زكام":      ["برد", "cold", "انفلونزا"],
  "صداع":      ["مسكن", "pain", "باراسيتامول"],
  "معده":      ["معدة", "stomach", "أوميبرازول"],
  "مسكن":      ["مسكنات", "pain", "باراسيتامول", "إيبوبروفين"],
  "cream":     ["كريم"],
  "vitamin":   ["فيتامين"],
  "shampoo":   ["شامبو"],
  "soap":      ["صابون"],
  "baby":      ["أطفال", "طفل"],
};

function expandKeywords(query: string): string[] {
  const lower = query.toLowerCase();
  const normalized = normalizeArabic(lower);
  const variants: Set<string> = new Set([query]);

  for (const [key, aliases] of Object.entries(KEYWORD_ALIASES)) {
    const normKey = normalizeArabic(key);
    if (normalized.includes(normKey) || lower.includes(key)) {
      aliases.forEach((a) => variants.add(a));
    }
    for (const alias of aliases) {
      if (normalized.includes(normalizeArabic(alias)) || lower.includes(alias.toLowerCase())) {
        variants.add(key);
        aliases.forEach((a) => variants.add(a));
      }
    }
  }

  return Array.from(variants);
}

function buildSearchFilter(search: string): string {
  const terms = expandKeywords(search);
  const clauses: string[] = [];
  for (const term of terms) {
    const s = term.trim().replace(/[%_]/g, "\\$&");
    if (!s) continue;
    clauses.push(
      `Name_Ar.ilike.%${s}%`,
      `Name_En.ilike.%${s}%`,
      `Code.ilike.%${s}%`,
      `Barcode.ilike.%${s}%`,
      `Category_Name.ilike.%${s}%`,
      `Category_Name_En.ilike.%${s}%`,
    );
  }
  return clauses.join(",");
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
    const filter = buildSearchFilter(search.trim());
    if (filter) q = q.or(filter);
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

// Hardcoded seeds — always shown immediately, even when Supabase is offline.
// IDs match the Category_Name values in the products table.
const CATEGORY_SEEDS: NativeCategory[] = [
  { id: "الأدوية والعلاجات",     name: "الأدوية والعلاجات",     nameEn: "Medications",          count: 0 },
  { id: "الفيتامينات والمكملات",  name: "الفيتامينات والمكملات",  nameEn: "Vitamins & Supplements", count: 0 },
  { id: "العناية بالبشرة",        name: "العناية بالبشرة",        nameEn: "Skin Care",             count: 0 },
  { id: "العناية الشخصية",        name: "العناية الشخصية",        nameEn: "Personal Care",         count: 0 },
  { id: "الأم والطفل",            name: "الأم والطفل",            nameEn: "Baby & Mother Care",    count: 0 },
  { id: "العناية بالفم والأسنان", name: "العناية بالفم والأسنان", nameEn: "Oral Care",             count: 0 },
  { id: "الإسعافات والمستلزمات", name: "الإسعافات والمستلزمات", nameEn: "First Aid & Supplies",  count: 0 },
  { id: "الأجهزة الطبية",         name: "الأجهزة الطبية",         nameEn: "Medical Devices",       count: 0 },
  { id: "الصحة العامة",           name: "الصحة العامة",           nameEn: "General Healthcare",    count: 0 },
];

function isValidCategoryName(name: string): boolean {
  if (!name || name.trim().length < 2) return false;
  if (/�/.test(name)) return false;
  if (/^\?+$/.test(name)) return false;
  if (/^[\s\W\d]+$/.test(name)) return false;
  if (!/[؀-ۿa-zA-Z]/.test(name)) return false;
  return true;
}

export async function fetchCategories(): Promise<NativeCategory[]> {
  // Race the Supabase query against a 5 s deadline so a cold-start
  // never blocks the home screen. Seeds are always the fallback.
  const timeoutPromise = new Promise<NativeCategory[]>((resolve) =>
    setTimeout(() => resolve(CATEGORY_SEEDS), 5000),
  );

  const fetchPromise = (async (): Promise<NativeCategory[]> => {
    const { data, error } = await supabase
      .from("products")
      .select("Category_Name, Category_Name_En")
      .eq("is_active", true)
      .limit(2000);

    if (error || !data?.length) return CATEGORY_SEEDS;

    const map = new Map<string, NativeCategory>();
    for (const row of data as Array<{ Category_Name: string; Category_Name_En: string }>) {
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
    const result = Array.from(map.values()).sort((a, b) => b.count - a.count);
    return result.length > 0 ? result : CATEGORY_SEEDS;
  })();

  return Promise.race([fetchPromise, timeoutPromise]);
}

export interface CatalogStats {
  totalProducts: number;
  totalCategories: number;
  inStockCount: number;
}

export async function fetchCatalogStats(): Promise<CatalogStats> {
  const safe = <T>(p: Promise<T>, fallback: T): Promise<T> =>
    p.catch(() => fallback);

  const [totalRes, stockRes, catRes] = await Promise.all([
    safe(
      supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
      { count: 0, data: null, error: null },
    ),
    safe(
      supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true).gt("Stock", 0),
      { count: 0, data: null, error: null },
    ),
    safe(
      supabase.from("products").select("Category_Name").eq("is_active", true).limit(2000),
      { count: null, data: [], error: null },
    ),
  ]);

  const totalProducts = totalRes.count ?? 0;
  const inStockCount = stockRes.count ?? 0;

  let totalCategories = 0;
  if (catRes.data?.length) {
    const unique = new Set<string>();
    for (const row of catRes.data as Array<{ Category_Name: string }>) {
      const name = (row.Category_Name ?? "").trim();
      if (name.length >= 2) unique.add(name);
    }
    totalCategories = unique.size;
  }

  if (totalProducts === 0 && totalCategories === 0) {
    throw new Error("stats unavailable");
  }

  return { totalProducts, totalCategories, inStockCount };
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
