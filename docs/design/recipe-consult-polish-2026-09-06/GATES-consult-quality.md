# Gates: live answer quality and tool relevance

Scope: Evaluate the configured model through the real consultation prompt, tool loop, and output guards, using only synthetic records and recipe facts. No user records, DB writes, or clinical efficacy claims. Findings must be judged against the complete question and returned facts, not just successful HTTP status.

- [x] Q1: A reproducible opt-in live evaluator records question, public activity, actual fixture tool calls, first-text latency, completion time, and the final guarded answer. It refuses live execution without an explicit flag; secrets and raw reasoning/provider bodies never enter output.
  CHECK: cd ../sinsin-be-bun && bunx tsc --noEmit && bun scripts/evaluate-consultation.ts
  EXPECT: "mode":"preview"
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output={"mode":"preview","cases":[{"id":"greeting","question":"안녕! 오늘도 잘 부탁해.","category":"NONE"},{"id":"two-recipes","question":"앱에서 두부 레시피 두 개를 찾아서 각각 재료와 분량을 알려줘.","category":"FOOD_DIET"},{"id":"missing-intake","question":"오늘 기록한 나트륨 섭취량을 알려줘."

- [x] Q2: Run representative real model cases for simple conversation, two-recipe facts, absent intake, recorded zero, and failed lookup. Review actual outputs for factual grounding, missing-versus-zero distinction, relevant tools, and compact readable formatting. Record failures as failures and fix substantiated defects.
  EVIDENCE: 2026-09-06 live configured gpt-5.6-luna/high; baseline.json (5 cases), streamed.json and streamed-repeat.json (5 cases each), final-recipe-hierarchy.json (1 focused case) reviewed against the synthetic fixtures. All final cases STOP/error=null. Two recipe details and all six ingredient amounts match; missing and zero remain distinct; failures retain error activity and do not invent facts or promise automatic follow-up. Final single-read answers use two streamed model requests, with first text before completion; recipes use three requests. Timing varies and is not a speed SLO. Rejected finish-control prototype had added latency. Full evidence and limits: ../sinsin-be-bun/docs/consult-quality-2026-09-06/README.md. Manual review covers model/output contracts, not native UI.

- [x] Q3: Any implementation changes caused by evaluation retain prompt, provider, tool, streaming and safety regression coverage.
  CHECK: cd ../sinsin-be-bun && bun test tests/llm-core/consultAgent.test.ts tests/llm-core/guards.test.ts tests/llm-core/requests.test.ts tests/llm-core/prompts.test.ts tests/llm-core/promptInvariants.test.ts tests/llm-core/fallback.test.ts tests/llm-core/stream.test.ts
  EXPECT: 0 fail
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=600 expect() calls | Ran 202 tests across 7 files. [400.00ms]

- [x] Q4: Tool-selection rounds stream public answer text through the same existing guard, without an extra finish-control request. Complete provider tool calls and private reasoning return only to the provider. Every call ID gets a result; incomplete or malformed calls never execute; two-round/six-read limits and cancellation remain intact.
  CHECK: cd ../sinsin-be-bun && bun test tests/llm-core/consultAgent.test.ts && bunx tsc --noEmit
  EXPECT: 0 fail
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=92 expect() calls | Ran 26 tests across 1 file. [266.00ms]
