/**
 * 식단 리포트 페이지(시안 `write.svg`)의 색 한 벌. 토큰에 없는 값이라 여기에만 둔다.
 *
 * **가시성 규칙(코드리뷰 2026-09-04)**: 시안은 밝은 링 색(노랑 #FFCD38)을 글자에도 썼는데
 * 흰 바닥에서 1.5:1 이라 읽히지 않는다. 그래서 글자에는 같은 뜻의 **짙은 톤**(`textOn`),
 * 링·배지 면에는 밝은 색을 쓴다. 다크에서는 반대로 밝은 색이 글자에 맞는다.
 * `tests/reportContrast.test.ts` 가 여기 쌍들의 대비를 계산해 지킨다.
 */
export const REPORT_INK = {
  strong: "#2A2A37",
  muted: "rgba(46,47,51,0.70)",
  weak: "rgba(55,56,60,0.51)",
  hairline: "rgba(112,115,124,0.08)",
  band: "#F7F7F7",
  well: "#F9FAFB",
  brand: "#FE7139",
  brandSoft: "rgba(255,244,240,0.6)",
  chip: "rgba(46,47,51,0.70)",
  photoControl: "rgba(255,255,255,0.88)",
  /** 끼니 분할 막대 — 지난 끼니 / 이번 끼니 / 남은 몫 */
  split: ["#FE7139", "#FF9200", "#FFC06E"] as const,
  /** 링·배지 면에 쓰는 밝은 색 */
  ring: {
    ok: "#03B26C",
    tight: "#FFCD38",
    over: "#FF6363",
    unknown: "#B0B3BA",
    track: "#F2F3F5",
  },
  /** 흰 바닥 위 글자용 짙은 톤 — 링 색과 같은 뜻 */
  textOn: {
    ok: "#027A4C",
    tight: "#9C5800",
    over: "#D63C3C",
    unknown: "#5A5C63",
  },
  /** 다크 바닥 위 글자용 밝은 톤 */
  textOnDark: {
    ok: "#15C47E",
    tight: "#FFCD38",
    over: "#FF7B7B",
    unknown: "#B5B8BF",
  },
  badgeBg: {
    ok: "rgba(2,162,98,0.16)",
    tight: "rgba(255,205,56,0.16)",
    over: "rgba(255,99,99,0.16)",
    /** 모름은 색으로 판정하지 않는다 — 회색 면. */
    unknown: "rgba(112,115,124,0.14)",
  },
} as const

export type ReportTone = "ok" | "tight" | "over" | "unknown"
