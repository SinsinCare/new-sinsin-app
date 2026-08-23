import i18n from "@/src/i18n"

/**
 * 피드·상세가 같은 상대 시간 표기를 쓴다.
 *
 * Hermes 에는 `Intl.RelativeTimeFormat` 이 **없다**. 엔진이 싣고 있는 Intl 생성자는
 * Collator·DateTimeFormat·NumberFormat 셋뿐이라, 예전 구현처럼 `new Intl.RelativeTimeFormat()`
 * 을 부르면 undefined 를 생성자로 호출해 커뮤니티 피드가 통째로 크래시했다.
 * 상대 시간 문구는 엔진이 아니라 i18n 리소스에서 만든다 — 언어별 복수형도 여기서 맞춘다.
 *
 * 날짜 표기에 쓰는 `Intl.DateTimeFormat` 은 엔진에 있으므로 그대로 쓴다.
 *
 * ── 못 읽는 날짜는 **빈 문자열**이다 (던지지 않는다) ─────────────────────────
 *
 * `Intl.DateTimeFormat.format(Invalid Date)` 는 `RangeError: Invalid time value` 를
 * **던진다.** 그리고 이 함수의 호출부는 전부 목록의 한 줄을 그리는 중이라
 * (`PostListItem` · `app/post/[id].tsx` 의 댓글·본문·연관글 · `CommunityPopularScreen`),
 * 던지면 그 한 줄이 아니라 **목록 전체가 빨간 화면**이 된다. 서버 행 하나가
 * `createdAt` 없이 오면(`parseServerDate(undefined)` → Invalid Date, `mapPost` 는
 * 무조건 이 함수를 부른다) 피드가 통째로 죽는다는 뜻이다.
 *
 * 그래서 여기서 막고, 못 읽은 날짜는 **아무 말도 하지 않는다.** 대안 둘을 버린 이유:
 *  - `"Invalid Date"` · `"1970. 1. 1."` 같은 것을 그리는 것 — 없는 사실을 지어낸다.
 *  - `"방금 전"` 으로 떨구는 것 — 더 나쁘다. 모르는 것을 **아는 척**한다.
 * 이 저장소가 이미 같은 판단을 한 자리가 있다 —
 * `restaurant/utils/reviewFormat.ts` 의 `reviewDateParts` 는 파싱 실패에 `null` 을
 * 돌려주고 화면이 날짜 줄을 감춘다. 빈 문자열은 그 규칙의 문자열판이다.
 */
export function formatTimeAgo(date: Date, language = "ko"): string {
  const at = date.getTime()
  // 못 읽는 날짜. 여기서 접지 않으면 아래 `Intl` 이 RangeError 를 던진다.
  if (Number.isNaN(at)) return ""

  const isEnglish = language.toLowerCase().startsWith("en")
  const t = i18n.getFixedT(isEnglish ? "en" : "ko", "common")

  const now = Date.now()
  const diffMs = now - at
  const diffMin = Math.floor(diffMs / 60000)
  // 미래 시각(기기 시계 어긋남)도 여기로 떨어져 "방금 전"이 된다.
  if (diffMin < 1) return t("time.justNow")
  if (diffMin < 60) return t("time.minutesAgo", { count: diffMin })

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return t("time.hoursAgo", { count: diffHour })

  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return t("time.daysAgo", { count: diffDay })

  /*
    7일이 넘으면 절대 날짜로 넘어간다. 그때 **해가 다르면 연도를 붙인다.**
    종전에는 월·일만 찍어서 30일 전 글과 395일 전 글이 똑같이 `7월 21일` 이었다 —
    내 활동 보관함과 작성자 프로필처럼 오래된 글이 함께 쌓이는 목록에서는
    작년 글과 지난달 글을 구분할 방법이 화면에 없었다는 뜻이다.
    같은 해에는 붙이지 않는다. 대부분의 줄에 올해 연도가 반복되면 그 줄에서
    실제로 다른 정보(월·일)가 묻힌다.
  */
  const isSameYear = date.getFullYear() === new Date(now).getFullYear()
  return new Intl.DateTimeFormat(isEnglish ? "en-US" : "ko-KR", {
    year: isSameYear ? undefined : "numeric",
    month: isEnglish ? "short" : "long",
    day: "numeric",
  }).format(date)
}
