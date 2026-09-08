/**
 * Six health record pages: calm neutral surfaces, one action color, focused measurements.
 * References and rationale: docs/design/health-record-refresh-2026-09-05/REVIEW.md.
 * Keep geometry here so every metric shares the same type and spacing rhythm.
 */
import {
  typography,
  fontFamily,
} from "@/src/design-system-v2/tokens/typography"

/** 좌우 여백. 시안의 모든 카드가 x=20, w=335(=375−40)에서 시작한다. */
export const PAGE_X = 20

/** 4pt 격자. 홈·리포트와 같은 사다리다. */
export const S = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
} as const

/** 최소 조건 — 터치 타깃과 면 가장자리 여백. */
export const MIN = { TOUCH: 44, EDGE: 4, INSET: 16 } as const

/** Page heading and its date. */
export const TITLE_BLOCK = {
  marginTop: S[4],
  height: 34,
  marginBottom: S[2],
  fontSize: 26,
  lineHeight: 34,
  /** 제목 옆 물음표 원. 시안 지름 16. */
  infoSize: 16,
} as const

/** 하단 저장 버튼. 시안 x20 y736 w335 h56 r16, 화면 바닥에서 20. */
export const CTA = { height: 52, radius: 14, bottomInset: S[4] } as const

/** Short edge fade keeps the last readable row clear of the anchored action. */
export const FOOTER_FADE = S[4]

/** Persistent label, native numeric input, and unit. */
export const FIELD = {
  height: 88,
  radius: 16,
  gap: S[2],
  paddingX: S[4],
  labelGap: S[2],
  fontSize: 24,
  unitFontSize: 15,
  heroHeight: 120,
  pairedHeight: 112,
  heroFontSize: 40,
  pairedFontSize: 34,
  inputHeight: 36,
  heroInputHeight: 56,
  pairedInputHeight: 48,
} as const

/** Shared form rhythm for all six health record pages. */
export const FORM = {
  sectionGap: S[6],
  labelGap: S[2],
  choiceHeight: 44,
  choiceRadius: 12,
  label: { ...typography.title.xSmallWeak, lineHeight: 24 },
  option: { ...typography.label.small, lineHeight: 20 },
  hint: { ...typography.body.xSmall, lineHeight: 20 },
  body: { ...typography.subtext.large, lineHeight: 24 },
  metric: {
    fontFamily: fontFamily.semibold,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -1.2,
  },
} as const

/** Calm record history with generous row spacing. */
export const TABLE = {
  headerHeight: 34,
  rowHeight: 48,
  fontSize: 14,
  lineHeight: 20,
} as const

/** Compact measurement summary with a secondary cup illustration. */
export const WATER_CARD = {
  size: 335,
  radius: 20,
  height: 136,
  glassSize: 112,
} as const

/** Pending water additions; neutral time labels and a 44pt delete action. */
export const WATER_ROW = {
  height: 60,
  chipWidth: 51,
  chipHeight: 29,
  chipRadius: 13,
  fontSize: 16,
  chipFontSize: 13,
} as const

/** Quick-add buttons on the water page. */
export const WATER_QUICK = { height: 64, radius: 12, gap: S[2] } as const
