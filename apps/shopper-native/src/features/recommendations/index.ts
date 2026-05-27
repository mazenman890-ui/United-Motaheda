/**
 * Recommendations — public barrel.
 *
 * Pluggable feed surface. Today: related (by category) + trending (by
 * recency). When ML ranking lands, add a new hook (e.g. useRankedFeed)
 * with the same NativeProduct[] return type; consumers swap by name.
 */

export {
  fetchRelatedProducts,
  fetchTrendingProducts,
} from "./api/recommendationsApi";
export { recommendationKeys } from "./api/queryKeys";

export { useRelatedProducts }       from "./hooks/useRelatedProducts";
export { useTrendingProducts }      from "./hooks/useTrendingProducts";
export { useRecentlyViewedFeed }    from "./hooks/useRecentlyViewedFeed";
