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
 */
export function formatTimeAgo(date: Date, language = "ko"): string {
  const isEnglish = language.toLowerCase().startsWith("en")
  const t = i18n.getFixedT(isEnglish ? "en" : "ko", "common")

  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  // 미래 시각(기기 시계 어긋남)도 여기로 떨어져 "방금 전"이 된다.
  if (diffMin < 1) return t("time.justNow")
  if (diffMin < 60) return t("time.minutesAgo", { count: diffMin })

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return t("time.hoursAgo", { count: diffHour })

  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return t("time.daysAgo", { count: diffDay })

  return new Intl.DateTimeFormat(isEnglish ? "en-US" : "ko-KR", {
    month: isEnglish ? "short" : "long",
    day: "numeric",
  }).format(date)
}
