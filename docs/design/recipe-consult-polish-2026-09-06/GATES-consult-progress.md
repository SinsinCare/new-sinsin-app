# Gates: compact consultation progress and text shimmer

Scope: Replace the repeated phase checklist with a single live status and an expandable list of actual read results. Preserve real outcomes and previously saved history; no provider/raw reasoning changes. Use compact v2 type/spacing and the existing mascot.

- [x] P1: The presentation maps thinking/answer phases to the live headline only. Details and counts contain actual reads, duplicate updates do not add rows, and failed/stopped/empty states are accurate.
  CHECK: npx jest --config jest.config.ts tests/consultProgress.test.ts tests/chatActivityHistory.test.ts tests/chatSources.test.ts --runInBand
  EXPECT: Test Suites: 3 passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        1.757 s, estimated 2 s | Ran all test suites matching /tests\/consultProgress.test.ts|tests\/chatActivityHistory.test.ts|tests\/chatSources.test.ts/i.

- [x] P2: Text shimmer runs only for the active response on a focused foreground screen. Completion, stop, reduced motion, background and unmount cancel it; no per-frame JS timer or layout animation. Text size and wrapping match the static label.
  CHECK: npx jest --config jest.config.ts tests/consultProgressMotion.test.ts --runInBand
  EXPECT: Test Suites: 1 passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        0.715 s, estimated 2 s | Ran all test suites matching /tests\/consultProgressMotion.test.ts/i.

- [x] P3: Types, changed-file lint, Korean copy audit, and existing disclosure/follow/stream/history regression checks pass.
  CHECK: npx tsc --noEmit && npx eslint src/features/consultation/components/ChatMessageBubble.tsx src/features/consultation/components/ConsultActivityTrail.tsx src/features/consultation/components/ConsultShimmerText.tsx src/features/consultation/hooks/useConsultMotion.ts src/features/consultation/lib/consultProgress.ts && npm run audit:ux-copy && npx jest --config jest.config.ts tests/chatFollow.test.ts tests/chatTranscript.test.ts tests/consultSession.test.ts --runInBand
  EXPECT: Test Suites: 3 passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        2.397 s | Ran all test suites matching /tests\/chatFollow.test.ts|tests\/chatTranscript.test.ts|tests\/consultSession.test.ts/i.

- [x] P4: Simulator shows one stable live status with visible text shimmer; completed/expanded history shows actual reads without generic phase rows, and no-tool answers have no empty disclosure. Verify stop/retry and saved answer reopening. Record any native-only limits honestly.
  EVIDENCE: iPhone 17 Pro / iOS 26.5 local TEST: real health-target/intake/search/two-recipe request produced exactly 5 read rows, including no-record and 4-found outcomes. consult-progress-live.mp4 and shimmer-a/b.png show native text color movement with stable line position. consult-progress-complete-expanded.png and consult-progress-restored.png show completed and reloaded actual reads; consult-progress-no-tools.png has no disclosure. Retry completed, then a further regeneration was stopped; consult-progress-stopped.png shows one stopped headline and the retry action, with no duplicate stopped paragraph. Final static-heading refinement passed an additional npx tsc --noEmit and targeted ConsultActivityTrail ESLint. Reduced-motion/background/blur lifecycle is verified by P2's production-hook tests; OS setting changes, physical VoiceOver, Android, large text and dark-mode native checks are not claimed.
