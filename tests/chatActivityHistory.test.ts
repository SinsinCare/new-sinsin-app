import { mapMessage, parseActivityHistory, type MessageData } from "../src/types/chat"

const receipt = { id: "tool_1", action: "recipes", status: "complete", resultCount: 4 }
const dto: MessageData = { messageId: 23, role: "ASSISTANT", content: "찾은 레시피예요", category: null, categoryLabel: null, createdAt: "2026-09-06T01:00:00" }

test("reopening a saved answer restores verified tool history, without private extras", () => {
  const restored = mapMessage({ ...dto, activities: [{ ...receipt, arguments: "private", reasoning: "private" }] }, 5)
  expect(restored.activities).toEqual([receipt])
  expect(restored.content).toBe(dto.content)
  expect(restored.createdAt.toISOString()).toBe("2026-09-06T01:00:00.000Z")
})

test("legacy and user messages do not acquire fabricated history", () => {
  expect(mapMessage(dto, 5).activities).toBeUndefined()
  expect(mapMessage({ ...dto, role: "USER", activities: [receipt] }, 5).activities).toBeUndefined()
  expect(parseActivityHistory("not an array")).toEqual([])
})

test("old spinners, unknown actions, invalid IDs and arbitrary states are rejected", () => {
  expect(parseActivityHistory([null, [], { ...receipt, status: "running" }, { ...receipt, status: "stopped" }, { ...receipt, action: "shell" }, { ...receipt, id: "<bad>" }, receipt])).toEqual([receipt])
  expect(parseActivityHistory([{ ...receipt, resultCount: Infinity }])).toEqual([{ id: "tool_1", action: "recipes", status: "complete" }])
})

test("history stays bounded and updates a duplicate in place", () => {
  expect(parseActivityHistory(Array.from({ length: 1000 }, (_, i) => ({ ...receipt, id: `id_${i}` })))).toHaveLength(24)
  expect(parseActivityHistory([receipt, { ...receipt, status: "error" }])).toHaveLength(1)
  expect(parseActivityHistory([receipt, { ...receipt, status: "error" }])[0]?.status).toBe("error")
})
