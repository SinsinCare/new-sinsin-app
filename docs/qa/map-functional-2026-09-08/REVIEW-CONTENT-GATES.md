# Review text disclosure

- [x] C1: Short, exactly three-line, long and resized text choose the correct disclosure state.
  CHECK: npx jest --config jest.config.ts tests/restaurantReviewContent.test.ts --runInBand
  EXPECT: /Tests:.*passed/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=Time:        3.106 s | Ran all test suites matching /tests\/restaurantReviewContent.test.ts/i.
- [x] C2: Edited shared review content and consumers pass type/lint/format checks.
  CHECK: npx tsc --noEmit && npx eslint src/features/restaurant/components/detail/ReviewExpandableContent.tsx src/features/restaurant/components/detail/ReviewCard.tsx src/features/restaurant/views/ReviewerProfileScreen.tsx tests/restaurantReviewContent.test.ts && npx prettier --check src/features/restaurant/components/detail/ReviewExpandableContent.tsx src/features/restaurant/components/detail/ReviewCard.tsx src/features/restaurant/views/ReviewerProfileScreen.tsx tests/restaurantReviewContent.test.ts && git diff --check
  EXPECT: /All matched files use Prettier code style!/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=Checking formatting... | All matched files use Prettier code style!
- [x] C3: Native short reviews no longer show redundant more buttons; record long-text and profile verification limits.

  EVIDENCE: iPhone 17 Pro iOS 26.5 restaurant reviews tab: before change a fully visible one-line review exposed More; pressing it only removed the action. After Fast Refresh the four short reviews retained their full text and showed no More actions in screenshot or AX. Native long review wrapping, large text/orientation and reviewer-profile rendering remain unverified; conditional expansion and remeasurement passed synthetic native-layout event tests. No review was posted or changed.
