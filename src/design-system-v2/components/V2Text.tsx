import { Text as RNText } from "@/src/design-system-v2/primitives/NativeText"
// Design System v2 — Text (타이포 프리미티브)
//
// ■ 왜 만드나
//
//   실측(2026-08-19): tamagui 를 import 하는 84파일에서 `Text` 가 75회로 최다다.
//   그 자리를 받는다. tamagui 의 `Text` 는 테마·variant 를 끌고 오지만 이 레포는
//   그 기능을 거의 안 쓰고 `fontSize`/`fontWeight`/`color` 만 직접 준다.
//
// ■ 두 가지 입력 방식을 모두 받는다 (이행을 막지 않기 위해)
//
//   1. **토큰**: `<V2Text token="title.small">` — 새로 쓰는 쪽의 권장 형태.
//      face·크기·행간이 한 번에 정해져 Figma 정본과 어긋날 수 없다.
//   2. **직접 스타일**: `<V2Text style={{ fontSize: 15, fontWeight: "600" }}>` —
//      84파일에 이미 이렇게 적혀 있다. 이것까지 한 번에 토큰으로 바꾸려 들면
//      이행이 디자인 협의에 막힌다. **먼저 계보를 옮기고, 토큰화는 그다음이다.**
//
//   2번이 들어와도 서체는 지켜진다 — `fontWeight` 를 Pretendard face 로 바꾸는
//   변환을 `shared/components/AppText` 와 **같은 규칙으로** 적용하기 때문이다.
//   그 파일의 머리말이 근거다: Pretendard 는 weight 별 4개 파일로 로드되므로
//   `fontWeight` 만 준 스타일은 OS 기본 서체로 그려진다(실측: home 34파일이 그랬다).
//
// ■ `color` 를 prop 으로 받는 이유
//
//   84파일이 tamagui 의 `<Text color="$gray11">` 를 쓴다. 옮길 때 `style` 안으로
//   집어넣게 하면 diff 가 불필요하게 커진다. 같은 자리에 그대로 적을 수 있게 둔다.

import { forwardRef, type ComponentRef, type ReactNode } from "react"
import {
  StyleSheet,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from "react-native"

import { fontFamily, typography } from "../tokens/typography"
import { useV2Theme } from "../hooks/useV2Theme"

/** `"title.small"` 처럼 점으로 잇는 토큰 경로. */
export type TypographyToken =
  | `display.${keyof typeof typography.display}`
  | `title.${keyof typeof typography.title}`
  | `body.${keyof typeof typography.body}`
  | `subtext.${keyof typeof typography.subtext}`
  | `label.${keyof typeof typography.label}`
  | `caption.${keyof typeof typography.caption}`

function tokenStyle(token: TypographyToken | undefined): TextStyle | undefined {
  if (!token) return undefined
  const [group, name] = token.split(".") as [string, string]
  const bucket = (typography as Record<string, Record<string, TextStyle>>)[
    group
  ]
  return bucket?.[name]
}

/**
 * `fontWeight` → Pretendard face. `AppText` 와 같은 표를 쓴다.
 * 두 곳에 두는 것이 마음에 걸리지만, `AppText` 는 `shared`(legacy 계보)에 있고
 * v2 는 그쪽에 의존하지 않는다는 것이 이 디자인 시스템의 전제다.
 * `AppText` 가 걷히면 이쪽만 남는다.
 */
const FACE: Record<string, string> = {
  "100": fontFamily.regular,
  "200": fontFamily.regular,
  "300": fontFamily.regular,
  "400": fontFamily.regular,
  normal: fontFamily.regular,
  "500": fontFamily.medium,
  "600": fontFamily.semibold,
  "700": fontFamily.bold,
  "800": fontFamily.bold,
  "900": fontFamily.bold,
  bold: fontFamily.bold,
}

/**
 * face 가 없고 weight 만 있으면 face 로 바꾼다.
 *
 * `fontWeight` 를 **떼는** 것이 핵심이다 — 남겨 두면 iOS 가 이미 굵은 face 위에
 * 합성 볼드를 한 번 더 얹는다(AppText 머리말).
 */
function applyFace(flat: TextStyle | undefined): TextStyle | undefined {
  if (!flat || flat.fontFamily) return flat
  const face = FACE[String(flat.fontWeight ?? "400")]
  if (!face) return flat
  const { fontWeight: _expressedByFace, ...rest } = flat
  return { ...rest, fontFamily: face }
}

export interface V2TextProps extends Omit<RNTextProps, "style"> {
  children?: ReactNode
  /** 타이포 토큰. 새 코드는 이쪽을 쓴다. */
  token?: TypographyToken
  /** 글자색. tamagui `<Text color=…>` 자리를 그대로 받는다. */
  color?: string
  style?: StyleProp<TextStyle>
}

export const V2Text = forwardRef<ComponentRef<typeof RNText>, V2TextProps>(
  function V2Text({ token, color, style, children, ...rest }, ref) {
    const { colors } = useV2Theme()
    const flat = StyleSheet.flatten([tokenStyle(token), style]) as
      | TextStyle
      | undefined
    const resolved = applyFace(flat)
    // 색을 아무도 안 주면 RN 기본값(검정)이 아니라 테마의 본문색을 쓴다.
    // 2026-09-08 상담 기록 목록: 제목 V2Text 에 color 가 없어 다크에서 검은 바탕 위 검은 글자였다.
    // 색은 prop > style > 테마 순으로 결정되고, 명시한 색은 그대로 존중한다.
    const themed =
      color === undefined && flat?.color === undefined
        ? { color: colors.label.normal }
        : undefined

    return (
      <RNText
        ref={ref}
        style={[resolved, themed, color !== undefined && { color }]}
        // 한글 줄바꿈을 어절 단위로 — 앱 전체가 한국어라 기본값이다.
        lineBreakStrategyIOS="hangul-word"
        {...rest}
      >
        {children}
      </RNText>
    )
  },
)
