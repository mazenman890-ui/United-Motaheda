/**
 * Recommendations query keys. Public, anonymous data — these keys are NOT
 * in the persister's SENSITIVE_PREFIXES list, so feeds survive cold starts.
 */

export const recommendationKeys = {
  all:        ["recommendations"] as const,
  related:    (productId: string, limit: number) =>
    ["recommendations", "related", productId, limit] as const,
  trending:   (category: string | null, limit: number) =>
    ["recommendations", "trending", category ?? "_all", limit] as const,
  recentlyViewed: () =>
    ["recommendations", "recently-viewed"] as const,
};
