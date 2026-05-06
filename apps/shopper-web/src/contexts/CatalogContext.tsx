import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deriveCatalogCategories,
  buildSpotlightProducts,
  type CatalogCategory,
  type CatalogProduct,
} from "../app/catalog";
import {
  fetchShopperCatalogSnapshot,
  getCachedShopperCatalogSnapshot,
} from "../services/shopperCatalogApi";

type CatalogMetrics = {
  totalProducts: number;
  totalCategories: number;
  inStockProducts: number;
  barcodedProducts: number;
  lowStockProducts: number;
};

/**
 * Lightweight descriptor used by `rankAlternativeProducts`.
 * Precomputed once in the context so ProductDetails never re-maps 52K items.
 */
export type ProductRecommendationDescriptor = {
  id:             string;
  code:           string;
  barcode:        string;
  nameAr:         string;
  nameEn:         string;
  category:       string;
  categoryName:   string;
  categoryNameEn: string;
  price:          number;
  stock:          number;
  inStock:        boolean;
  imageUrl:       string;
};

type CatalogContextType = {
  products: CatalogProduct[];
  categories: CatalogCategory[];
  productsById: Record<string, CatalogProduct>;
  categoriesById: Record<string, CatalogCategory>;
  featuredProducts: CatalogProduct[];
  inStockProducts: CatalogProduct[];
  metrics: CatalogMetrics;
  lastUpdated: string | null;
  isLoading: boolean;
  error: string | null;
  /**
   * Precomputed search index for categories.
   * Keys: category ID. Values: lowercased searchable string (all name variants).
   * Built once when categories change — consumers do a single `.includes()` call.
   */
  categorySearchIndex: Record<string, string>;
  /**
   * Pool of recommendation descriptors for the full catalog.
   * Passed directly to `rankAlternativeProducts` in ProductDetails — eliminates
   * the 52K `products.map(...)` that previously ran on every product page open.
   */
  alternativeProductPool: ProductRecommendationDescriptor[];
  refreshCatalog: (forceRefresh?: boolean) => Promise<void>;
  upsertProduct: (product: CatalogProduct) => void;
  removeProduct: (identifier: string) => void;
};

const initialSnapshot = getCachedShopperCatalogSnapshot();

const CatalogContext = createContext<CatalogContextType>({
  products: initialSnapshot?.products ?? [],
  categories: initialSnapshot?.categories ?? [],
  productsById: {},
  categoriesById: {},
  featuredProducts: [],
  inStockProducts: [],
  metrics: {
    totalProducts: initialSnapshot?.products.length ?? 0,
    totalCategories: initialSnapshot?.categories.length ?? 0,
    inStockProducts: initialSnapshot?.products.filter((product) => product.inStock).length ?? 0,
    barcodedProducts: initialSnapshot?.products.filter((product) => Boolean(product.barcode)).length ?? 0,
    lowStockProducts: initialSnapshot?.products.filter((product) => product.inStock && product.stock <= 5).length ?? 0,
  },
  lastUpdated: initialSnapshot?.lastUpdated ?? null,
  isLoading: !initialSnapshot,
  error: null,
  categorySearchIndex: {},
  alternativeProductPool: [],
  refreshCatalog: async () => {},
  upsertProduct: () => {},
  removeProduct: () => {},
});

