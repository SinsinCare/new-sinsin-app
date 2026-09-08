# Consultation motion and history

Scope: stable public progress, answer-before-result presentation, interruptible disclosure motion, and a compact full-page history surface. Preserve data receipts, conversation/draft identity and actual stop/retry behavior.

- [x] M1: Sub-200ms read phases do not flash; completed reads never regress to initial thinking; terminal states are immediate; rapid updates coalesce rather than queue stale labels.
  CHECK: npx jest --config jest.config.ts tests/consultProgress.test.ts tests/consultPresentation.test.ts tests/consultProgressMotion.test.ts --runInBand
  EXPECT: Test Suites: 3 passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        0.812 s, estimated 1 s | Ran all test suites matching /tests\/consultProgress.test.ts|tests\/consultPresentation.test.ts|tests\/consultProgressMotion.test.ts/i.

- [x] M2: Live result cards wait until the answer finishes; old history is immediately readable; canceled/failed/retried answers cannot leak a delayed card from an old turn. Disclosure motion preserves amounts, accessibility and follow-scroll ownership.
  CHECK: npx jest --config jest.config.ts tests/consultRecipeCard.test.ts tests/consultNutritionCard.test.ts tests/chatTranscript.test.ts tests/chatFollow.test.ts tests/consultSession.test.ts tests/consultCopy.test.ts --runInBand
  EXPECT: Test Suites: 6 passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        0.994 s, estimated 2 s | Ran all test suites matching /tests\/consultRecipeCard.test.ts|tests\/consultNutritionCard.test.ts|tests\/chatTranscript.test.ts|tests\/chatFollow.test.ts|tests\/consultSession.test.ts|tests\/consultCop

- [x] M3: History search/grouping and row actions preserve stable IDs, selection, drafts and navigation; title, timestamp and summary have distinct compact hierarchy. Search empty/clear and modal actions work.
  CHECK: npx jest --config jest.config.ts tests/chatHistoryPresentation.test.ts tests/consultHistoryScreen.test.ts tests/consultExitGuard.test.ts --runInBand
  EXPECT: Test Suites: 3 passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        0.841 s, estimated 3 s | Ran all test suites matching /tests\/chatHistoryPresentation.test.ts|tests\/consultHistoryScreen.test.ts|tests\/consultExitGuard.test.ts/i.

- [x] M4: Typecheck, touched-file lint and copy audit pass; changes and inspected references are documented.
  EVIDENCE: 2026-09-06: npx tsc --noEmit exit=0 (session 61332); ESLint for 16 changed consultation source files exit=0 (session 72400); scoped git diff --check exit=0. UX copy audit exit=0, 12 existing candidates, no new consultation candidate. REVIEW.md records inspected Mobbin screens, implementation policy and limits.

- [x] M5: Real local model + Simulator video/interaction checks show stable progress, prose-before-cards, interruptible expand/collapse, history search/clear/selection/rename cancellation, and stop/retry. Record native mode limits explicitly.
  EVIDENCE: 2026-09-06: iPhone 17 Pro / iOS 26.5 / light / default text. Final consult-live-motion.mp4 and handoff-frames.jpg show complete prose before result fade with reading position retained; disclosure-frames.jpg shows intermediate height/chevron motion. Four real tool receipts, stop -> stopped -> retry -> completed, tool/recipe/basis open-close and hidden accessibility verified. History empty/clear/search/selection and rename cancel preserving query/title verified. Sub-220ms reversal is covered by the deterministic M1 component test; native repeated taps and intermediate frames were inspected. First Fast Refresh recording excluded. Dark/large-text/reduced-motion native variants not rerun; limits in REVIEW.md.
