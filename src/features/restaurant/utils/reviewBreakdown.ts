import type { RestaurantReviewsResponse, ReviewBreakdown } from "../types"

/** Review facets describe the records users can browse, not an external site's totals. */
export function toReviewBreakdown(
  response: RestaurantReviewsResponse,
): ReviewBreakdown {
  return {
    avgRating: response.ratingBreakdown.average,
    totalCount: response.ratingBreakdown.reviewCount,
    ratedCount: response.ratingBreakdown.ratedCount,
    keywordCounts: response.keywordCounts,
    menuCounts: Object.entries(response.menuCounts)
      .filter((entry): entry is [string, number] => entry[1] !== undefined)
      .map(([menuName, count]) => ({ menuName, count }))
      .sort(
        (a, b) => b.count - a.count || a.menuName.localeCompare(b.menuName),
      ),
  }
}
