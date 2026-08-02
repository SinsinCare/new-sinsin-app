// Design System v2 — token barrel
import { colors } from "./colors"
import { typography, fontFamily, fontWeight } from "./typography"
import { spacing } from "./spacing"
import { radius } from "./radius"
import {
  controlHeight,
  touchTarget,
  barHeight,
  iconSize,
  borderWidth,
} from "./size"
import { elevation, blur } from "./elevation"

export * from "./colors"
export * from "./typography"
export * from "./spacing"
export * from "./radius"
export * from "./size"
export * from "./elevation"
// 화면 격자(GUTTER/SECTION_GAP/…). `v2Tokens` 객체에는 넣지 않는다 — 디자인 토큰이 아니라
// 토큰으로 만든 **레이아웃 규약**이라 층이 다르다. 자세한 이유는 layout.ts 머리말.
export * from "./layout"

/** 전체 토큰 집합 — `import { v2Tokens } from "@/src/design-system-v2"` */
export const v2Tokens = {
  colors,
  typography,
  fontFamily,
  fontWeight,
  spacing,
  radius,
  controlHeight,
  touchTarget,
  barHeight,
  iconSize,
  borderWidth,
  elevation,
  blur,
} as const

export type V2Tokens = typeof v2Tokens
