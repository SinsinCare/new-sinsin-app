# Gates: Six health record pages

OWNS: tests/analyticsScreenTable.test.ts, src/features/analytics/events.ts, src/features/home/components/record/pages/**, src/features/home/hooks/useMedicationRecord.ts, src/features/home/views/MedicationRecordScreen.tsx, src/features/home/stores/recordPageStore.ts, src/features/home/components/record/RecordView.tsx, app/record/medication.tsx, src/i18n/locales/*/common.json, tests/record*.test.ts, tests/medicationRecord.test.ts, docs/design/health-record-refresh-2026-09-05/**

Scope: Research varied mobile references, unify the six home health recording pages, add the medication page, and verify the existing simulator session without publishing test health records.

- [x] G1: Visually inspect varied Mobbin references and document the adopted patterns and their canonical links.
  EVIDENCE: REVIEW.md inventories 18 inspected screens from 9 apps with canonical Mobbin links and a per-pattern adoption decision.

- [x] G2: All six pages show the same header, date, typography, surfaces and save controls in the simulator; primary controls are legible and reachable.
  EVIDENCE: All six pages opened from Home in the existing iPhone 17 Pro iOS 26.5 session. Shared date/header, fields, selection surfaces and CTA inspected. Water first pending row is fully above the footer. Glucose elapsed choices and scrolled history are reachable. Empty BP 120/80 and glucose 100 render without clipping; BP 88/108 input then clearing verified. REVIEW.md records the checks and limits.

- [x] G3: Numeric input, keyboard dismissal, selection and unsaved water exit work in the simulator without a floating footer or duplicate blank popup.
  EVIDENCE: BP and glucose numeric input and keyboard-down button checked. Water add 100mL, keep draft, discard and return Home verified; both dialog labels fully visible and no second empty popup observed. Water row deletion returns total to zero. Edema ankle/slight/pitting selection survives another-part round trip, then discard returns Home. Medication checkbox changes CTA availability. No test records submitted to the server.

- [x] G4: Medication selection saves through the existing intake service once, keeps failed drafts, and refreshes the displayed count after success.
  CHECK: npx jest --config jest.config.ts --runInBand tests/medicationRecord.test.ts
  EXPECT: /Tests:.*passed/
  CWD: ../../..
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=326d29e73965/24 entries; output=Time:        0.654 s, estimated 1 s | Ran all test suites matching /tests\/medicationRecord.test.ts/i.

- [x] G5: The shared record form, layout, exit and save regression checks pass.
  CHECK: npx jest --config jest.config.ts --runInBand tests/recordPageSpec.test.ts tests/recordPages.test.ts tests/recordPageContrast.test.ts tests/recordSaveFeedback.test.ts tests/recordSaveResult.test.ts tests/healthRecordForms.test.ts tests/waterRecordExitGuard.test.ts tests/analyticsScreenTable.test.ts
  EXPECT: /Tests:.*passed/
  CWD: ../../..
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=326d29e73965/24 entries; output=Time:        2.227 s, estimated 4 s | Ran all test suites matching /tests\/recordPageSpec.test.ts|tests\/recordPages.test.ts|tests\/recordPageContrast.test.ts|tests\/recordSaveFeedback.test.ts|tests\/recordSaveResult.test.ts|tests\/healthRe

- [x] G6: TypeScript accepts the integrated six-page implementation.
  CHECK: node -e "require('node:child_process').execFileSync('node_modules/.bin/tsc',['--noEmit'],{stdio:'inherit'});process.stdout.write('TYPECHECK_OK')"
  EXPECT: TYPECHECK_OK
  CWD: ../../..
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=326d29e73965/24 entries; output=TYPECHECK_OK

- [x] G7: Changed health components and route pass ESLint; copy audit is reviewed for new findings.
  CHECK: node -e "require('node:child_process').execFileSync('node_modules/.bin/eslint',['src/features/home/components/record/pages','src/features/home/hooks/useMedicationRecord.ts','src/features/home/views/MedicationRecordScreen.tsx','src/features/home/stores/recordPageStore.ts','src/features/home/components/record/RecordView.tsx','app/record/medication.tsx'],{stdio:'inherit'});process.stdout.write('HEALTH_LINT_OK')"
  EXPECT: HEALTH_LINT_OK
  CWD: ../../..
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=326d29e73965/24 entries; output=✖ 13 problems (0 errors, 13 warnings) | HEALTH_LINT_OK
