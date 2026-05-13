import type {
  CartSnapshot,
  Coordinates,
  LanguageCode,
  PharmacyAssignment,
  PharmacyBranch,
  SearchEnvelope,
  SearchResultItem,
  SearchSuggestion,
} from "@pharmacy/types";
import { fuzzyMatch, type FuzzySearchableFields } from "@pharmacy/fuzzy-search";
import {
  apiResponseSchema,
  BranchSchema,
  DeliveryStatusSchema,
  type Branch,
  type DeliveryStatus,
} from "@pharmacy/contracts";

type SearchCatalogInput = {
  query: string;
  lang: LanguageCode;
  products: SearchResultItem[];
  signal?: AbortSignal;
};

type ResolveLocationInput = {
  coordinates: Coordinates;
  cart: CartSnapshot;
  label?: string;
};

type QuoteCheckoutInput = {
  coordinates: Coordinates;
  cart: CartSnapshot;
  label?: string;
  requestedBranchId?: string;
};

type ApiClientConfig = {
  baseUrl?: string;
  searchApiBase?: string;
  defaultDeliveryFee?: number;
  branches?: PharmacyBranch[];
};

type ApiClient = {
  searchCatalog(input: SearchCatalogInput): Promise<SearchEnvelope>;
  resolveLocation(input: ResolveLocationInput): Promise<PharmacyAssignment>;
  quoteCheckout(input: QuoteCheckoutInput): Promise<DeliveryStatus>;
  listBranches(): Promise<Branch[]>;
};

const defaultConfig: Required<Pick<ApiClientConfig, "defaultDeliveryFee" | "branches">> = {
  defaultDeliveryFee: 10,
  branches: [],
};

let apiClientConfig: ApiClientConfig = { ...defaultConfig };

export function configureApiClient(config: ApiClientConfig) {
  apiClientConfig = {
    ...apiClientConfig,
    ...config,
    branches: config.branches ?? apiClientConfig.branches ?? defaultConfig.branches,
  };
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

function buildUrl(path: string) {
  const baseUrl = apiClientConfig.baseUrl?.replace(/\/+$/, "");
  if (!baseUrl) return null;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

async function fetchWrapped<T>(
  path: string,
  init: RequestInit,
  dataSchema: import("zod").ZodType<T>,
): Promise<T> {
  const url = buildUrl(path);
  if (!url) {
    throw new ApiClientError(
      "NO_BASE_URL",
      "API baseUrl is not configured for @pharmacy/api-client.",
    );
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const json = (await response.json()) as unknown;
  const parsed = apiResponseSchema(dataSchema).safeParse(json);

  if (!parsed.success) {
    throw new ApiClientError("INVALID_RESPONSE", "Invalid API response shape.", {
      issues: parsed.error.issues,
    });
  }

  if (!parsed.data.success) {
    throw new ApiClientError(parsed.data.error.code, parsed.data.error.message, parsed.data.error.details);
  }

  return parsed.data.data;
}

function normalize(value: string | undefined | null) {
  return String(value ?? "").trim().toLowerCase();
}

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const token = key(item);
    if (seen.has(token)) {
      return false;
    }
    seen.add(token);
    return true;
  });
}

function buildVariation(value: string) {
  const trimmed = value.trim();
  return trimmed ? [{ type: trimmed }] : [];
}

function mapSuggestion(product: SearchResultItem): SearchSuggestion {
  return {
    productId: product.id,
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    variations: buildVariation(product.categoryName),
  };
}

function queryMatch(product: SearchResultItem, needle: string) {
  const fields: FuzzySearchableFields = {
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    category: product.categoryName || product.categoryNameEn || product.category,
    code: product.code,
    barcode: product.barcode,
  };
  return fuzzyMatch(needle, fields);
}

function mapFacet(products: SearchResultItem[]) {
  const counts = new Map<string, number>();

  for (const product of products) {
    counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([id, count]) => ({
    id,
    label: products.find((product) => product.category === id)?.categoryNameEn
      || products.find((product) => product.category === id)?.categoryName
      || id,
    count,
  }));
}

function buildCollections(query: string, products: SearchResultItem[]) {
  if (!query.trim()) {
    return [];
  }

  return [
    {
      id: "query-match",
      title: `Query match: ${query.trim()}`,
      strategy: "query_match" as const,
      productIds: products.slice(0, 12).map((product) => product.id),
    },
  ];
}

