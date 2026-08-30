# Gates: V2 overlay interaction release and edge-case hardening

OWNS: src/**, tests/**, GATES.md

Scope: Bottom sheets, modals, and shared V2 components release interaction state reliably and pass repository checks without warnings.

- [x] G1: Every modal and bottom-sheet close path releases the overlay gate before follow-up interaction
      CHECK: ./node_modules/.bin/jest --config jest.config.ts tests/modalScrollReleaseGuard.test.ts tests/appModalGate.test.ts tests/sheetCloseDeadline.test.ts tests/writeExitModalGate.test.ts tests/nativePresentGuard.test.ts tests/dialogHostRouting.test.ts --runInBand && node -e "console.log('G1_MODAL_RELEASE_OK')"
      EXPECT: G1_MODAL_RELEASE_OK
      EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=62ae3546b7f3/22 entries; output=Time:        6.64 s, estimated 7 s | Ran all test suites matching /tests\/modalScrollReleaseGuard.test.ts|tests\/appModalGate.test.ts|tests\/sheetCloseDeadline.test.ts|tests\/writeExitModalGate.test.ts|tests\/nativePresentGuard.test.ts|test

- [x] G2: V2 shared component edge cases are guarded by focused regression tests
      CHECK: ./node_modules/.bin/jest --config jest.config.ts tests/v2EdgeCaseGuard.test.ts tests/v2Avatar.test.ts tests/v2FieldVariants.test.ts tests/v2Menu.test.ts tests/v2Primitives.test.ts tests/v2SheetFixedHeight.test.ts tests/sheetNumberInput.test.ts --runInBand && node -e "console.log('G2_V2_EDGE_CASES_OK')"
      EXPECT: G2_V2_EDGE_CASES_OK
      EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=62ae3546b7f3/22 entries; output=Time:        1.025 s | Ran all test suites matching /tests\/v2EdgeCaseGuard.test.ts|tests\/v2Avatar.test.ts|tests\/v2FieldVariants.test.ts|tests\/v2Menu.test.ts|tests\/v2Primitives.test.ts|tests\/v2SheetFixedHeight.test.ts|tests\/sheetNumbe

- [x] G3: V2 and task-owned source lint completes with zero errors and zero warnings
      CHECK: ./node_modules/.bin/eslint src/design-system-v2 src/shared/components/AppModal.tsx src/shared/components/appModalGate.ts src/lib/dialog.ts src/hooks/useAuth.ts src/features/auth/hooks/useEmailLogin.ts src/features/auth/hooks/useSocialLogin.ts src/features/settings/views/SettingsScreen.tsx src/features/consultation/components/ChatHistoryCard.tsx src/features/recipe/components/RecipeEditor.tsx tests/authSurface.test.ts tests/modalScrollReleaseGuard.test.ts tests/v2EdgeCaseGuard.test.ts tests/v2FieldVariants.test.ts tests/v2Menu.test.ts --max-warnings=0 && node -e "console.log('G3_LINT_ZERO_WARNINGS_OK')"
      EXPECT: G3_LINT_ZERO_WARNINGS_OK
      EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=62ae3546b7f3/22 entries; output=G3_LINT_ZERO_WARNINGS_OK

- [x] G4: TypeScript type checking completes successfully
      CHECK: ./node_modules/.bin/tsc --noEmit --pretty false && node -e "console.log('G4_TYPES_OK')"
      EXPECT: G4_TYPES_OK
      EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=62ae3546b7f3/22 entries; output=G4_TYPES_OK

- [x] G5: All local non-network Jest suites pass without positional-argument contamination
      CHECK: ./node_modules/.bin/jest --config jest.config.ts --runInBand --testPathIgnorePatterns='/tests/(auth|food|profile|chat)\.test\.ts$' && node -e "console.log('G5_LOCAL_REGRESSION_OK')"
      EXPECT: G5_LOCAL_REGRESSION_OK
      EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=62ae3546b7f3/22 entries; output=Time:        18.405 s, estimated 19 s | Ran all test suites.

- [x] G6: The working diff contains no whitespace errors
      CHECK: git diff --check && node -e "console.log('G6_DIFF_OK')"
      EXPECT: G6_DIFF_OK
      EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=62ae3546b7f3/22 entries; output=G6_DIFF_OK

- [ ] G7: The repaired close paths are exercised on the selected iOS or Android target and scrolling works after backdrop, gesture, hardware-back, and action-dialog dismissal
      EVIDENCE: pending

ABANDON: G7 실기기 검증은 이 세션의 배포 원장으로 승계했다 — scratchpad/deploy/GATES.md 의 A5 가 같은 outcome(배경탭·제스처·하드웨어백·액션다이얼로그로 닫은 뒤 스크롤 생존)을 안드로이드 에뮬레이터 릴리즈 빌드에서 측정한다. 여기서 지운 것이 아니라 옮긴 것이며, 최종 보고에 그대로 드러난다.
