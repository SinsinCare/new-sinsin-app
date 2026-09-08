# Gates: readable consultation answers

Scope: Remove conflicting transcript formatting rules and unnecessary closing boilerplate. Preserve medical boundaries, facts, and the character's existing warm tone.

- [x] T1: Existing prompt, medical-boundary, provider request, and tool-loop checks remain passing after the prompt change.
  CHECK: cd ../sinsin-be-bun && bun test tests/llm-core/promptInvariants.test.ts tests/llm-core/promptDivergenceShape.test.ts tests/llm-core/prompts.test.ts tests/llm-core/requests.test.ts tests/llm-core/guards.test.ts tests/llm-core/consultAgent.test.ts && bunx tsc --noEmit
  EXPECT: 0 fail
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=385 expect() calls | Ran 163 tests across 6 files. [373.00ms]

- [x] T2: A real Simulator two-recipe request produces separately scannable recipe items, preserves tool-returned quantities, and avoids a generic closing disclaimer on the simple catalog lookup. This is a single live example, not a model-wide quality score.
  EVIDENCE: On the real Simulator, regenerated the same owned two-recipe TEST question. The reply rendered two separate bullets with bold recipe names and no generic suitability disclaimer. Six named ingredient amounts matched a read-only check through recipeConsultFacts against loopback local sinsin catalog. consult-compact-comparison.png. Prompt/type/guard checks are T1; this example alone is not a population-level model evaluation.

- [x] T3: Rendering keeps recognized amounts and units together without rewriting persisted/copyable text or code. Existing Markdown tests and static checks pass; the observed small-spoon line break is checked in Simulator.
  CHECK: npx jest tests/chatMarkdown.test.ts --runInBand && npx tsc --noEmit && npx eslint src/features/consultation/utils/chatMarkdown.ts src/features/consultation/components/ChatMessageBubble.tsx
  EXPECT: Test Suites: 1 passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        1.308 s, estimated 2 s | Ran all test suites matching /tests\/chatMarkdown.test.ts/i.

Native T3 evidence: After rendering with a word joiner at the numeric/recognized-unit boundary, the entire `1작은술` moved to the next line together (consult-compact-comparison.png). The existing copy handler still receives message.content; only Markdown text-node presentation changes. Code nodes keep their original renderer.
