# 지도 지역 이동과 조회 확정

OWNS: src/features/restaurant/views/RestaurantMapScreen.tsx, src/features/restaurant/hooks/useRegionFilterTransition.ts, src/features/restaurant/hooks/useRestaurantFilters.ts, src/features/restaurant/map/mapHtml.ts, src/features/restaurant/components/MapEmptyState.tsx, src/features/restaurant/components/RestaurantListSheet.tsx, tests/restaurantRegionFilterTransition.test.ts, tests/restaurantFilterState.test.ts, docs/qa/map-functional-2026-09-08/TRANSITION-GATES.md, docs/qa/map-functional-2026-09-08/TRANSITION-REVIEW.md

Previous goal turn: progress. Search destinations/deletion and AI region movement were changed and verified. This pass addresses the remaining intermediate region/bbox mismatch without narrowing the full multi-page goal.

- [x] T1: An in-progress region change keeps old query filters until an accepted new viewport is committed; stale idle, rapid reselection, manual interruption and failure are handled.
  CHECK: npx jest --config jest.config.ts tests/restaurantRegionFilterTransition.test.ts tests/restaurantMapHtml.test.ts tests/restaurantViewportAction.test.ts tests/restaurantFilterState.test.ts tests/restaurantRegionFilterNavigation.test.ts tests/restaurantSearchRecent.test.ts --runInBand
  EXPECT: /Tests:.*passed/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=Time:        1.207 s, estimated 2 s | Ran all test suites matching /tests\/restaurantRegionFilterTransition.test.ts|tests\/restaurantMapHtml.test.ts|tests\/restaurantViewportAction.test.ts|tests\/restaurantFilterState.test.ts|tests\/restaur
- [x] T2: TypeScript, scoped lint and formatting pass for changed paths.
  CHECK: npx tsc --noEmit --pretty false && npx eslint src/features/restaurant/hooks/useRegionFilterTransition.ts src/features/restaurant/hooks/useRestaurantFilters.ts src/features/restaurant/views/RestaurantMapScreen.tsx src/features/restaurant/map/mapHtml.ts src/features/restaurant/components/MapEmptyState.tsx src/features/restaurant/components/RestaurantListSheet.tsx tests/restaurantRegionFilterTransition.test.ts tests/restaurantFilterState.test.ts && npx prettier --check src/features/restaurant/hooks/useRegionFilterTransition.ts src/features/restaurant/hooks/useRestaurantFilters.ts src/features/restaurant/views/RestaurantMapScreen.tsx src/features/restaurant/map/mapHtml.ts src/features/restaurant/components/MapEmptyState.tsx src/features/restaurant/components/RestaurantListSheet.tsx tests/restaurantRegionFilterTransition.test.ts tests/restaurantFilterState.test.ts
  EXPECT: /All matched files use Prettier code style!/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=Checking formatting... | All matched files use Prettier code style!
- [x] T3: Simulator proves different-region, same-center and empty-result recovery flows complete without a stuck loading state.
  EVIDENCE: iPhone 17 Pro / iOS 26.5 CUA: manual Seocho (4), Gangnam with Korean preserved (161), repeat Gangnam (161), Jeju (0), reset, widen, Gangnam (334), AI Seocho Korean (4). Final states had no pending label. Details in TRANSITION-REVIEW.md.
- [x] T5: A searched region replaces old region selections while preserving other confirmed filters; cancelled draft edits do not return.
  EVIDENCE: native Seocho + Korean -> recent Gangnam removed region chip and retained Korean; hook regression verifies all other confirmed fields and discarded draft isolation. TRANSITION-REVIEW.md distinguishes native and synthetic coverage.
- [x] T4: Evidence and remaining verification scope are recorded.
  EVIDENCE: TRANSITION-REVIEW.md records runtime, reproduction, changed behavior, final flows, checks and unverified environments. Whole-app goal remains active.

- [x] T6: The empty map result recovery CTA is fully visible and works at the middle detent.
  EVIDENCE: CUA screenshots before/after on iPhone 17 Pro; standard text sizes retained, decorative icon omitted only in sheet empty state; visible widen action changed Jeju map scale, then region search recovered 334 results. Smaller devices and large text are not claimed.
