# Gates: Record calendar refresh

Scope: Home and statistics date selection, including the shared month sheet and statistics week strip. Reference source: Mobbin only. Preserve the existing test session and shared checkout; do not save test health records.

- [x] C1: Mobbin references are inspected visually and the applied choices documented.
  EVIDENCE: Mobbin MCP: 13 screen images inspected, including Amie, pliability, Fitbit, Asana, FotMob and Oura. Canonical screen links and applied/omitted patterns documented in REVIEW.md.
- [x] C2: Month/year navigation, Today, date selection, dismissal and future limits work in the existing iOS app.
  EVIDENCE: CUA iPhone 17 Pro/iOS 26.5: Aug 2026 to Feb 2021 through year/month selection, Today return, Sep 4 selection reflected in home, close button, disabled Sep 6/future months. Actual statistics route opens the same calendar; date exploration leaves home date unchanged. REVIEW.md records the observed states.
- [x] C3: Month and week calendars share clear selected/today/meal-record states, accessible targets and readable default/enlarged layouts without month-height jumps.
  EVIDENCE: CUA: matching month and live statistics week cells, selected Sep 4 versus Today/meal marker Sep 5, disabled Sep 6. 4/5/6-week frames checked. Default and three-step enlarged month/week views, enlarged month chooser, live font resize after fix and dark month calendar inspected. Font size restored. Layout limitations and native/render-test boundaries are documented in REVIEW.md.
- [x] C4: Loading, failed record lookup and empty records remain distinct without blocking date selection or shifting the calendar.
  EVIDENCE: Real MonthCalendarSheet branch render tests verify pending/error/known-empty copy, retry callback and usable date selection during failed lookup, record association and closed-query gating. Calendar geometry reserves six rows and a two-line status area; native successful/empty month and transitions inspected. Error-path rendering tests do not claim native fault injection. See recordCalendarStates.test.ts and REVIEW.md.
- [x] C5: Calendar date arithmetic and record association regression tests pass.
  CHECK: npx jest --config jest.config.ts --runInBand tests/recordCalendar.test.ts tests/recordCalendarStates.test.ts
  EXPECT: /Tests:.*passed/
  CWD: ../../..
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=326d29e73965/24 entries; output=Time:        2.231 s, estimated 3 s | Ran all test suites matching /tests\/recordCalendar.test.ts|tests\/recordCalendarStates.test.ts/i.
- [x] C6: TypeScript and edited calendar components pass static checks.
  CHECK: node -e "const cp=require('node:child_process');cp.execFileSync('node_modules/.bin/tsc',['--noEmit'],{stdio:'inherit'});cp.execFileSync('node_modules/.bin/eslint',['src/features/home/components/calendar','src/features/home/components/statistics/MonthCalendarSheet.tsx','src/features/home/components/statistics/WeekCalendar.tsx','app/statistics.tsx','src/features/stats-report/components/StatsReportScreen.tsx','src/features/home/hooks/useMonthDiaryExistence.ts','src/features/home/hooks/useDiaryExistence.ts','src/features/home/utils/getWeekDays.ts'],{stdio:'inherit'});process.stdout.write('CALENDAR_STATIC_OK')"
  EXPECT: CALENDAR_STATIC_OK
  CWD: ../../..
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=326d29e73965/24 entries; output=CALENDAR_STATIC_OK
