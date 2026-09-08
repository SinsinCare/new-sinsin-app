import { chatActivityDate, presentChatHistory } from "../src/features/consultation/lib/chatHistoryPresentation"
import type { Chat } from "../src/types/chat"

const now = new Date(2026, 8, 6, 12)
const chat = (id: number, daysAgo: number, title: string, summary?: string): Chat => ({
  id, title, summary, status: "ACTIVE", category: null,
  createdAt: new Date(2026, 7, 1), updatedAt: new Date(2026, 8, 6 - daysAgo, 10),
})

test("old conversations resumed today use last activity, with deterministic recent order", () => {
  const input = [chat(1, 0, "첫 대화"), chat(4, 8, "옛 대화"), chat(3, 0, "다시 시작"), chat(2, 1, "어제")]
  expect(presentChatHistory(input, "", now).map(s => [s.key, s.data.map(c => c.id)])).toEqual([["today", [3, 1]], ["yesterday", [2]], ["older", [4]]])
  expect(input.map(c => c.id)).toEqual([1, 4, 3, 2])
})

test("search matches normalized words across title and summary, then clears to all history", () => {
  const input = [chat(1, 0, "두부 레시피", "국물 없이 조리"), chat(2, 1, "TOFU Salad"), chat(3, 4, "과일 고르기")]
  expect(presentChatHistory(input, " 조리 두부 ", now)[0]?.data.map(c => c.id)).toEqual([1])
  expect(presentChatHistory(input, "ｔｏｆｕ", now)[0]?.data.map(c => c.id)).toEqual([2])
  expect(presentChatHistory(input, "없는 검색어", now)).toEqual([])
  expect(presentChatHistory(input, " ", now).flatMap(s => s.data)).toHaveLength(3)
})

test("missing or invalid update date falls back to creation", () => {
  const item = { ...chat(1, 1, "대화"), updatedAt: new Date(NaN) }
  expect(chatActivityDate(item)).toEqual(item.createdAt)
  expect(presentChatHistory([item], "", now)[0]?.key).toBe("older")
})
