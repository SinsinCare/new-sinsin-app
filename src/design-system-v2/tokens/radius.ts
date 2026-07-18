// Design System v2 — Border radius tokens
// Docs: project/design-system-v2/design-system-base/radius-shadow.md
// 충실안(faithful): 관측된 2px 사다리 유지, 홀수(9/11/13)만 정리.
// 원칙: pill/원형 요소는 실제 px(15/40/99/200) 대신 항상 `radius.full`.

export const radius = {
  xs: 4, // 2.5, 5, 6
  sm: 8, // 8, 9
  md: 10, // 10, 11
  lg: 12, // 12, 13
  xl: 14, // 14
  "2xl": 16, // 16
  "3xl": 24, // 24
  "4xl": 28, // 28
  full: 9999, // pill / circle
} as const

export type Radius = keyof typeof radius
