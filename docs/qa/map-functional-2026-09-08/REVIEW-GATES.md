# Restaurant review submission lifecycle

OWNS: src/features/restaurant/hooks/useReviewEditorLifecycle.ts, src/features/restaurant/views/ReviewWriteScreen.tsx, tests/restaurantReviewEditorLifecycle.test.ts, tests/restaurantReviewSubmitContract.test.ts, docs/qa/map-functional-2026-09-08/REVIEW-GATES.md

- [x] R1: Deferred upload and submit tests prove single-flight, retry, navigation protection and no late UI effects after unmount.
  CHECK: npx jest --config jest.config.ts tests/restaurantReviewEditorLifecycle.test.ts tests/restaurantReviewSubmitContract.test.ts --runInBand
  EXPECT: /Tests:.*passed/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=Time:        1.432 s, estimated 2 s | Ran all test suites matching /tests\/restaurantReviewEditorLifecycle.test.ts|tests\/restaurantReviewSubmitContract.test.ts/i.
- [x] R2: Changed code passes type, lint, formatting and whitespace checks.
  CHECK: npx tsc --noEmit && npx eslint src/features/restaurant/hooks/useReviewEditorLifecycle.ts src/features/restaurant/views/ReviewWriteScreen.tsx tests/restaurantReviewEditorLifecycle.test.ts tests/restaurantReviewSubmitContract.test.ts && npx prettier --check src/features/restaurant/hooks/useReviewEditorLifecycle.ts src/features/restaurant/views/ReviewWriteScreen.tsx tests/restaurantReviewEditorLifecycle.test.ts tests/restaurantReviewSubmitContract.test.ts && git diff --check
  EXPECT: /All matched files use Prettier code style!/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=Checking formatting... | All matched files use Prettier code style!
- [x] R3: Simulator empty close, dirty keep/discard and detail return work without publishing a review.
  EVIDENCE: iPhone 17 Pro/iOS 26.5 CUA: empty close returned to detail; selected four stars, X opened a visible in-modal dialog; screenshot showed both vertical labels without clipping; keep writing preserved four stars; second X plus discard returned to restaurant detail. Native-stack root dialog presentation failure was reproduced and fixed by a local V2DialogHost.
- [x] R4: Record verification boundaries, including saved-list photo return and untested external publication.

  EVIDENCE: This ledger records implementation and verification boundaries below. Whole-app goal remains active.

## Changes and limits

- Extracted editor transaction lifecycle: synchronous single-flight lock covers upload and POST, including one photo and zero photos; form and exit disabled during submission; failed requests preserve the draft and allow retry. Successfully uploaded paths are reused within this editor session.
- Native navigation actions and X share one confirmation request. The native modal owns its V2DialogHost so the confirmation is visible above the editor.
- Successful publication stays locked through navigation; partial photo outcomes still use the existing notice helper before navigation. Forced unmount stops the upload chain before POST and suppresses late UI callbacks.
- Deferred hook tests cover uploads, POST, failures, success/partial photo notices, concurrent taps, exit requests and unmount. Tests use a lightweight hook harness, not a native renderer or real publication server.
- Native checks used only locally created unsaved star input; no review was published and no user record was deleted. Actual photo upload/POST, Android hardware back and interrupted network persistence are not native-verified. Server idempotency for ambiguous network failures is outside this change.
- Additional native evidence: saved restaurant list opened its second photo at 2/3 and returned to the saved list. No bookmark was created or removed.
- Runnable evidence in /tmp/sinsin-review-gates.log: R1 and R2 exited zero. Its final unmet count predates completion of native checks recorded above.
