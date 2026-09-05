# Gates: Restaurant map discovery

Scope: Existing restaurant map, result sheet/cards, category/filter controls, and map-to-detail navigation. Mobbin references only. Keep the current test Simulator/Metro session and shared checkout; no fabricated data or production deployment.

- [x] R1: Broad Mobbin screen and flow comparisons are visually inspected and applied decisions documented.
  EVIDENCE: Mobbin returned 28 distinct inspected screens from 20 apps plus 5 inspected preview images across Wanderlog/TikTok flows; canonical links, initial audit and applied decisions recorded in REVIEW.md.
- [x] R2: Map results have a clear heading, explicit map/list controls, distinct marker selection, and usable search/filter hierarchy.
  EVIDENCE: iPhone 17 Pro screenshots and actual taps verify result count, map/list toggle, neutral clusters, orange selected marker, category and saved filter. Final saved-only state visibly reads 저장한 식당 / 0곳; expanded sheet hides obstructed controls and covers status-bar background.
- [x] R3: Restaurant cards keep names readable, separate nutrition meaning from identity, show real imagery without repeated strips, and preserve detail navigation.
  EVIDENCE: Default and enlarged light/dark rows inspected with single stable thumbnail, wrapping title and separate nutrition footer; 오레노라멘 and 크라이치즈버거 cards open matching detail and return. Blank/duplicate URL regression passes. Upstream image authenticity remains a data limitation documented in REVIEW.md.
- [x] R4: Existing iOS app verifies search, filter apply/reset, map movement/search, list expansion/collapse, place selection/detail return and empty saved results.
  EVIDENCE: Existing Metro 8085 client: search suggestion→matching detail→back; 한식 334→161; saved-only plus 한식→0→reset; cluster tap zooms to individual places, selected marker/card opens detail; returning from final detail updates visible-area results to 32. Map/list toggles exercised. Manual drag/FPS was not measured; see REVIEW.md.
- [x] R5: Default/enlarged text and light/dark states remain readable; loading, unavailable data and map fallback preserve useful actions.
  EVIDENCE: Native default and +3 preferred-text-size screenshots in light/dark inspected; original dark/default settings restored. Dark detail status icons verified white after native transition. Skeleton/error/map-fallback source reviewed and retry/response classification covered by R6; native SDK outage was not injected. REVIEW.md states verification limits.
- [x] R6: Relevant restaurant interaction/data regression tests pass.
  CHECK: npx jest --config jest.config.ts --runInBand tests/restaurantMapHtml.test.ts tests/restaurantMapTheme.test.ts tests/restaurantMapBridge.test.ts tests/restaurantMapGeometry.test.ts tests/restaurantSheetTop.test.ts tests/restaurantSheetDetent.test.ts tests/restaurantViewportAction.test.ts tests/restaurantSelectedFirst.test.ts tests/restaurantFilterState.test.ts tests/restaurantStockPhoto.test.ts tests/restaurantSafetyBadge.test.ts tests/restaurantCategoryChip.test.ts tests/restaurantRetryGuard.test.ts tests/restaurantBackendMismatch.test.ts
  EXPECT: /Tests:.*passed/
  CWD: ../../..
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=326d29e73965/24 entries; output=Time:        1.402 s, estimated 3 s | Ran all test suites matching /tests\/restaurantMapHtml.test.ts|tests\/restaurantMapTheme.test.ts|tests\/restaurantMapBridge.test.ts|tests\/restaurantMapGeometry.test.ts|tests\/restaurantSheetTop.test.ts
- [x] R7: TypeScript, changed restaurant UI lint, UX copy audit and diff checks pass.
  CHECK: node -e "const cp=require('node:child_process');cp.execFileSync('node_modules/.bin/tsc',['--noEmit'],{stdio:'inherit'});cp.execFileSync('node_modules/.bin/eslint',['src/features/restaurant','app/_layout.tsx','app/restaurant/_layout.tsx'],{stdio:'inherit'});cp.execFileSync('npm',['run','audit:ux-copy'],{stdio:'inherit'});cp.execFileSync('git',['diff','--check'],{stdio:'inherit'});process.stdout.write('RESTAURANT_STATIC_OK')"
  EXPECT: RESTAURANT_STATIC_OK
  CWD: ../../..
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=326d29e73965/24 entries; output=S1 MED-002 src/i18n/locales/ko/common.json:1870 하루 소금 섭취는 5g 이하를 권장해요. 찌개나 국물은 남기는 습관이 콩팥을 지켜줘요. | RESTAURANT_STATIC_OK
