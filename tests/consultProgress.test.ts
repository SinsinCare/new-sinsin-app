import { consultProgress } from "../src/features/consultation/lib/consultProgress"
import type { ConsultActivity } from "../src/types/chat"
const phase = (
  action: ConsultActivity["action"],
  status: ConsultActivity["status"] = "complete",
  id: string = action,
): ConsultActivity => ({ id, action, status })

test("the reported three-row stack becomes one real health-target receipt", () => {
  const result = consultProgress(
    [phase("thinking"), phase("profile"), phase("answer")],
    false,
  )
  expect(result.tools).toEqual([phase("profile")])
  expect(result.headlineKey).toBe("consult.activity.checkedInfo")
  expect(result.canExpand).toBe(true)
})
test("phase-only and legacy answers do not offer an empty disclosure", () => {
  for (const activities of [[], [phase("thinking"), phase("answer")]]) {
    const result = consultProgress(activities, false)
    expect(result.tools).toEqual([])
    expect(result.canExpand).toBe(false)
    expect(result.headlineKey).toBe("consult.activity.finished")
  }
})
test("live phases replace one headline while only reads enter the details", () => {
  expect(consultProgress([], true).headlineKey).toBe("consult.activity.waiting")
  const first = [phase("thinking", "running"), phase("recipes", "running")]
  expect(consultProgress(first, true).headlineKey).toBe(
    "consult.activity.recipes",
  )
  const answer = [
    phase("thinking"),
    phase("recipes"),
    phase("answer", "running"),
  ]
  expect(consultProgress(answer, true).headlineKey).toBe(
    "consult.activity.answer",
  )
  expect(
    consultProgress(answer, true).tools.map((item) => item.action),
  ).toEqual(["recipes"])
})
test("duplicate updates replace a row but distinct real reads stay distinct", () => {
  const result = consultProgress(
    [
      phase("recipe", "running", "a"),
      phase("recipe", "complete", "a"),
      phase("recipe", "complete", "b"),
    ],
    false,
  )
  expect(result.tools.map((item) => [item.id, item.status])).toEqual([
    ["a", "complete"],
    ["b", "complete"],
  ])
})
test("read failure stays visible while recovered provider phases do not taint a good answer", () => {
  expect(
    consultProgress([phase("recipes", "error"), phase("answer")], false)
      .headlineKey,
  ).toBe("consult.activity.partial")
  expect(
    consultProgress(
      [phase("thinking", "error"), phase("profile"), phase("answer")],
      false,
    ).headlineKey,
  ).toBe("consult.activity.checkedInfo")
})
test("answer failure and user stop take priority over completed reads", () => {
  expect(consultProgress([phase("profile")], false, "failed").headlineKey).toBe(
    "consult.answerFailed",
  )
  expect(
    consultProgress([phase("profile")], false, "stopped").headlineKey,
  ).toBe("consult.activity.stopped")
})
test("inactive unfinished reads never display an eternal spinner or invented completion", () => {
  const original = phase("profile", "running")
  expect(consultProgress([original], false).tools[0]?.status).toBe("stopped")
  expect(consultProgress([original], false, "failed").tools[0]?.status).toBe(
    "error",
  )
  expect(original.status).toBe("running")
})
test("empty, zero-result and actual source details survive presentation unchanged", () => {
  const inputs: ConsultActivity[] = [
    { ...phase("intake"), outcome: "empty" },
    { ...phase("recipes"), resultCount: 0 },
    {
      ...phase("recipe"),
      sources: [{ id: 25, type: "recipe", title: "두부찜" }],
    },
  ]
  expect(consultProgress(inputs, false).tools).toEqual(inputs)
})

test("completed reads do not revive lingering thinking during the gap before final answer", () => {
  const activities = [phase("thinking", "running"), phase("profile")]
  expect(consultProgress(activities, true).headlineKey).toBe(
    "consult.activity.answer",
  )
  expect(
    consultProgress([phase("recipe", "running")], true, undefined, true)
      .headlineKey,
  ).toBe("consult.activity.answer")
})
