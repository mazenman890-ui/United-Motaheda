/**
 * useAlternativeProducts.ts
 *
 * Offloads rankAlternativeProducts to a dedicated worker.
 * The main thread sends only a ~200-byte product descriptor.
 * The worker owns the 52K catalog in its own memory.
 * Returns resolved CatalogProduct[] once the worker responds.
 */

import { useEffect, useRef, useState } from "react";
import type { CatalogProduct } from "../catalog";

interface WorkerResponse {
  rankedIds: string[];
  requestId: number;
  error?: string;
}

// ─── Worker + catalog reference singleton ─────────────────────────────────────

let _worker: Worker | null = null;
let _lastInitProducts: CatalogProduct[] | null = null;

function getAlternativesWorker(): Worker {
  if (!_worker) {
    _worker = new Worker(
      new URL("../../workers/alternativesSearch.worker.ts", import.meta.url),
      { type: "module" },
    );
    _lastInitProducts = null;
  }
  return _worker;
}

function ensureInit(products: CatalogProduct[]) {
  if (products === _lastInitProducts) return; // same reference → already loaded
  const worker = getAlternativesWorker();
  // Worker maps the objects itself; we only pay structuredClone once ever
  worker.postMessage({ type: "INIT", products });
  _lastInitProducts = products;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAlternativeProducts(
  product: CatalogProduct | undefined,
  products: CatalogProduct[],
  productsById: Record<string, CatalogProduct>,
  maxResults = 12,
): { alternatives: CatalogProduct[]; isLoading: boolean } {
  const requestIdRef = useRef(0);
  const [alternatives, setAlternatives] = useState<CatalogProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!product || products.length === 0) {
      setAlternatives([]);
      setIsLoading(false);
      return;
    }

    // Ensure the worker has the catalog — skips if reference unchanged
    ensureInit(products);

    const requestId = ++requestIdRef.current;
    setIsLoading(true);

    const worker = getAlternativesWorker();

    const handleMessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.requestId !== requestId) return;
      const resolved = event.data.rankedIds
        .map((id) => productsById[id])
        .filter(Boolean)
        .slice(0, maxResults) as CatalogProduct[];
      setAlternatives(resolved);
      setIsLoading(false);
    };

    const handleError = () => {
      if (requestId !== requestIdRef.current) return;
      setIsLoading(false);
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);

    // Send only a tiny plain descriptor — not the full CatalogProduct object
    worker.postMessage({
      type: "RANK",
      requestId,
      product: {
        id: product.id,
        code: product.code,
        barcode: product.barcode,
        nameAr: product.nameAr ?? product.name,
        nameEn: product.nameEn ?? product.name,
        category: product.category,
        categoryName: product.categoryName,
        categoryNameEn: product.categoryNameEn,
        price: product.price,
        stock: product.stock,
        inStock: product.inStock,
        imageUrl: product.imageUrl,
      },
    });

    return () => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
    };
  }, [product?.id, products, productsById, maxResults]);

  return { alternatives, isLoading };
}