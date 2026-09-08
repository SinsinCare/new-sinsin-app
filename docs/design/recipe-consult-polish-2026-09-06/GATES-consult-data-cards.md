# Gates: verified consultation data UI

Scope: Audit the four read tools; add compact personal-target and recorded-intake cards where exact comparison helps, discoverable draft shortcuts, and correct public answer phase handling. Preserve actual data provenance, missing records, legacy clients, saved histories and user-controlled disclosure. No diagnosis, invented data or automatic writes.

- [x] U1: Nutrition receipts are bounded, authenticated, date-stamped snapshots. Null/zero/over-target/weight-derived protein and invalid data are distinct. Private profile text never enters cards. SSE and saved history retain the same facts.
  CHECK: bun test tests/llm-core/consultNutritionCard.test.ts tests/chat-sse/activityHistory.test.ts
  CWD: sinsin-be-bun
  EXPECT: 0 fail
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-be-bun; path=c4247c96c970/31 entries; output=99 expect() calls | Ran 9 tests across 2 files. [913.00ms]

- [x] U2: Compact target/intake cards merge redundant same-day target reads, use factual amount comparisons without medical safety colors, preserve unknown states and show query time. Quick actions only draft questions. Copy includes collapsed card facts and provenance. Native routes and scroll ownership remain intact.
  CHECK: npx jest --config jest.config.ts tests/consultNutritionCard.test.ts tests/consultCopy.test.ts tests/chatSse.test.ts tests/chatFollow.test.ts tests/consultSession.test.ts --runInBand
  CWD: sinsin-rn
  EXPECT: Test Suites: 5 passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=c4247c96c970/31 entries; output=Time:        0.963 s, estimated 2 s | Ran all test suites matching /tests\/consultNutritionCard.test.ts|tests\/consultCopy.test.ts|tests\/chatSse.test.ts|tests\/chatFollow.test.ts|tests\/consultSession.test.ts/i.

- [x] U3: OpenAI public commentary is not concatenated into final-answer prose; message phases stay request-local, tool context retains phase, and private reasoning never enters UI. Existing unphased providers and guarded streaming still work.
  CHECK: bun test tests/llm-core/consultStreamPhase.test.ts tests/llm-core/consultAgent.test.ts tests/llm-core/stream.test.ts
  CWD: sinsin-be-bun
  EXPECT: 0 fail
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-be-bun; path=c4247c96c970/31 entries; output=263 expect() calls | Ran 57 tests across 3 files. [302.00ms]

- [x] U4: Real local model and iPhone Simulator demonstrate target/intake queries, disclosure, re-opened histories and the recipe fix. Record visual and interaction evidence and actual device limitations.
  EVIDENCE: Native three shortcuts drafted without sending; actual target read displayed five stored values with expandable protein weight basis; actual empty-intake read displayed unknown amounts, not zero. Reopened intake retained original 10:50 lookup time. Native Copy included five rows, units, timestamp and protein/water basis while collapsed. Recipe stop/retry and subsequent history restore succeeded. Images: consult-nutrition-targets-basis.png, consult-nutrition-empty.png, consult-recipe-retry-copy.png. Populated/zero/excess are fixture evidence only; native account had no current intake records. OS appearance/text/motion settings unchanged.

- [x] U5: Both repositories typecheck; touched client files lint; copy audit and contract/lifecycle/stream regressions pass. Audit decisions and reference links are recorded.
  EVIDENCE: RN final tsc + touched-file ESLint exit 0 (35311); BE typecheck exit 0 (57277). RN 10-suite contract/lifecycle/progress/motion run passed 67 tests, then new bilingual copy tests passed; U2 reran copy with transport/follow/session suites. Backend gates cover numeric fixtures, actual authenticated tool construction, SSE/history, cancellation, phase handling and guarded streams. Copy audit exit 0 with 12 existing unrelated candidates; targeted diff checks pass. Decisions, inspected Mobbin links and official phase schema documented in CONSULT-DATA-REVIEW.md. No statistical speed or untested native-mode claim.
