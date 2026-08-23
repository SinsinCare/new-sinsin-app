import { semanticDark, semanticLight } from "../design-system-v2/tokens/colors"
import { getSurfacePalette, type SurfacePalette } from "./surface"
import { tokens } from "./tokens"

/**
 * tamagui 테마 — **v2 시맨틱에서 파생한다** (2026-08-17).
 *
 * 예전에는 여기 값들이 `tokens.ts` 의 회색 스케일(grey1~8)과 primary1~9 를 가리켰고,
 * 그래서 같은 역할이 계보마다 다른 색이 됐다:
 *
 * | 역할 | 예전 tamagui | surface 계보 | v2(정본) |
 * |---|---|---|---|
 * | 본문 잉크 | `#0D0D0D` | `#17181C` | `#2a2a37` |
 * | 다크 바닥 | `#0D0D0D` (거의 검정) | `#1F1F21` | `#1f1f21` |
 * | 구분선 | `#EDEDED` | `#E1E2E4` | `line.normal` |
 * | 브랜드 | `#EE6145` (다른 주황!) | `#FE7139` | `#FE7139` |
 * | 위험 | `#F82F08` | `#C81E12` | `#ff4242` |
 *
 * 특히 **브랜드가 달랐다** — 상담·홈 통계 같은 tamagui 화면의 `$primary` 는
 * `primary7 #EE6145` 였고 나머지 앱은 `#FE7139` 였다. 탭을 옮기면 주황이 바뀌었다.
 *
 * 이제 값의 출처는 `getSurfacePalette()` 하나이고, 그건 다시 v2 시맨틱에서 나온다.
 * **여기에 새 색을 적지 말 것.** hover/press 처럼 v2 에 단이 없는 자리는
 * 브랜드 램프(`sub6~8`)에서 가져오고, 그 이유를 줄마다 적었다.
 */

type Theme = {
  background: string
  backgroundHover: string
  backgroundPress: string
  backgroundFocus: string
  backgroundStrong: string
  backgroundTransparent: string

  color: string
  colorHover: string
  colorPress: string
  colorFocus: string
  colorTransparent: string
  colorSubtle: string

  borderColor: string
  borderColorHover: string
  borderColorFocus: string
  borderColorPress: string

  placeholderColor: string
  outlineColor: string

  primary: string
  primaryLight: string
  primarySoft: string
  primaryHover: string
  primaryPress: string

  secondary: string
  secondaryLight: string
  secondarySoft: string

  success: string
  warning: string
  danger: string
  dangerBackground: string

  cardBackground: string
  cardBackgroundHover: string
}

function build(
  s: SurfacePalette,
  v2: typeof semanticLight,
  isDark: boolean,
): Theme {
  return {
    background: s.canvas,
    backgroundHover: s.surface,
    backgroundPress: s.surfacePressed,
    backgroundFocus: s.surface,
    backgroundStrong: s.surface,
    backgroundTransparent: isDark
      ? "rgba(0, 0, 0, 0)"
      : "rgba(255, 255, 255, 0)",

    color: s.textStrong,
    colorHover: s.text,
    colorPress: s.text,
    colorFocus: s.text,
    colorTransparent: isDark ? "rgba(255, 255, 255, 0)" : "rgba(0, 0, 0, 0)",
    colorSubtle: s.textMuted,

    borderColor: s.border,
    // hover/focus/press 는 v2 에 단이 하나 더 있다 — 진한 선.
    borderColorHover: v2.line.strong,
    borderColorFocus: v2.line.strong,
    borderColorPress: v2.line.strong,

    placeholderColor: s.placeholder,
    // 포커스 링. 브랜드색 30% — 리터럴 대신 브랜드 토큰에서 만든다.
    outlineColor: `${s.brand}4d`,

    // 브랜드 램프. v2 에 hover/press 단이 없어 앱의 브랜드 스케일(sub6~8)을 쓴다 —
    // sub6 이 곧 v2 primary.primary(#FE7139)라 같은 계열 안에서만 움직인다.
    primary: s.brand,
    primaryLight: s.surfaceBrand,
    primarySoft: v2.primary.primaryWeak,
    primaryHover: tokens.color.sub7.val,
    primaryPress: tokens.color.sub8.val,

    // 보조(안전/양호). 이 앱에서 주황은 제한·주의 신호라 안전을 주황으로 겸하지 않는다.
    secondary: v2.status.positive,
    secondaryLight: v2.accentForeground.greenWeak,
    secondarySoft: v2.accentForeground.green,

    success: v2.status.positive,
    warning: v2.status.cautionary,
    danger: v2.status.negative,
    dangerBackground: v2.accentForeground.redWeak,

    // 카드 면. 라이트는 바닥과 같은 흰 면, 다크는 한 단계 뜬 면 — surface 계보와 같은 규칙.
    cardBackground: s.card,
    cardBackgroundHover: s.surfacePressed,
  }
}

export const lightTheme = build(getSurfacePalette(false), semanticLight, false)
export const darkTheme: typeof lightTheme = build(
  getSurfacePalette(true),
  semanticDark,
  true,
)
