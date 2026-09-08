# Restaurant report field recovery

- [x] V1: Required name/category validation and submission locking remain enforced.
  CHECK: npx jest --config jest.config.ts tests/restaurantReport.test.ts tests/restaurantReportSubmission.test.ts --runInBand
  EXPECT: /Tests:.*passed/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=Time:        0.69 s, estimated 2 s | Ran all test suites matching /tests\/restaurantReport.test.ts|tests\/restaurantReportSubmission.test.ts/i.
- [x] V2: Type and lint checks pass for the edited form.
  CHECK: npx tsc --noEmit && npx eslint src/features/restaurant/components/RestaurantReportForm.tsx tests/restaurantReport.test.ts && npx prettier --check src/features/restaurant/components/RestaurantReportForm.tsx tests/restaurantReport.test.ts && git diff --check
  EXPECT: /All matched files use Prettier code style!/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=Checking formatting... | All matched files use Prettier code style!
- [x] V3: Simulator submit from form bottom brings missing fields into view, correction clears errors, and exiting a test draft works.

  EVIDENCE: iPhone 17 Pro iOS 26.5 Simulator: empty submit scrolled to restaurant information; screenshot showed both red field borders and name/category instructions together. Entering a test name removed only its error; entering category removed the remaining instruction. Back displayed draft-discard confirmation; discarding returned to the map. Temporary cuisine filter was cleared. No report was submitted. Native software keyboard and server failure were not exercised in this leaf.
