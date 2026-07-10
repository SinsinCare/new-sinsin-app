// Design System v2 — Size tokens (control height / touch target / icon / border)
// Docs: project/design-system-v2/design-system-base/size.md

/** 컨트롤 높이 사다리 (Button·Icon Button 공유) */
export const controlHeight = { sm: 32, md: 38, lg: 48, xl: 56 } as const

/** 최소 터치 타겟 — 시각 높이와 별개, hit-slop으로 확보 권장 */
export const touchTarget = { min: 44, android: 48 } as const

/** OS별 바 높이 */
export const barHeight = {
  appBarIOS: 44,
  appBarAndroid: 54,
  tabBar: 62,
  tabBarSafe: 84, // + home indicator (safe-area)
} as const

/** 아이콘 크기 (Icons.md 반응형 스케일, 기본 md=24) */
export const iconSize = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  "2xl": 40,
} as const

/** 보더 두께 (사실상 이진) */
export const borderWidth = { thin: 1, thick: 2 } as const

export type ControlHeight = keyof typeof controlHeight
export type IconSize = keyof typeof iconSize