export function CatalogProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [products, setProducts] = useState<CatalogProduct[]>(initialSnapshot?.products ?? []);
  const [lastUpdated, setLastUpdated] = useState<string | null>(initialSnapshot?.lastUpdated ?? null);
  const [isLoading, setIsLoading] = useState(!initialSnapshot);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(
    () => deriveCatalogCategories(products, initialSnapshot?.categories ?? []),
    [products],
  );

  const refreshCatalog = async (forceRefresh = false) => {
    setIsLoading(true);

    try {
      const snapshot = await fetchShopperCatalogSnapshot(forceRefresh);

      startTransition(() => {
        setProducts(snapshot.products);
        setLastUpdated(snapshot.lastUpdated);
        setError(null);
        setIsLoading(false);
      });

      queryClient.setQueryData(["shopper-catalog"], snapshot);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load catalog");
      setIsLoading(false);
    }
  };

  const catalogQuery = useQuery({
    queryKey: ["shopper-catalog"],
    queryFn: () => fetchShopperCatalogSnapshot(false),
    initialData: initialSnapshot ?? undefined,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    if (!catalogQuery.data) {
      return;
    }

    startTransition(() => {
      setProducts(catalogQuery.data.products);
      setLastUpdated(catalogQuery.data.lastUpdated);
      setError(null);
      setIsLoading(false);
    });
  }, [catalogQuery.data]);

  useEffect(() => {
    if (!catalogQuery.error) {
      return;
    }

    setError(catalogQuery.error instanceof Error ? catalogQuery.error.message : "Failed to load catalog");
    setIsLoading(false);
  }, [catalogQuery.error]);

  useEffect(() => {
    setIsLoading(catalogQuery.isFetching && products.length === 0);
  }, [catalogQuery.isFetching, products.length]);

  const upsertProduct = (product: CatalogProduct) => {
    startTransition(() => {
      setProducts((current) => {
        const existingIndex = current.findIndex((item) => item.id === product.id || item.code === product.code);

        if (existingIndex === -1) {
          return [product, ...current];
        }

        return current.map((item, index) => (index === existingIndex ? product : item));
      });
      setLastUpdated(new Date().toISOString());
    });
  };

  const removeProduct = (identifier: string) => {
    startTransition(() => {
      setProducts((current) => current.filter((item) => item.id !== identifier && item.code !== identifier));
      setLastUpdated(new Date().toISOString());
    });
  };

  const productsById = useMemo(
    () =>
      products.reduce<Record<string, CatalogProduct>>((accumulator, product) => {
        accumulator[product.id] = product;
        return accumulator;
      }, {}),
    [products],
  );

  const categoriesById = useMemo(
    () =>
      categories.reduce<Record<string, CatalogCategory>>((accumulator, category) => {
        accumulator[category.id] = category;
        return accumulator;
      }, {}),
    [categories],
  );

  const inStockProducts = useMemo(() => products.filter((product) => product.inStock), [products]);
  const featuredProducts = useMemo(() => buildSpotlightProducts(products, categories, 180), [categories, products]);

  const categorySearchIndex = useMemo<Record<string, string>>(
    () =>
      categories.reduce<Record<string, string>>((accumulator, category) => {
        accumulator[category.id] = `${category.name} ${category.nameEn}`.trim().toLowerCase();
        return accumulator;
      }, {}),
    [categories],
  );

  const alternativeProductPool = useMemo<ProductRecommendationDescriptor[]>(
    () =>
      products.map((product) => ({
        id: product.id,
        code: product.code,
        barcode: product.barcode,
        nameAr: product.nameAr,
        nameEn: product.nameEn,
        category: product.category,
        categoryName: product.categoryName,
        categoryNameEn: product.categoryNameEn,
        price: product.price,
        stock: product.stock,
        inStock: product.inStock,
        imageUrl: product.imageUrl,
      })),
    [products],
  );

  const metrics = useMemo<CatalogMetrics>(
    () => ({
      totalProducts: products.length,
      totalCategories: categories.length,
      inStockProducts: inStockProducts.length,
      barcodedProducts: products.filter((product) => Boolean(product.barcode)).length,
      lowStockProducts: inStockProducts.filter((product) => product.stock <= 5).length,
    }),
    [categories.length, inStockProducts, products],
  );

  return (
    <CatalogContext.Provider
      value={{
        products,
        categories,
        productsById,
        categoriesById,
        featuredProducts,
        inStockProducts,
        metrics,
        lastUpdated,
        isLoading,
        error,
        categorySearchIndex,
        alternativeProductPool,
        refreshCatalog,
        upsertProduct,
        removeProduct,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  return useContext(CatalogContext);
}
