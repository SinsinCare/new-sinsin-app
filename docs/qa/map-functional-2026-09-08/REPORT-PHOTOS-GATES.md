# Report photo selection

OWNS: useRestaurantReportPhotos.ts, RestaurantReportForm.tsx, restaurantReportPhotos.test.ts.

- [x] F1: Photo selection handles double taps, cancel, duplicate assets, failures, reset and unmount.
  CHECK: npx jest --config jest.config.ts tests/restaurantReportPhotos.test.ts tests/restaurantReportSubmission.test.ts --runInBand
  EXPECT: /Tests:.*passed/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=Time:        0.706 s, estimated 2 s | Ran all test suites matching /tests\/restaurantReportPhotos.test.ts|tests\/restaurantReportSubmission.test.ts/i.
- [x] F2: Type, lint and formatting checks pass.
  CHECK: npx tsc --noEmit && npx eslint src/features/restaurant/hooks/useRestaurantReportPhotos.ts src/features/restaurant/components/RestaurantReportForm.tsx tests/restaurantReportPhotos.test.ts && npx prettier --check src/features/restaurant/hooks/useRestaurantReportPhotos.ts src/features/restaurant/components/RestaurantReportForm.tsx tests/restaurantReportPhotos.test.ts && git diff --check
  EXPECT: /All matched files use Prettier code style!/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=Checking formatting... | All matched files use Prettier code style!
- [ ] F3: Native photo chooser opens and cancels back to the draft; record selection and permission boundaries.
  EVIDENCE: Partial native verification on iPhone 17 Pro iOS 26.5: restaurant report > add photo shows the system picker with maximum 3 images. Before presentation, photo action is busy and submit is disabled. No new permission prompt appeared. Cancel/select controls are absent from the Simulator accessibility tree; screenshot shows X, but coordinate click fails with computer-use error -10005 noWindowsAvailable. App switcher/return did not restore those controls. Cancellation, selected-photo rendering and inline picker failure remain unverified natively; no photo was selected, uploaded or submitted. These lifecycle cases passed in hook tests only. Picker remains open for manual cancellation.

FOLLOW-UP: On the next validation pass, the empty picker was cleared by closing only the Sinsin app via Simulator App Switcher and reopening it. This restored native app testing but does not prove the system picker cancellation flow.
