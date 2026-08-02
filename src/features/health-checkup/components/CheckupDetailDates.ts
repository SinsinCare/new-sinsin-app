/**
 * 검진 상세·캘린더가 같이 쓰는 날짜/수치 서식.
 *
 * ## 구분자를 믿지 않는 이유
 * 같은 응답 안에서 날짜 표기가 두 가지다. `AnalysisMetric.checkupDate` 는 검진 원본을 그대로
 * 들고 오고("2026.05.21"), `TimelineEntry.date` 와 `CalendarDay.date` 는 ISO 로 정규화돼
 * 내려온다("2026-05-21"). 그래서 파싱은 구분자를 보지 않고 숫자만 뽑는다 — 서버가 표기를
 * 통일하더라도 이 함수는 계속 맞는다.
 *
 * ## `new Date("2026-05-21")` 을 쓰지 않는 이유
 * 그 형식은 스펙상 **UTC 자정**으로 해석된다. UTC-n 시간대(미주)에서는 하루 전으로 밀려서
 * 달력의 점이 통째로 하루씩 어긋난다. 문자열은 문자열로 자르고, 달력 좌표를 만들 때만
 * `new Date(y, m, d)`(로컬 생성자)를 쓴다.
 */

export interface CheckupYmd {
  year: number
  /** 1~12 (Date 의 0-based month 가 아니다) */
  month: number
  day: number
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

export function parseCheckupYmd(
  raw: string | null | undefined,
): CheckupYmd | null {
  const digits = (raw ?? "").replace(/[^0-9]/g, "")
  if (digits.length < 8) return null
  const year = Number(digits.slice(0, 4))
  const month = Number(digits.slice(4, 6))
  const day = Number(digits.slice(6, 8))
  if (!year || !month || month > 12 || !day || day > 31) return null
  return { year, month, day }
}

/**
 * 회차 정렬용 키. 표기가 섞여도("2026.05.21" vs "2026-05-21") 같은 순서가 나오도록
 * 숫자만 남긴 뒤 문자열 비교한다.
 */
export function checkupSortKey(raw: string): string {
  return raw.replace(/[^0-9]/g, "")
}

/** "2023. 12. 15" — 시안의 타임라인 그룹 헤더 표기. 숫자 서식이라 번역 대상이 아니다. */
export function formatCheckupDate(raw: string): string {
  const ymd = parseCheckupYmd(raw)
  if (!ymd) return raw
  return `${ymd.year}. ${pad2(ymd.month)}. ${pad2(ymd.day)}`
}

/** 로컬 달력 좌표 → 캘린더 조회 키. `toISOString()` 은 UTC 로 밀리므로 쓰지 않는다. */
export function toIsoDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

/**
 * 검사 수치 표기.
 *
 * 소수 자릿수를 강제하지 않는다. 시안의 "9.0" 을 흉내내려고 `toFixed(1)` 을 걸면
 * 크레아티닌(0.5~1.2 범위)의 유효 자릿수가 잘려 다른 값이 된다. 부동소수 찌꺼기
 * (0.30000000000000004)만 걷어내고 나머지는 서버가 준 정밀도를 그대로 보여 준다.
 */
export function formatMetricValue(value: number): string {
  return String(Math.round(value * 100) / 100)
}

/**
 * "지난 진단 대비" 뒤에 붙는 변화량. 부호는 여기서 직접 붙인다 —
 * `delta` 는 음수도 그대로 오지만 시안은 "- 9.0" 처럼 부호와 숫자를 띄어 쓴다.
 */
export function formatCheckupDelta(
  delta: number,
  direction: "up" | "down" | null,
): string {
  const magnitude = formatMetricValue(Math.abs(delta))
  if (direction === "up") return `+ ${magnitude}`
  if (direction === "down") return `- ${magnitude}`
  return magnitude
}

/** "eGFR 신장 수치 71.3 mL/min" — 단위가 비어 있는 지표도 있어 join 으로 조립한다. */
export function formatMetricHeadline(
  label: string,
  value: number,
  unit: string,
): string {
  return [label, formatMetricValue(value), unit].filter(Boolean).join(" ")
}
