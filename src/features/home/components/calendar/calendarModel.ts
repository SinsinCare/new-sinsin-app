import { toDateStr } from "../../utils/dateUtils"

export function calendarMonth(date: Date, offset = 0): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1)
}

/** Keep six rows stable when browsing 4-, 5- and 6-week months. Monday first,
 * matching the statistics API's Monday-Sunday week window in both languages. */
export function calendarWeeks(month: Date): (Date | null)[][] {
  const first = calendarMonth(month)
  const offset = (first.getDay() + 6) % 7
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - offset + 1
    return day > 0 && day <= days
      ? new Date(first.getFullYear(), first.getMonth(), day)
      : null
  })
  return Array.from({ length: 6 }, (_, row) =>
    cells.slice(row * 7, row * 7 + 7),
  )
}

/** Compare civil dates, not instants: the whole of today is "today", not only its first tick. */
export function isFutureCalendarDate(date: Date, today = new Date()): boolean {
  return toDateStr(date) > toDateStr(today)
}

/** Do not parse YYYY-MM-DD through new Date(): west of UTC it becomes yesterday. */
export function diaryDateKeys(
  items: { date: string; exists: boolean }[],
): Set<string> {
  return new Set(
    items.filter((item) => item.exists).map((item) => item.date.slice(0, 10)),
  )
}

/**
 * `Intl.DateTimeFormat` 은 **만드는 비용**이 크다 — 로케일 데이터를 읽어 오는 생성이라
 * 한 개에 수백 µs 다. 월 달력은 42칸이 렌더마다 접근성 라벨용·요일용 서식기를 새로 만들고
 * 시트 머리도 몇 개를 더 만들어, 스크롤 한 틱에 ~50개가 생겼다 놓였다. 같은
 * (로케일, 옵션) 조합은 결과가 같으므로 한 번 만든 것을 모듈 캐시에서 꺼내 쓴다.
 * 옵션은 화면이 리터럴로 주므로 JSON 키가 안정적이다.
 */
const formatterCache = new Map<string, Intl.DateTimeFormat>()

export function calendarDateFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  let formatter = formatterCache.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options)
    formatterCache.set(key, formatter)
  }
  return formatter
}
