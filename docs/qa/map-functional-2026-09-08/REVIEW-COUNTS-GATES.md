# Review aggregate provenance

- [x] N1: Review projection separates visible reviews from external totals and unrated entries.
  CHECK: npx jest --config jest.config.ts tests/restaurantReviewBreakdown.test.ts --runInBand
  EXPECT: /Tests:.*passed/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=Time:        1.19 s | Ran all test suites matching /tests\/restaurantReviewBreakdown.test.ts/i.
- [x] N2: Type/lint/format checks pass.
  CHECK: npx tsc --noEmit && npx eslint src/features/restaurant/utils/reviewBreakdown.ts src/features/restaurant/hooks/useRestaurantReviews.ts src/features/restaurant/components/detail/RatingBreakdown.tsx tests/restaurantReviewBreakdown.test.ts && npx prettier --check src/features/restaurant/utils/reviewBreakdown.ts src/features/restaurant/hooks/useRestaurantReviews.ts src/features/restaurant/components/detail/RatingBreakdown.tsx src/features/restaurant/types/index.ts tests/restaurantReviewBreakdown.test.ts && git diff --check
  EXPECT: /All matched files use Prettier code style!/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=Checking formatting... | All matched files use Prettier code style!
- [x] N3: Simulator review filters and rating summary use the live aggregate, while external header values remain unchanged.

  EVIDENCE: iPhone 17 Pro iOS 26.5 local runtime: restaurant detail header remains external 4.8 / 461. Home review section now reports 4 reviews; review tab displays 4.5, 4 rated reviews, and both All chips show 4. Existing four rendered ratings are 5/4/4/5, consistent with the server live aggregate. Backend getReviewPage already supplies ratingBreakdown.reviewCount/ratedCount/average; frontend previously discarded them. No database rows or backend implementation changed. Unrated and empty filtered cases verified by projection tests, not native fixtures.
