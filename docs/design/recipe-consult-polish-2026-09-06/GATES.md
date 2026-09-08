# Gates: Recipe hierarchy and AI consultation

Scope: Refine compact recipe presentation and consultation entry, question composition, streaming controls, history and recovery in the existing local TEST app.

Extension requested during implementation: reference Manus and ChatGPT/Codex in Mobbin, add character-led agent activity backed by actual read-only tools, and strengthen grounded answers.

- [x] G9: AI consultation uses a standalone page from all existing entry points, preserving restaurant, meal and exam question context.
  EVIDENCE: Root /consult stack uses card presentation. Restaurant detail Question opens the same page with context; actual name-only test returned the selected restaurant. Existing meal/exam/context round-trip and restaurant entry checks pass. No active RestaurantConsultSheetHost mount remains.

- [x] G7: Read-only consultation tools and bounded, cancellable tool rounds are tested; the existing answer safety boundary remains in use.
  CHECK: cd ../sinsin-be-bun && bun test tests/llm-core/consultAgent.test.ts tests/llm-core/stream.test.ts tests/llm-core/cancellation.test.ts tests/llm-core/requests.test.ts tests/llm-core/guards.test.ts tests/chat-sse/stream.test.ts tests/chat-sse/streamParity.test.ts && bunx tsc --noEmit
  EXPECT: 209 pass
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=1223 expect() calls | Ran 209 tests across 7 files. [1446.00ms]

- [x] G8: Validated activity events reach the app; character animation, expandable activity and stop behavior are verified without fabricated tool or reasoning claims.
  EVIDENCE: Native live recipe query: collapsed activity and expanded recipe search (4 found), ingredients/steps check and answer completion observed; stop interrupted planning, retry completed. consult-tool-trace.png plus actual enum-only API, cancellation and reasoning-exclusion tests. No frame-rate claim.

- [x] G1: Mobbin screens and current UI are visually compared; concrete changes are recorded.
  EVIDENCE: REVIEW.md compares inspected Manus, ChatGPT/Codex and Kitchen Stories references with implementation. Initial mismatched searches were excluded; static references are not motion measurements.

- [x] G2: Consultation lifecycle and recipe presentation checks pass.
  CHECK: npx jest tests/consultSession.test.ts tests/chatSse.test.ts tests/chatTranscript.test.ts tests/chatRegenerate.test.ts tests/chatFailureCopy.test.ts tests/chatMarkdown.test.ts tests/foodConsultMessage.test.ts tests/examConsultMessage.test.ts tests/restaurantConsultMessage.test.ts tests/restaurantAiConsultEntry.test.ts tests/recipeDetailPresentation.test.ts tests/recipeDetailV2.test.ts tests/recipePhotoCard.test.ts --runInBand
  EXPECT: Test Suites: 13 passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        1.325 s, estimated 3 s | Ran all test suites matching /tests\/consultSession.test.ts|tests\/chatSse.test.ts|tests\/chatTranscript.test.ts|tests\/chatRegenerate.test.ts|tests\/chatFailureCopy.test.ts|tests\/chatMarkdown.test.ts|

- [x] G3: Updated frontend has no TypeScript errors.
  CHECK: npx tsc --noEmit && node -e "console.log('TYPECHECK_OK')"
  EXPECT: TYPECHECK_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=TYPECHECK_OK

- [x] G4: Changed code passes targeted lint and the UX copy audit is reviewed.
  CHECK: npx eslint src/features/consultation/views/ConsultScreen.tsx src/features/consultation/hooks/useChat.ts src/features/consultation/hooks/useConsultScreen.ts src/features/consultation/hooks/useChatTranscript.ts src/features/consultation/components/ConsultActivityTrail.tsx src/features/consultation/components/ConsultCompanion.tsx src/features/consultation/components/ConsultChatHeader.tsx src/features/consultation/components/ConsultComposer.tsx src/features/consultation/components/ConsultWelcome.tsx src/features/consultation/components/ConsultAttachMenu.tsx src/services/data/chatApiService.ts src/types/chat.ts src/features/consultation/components/ChatMessageBubble.tsx src/features/consultation/components/ChatHistorySheet.tsx src/features/recipe/components/detail/RecipeTitleBlock.tsx src/features/recipe/components/detail/RecipeHero.tsx src/features/recipe/components/detail/IngredientSection.tsx src/features/recipe/components/detail/NutritionCard.tsx src/features/recipe/components/detail/StepSection.tsx src/features/recipe/components/list/RecipePhotoCard.tsx src/features/restaurant/views/RestaurantDetailScreen.tsx && node -e "console.log('LINT_OK')"
  EXPECT: LINT_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=LINT_OK

- [ ] G5: Recipe browse and detail hierarchy are visually verified in the Simulator.
  EVIDENCE: pending

- [x] G6: Consultation entry, draft question, send/response, stop, history and close are exercised with runtime evidence or a recorded tool limitation.
  EVIDENCE: Native iPhone 17 Pro/iOS 26.5: drafted and edited question, live tool-backed response, stop, retry, history opening/restoration, back to home verified. Explicit regeneration reopened with one question and one answer (consult-regenerated-history.png). Coordinate scrolling is a tool limitation described in REVIEW.md.

ABANDON: G5 Recipe browse and detail upper hierarchy were visually checked (recipe-detail.png), but the full lower-detail visual pass could not be completed because the native scroll tool repeatedly returned -10005 noWindowsAvailable. This is a QA limitation, not a claim of successful scroll verification.
