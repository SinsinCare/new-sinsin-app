const pad = (n: number) => String(n).padStart(2, "0")

export const toDateStr = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** 홈 날짜 버튼. 앱 언어에 맞는 월·일·요일 순서를 사용한다. */
export const formatDateWithWeekday = (date: Date, language: string): string =>
  new Intl.DateTimeFormat(language.startsWith("en") ? "en-US" : "ko-KR", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(date)
