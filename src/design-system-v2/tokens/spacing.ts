// Design System v2 — Spacing tokens
// Docs: project/design-system-v2/design-system-base/spacing.md
// 값 기반 네이밍: spacing[16] === 16px. 4px 그리드 + 2px 마이크로.
// 21개 컴포넌트 실측 역산. 원오프(3/5/7/9/11/13/19/21/26/34)는 인접 토큰으로 스냅.

export const spacing = {
  2: 2,
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
} as const

export type Spacing = keyof typeof spacing
