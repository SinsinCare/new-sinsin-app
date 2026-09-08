# Medication grayscale consistency

OWNS: app/(write)/story/new.tsx, src/features/{auth,onboarding,settings,coach,home,medication,recipe,stats-report,food-report}/**, src/hooks/useSurface.ts, src/theme/surface.ts, tests/recordPageContrast.test.ts, tests/lightContrastAudit.test.ts, docs/design/medication-grayscale-2026-09-07/**. Exact touched files: changed-surfaces.json; ownership is limited to grayscale role changes and related contrast checks.

Scope extension: User requested the same grayscale audit across every feature. Audit all src/app surface, fill and hardcoded gray references; correct quiet form/control/support roles using existing tokens. Preserve page foundations, chart tracks, overlays and interaction contrast. Expanded source coverage is recorded in REVIEW.md.

Scope: Match every medication surface to the existing health record shallow neutral layer. Preserve typography, spacing, selection, reminders and navigation. Local TEST runtime only.

- [x] G1: All medication input, choice, empty, photo, product and reminder panels use the existing shallow surface; common record disabled actions follow the same layer. No new gray values or global palette changes.
  EVIDENCE: Medication shallow token references reviewed; existing palette values preserved. REVIEW.md and changed-surfaces.json identify exact consumers. Common record disabled CTA uses surfaceSunken.
- [x] G2: Types, scoped lint and existing record contrast and medication regressions pass.
  CHECK: npx tsc --noEmit && npx eslint src/features/medication src/features/home/components/record/pages/RecordPageShell.tsx && npx jest --runInBand --testPathPattern='recordPageContrast|medicationV2|medicationReminderTime' && node -e "console.log('MEDICATION_GRAYSCALE_OK')"
  EXPECT: MEDICATION_GRAYSCALE_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        0.873 s, estimated 1 s | Ran all test suites matching /recordPageContrast|medicationV2|medicationReminderTime/i.
- [x] G3: Simulator shows the corrected medication form, diary, add/search/manage/photo fallback and selected reminder states; light and dark are compared with another health record page. No QA record is saved.
  EVIDENCE: Simulator captures screens/01 through 11 and 16: medication editor, selected reminder, add, search, photo fallback, diary, manage and edema in light/dark. Test selection cleared; no medication saved. Populated integration states are explicitly source-only in REVIEW.md.
- [x] G4: Every feature is inventoried for deep gray use; confirmed input, choice and support-panel mismatches are corrected, with intentional retained roles documented.
  EVIDENCE: Source inventory covers app/shared surfaces and 22 feature directories (feature-inventory.json); 75 reviewed code/test files in changed-surfaces.json. REVIEW.md records corrected and retained roles; last remaining reference pass inspected controls, graphs, avatars and alternate palettes.
- [x] G5: Expanded changes pass type checking, error-level lint and current surface/contrast/component regressions; the legacy source audit has no additional failures compared with its pre-change baseline.
  EVIDENCE: Final npx tsc --noEmit exit=0. Manifest-scoped ESLint 0 errors / 72 warnings. Current regression command: 11 suites / 272 tests passed (checks/regression.log). Legacy source audit baseline and final both 5 failed / 55 passed; details and scope in REVIEW.md and checks/legacy-audit*.log.
- [x] G6: Representative shared consumers outside medication are visually checked in Simulator, including settings, community and recipe. Runtime coverage and unavailable states are explicitly recorded.
  EVIDENCE: Settings nickname input light, community story empty light/dark and recipe new light/dark observed; captures screens/09,12,13,14,15. Final app restored to light medication editor with empty input (16). REVIEW.md distinguishes source coverage from native checks.
