# Route app launch lifecycle

OWNS: RouteAppSheet.tsx, useRouteAppLaunch.ts, restaurantRouteAppLaunch.test.ts, ko/en restaurant.route copy.

- [x] L1: Deferred launches prove single-flight, app-to-web fallback, recoverable failure and cancellation of late callbacks.
  CHECK: npx jest --config jest.config.ts tests/restaurantRouteAppLaunch.test.ts tests/restaurantMapAppLinks.test.ts --runInBand
  EXPECT: /Tests:.*passed/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=Time:        1.185 s | Ran all test suites matching /tests\/restaurantRouteAppLaunch.test.ts|tests\/restaurantMapAppLinks.test.ts/i.
- [x] L2: Type, lint, formatting and copy checks pass.
  CHECK: npx tsc --noEmit && npx eslint src/features/restaurant/hooks/useRouteAppLaunch.ts src/features/restaurant/components/RouteAppSheet.tsx tests/restaurantRouteAppLaunch.test.ts && npx prettier --check src/features/restaurant/hooks/useRouteAppLaunch.ts src/features/restaurant/components/RouteAppSheet.tsx tests/restaurantRouteAppLaunch.test.ts && npm run audit:ux-copy && git diff --check
  EXPECT: /All matched files use Prettier code style!/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=S2 NAV-002 src/i18n/locales/ko/common.json:1823 카카오톡 앱이 설치되어 있는지 확인 후 다시 시도해 주세요. | S1 MED-002 src/i18n/locales/ko/common.json:1935 하루 소금 섭취는 5g 이하를 권장해요. 찌개나 국물은 남기는 습관이 콩팥을 지켜줘요.
- [x] L3: Simulator verifies route-sheet open/cancel/reopen and external launch; record external and mocked boundaries explicitly.

  EVIDENCE: iPhone 17 Pro/iOS 26.5 CUA: route options displayed, selecting Kakao showed an opening indicator and disabled all options; Safari opened applink.map.kakao.com with the Kakao map landing page. App Switcher returned to the same restaurant detail, the route sheet reopened with enabled options, and close removed the options.

## Boundaries

Native proof establishes external browser handoff, not completed route calculation. The Kakao landing page offered installation-free map viewing, but its link was not exposed in Simulator accessibility and coordinate interaction returned noWindowsAvailable; destination rendering beyond the landing page remains unverified. No app installation, route-start action or location permission was performed. Native+web double failure, retry, late cancellation and changed destinations are covered by deferred hook tests, not injected native failures. Android map launch remains unverified.

R1/R2 passed in /tmp/sinsin-route-gates.log; its unmet L3 result predates this native evidence. UX copy audit exited zero but reported pre-existing unrelated findings; this is not a clean whole-app copy audit. No deployment or data changes. The whole-app goal remains active. Shared shareContent was inspected; sharing improvements remain for a later pass.
