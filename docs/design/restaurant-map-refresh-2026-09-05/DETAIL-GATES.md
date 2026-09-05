# Gates: Restaurant map hierarchy refinement

Scope: Follow-up Mobbin research and refinement of map label density, result heading, filter controls and restaurant comparison hierarchy. Preserve the existing shared checkout and Metro 8085 test client.

User refinement: reject oversized controls and headings. Compare smaller map-first screens from other Mobbin apps, then reduce visible control/card sizes while preserving accessible interaction areas.

- [x] D1: Additional distinct Mobbin screens are visually inspected and linked to specific design decisions.
  EVIDENCE: DETAIL-REVIEW records 28 additional captures; COMPACT-REVIEW records the subsequent 26 distinct captures compared after the user's size correction, including repeats from earlier passes. Every image was visually inspected and attributed by returned app name. Selected direction is Blackbird, corner, Wolt and Places.
- [x] D2: Result heading leads the sheet; a single explicit map/list action and quieter filters retain their full touch targets.
  EVIDENCE: iPhone 17 Pro / iOS 26.5, Metro 8085 TEST: default light and dark map/list screenshots verify 17-point title, inline count, one map/list action, small chip faces. Category, filter and view controls retain 44-point minimum boxes in source. List and map actions were activated through native accessibility.
- [x] D3: Map labels avoid crowding and viewport clipping while selected places and every marker remain available.
  EVIDENCE: restaurantMapLabelDensity tests execute the actual generated collision function for dense grids, small viewports, selected bubble priority, neighboring pins and clipped labels. Map labels were visually inspected after detail return. Marker targets and native bridge wiring are preserved; compact clusters retain 44-pixel boxes. Direct native pin tapping was not reverified; see D5.
- [ ] D4: Selected restaurant cards are recognizable; typography, metadata and spacing work in light/dark and enlarged text.
  EVIDENCE: Partial: default light/dark map and list, plus light app reloaded at three preferred-text-size increments, were visually inspected. Titles, metadata and controls remain readable. The selected edge is implemented but no final native selected-row screenshot was obtainable because coordinate tapping failed. Font size and original dark theme were restored after QA.
- [ ] D5: Existing iOS app verifies view switching, selected marker/detail return, filtering and search after the refinement.
  EVIDENCE: Partial: map/list switching, card detail entry/back, nutrition-to-cuisine tab draft persistence, combined filter apply and reset, and region search into a 326-place map were verified. Text search for the prior recent restaurant query returned an empty state. Direct native pin tapping/dragging could not be completed because CUA coordinate actions returned noWindowsAvailable; no gesture success is claimed.
- [x] D6: Regression tests and static checks pass for the final changes.
  CHECK: node -e "const cp=require('node:child_process');cp.execFileSync('node_modules/.bin/jest',['--config','jest.config.ts','--runInBand','tests/restaurantMapLabelDensity.test.ts','tests/restaurantMapHtml.test.ts','tests/restaurantMapTheme.test.ts','tests/restaurantMapGeometry.test.ts','tests/restaurantSheetTop.test.ts','tests/restaurantSheetDetent.test.ts','tests/restaurantSelectedFirst.test.ts','tests/restaurantFilterState.test.ts','tests/restaurantCategoryChip.test.ts'],{stdio:'inherit'});cp.execFileSync('node_modules/.bin/tsc',['--noEmit'],{stdio:'inherit'});cp.execFileSync('node_modules/.bin/eslint',['src/features/restaurant'],{stdio:'inherit'});cp.execFileSync('npm',['run','audit:ux-copy'],{stdio:'inherit'});cp.execFileSync('git',['diff','--check'],{stdio:'inherit'});process.stdout.write('RESTAURANT_DETAIL_CHECKS_OK')"
  EXPECT: RESTAURANT_DETAIL_CHECKS_OK
  CWD: ../../..
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=326d29e73965/24 entries; output=Time:        1.805 s, estimated 3 s | Ran all test suites matching /tests\/restaurantMapLabelDensity.test.ts|tests\/restaurantMapHtml.test.ts|tests\/restaurantMapTheme.test.ts|tests\/restaurantMapGeometry.test.ts|tests\/restaurantSheetTop.t

ABANDON: D4 Final native selected-row appearance requires direct map pin interaction unavailable through the current CUA coordinate bridge. Other appearance checks passed; this gate remains explicitly incomplete rather than inferred from source.
ABANDON: D5 Direct native pin selection and drag could not be reverified due to CUA noWindowsAvailable. Other listed native flows were exercised; the missing gesture is not claimed as verified.
