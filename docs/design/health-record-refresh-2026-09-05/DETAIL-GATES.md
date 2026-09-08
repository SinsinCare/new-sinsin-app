# Gates: Six health record pages detail audit

OWNS: app/record/**, src/features/home/views/*RecordScreen.tsx, src/features/home/hooks/useHealthRecordRoute.ts, src/features/home/hooks/useGlucoseRecordForm.ts, src/features/home/components/record/pages/**, src/features/home/hooks/useBloodPressureRecordForm.ts, src/features/home/hooks/useWeightRecordForm.ts, src/features/home/hooks/useRecordExitGuard.ts, src/features/home/hooks/useMedicationRecord.ts, src/i18n/locales/*/common.json, tests/healthRecord*.test.ts, tests/record*.test.ts, docs/design/health-record-refresh-2026-09-05/**

Scope: The earlier visual smoke pass did not prove the user's full six-page detail requirement. Re-audit typography, alignment, spacing, input and draft behavior, keyboard/scroll geometry, auxiliary sheets, errors and save feedback. Use the existing iOS test session; do not write fabricated health records.

- [x] D1: Common numeric fields keep labels, entered values, examples and units aligned and unclipped in empty, edited and cleared states, including larger system text.
  EVIDENCE: CUA iPhone 17 Pro/iOS 26.5: default BP 80 entered then cleared remained whole; enlarged BP 80 and weight 0.0, entered 300.1/600/251, labels and units remained unclipped. See DETAIL-REVIEW.md.

- [x] D2: Water quick/custom additions, removal, sheet keyboard, unsaved exit and the complete pending list remain usable and legible.
  EVIDENCE: CUA: custom 2001 error/clear/250 addition; 100+200+300 presets produced 850, removing 100 produced 750; last pending row reachable; keep/discard dialogs legible at three larger text steps; no pending records saved. See DETAIL-REVIEW.md.

- [x] D3: Blood pressure preserves the draft during context changes and unsaved exit, clearly handles invalid values, and displays readable history and information.
  EVIDENCE: CUA: editable draft preserved after Keep, context switching, pulse 251 validation/clear, readable enlarged history and info sheet. Real-hook tests cover context maps, background refresh, bounds, failure and duplicate save. See DETAIL-REVIEW.md.

- [x] D4: Weight keeps its draft, validates with stable feedback geometry and shows comparison/history without text collisions.
  EVIDENCE: CUA: 62.4 seeded on entry; 300.1 invalid, clear, restore 62.4; keyboard hint clear of dock; default/enlarged comparison and history columns and info sheet readable. Hook tests cover failed saves and draft baseline. See DETAIL-REVIEW.md.

- [x] D5: Glucose context/elapsed choices and edema body/degree/pitting choices retain state and remain aligned and reachable at default and larger text.
  EVIDENCE: CUA: enlarged glucose 601 rejected/600 accepted; corrected timing toggle now restores lunch and 1H in default render. Edema ankle/face switching restores level and pitting; default three-column and enlarged two-column choices and summaries reachable. See DETAIL-REVIEW.md.

- [x] D6: Medication selection, summary and save/failed-save states follow the same visual and interaction conventions.
  EVIDENCE: CUA default/enlarged medication selection, summary and CTA verified on/off; no test dose saved. Actual hook tests cover confirmed save, rejected save, draft retention and duplicate suppression; shared footer owns feedback. See DETAIL-REVIEW.md.

- [x] D7: All six pages pass a final current-render review for default and enlarged text, keyboard/scroll footer clearance, contrast and motion; no known detail defect is left open.
  EVIDENCE: CUA iPhone 17 Pro/iOS 26.5: all six inspected in light default/enlarged text and dark default text. Rechecked final BP empty 120/80 after restoring light mode; native keyboard open/close preserved dark status-bar contrast. Actual input, keyboard dock, selection and sheet transitions reviewed; no frame-rate measurement claimed. Test drafts cleared/discarded, original light theme/text size restored, existing BP 128/82 and weight 62.4 unchanged. Contrast tests and current static checks passed. See DETAIL-REVIEW.md for scope and limitations.

- [x] D8: Relevant state, numeric and exit regression tests pass.
  CHECK: npx jest --config jest.config.ts --runInBand tests/healthRecordInputs.test.ts tests/healthRecordForms.test.ts tests/medicationRecord.test.ts tests/recordPages.test.ts tests/recordPageSpec.test.ts tests/recordPageContrast.test.ts tests/recordSaveFeedback.test.ts tests/recordSaveResult.test.ts tests/waterRecordExitGuard.test.ts
  EXPECT: /Tests:.*passed/
  CWD: ../../..
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=326d29e73965/24 entries; output=Time:        2.122 s | Ran all test suites matching /tests\/healthRecordInputs.test.ts|tests\/healthRecordForms.test.ts|tests\/medicationRecord.test.ts|tests\/recordPages.test.ts|tests\/recordPageSpec.test.ts|tests\/recordPageContrast.test.

- [x] D9: TypeScript and the changed health page files pass static validation.
  CHECK: node -e "const cp=require('node:child_process');cp.execFileSync('node_modules/.bin/tsc',['--noEmit'],{stdio:'inherit'});cp.execFileSync('node_modules/.bin/eslint',['src/features/home/components/record/pages','src/features/home/hooks/useBloodPressureRecordForm.ts','src/features/home/hooks/useWeightRecordForm.ts','src/features/home/hooks/useGlucoseRecordForm.ts','src/features/home/hooks/useHealthRecordRoute.ts','src/features/home/views/BloodPressureRecordScreen.tsx','src/features/home/views/WeightRecordScreen.tsx','src/features/home/views/WaterRecordScreen.tsx','app/record'],{stdio:'inherit'});process.stdout.write('DETAIL_STATIC_OK')"
  EXPECT: DETAIL_STATIC_OK
  CWD: ../../..
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=326d29e73965/24 entries; output=✖ 9 problems (0 errors, 9 warnings) | DETAIL_STATIC_OK
