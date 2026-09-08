# Gates: Nutrition statistics redesign

OWNS: src/features/stats-report/**, app/statistics.tsx, tests/nutritionStatsPresentation.test.ts, tests/fixtures/nutritionStatsReports.ts, src/i18n/locales/ko/common.json (stats.redesign only), src/i18n/locales/en/common.json (stats.redesign only), docs/design/nutrition-statistics-2026-09-07/**

Scope: Nutrition statistics presentation and navigation. Preserve report API values, personal limits, health warnings, analytics, and unrelated working changes.

- [x] G1: Report presentation regression tests pass
  CHECK: npx jest --config jest.config.ts tests/nutritionStatsPresentation.test.ts --runInBand
  EXPECT: /Tests:.*passed/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        0.806 s, estimated 2 s | Ran all test suites matching /tests\/nutritionStatsPresentation.test.ts/i.
- [x] G2: Changed TypeScript has no type or lint errors; Korean copy audit has no new findings in changed copy
  EVIDENCE: 2026-09-07 npx tsc --noEmit exit 0; scoped ESLint exit 0; audit:ux-copy exit 0, 14 unrelated existing candidates and none in stats.redesign or stats-report; diff --check exit 0. See QA.md.
- [x] G3: Simulator verifies empty/live report, day/week/month navigation, populated fixture charts and complete interpretations, loading/error, dark mode and larger text
  EVIDENCE: iPhone 17 Pro iOS 26.5, Metro 8085. Observed final empty/day/week/month report, calendar selection, chart-to-day selection, record CTA home return, final light/dark cards and two larger text steps. Synthetic fixture chart/interpretation and loading/error views inspected separately. Native scroll gestures and error retry recovery remain unverified due CUA noWindowsAvailable; see QA.md for precise boundary.
- [x] G4: Mobbin references documented; actual report values and safety notes retained; preview data isolated from real records
  EVIDENCE: DESIGN.md records viewed Mobbin references; ReportContent retains every populated contract section and disclaimer. Report contract/backend unchanged. Temporary QA route removed, final route re-exports StatisticsScreen; no fixture imports in app or stats-report. No saved health records were created or edited.
