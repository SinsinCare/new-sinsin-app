import type { Chat } from "@/src/types/chat"

export type HistoryBucket = "today" | "yesterday" | "week" | "older"
const buckets: HistoryBucket[] = ["today", "yesterday", "week", "older"]

export function chatActivityDate(chat: Chat): Date {
  return chat.updatedAt && Number.isFinite(chat.updatedAt.getTime())
    ? chat.updatedAt
    : chat.createdAt
}

export function historyBucket(date: Date, now: Date): HistoryBucket {
  const day = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((day(now) - day(date)) / 86_400_000)
  return days <= 0
    ? "today"
    : days === 1
      ? "yesterday"
      : days < 7
        ? "week"
        : "older"
}

// 비교용 접기라 `toLowerCase()` 다 — 인자 없는 `toLocaleLowerCase()` 는 터키어 기기에서
// `I` 를 `ı` 로 접어 그 기기만 검색이 어긋난다(`tests/localeIndependentCasing.test.ts`).
const searchable = (value: string) =>
  value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim()

/** Search only the loaded recent history. Match every word, keep last activity ordering. */
export function presentChatHistory(chats: Chat[], query: string, now: Date) {
  const words = searchable(query).split(" ").filter(Boolean)
  const data = chats
    .filter((chat) => {
      const text = searchable(`${chat.title} ${chat.summary ?? ""}`)
      return words.every((word) => text.includes(word))
    })
    .sort(
      (a, b) =>
        chatActivityDate(b).getTime() - chatActivityDate(a).getTime() ||
        b.id - a.id,
    )
  return buckets
    .map((key) => ({
      key,
      data: data.filter(
        (chat) => historyBucket(chatActivityDate(chat), now) === key,
      ),
    }))
    .filter((section) => section.data.length > 0)
}

/** Keep context payloads and repeated summaries out of the browsing hierarchy. */
export function historyRowCopy(chat: Chat) {
  const title = chat.title
    .split(/\n\s*\n/)[0]
    .replace(/\s+/g, " ")
    .trim()
  const summary = (chat.summary ?? "").replace(/\s+/g, " ").trim()
  return {
    title: title || chat.title,
    summary: searchable(summary) === searchable(title) ? "" : summary,
  }
}
export function formatChatHistoryTime(
  chat: Chat,
  now: Date,
  language: string,
): string {
  const date = chatActivityDate(chat)
  const locale = language.startsWith("en") ? "en-US" : "ko-KR"
  return historyBucket(date, now) === "today"
    ? new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(date)
    : new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
      }).format(date)
}
