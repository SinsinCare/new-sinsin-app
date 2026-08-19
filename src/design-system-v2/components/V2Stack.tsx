// Design System v2 — Stack (레이아웃 프리미티브)
//
// ■ 왜 만드나 — tamagui 84파일이 여기 묶여 있다
//
//   실측(2026-08-19): tamagui 를 import 하는 84파일이 실제로 쓰는 심볼은
//   Text 75 · XStack 58 · YStack 56 · View 17 이 사실상 전부다(나머지 10종은 합쳐 13회).
//   테마·애니메이션·컴파일러 같은 tamagui 고유 기능은 거의 안 쓴다.
//
//   즉 84파일은 **레이아웃 프리미티브 4개** 때문에 tamagui 에 남아 있었다. v2 의
//   컴포넌트 32개는 전부 Badge/Button/Card 같은 완성품이라 대체재가 없었기 때문이다.
//   그 구멍을 여기서 메운다.
//
// ■ 왜 순정 View 인가 (tamagui 를 유지하지 않는 이유)
//
//   `docs/design/bottom-sheet-consolidation.md` §1 이 이미 판단을 남겼다:
//   설치된 tamagui 는 `2.0.0-rc.6` 으로 **정식 릴리스가 아니고**, 최적화 컴파일러도
//   **켜져 있지 않다**(babel/metro 설정 없음). 장점은 안 쓰면서 런타임 비용만 낸다.
//   여기는 `View` + `StyleSheet` 뿐이라 그 비용이 없다.
//
// ■ props 는 tamagui 와 같은 이름을 쓴다
//
//   84파일을 옮길 때 속성 이름까지 바꾸면 diff 가 통째로 커지고 실수가 는다.
//   `gap` `padding` `alignItems` 는 그대로 두고, 축(`XStack`/`YStack`)만 맞춘다.
//   단 **`space` 는 받지 않는다** — tamagui 의 `space` 는 자식 사이에 요소를 끼워 넣는
//   방식이라 RN `gap` 과 결과가 미묘하게 다르다. 같은 이름으로 다르게 동작하는 것이
//   가장 나쁘므로 아예 없앤다(옮길 때 `gap` 으로 바꿔 적는다).

import { forwardRef, type ReactNode } from "react"
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native"

import { spacing, type Spacing } from "../tokens"

/**
 * 간격 값. 토큰 키(`8`·`16`…)를 권장하지만 임의 숫자도 받는다 —
 * 84파일에는 토큰에 없는 값(14·18 등)이 섞여 있고, 그것까지 한 번에 정리하려 들면
 * 이행이 디자인 협의에 막힌다. **먼저 옮기고, 값 정리는 그다음이다.**
 */
export type GapValue = Spacing | number

function resolve(value: GapValue | undefined): number | undefined {
  if (value === undefined) return undefined
  return (spacing as Record<number, number>)[value] ?? value
}

export interface V2StackProps extends Omit<ViewProps, "style"> {
  children?: ReactNode
  /** 자식 사이 간격 (RN `gap`) */
  gap?: GapValue
  /** 주축 정렬 */
  justify?: ViewStyle["justifyContent"]
  /** 교차축 정렬 */
  align?: ViewStyle["alignItems"]
  /** `flex: 1` 단축 */
  flex?: number
  /** 줄바꿈 */
  wrap?: ViewStyle["flexWrap"]
  padding?: GapValue
  paddingHorizontal?: GapValue
  paddingVertical?: GapValue
  style?: StyleProp<ViewStyle>
}

type DirectionalProps = V2StackProps & { direction: "row" | "column" }

const Stack = forwardRef<View, DirectionalProps>(function Stack(
  {
    direction,
    children,
    gap,
    justify,
    align,
    flex,
    wrap,
    padding,
    paddingHorizontal,
    paddingVertical,
    style,
    ...rest
  },
  ref,
) {
  return (
    <View
      ref={ref}
      style={[
        { flexDirection: direction },
        gap !== undefined && { gap: resolve(gap) },
        justify !== undefined && { justifyContent: justify },
        align !== undefined && { alignItems: align },
        flex !== undefined && { flex },
        wrap !== undefined && { flexWrap: wrap },
        padding !== undefined && { padding: resolve(padding) },
        paddingHorizontal !== undefined && {
          paddingHorizontal: resolve(paddingHorizontal),
        },
        paddingVertical !== undefined && {
          paddingVertical: resolve(paddingVertical),
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  )
})

/** 가로 스택. tamagui `XStack` 자리. */
export const V2HStack = forwardRef<View, V2StackProps>(
  function V2HStack(props, ref) {
    return <Stack ref={ref} direction="row" {...props} />
  },
)

/** 세로 스택. tamagui `YStack` 자리. */
export const V2VStack = forwardRef<View, V2StackProps>(
  function V2VStack(props, ref) {
    return <Stack ref={ref} direction="column" {...props} />
  },
)

/**
 * 방향 없는 상자. tamagui `View` 자리.
 *
 * RN `View` 를 직접 써도 되지만, 같은 파일 안에서 `V2HStack` 과 `View` 가 섞이면
 * 어느 계보인지 읽는 사람이 매번 확인해야 한다. 토큰 기반 `gap`/`padding` 을 같은
 * 문법으로 쓰기 위해서도 하나 둔다.
 */
export const V2Box = forwardRef<View, V2StackProps>(function V2Box(props, ref) {
  return <Stack ref={ref} direction="column" {...props} />
})

/** 남는 공간을 밀어내는 자리. `<V2Spacer />` 하나로 `flex:1` 빈 View 를 대신한다. */
export function V2Spacer({ size }: { size?: GapValue }) {
  if (size === undefined) return <View style={styles.grow} />
  return <View style={{ width: resolve(size), height: resolve(size) }} />
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
})
