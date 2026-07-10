// Design System v2 — theme resolver (light/dark 시맨틱 색상 선택)
import {
  semantic,
  primitives,
  type ColorMode,
  type SemanticColors,
} from "../tokens/colors"

export type V2Theme = {
  mode: ColorMode
  /** 현재 모드의 시맨틱 색상 (primary/label/background/line/fill/status/static/accentForeground) */
  colors: SemanticColors
  /** 원시 팔레트 (mode 무관) */
  primitives: typeof primitives
}

/** 모드로 테마 해석. RN 컴포넌트에선 `useV2Theme()` 사용 권장. */
export function resolveTheme(mode: ColorMode): V2Theme {
  return { mode, colors: semantic[mode], primitives }
}

export const v2LightTheme = resolveTheme("light")
export const v2DarkTheme = resolveTheme("dark")
