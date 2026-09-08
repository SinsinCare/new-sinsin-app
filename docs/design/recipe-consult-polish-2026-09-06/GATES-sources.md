# Gates: actionable tool evidence and stable transcript

Scope: Turn actual recipe reads into compact links to the existing recipe detail; preserve disclosure state through stream completion and leave scroll control with the reader. Keep the original consultation quality goal intact.

- [x] S1: Only successfully read catalog recipes produce bounded source metadata, with no model-generated URLs or private tool arguments; source receipts survive answer persistence.
  CHECK: cd ../sinsin-be-bun && bun test tests/llm-core/consultAgent.test.ts tests/chat-sse/activityHistory.test.ts tests/llm-core/guards.test.ts && bunx tsc --noEmit
  EXPECT: 0 fail
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=148 expect() calls | Ran 83 tests across 3 files. [768.00ms]

- [x] S2: Source links are validated and deduplicated; streaming identity remains stable when the server assigns an ID, and reader disclosure pauses automatic following until explicitly resumed.
  CHECK: npx jest tests/chatSources.test.ts tests/chatFollow.test.ts tests/chatActivityHistory.test.ts tests/chatSse.test.ts tests/chatTranscript.test.ts tests/consultSession.test.ts --runInBand
  EXPECT: Test Suites: 6 passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        1.408 s | Ran all test suites matching /tests\/chatSources.test.ts|tests\/chatFollow.test.ts|tests\/chatActivityHistory.test.ts|tests\/chatSse.test.ts|tests\/chatTranscript.test.ts|tests\/consultSession.test.ts/i.

- [x] S3: Changed consultation frontend passes type and lint checks.
  CHECK: npx tsc --noEmit && npx eslint src/types/chat.ts src/features/consultation/components/ConsultSources.tsx src/features/consultation/components/ConsultActivityTrail.tsx src/features/consultation/components/ChatMessageBubble.tsx src/features/consultation/hooks/useChat.ts src/features/consultation/hooks/useChatFollow.ts src/features/consultation/views/ConsultScreen.tsx && node -e "console.log('CONSULT_SOURCE_STATIC_OK')"
  EXPECT: CONSULT_SOURCE_STATIC_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=CONSULT_SOURCE_STATIC_OK

- [x] S4: Mobbin source disclosures are compared; actual Simulator conversation opens the tool-read recipe and returns to the same answer, including after history reload.
  EVIDENCE: Mobbin ChatGPT source footer 8cf567ec-633b-4d0b-81b8-4e05de5fdb9c and source sheet 3eaf4e44-fdce-48bc-965b-b194ed9c43ac viewed. Simulator live answer opened tofu stew detail and returned; after new chat and history reload, second link opened spinach tofu salad detail and returned to the same persisted answer with both source links. consult-source-links.png and consult-restored-source-links.png.

- [x] S5: Stream completion preserves an open activity disclosure; content growth and manual follow/resume behavior are checked, with remaining physical scroll limitations recorded honestly.
  EVIDENCE: Simulator activity disclosure opened during generation remained expanded after completion and server ID assignment; question stayed visible as content grew, and Recent answer resumed bottom following. consult-stable-disclosure.png records the result. Hook tests cover user drag, accessibility scroll, layout growth, and programmatic resume versus user momentum. CUA coordinate scroll again returned -10005:noWindowsAvailable; continuous finger scrolling and FPS remain unverified, not counted as passed.
