import { chatMessageKey, consultSources, mapMessage, parseConsultActivity, parseConsultSources, recipeSourceRoute, reconcileStreamedMessage, type Message } from "../src/types/chat"

const source = { type: "recipe" as const, id: 45, title: "두부 채소찜" }
const receipt = { id: "t1", action: "recipe", status: "complete", sources: [source] }
test("only successful detail reads expose compact internal recipe links", () => {
  const valid = parseConsultActivity({ ...receipt, sources: [{ ...source, url: "https://untrusted.invalid", instructions: "private" }] })!
  expect(consultSources([valid])).toEqual([source])
  expect(recipeSourceRoute(source)).toBe("/recipe/45")
  expect(consultSources([valid, { ...valid, id: "t2" }])).toEqual([source])
  for (const overrides of [{ status: "running" }, { status: "error" }, { outcome: "empty" }, { action: "recipes" }]) {
    expect(parseConsultActivity({ ...receipt, ...overrides })?.sources).toBeUndefined()
  }
})
test("source titles and IDs are bounded and cannot specify a URL or another destination", () => {
  expect(parseConsultSources([{ ...source, id: -1 }, { ...source, id: 2147483648 }, { ...source, id: "45" }, { ...source, type: "url" }, { ...source, title: "x".repeat(121) }, { ...source, title: "숨김\u202e문구" }])).toEqual([])
  expect(parseConsultSources(Array.from({ length: 1000 }, (_, i) => ({ ...source, id: i + 1 })))).toHaveLength(4)
  const restored = mapMessage({ messageId: 1, role: "ASSISTANT", content: "답변", category: null, categoryLabel: null, createdAt: "2026-09-06T01:00:00", activities: [receipt] }, 2)
  expect(consultSources(restored.activities!)).toEqual([source])
})
test("completion and late chunks preserve the same render identity without duplicate rows", () => {
  const placeholder: Message = { id: -3, clientKey: "local--3", conversationId: -1, role: "assistant", content: "", createdAt: new Date() }
  const completed = { ...placeholder, clientKey: undefined, id: 123, conversationId: 2, content: "완료" }
  const result = reconcileStreamedMessage([placeholder], -3, completed)
  expect(result).toHaveLength(1)
  expect(result[0]?.id).toBe(123)
  expect(chatMessageKey(result[0]!)).toBe(chatMessageKey(placeholder))
  expect(reconcileStreamedMessage(result, -3, completed)).toHaveLength(1)
  expect(chatMessageKey(reconcileStreamedMessage(result, -3, completed)[0]!)).toBe("local--3")
  expect(chatMessageKey({ ...completed, id: 124 })).not.toBe(chatMessageKey(completed))
})
