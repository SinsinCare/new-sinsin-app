/**
 * 진단 시기는 연·월까지만 받는다 — 환자가 진단받은 "날"을 기억하는 경우는 드물다.
 * 저장·전송은 `YYYY-MM-01`, 표시는 로케일별 연·월.
 *
 * 온보딩과 마이페이지가 같은 값을 다르게 그리면 사용자는 둘을 다른 정보로 읽는다.
 * 그래서 파싱·조립·표시를 여기 한 곳에 둔다.
 */

export interface YearMonth {
  year: number
  month: number
}

export function parseDiagnosisDate(
  iso: string | null | undefined,
): YearMonth | null {
  const match = /^(\d{4})-(\d{2})/.exec(iso ?? "")
  if (!match) return null
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return { year: Number(match[1]), month }
}

/** 서버 계약은 날짜 컬럼이라 일자가 필요하다. 연·월만 받으므로 1일로 고정한다. */
export function toDiagnosisDateIso({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, "0")}-01`
}

export function formatDiagnosisDate(
  iso: string | null | undefined,
  language: string,
): string | null {
  const parsed = parseDiagnosisDate(iso)
  if (!parsed) return null
  return new Intl.DateTimeFormat(
    language.startsWith("en") ? "en-US" : "ko-KR",
    { year: "numeric", month: "long" },
  ).format(new Date(parsed.year, parsed.month - 1, 1))
}
