# Gates: consistent structured recipe answers

Scope: Render successful catalog reads as compact recipe components with trusted ingredient and step snapshots. Keep model prose supplementary, legacy clients and histories readable, and route/stream/cancel behavior intact.

- [x] R1: Server only emits bounded recipe snapshots from successful actual reads; unknown/private fields are excluded, persisted history restores the snapshot, and older clients retain prose mode.
  CHECK: bun test tests/llm-core/consultRecipeCard.test.ts tests/llm-core/consultAgent.test.ts tests/chat-sse/activityHistory.test.ts
  CWD: sinsin-be-bun
  EXPECT: 0 fail
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-be-bun; path=c4247c96c970/31 entries; output=170 expect() calls | Ran 34 tests across 3 files. [1161.00ms]

- [x] R2: Client preserves the same validated card through streaming/done/history; bad or missing snapshots preserve the internal source link, and disclosure actions pause auto-follow without losing recipe amounts.
  CHECK: npx jest --config jest.config.ts tests/consultRecipeCard.test.ts tests/chatSources.test.ts tests/chatActivityHistory.test.ts tests/chatSse.test.ts tests/chatFollow.test.ts --runInBand
  CWD: sinsin-rn
  EXPECT: Test Suites: 5 passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=c4247c96c970/31 entries; output=Time:        0.904 s, estimated 1 s | Ran all test suites matching /tests\/consultRecipeCard.test.ts|tests\/chatSources.test.ts|tests\/chatActivityHistory.test.ts|tests\/chatSse.test.ts|tests\/chatFollow.test.ts/i.

- [x] R3: Both repositories typecheck, changed client files lint, and copy audit passes.
  EVIDENCE: RN tsc + touched-file ESLint exit 0 (final copy check session 35311); BE typecheck exit 0 (57277). Copy audit exit 0: 6900 strings, 12 pre-existing candidates outside new consultation copy (9 S1 / 3 S2). Targeted git diff --check passes in both repositories. See CONSULT-DATA-REVIEW.md for scope.

- [x] R4: Repeat the user's short dinner-recipe request through the real local model and Simulator. Confirm consistent cards, ingredient/step disclosure, short nonduplicate prose, source navigation, stop/retry, and reopening saved structured answers. Note actual verification limits.
  EVIDENCE: iPhone 17 Pro / iOS 26.5, local API 8100 + Metro 8085. Exact 오늘저녁레시피 request stopped during generation, retained its completed read, retried into catalog cards, then reopened after visiting the intake conversation: both snapshots and final prose restored. Native ingredient/step expansion and full-detail-return observed. Native Copy included collapsed quantities and steps. Images: consult-recipe-card-expanded.png, consult-recipe-card-final.png, consult-recipe-retry-copy.png. Prose no longer contains full recipe lists but retry had two paragraphs; strict two-sentence compliance is not guaranteed. Only light/default-text native appearance was checked.