function buildSearchEnvelope(query: string, products: SearchResultItem[]): SearchEnvelope {
  const normalizedQuery = normalize(query);
  const results = normalizedQuery
    ? uniqueBy(
        products.filter((product) => queryMatch(product, normalizedQuery)),
        (product) => product.id,
      )
    : products;

  return {
    query,
    suggestions: results.slice(0, 8).map(mapSuggestion),
    results,
    collections: buildCollections(query, results),
    facets: mapFacet(results),
    updatedAt: new Date().toISOString(),
  };
}

function haversineDistanceKm(start: Coordinates, end: Coordinates) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRad(end.lat - start.lat);
  const deltaLng = toRad(end.lng - start.lng);
  const a =
    Math.sin(deltaLat / 2) ** 2
    + Math.cos(toRad(start.lat))
      * Math.cos(toRad(end.lat))
      * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function buildEtaBand(distanceKm: number, loadFactor = 1) {
  const distanceMinutes = Math.max(10, Math.round(distanceKm * 7));
  const weighted = Math.round(distanceMinutes * Math.max(loadFactor, 1));
  return {
    minMinutes: weighted,
    maxMinutes: weighted + 15,
  };
}

function createToken(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

const client: ApiClient = {
  async searchCatalog({ query, products }) {
    return buildSearchEnvelope(query, products);
  },

  async listBranches() {
    // Prefer backend source of truth when configured.
    if (apiClientConfig.baseUrl) {
      return fetchWrapped("/branches", { method: "GET" }, BranchSchema.array());
    }

    // Fallback to locally configured branches (legacy).
    const branches = apiClientConfig.branches ?? defaultConfig.branches;
    return branches.map(
      (branch): Branch => ({
        id: branch.id,
        nameAr: branch.nameAr,
        nameEn: branch.nameEn,
        governorate: "Cairo",
        area: "Cairo",
        lat: branch.lat,
        lng: branch.lng,
        isActive: true,
      }),
    );
  },

  async resolveLocation({ coordinates }) {
    const branches = apiClientConfig.branches ?? defaultConfig.branches;

    if (!branches.length) {
      throw new Error("No pharmacy branches are configured for assignment.");
    }

    const nearest = [...branches]
      .map((branch) => ({
        branch,
        distanceKm: haversineDistanceKm(coordinates, {
          lat: branch.lat,
          lng: branch.lng,
        }),
      }))
      .sort((left, right) => left.distanceKm - right.distanceKm)[0];

    return {
      pharmacyId: nearest.branch.id,
      pharmacyName: nearest.branch.nameEn,
      distanceKm: Number(nearest.distanceKm.toFixed(2)),
      etaBand: buildEtaBand(nearest.distanceKm, nearest.branch.loadFactor),
      assignmentToken: createToken("assign"),
      reason: "nearest_available",
    };
  },

  async quoteCheckout(input) {
    // Prefer backend quote engine when configured.
    if (apiClientConfig.baseUrl) {
      return fetchWrapped(
        "/delivery/quote",
        {
          method: "POST",
          body: JSON.stringify({
            coordinates: input.coordinates,
            cart: input.cart,
            requestedBranchId: input.requestedBranchId,
          }),
        },
        DeliveryStatusSchema,
      );
    }

    // Fallback: legacy (local) estimate to keep the UI functioning in dev.
    const assignment = await client.resolveLocation(input);
    const updatedAt = new Date().toISOString();
    const branches = apiClientConfig.branches ?? defaultConfig.branches;
    const matchedBranch = branches.find((branch) => branch.id === assignment.pharmacyId);

    return {
      isDeliverable: true,
      cost: apiClientConfig.defaultDeliveryFee ?? defaultConfig.defaultDeliveryFee,
      currency: "EGP",
      eta: assignment.etaBand,
      distanceKm: assignment.distanceKm,
      assignmentToken: assignment.assignmentToken,
      quoteToken: createToken("quote"),
      branch: {
        id: assignment.pharmacyId,
        nameAr: assignment.pharmacyName,
        nameEn: assignment.pharmacyName,
        governorate: "Cairo",
        area: "Cairo",
        lat: matchedBranch?.lat ?? input.coordinates.lat,
        lng: matchedBranch?.lng ?? input.coordinates.lng,
        isActive: true,
      },
      zoneId: null,
      reasonCode: "OK",
      updatedAt,
    };
  },
};

export function getApiClient() {
  return client;
}
