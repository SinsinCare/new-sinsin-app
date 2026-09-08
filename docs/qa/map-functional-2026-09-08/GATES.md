# 지도 기능 직접 사용 점검

OWNS: src/features/restaurant/views/RestaurantMapScreen.tsx, src/features/restaurant/hooks/useRestaurantFilters.ts, src/features/restaurant/utils/regionFilterNavigation.ts, tests/restaurantRegionFilterNavigation.test.ts, src/i18n/locales/ko/common.json, src/i18n/locales/en/common.json, docs/qa/map-functional-2026-09-08/GATES.md, docs/qa/map-functional-2026-09-08/REVIEW.md

Scope: 전체 페이지를 직접 사용하며 개선하는 지속 목표의 지도 우선 점검. 이 레저는 이번 지도 검색·지역 필터 문제의 수정과 검증만 다룬다. 전체 목표 완료를 의미하지 않는다. 검색 화면/최근 기록/자동완성은 별도 SEARCH-GATES.md 소유다.

- [x] G1: 수동 및 AI 지역 조건 적용에 같은 이동 기준을 사용하고 기존 선택 순서 변경만으로 이동하지 않는다
  CHECK: npx jest --config jest.config.ts tests/restaurantRegionFilterNavigation.test.ts tests/restaurantSearchRecent.test.ts tests/restaurantFilterState.test.ts --runInBand
  EXPECT: /Tests:.*passed/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=Time:        1.609 s | Ran all test suites matching /tests\/restaurantRegionFilterNavigation.test.ts|tests\/restaurantSearchRecent.test.ts|tests\/restaurantFilterState.test.ts/i.
- [x] G2: 검색 수정과 지역 필터 변경을 통합한 타입·린트 검사가 통과한다
  EVIDENCE: Final npx tsc --noEmit --pretty false exited 0 (session 59148). Map screen/filter/helper/tests scoped ESLint and Prettier passed; search paths reverified in SEARCH-GATES:G2 after sibling delete buttons changed. Scoped git diff --check passed. See REVIEW.md for the separate pre-existing global tab-route failure.
- [x] G3: Simulator에서 검색→지역 이동→최근 항목 재선택 및 필터 적용을 직접 확인한다
  EVIDENCE: iPhone 17 Pro iOS 26.5 CUA 11:21–11:36: Gangnam→Seocho→recent Gangnam restored map/results; restaurant suggestion and recent entry reopened same detail; AI Seocho/Korean and manual Seocho both moved camera and returned 4 places; closing an edited filter preserved confirmed selection. Delete X remained on search screen and deletion survived re-entry. Details in REVIEW.md.
- [x] G4: 발견·수정·실사용 증거와 미검증 경계를 남긴다
  EVIDENCE: REVIEW.md records fixes, Simulator observations, local API/runtime boundaries, test scope, existing unrelated route failure, and unmeasured transition flicker/GPS/device variants. Search scope was released after reverify; all earlier checkout changes preserved.
