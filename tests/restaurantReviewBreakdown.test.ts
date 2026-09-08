import { toReviewBreakdown } from "../src/features/restaurant/utils/reviewBreakdown"
import type { RestaurantReviewsResponse } from "../src/features/restaurant/types"
const response: RestaurantReviewsResponse = {
  restaurantId: 1,
  items: [],
  hasMore: false,
  nextCursor: null,
  totalCount: 461,
  avgRating: 4.8,
  ratingBreakdown: {
    reviewCount: 4,
    ratedCount: 3,
    average: 4.3,
    distribution: [0, 0, 0, 2, 1],
  },
  keywordCounts: { TASTE: 2 },
  menuCounts: { Soup: 1, Rice: 2 },
}
it("uses actual reviews and ratings rather than imported external counters", () => {
  expect(toReviewBreakdown(response)).toMatchObject({
    totalCount: 4,
    ratedCount: 3,
    avgRating: 4.3,
  })
  expect(response.totalCount).toBe(461)
  expect(response.avgRating).toBe(4.8)
})
it("does not invent stars for unrated reviews or fall back to external ratings", () => {
  expect(
    toReviewBreakdown({
      ...response,
      ratingBreakdown: {
        reviewCount: 2,
        ratedCount: 0,
        average: null,
        distribution: [0, 0, 0, 0, 0],
      },
    }),
  ).toMatchObject({ totalCount: 2, ratedCount: 0, avgRating: null })
})
it("retains global facets even on an empty filtered page", () => {
  const b = toReviewBreakdown({ ...response, items: [] })
  expect(b.totalCount).toBe(4)
  expect(b.keywordCounts).toEqual({ TASTE: 2 })
  expect(b.menuCounts).toEqual([
    { menuName: "Rice", count: 2 },
    { menuName: "Soup", count: 1 },
  ])
})
