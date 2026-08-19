// Design System v2 — theme resolver (light/dark 시맨틱 색상 선택)
import {
  semantic,
  primitives,
  type ColorMode,
  type SemanticColors,
} from "../tokens/colors"
import { getSurfacePalette, type SurfacePalette } from "@/src/theme/surface"

export type V2Theme = {
  mode: ColorMode
  /** 현재 모드의 시맨틱 색상 (primary/label/background/line/fill/status/static/accentForeground) */
  colors: SemanticColors
  /**
   * **면(surface) 계층** — 바닥 위로 합성해 만든 불투명한 면들.
   *
   * ■ 왜 `colors.background` 로는 부족한가 (2026-08-19 추가)
   *
   *   v2 의 `background` 는 `default`/`lower` 같은 **절대적인 단**이라 "카드는 바닥보다
   *   한 겹 위" 같은 **관계**를 표현하지 못한다. 그리고 이 앱에서 그 관계는 스킴마다
   *   다르다 — `surface.ts` 의 규칙 그대로:
   *
   *       const card = isDark ? over(fill.normal, canvas) : canvas
   *
   *   라이트는 "회색 바닥 위 흰 카드"라 카드가 바닥과 **같은 흰 면**이고, 다크는 바닥
   *   위로 한 겹 올린 면이다. 라이트에서 카드를 한 겹 더 올리면 흰 카드가 회색이 되어
   *   층이 뒤집힌다.
   *
   *   tamagui `$cardBackground` 를 v2 로 옮기다가 이 빈틈이 드러났다: 라이트는
   *   `background.default`, 다크는 `background.lower` 를 가리켜 **한 토큰으로 접히지
   *   않았다**(tests/tamaguiColorMap.test.ts). 옮기는 쪽에서 스킴 분기를 다시 쓰면
   *   v2 를 쓰는 의미가 없어지므로, 관계를 아는 정본(`surface.ts`)을 여기 연결한다.
   *
   * ■ 새로 만든 값이 아니다
   *
   *   `getSurfacePalette` 는 레거시 계보(themes.ts)가 이미 쓰던 그 함수다. 두 계보가
   *   같은 한 곳을 보게 하는 것이 목적이고, 그래서 이행 전후로 색이 바뀌지 않는다.
   */
  surface: SurfacePalette
  /** 원시 팔레트 (mode 무관) */
  primitives: typeof primitives
}

/** 모드로 테마 해석. RN 컴포넌트에선 `useV2Theme()` 사용 권장. */
export function resolveTheme(mode: ColorMode): V2Theme {
  return {
    mode,
    colors: semantic[mode],
    surface: getSurfacePalette(mode === "dark"),
    primitives,
  }
}

export const v2LightTheme = resolveTheme("light")
export const v2DarkTheme = resolveTheme("dark")
