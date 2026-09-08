# Gates: durable agent activity and usable consultation history

Scope: Preserve validated tool results when reopening an answer; improve compact conversation search and list behavior. Follow the existing legacy Alembic migration owner, apply only the new nullable metadata field on verified local databases, and leave unrelated schema changes alone.

- [x] H1: Stored activity is bounded, enum-only terminal metadata; completed answers and regeneration save it atomically, while failed or canceled regeneration preserves the original answer.
  CHECK: cd ../sinsin-be-bun && bun test tests/chat-sse/activityHistory.test.ts tests/chat-sse/stream.test.ts tests/llm-core/consultAgent.test.ts && bunx tsc --noEmit
  EXPECT: 0 fail
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=162 expect() calls | Ran 36 tests across 3 files. [1223.00ms]

- [x] H2: Frontend history mapping rejects invalid or live activity and restores valid traces; search and grouping preserve recent ordering and unknown metadata is not shown.
  CHECK: npx jest tests/chatActivityHistory.test.ts tests/chatHistoryPresentation.test.ts tests/chatSse.test.ts tests/chatRegenerate.test.ts --runInBand
  EXPECT: Test Suites: 4 passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        1.48 s | Ran all test suites matching /tests\/chatActivityHistory.test.ts|tests\/chatHistoryPresentation.test.ts|tests\/chatSse.test.ts|tests\/chatRegenerate.test.ts/i.

- [x] H3: Changed frontend passes type and lint checks.
  CHECK: npx tsc --noEmit && npx eslint src/types/chat.ts src/features/consultation/components/ChatHistorySheet.tsx src/features/consultation/components/ConsultActivityTrail.tsx src/features/consultation/components/ChatMessageBubble.tsx src/features/consultation/views/ConsultScreen.tsx src/features/consultation/lib/chatHistoryPresentation.ts src/services/data/chatApiService.ts src/features/consultation/hooks/useChat.ts && node -e "console.log('HISTORY_STATIC_OK')"
  EXPECT: HISTORY_STATIC_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=HISTORY_STATIC_OK

- [x] H4: Actual tool-backed answer keeps its activity after opening history and reloading it in the local Simulator. Search, empty result, clearing search and return are exercised.
  EVIDENCE: iPhone 17 Pro/iOS 26.5 local TEST: real tofu recipe search (4 results) and ingredients check completed. Reset to empty new chat, reopened saved conversation, expanded the restored 2 tool checks. Korean search, no matches, clear and new chat verified. consult-restored-activity.png and consult-history-search-empty.png.

- [x] H5: Mobbin comparison and runtime screenshots document final hierarchy, disclosure behavior and remaining native QA limitations.
  EVIDENCE: REVIEW.md follow-up records inspected ChatGPT/Codex Mobbin history references, final compact list/search and restored activity screenshots, 096 migration boundary, and continuing scroll/dark/large-text QA exclusions.
