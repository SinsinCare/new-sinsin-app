# Medication v2 delivery gates

Scope: Build a real medication diary and registration flow aligned with the six independent record pages. Preserve old logs; add transactional per-slot saves, schedules, edit/pause/archive, honest catalog/photo capability states and opt-in reminders. Refresh six-page compact hierarchy and shared typography/header/input behavior from viewed Mobbin references. No production deployment, external credentials or recognition accuracy claims. Check commands use /Users/seongminhan/workspace/sinsin_dev as --cwd; sibling codebases retain their unrelated changes.

- [x] M1: v2 specification maps supplied logic, revised decisions and viewed Mobbin references to implementation and release dependencies.
  EVIDENCE: SPEC-v2.md maps the 26-page PDF RQ/EX/AC groups and M3-M11 flows, revised defaults, data model and release dependencies; SIX-PAGE-DESIGN.md records viewed Mobbin screens and per-page application.
- [x] M2: Server persistence, ownership, historical snapshots, save concurrency/idempotency and search/recognition boundaries pass focused tests against an isolated local test database.
  CHECK: bun scripts/medication-test.ts && bunx tsc --noEmit
  EXPECT: MEDICATION_SERVER_OK
  CWD: sinsin-be-bun
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-be-bun; path=c4247c96c970/31 entries; output=96 expect() calls | Ran 23 tests across 3 files. [1213.00ms]
- [x] M3: Client draft transactions, registration validation, date/slot selection, reminder privacy and stale-request behavior pass focused tests.
  CHECK: npx jest --runInBand --testPathPattern='medicationV2|medicationRecord|textScaling|inputMetrics|recordPage|healthRecord|settingsNotifications|recordCalendar|waterRecordExitGuard' && node -e "console.log('MEDICATION_CLIENT_OK')"
  EXPECT: MEDICATION_CLIENT_OK
  CWD: sinsin-rn
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=c4247c96c970/31 entries; output=Time:        1.6 s, estimated 4 s | Ran all test suites matching /medicationV2|medicationRecord|textScaling|inputMetrics|recordPage|healthRecord|settingsNotifications|recordCalendar|waterRecordExitGuard/i.
- [x] M4: Changed client and server TypeScript typecheck, owned lint and copy audit are reviewed.
  CHECK: npx tsc --noEmit && npx eslint src/design-system-v2/primitives src/design-system-v2/components/V2ScreenHeader.tsx src/design-system-v2/components/V2SheetTextInput.tsx src/design-system-v2/tokens/fontScaling.ts src/features/medication src/features/home/components/record/pages tests/inputMetrics.test.ts tests/textScaling.test.ts tests/medicationV2*.test.ts && node -e "console.log('MEDICATION_TYPES_OK')"
  EXPECT: MEDICATION_TYPES_OK
  CWD: sinsin-rn
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=c4247c96c970/31 entries; output=✖ 9 problems (0 errors, 9 warnings) | MEDICATION_TYPES_OK
- [x] M5: Simulator registration, per-slot selection/save/reopen/edit/pause, draft exit, empty/error/keyboard/large-text/dark states are visibly verified and QA data is cleaned up.
  EVIDENCE: REVIEW.md native interaction table and screens/01-08; QA dose 1 snapshot survived plan edit to 2 and pause. Exact task-created plan, versions, day entries and receipts were removed using a guarded local transaction; later temporary drafts were cleared/discarded. Default font size and Light appearance restored.
- [x] M6: Final evidence distinguishes implemented functionality from unconfigured external data, unavailable physical-camera proof and unevaluated clinical identification performance.
  EVIDENCE: REVIEW.md Release boundaries explicitly documents unavailable catalog/photo configuration, physical camera/notification delivery proof, clinical evaluation and incomplete legacy Alembic history. No production migration or deployment performed.

- [x] M7: All six independent record pages share compact measurement, choice, history and anchored CTA geometry, with viewed Mobbin references documented and native interactions verified.
  EVIDENCE: SIX-PAGE-DESIGN.md tokens and viewed Mobbin links; REVIEW.md records native water, BP, glucose, weight, edema and medication interactions, including conditional-field restoration and keyboard. No unmeasured scroll FPS claim.
- [x] M8: Owned text primitives have bounded role-based scaling without disabling enlargement, and native default/maximum/default transitions preserve readable geometry.
  CHECK: node scripts/audit-text-scaling.mjs
  EXPECT: TEXT_SCALING_COVERAGE_OK
  CWD: sinsin-rn
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=c4247c96c970/31 entries; output=TEXT_SCALING_COVERAGE_OK

- [x] M9: Shared navigation distinguishes flow titles from dates; page, search and sheet inputs share single-line vertical metrics while multiline editors retain their line spacing and keyboard integration. Native empty, editing and cleared states are reviewed.
  EVIDENCE: Native medication name/dose and search empty-enter-clear, water sheet 250-clear-close with numeric keyboard, and comment two-line/dismiss/discard observed; screens/06-09. Input tests in M3 cover style override normalization, untouched multiline metrics and retained refs/callbacks/gorhom implementation. Date and leading flow headers observed at default and maximum text sizes. Additional shared primitive/field/typeface/signup regressions: npx jest --runInBand --testPathPattern='v2FieldVariants|v2Primitives|v2EdgeCaseGuard|typefaceLineage|signupProfileExitTrap' exited 0, five suites / 73 tests passed.
