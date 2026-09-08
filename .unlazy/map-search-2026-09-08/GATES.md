# Gates: restaurant search intent and suggestion freshness

OWNS: src/features/restaurant/views/RestaurantSearchScreen.tsx, src/features/restaurant/hooks/useRecentSearches.ts, src/features/restaurant/hooks/useSearchSuggest.ts, src/features/restaurant/utils/restaurantSearchRecent.ts, tests/restaurantSearchRecent.test.ts, docs/qa/map-functional-2026-09-08/SEARCH-GATES.md

Scope: Preserve region and restaurant destinations when replaying recent searches, retain legacy string history, and prevent selection of suggestions belonging to a previous input. Simulator verification belongs to the parent map task.

- [x] G1: Recent history round trips preserve destination semantics; legacy and invalid persisted data are handled; the live suggestion hook never exposes a previous input's options.
  CHECK: npx jest --config jest.config.ts tests/restaurantSearchRecent.test.ts --runInBand
  EXPECT: /Tests:.*passed/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=Time:        0.732 s, estimated 1 s | Ran all test suites matching /tests\/restaurantSearchRecent.test.ts/i.

- [x] G2: Owned TypeScript files pass scoped lint and formatting validation.
  CHECK: npx eslint src/features/restaurant/views/RestaurantSearchScreen.tsx src/features/restaurant/hooks/useRecentSearches.ts src/features/restaurant/hooks/useSearchSuggest.ts src/features/restaurant/utils/restaurantSearchRecent.ts tests/restaurantSearchRecent.test.ts && npx prettier --check src/features/restaurant/views/RestaurantSearchScreen.tsx src/features/restaurant/hooks/useRecentSearches.ts src/features/restaurant/hooks/useSearchSuggest.ts src/features/restaurant/utils/restaurantSearchRecent.ts tests/restaurantSearchRecent.test.ts
  EXPECT: All matched files use Prettier code style!
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=Checking formatting... | All matched files use Prettier code style!

- [x] G3: Review confirms existing data compatibility and no changes outside the assigned search paths; parent receives precise Simulator replay steps and verification limits.
  EVIDENCE: Re-read the screen callbacks, migration/parser, storage lifecycle and debounce return path. Only the six declared deliverable paths and scope coordination metadata were edited. Legacy string arrays remain query entries because they never stored destination metadata; newly selected region coordinates and restaurant IDs round trip unchanged. npx tsc --noEmit --pretty false exited 0 in /Users/seongminhan/workspace/sinsin_dev/sinsin-rn. Parent received region and restaurant replay steps; native interaction and rendered checks remain the parent integration responsibility, not a leaf claim.

## Parent integration checks

1. In search, select a REGION suggestion, return to the map, reopen search, and select its recent entry. The map should return to the same destination. Recent destinations now show a compact region/restaurant badge using existing localized labels.
2. Select a RESTAURANT suggestion, return to search, clear the field and select its recent entry. The original restaurant detail ID should reopen.
3. Delete one recent destination with its X. The row must disappear without navigation. Reopen search to confirm the deletion persisted.
4. Change an input with loaded suggestions to a different query. During the 250 ms debounce only a placeholder may be shown; previous destinations must be unavailable. The hook tests cover the timing, late previous response and matching cached-result cases without network calls.

Scope claim: map-search-2026-09-08/GATES. Approval records use /tmp/sinsin-search-unlazy-approved because the default home directory is outside the writable sandbox. Parent should reverify the explicit SEARCH-GATES.md ledger, then release the scope claim.
