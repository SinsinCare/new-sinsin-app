import {
  Text as RNText,
  TextInput as RNTextInput,
} from "@/src/design-system-v2/primitives/NativeText"
import { forwardRef, type ComponentRef } from "react"
import {
  StyleSheet,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native"

import { fontFamily } from "@/src/design-system-v2/tokens/typography"

/**
 * `fontWeight` 를 Pretendard **face** 로 바꿔 주는 Text / TextInput.
 *
 * ■ 왜 필요한가 — 앱의 절반이 시스템 폰트로 그려지고 있었다
 *   Pretendard 는 weight 별 **네 개의 파일**(Regular/Medium/SemiBold/Bold)로 로드된다.
 *   그래서 RN 에서는 `fontFamily` 로 face 를 직접 골라야 하고, `fontWeight` 만 준 스타일은
 *   Pretendard 가 아니라 **OS 기본 서체**(iOS Apple SD Gothic Neo / Android Roboto)로 그려진다.
 *   실측(2026-08-17): `src/features/home` 34개 파일이 `fontWeight` 만 쓰고 `fontFamily` 는 0개,
 *   `src/features/health`·`src/shared` 도 같다. 반면 식당 탭은 v2 `typography` 토큰이
 *   face 를 들고 있어 Pretendard 로 그려진다 — **탭을 옮기면 서체가 바뀌고 있었다.**
 *   색·간격보다 먼저 눈에 띄는 불일치인데, 스타일 641곳을 고치는 대신 여기 한 곳에서 흡수한다.
 *
 * ■ 규칙
 *   - 스타일에 `fontFamily` 가 이미 있으면 **손대지 않는다** (v2 `typography` 토큰이 그렇다).
 *   - 없으면 `fontWeight` 로 face 를 고르고 `fontWeight` 는 **뗀다**. 남겨 두면 iOS 가
 *     이미 굵은 face 위에 합성 볼드를 한 번 더 얹고, 안드로이드도 같은 일을 한다.
 *   - Pretendard 는 400/500/600/700 네 벌뿐이다. 800·900 은 700 으로 내린다 —
 *     없는 굵기를 합성으로 만들지 않는다.
 *
 * ■ 쓰는 법
 *   `react-native` 대신 여기서 `Text`/`TextInput` 을 가져온다. 그 외에는 완전히 같다.
 *   새 화면이라면 v2 `typography` 토큰을 쓰는 쪽이 낫다 — 그러면 이 래퍼가 할 일이 없다.
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

/** 이미 face 가 정해진 스타일이면 null 을 돌려준다(= 원본 그대로 쓴다). */
function facePatch(flat: TextStyle | undefined): TextStyle | null {
  if (!flat || flat.fontFamily) return null
  const face = FACE[String(flat.fontWeight ?? "400")]
  if (!face) return null
  const { fontWeight: _weightIsExpressedByFace, ...rest } = flat
  return { ...rest, fontFamily: face }
}

/**
 * 같은 스타일 객체가 다시 오면 계산을 건너뛴다.
 * `StyleSheet.create` 로 만든 스타일은 참조가 고정이라 목록에서 이 캐시가 거의 항상 맞는다.
 */
const patched = new WeakMap<object, TextStyle | null>()

function withFace(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  if (!style) return style
  if (typeof style === "object" && !Array.isArray(style)) {
    const cached = patched.get(style)
    if (cached !== undefined) return cached ?? style
    const next = facePatch(style as TextStyle)
    patched.set(style, next)
    return next ?? style
  }
  const next = facePatch(StyleSheet.flatten(style) as TextStyle)
  return next ?? style
}

export const Text = forwardRef<ComponentRef<typeof RNText>, TextProps>(
  function Text({ style, ...rest }, ref) {
    return <RNText ref={ref} style={withFace(style)} {...rest} />
  },
)

export const TextInput = forwardRef<
  ComponentRef<typeof RNTextInput>,
  TextInputProps
>(function TextInput({ style, ...rest }, ref) {
  return <RNTextInput ref={ref} style={withFace(style)} {...rest} />
})

/**
 * `useRef<TextInput>(null)` 처럼 **인스턴스 타입**으로 쓰던 호출부를 그대로 두기 위한 별칭.
 * `react-native` 에서 가져오던 것과 같은 타입이다(값은 위의 래퍼, 타입은 RN 인스턴스).
 */
/* eslint-disable @typescript-eslint/no-redeclare -- 값(래퍼 컴포넌트)과 타입(인스턴스)을
   같은 이름으로 내보내는 건 react-native 가 하던 것과 같다. 호출부를 안 고치려면 필요하다. */
export type Text = ComponentRef<typeof RNText>
export type TextInput = ComponentRef<typeof RNTextInput>
