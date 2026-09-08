# Restaurant report draft protection

OWNS: RestaurantReportScreen.tsx, RestaurantReportForm.tsx, useRestaurantReportSubmission.ts, restaurantReportSubmission.test.ts.

- [x] P1: Submission handles duplicate taps, failure retry and late responses without losing a draft.
  CHECK: npx jest --config jest.config.ts tests/restaurantReportSubmission.test.ts --runInBand
  EXPECT: /Tests:.*passed/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=Time:        0.726 s, estimated 2 s | Ran all test suites matching /tests\/restaurantReportSubmission.test.ts/i.
- [x] P2: Type, scoped lint, formatting and whitespace checks pass.
  CHECK: npx tsc --noEmit && npx eslint src/features/restaurant/hooks/useRestaurantReportSubmission.ts src/features/restaurant/views/RestaurantReportScreen.tsx src/features/restaurant/components/RestaurantReportForm.tsx tests/restaurantReportSubmission.test.ts && npx prettier --check src/features/restaurant/hooks/useRestaurantReportSubmission.ts src/features/restaurant/views/RestaurantReportScreen.tsx src/features/restaurant/components/RestaurantReportForm.tsx tests/restaurantReportSubmission.test.ts && git diff --check
  EXPECT: /All matched files use Prettier code style!/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=Checking formatting... | All matched files use Prettier code style!
- [x] P3: Native report form empty back and draft keep/discard work. No real report is submitted.

  EVIDENCE: iPhone 17 Pro/iOS 26.5 CUA: empty submit displayed the required restaurant-name message; empty back returned to the map; typed a disposable test name, back opened one discard dialog, keep preserved that exact input, and discard returned to the 32-place map. No report was submitted.

## Changes and limits

Submission now synchronously locks through upload and POST, disables editing and photo actions, informs the route of its pending state, and suppresses callbacks after forced unmount. Completed input identities cannot be posted again through a retained stale callback; a new draft can be submitted. Failures preserve inputs and unlock for retry. The route uses usePreventRemove for native removal actions and the header back path, deduplicates prompts and avoids late dispatch after unmount.

Deferred submission tests passed (four cases), and type/lint/format/whitespace checks passed in /tmp/sinsin-report-gates.log. That log's unmet P3 count predates the native verification above. No DB writes, photo uploads or real submissions were performed. Android hardware back and native pending network state remain unverified. Photo picker permissions/errors and per-field validation refinement remain follow-up inspection work. This does not close the whole-app objective.
