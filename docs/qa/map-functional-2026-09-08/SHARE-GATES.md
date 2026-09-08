# Shared text and link sharing

OWNS: src/shared/utils/share.ts, tests/shareLifecycle.test.ts, common ko/en shareUi copy.

- [x] S1: Concurrent calls, transition waits, dismissal and failures are handled without duplicate sheets, unhandled rejection or payload logging.
  CHECK: npx jest --config jest.config.ts tests/shareLifecycle.test.ts tests/sharePayload.test.ts --runInBand
  EXPECT: /Tests:.*passed/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=Time:        0.65 s, estimated 2 s | Ran all test suites matching /tests\/shareLifecycle.test.ts|tests\/sharePayload.test.ts/i.
- [x] S2: Changed shared code passes type/lint/format and copy checks.
  CHECK: npx tsc --noEmit && npx eslint src/shared/utils/share.ts tests/shareLifecycle.test.ts && npx prettier --check src/shared/utils/share.ts tests/shareLifecycle.test.ts && npm run audit:ux-copy && git diff --check
  EXPECT: /All matched files use Prettier code style!/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=S2 NAV-002 src/i18n/locales/ko/common.json:1827 카카오톡 앱이 설치되어 있는지 확인 후 다시 시도해 주세요. | S1 MED-002 src/i18n/locales/ko/common.json:1939 하루 소금 섭취는 5g 이하를 권장해요. 찌개나 국물은 남기는 습관이 콩팥을 지켜줘요.
- [x] S3: Simulator restaurant share opens, cancels and opens again; a second shared entry point is exercised. No message is sent.

  EVIDENCE: iPhone 17 Pro/iOS 26.5 CUA: updated restaurant sharing opened a native popover, dismissed back to the same detail, reopened and dismissed again. Community PostDetail sharing also opened the native popover; dismissal restored the post header, share button and comment controls. No recipient was selected and no message was sent.

## Evidence and remaining scope

The current shared function is used by RestaurantDetailScreen, PostDetailScreen and RestaurantConsultSheetHost. Direct restaurant and post entry points are native-verified. The consult host's modal-transition case is covered by deferred transition tests; its native variant remains unverified. Recipe sharing is a separate path and was not changed or verified in this pass.

11 tests passed across share lifecycle and platform payload suites. S1/S2 rerun succeeded in /tmp/sinsin-share-gates.log; its unmet S3 count predates this native evidence. Type/lint/format checks passed. Copy audit exited zero with pre-existing unrelated findings; whole-app copy is not claimed clean.

Failure tests inject native rejection and transition rejection, verify recovery and fixed localized error copy. Actual native failures and Android presentation are not device-verified. iOS dismissal semantics were checked against the installed RN Share implementation. The mutex lasts through the native promise; Android promise resolution does not prove recipient delivery.

Native restaurant preview still uses the existing custom-scheme link. Install-free universal-link delivery and successful external recipient delivery are not proved by opening the panel and remain outside this change. The full app goal stays active.
