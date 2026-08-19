import { forwardRef } from "react"
import { StyleSheet, View, type ViewStyle } from "react-native"

import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import {
  V2VStack,
  type V2StackProps,
} from "@/src/design-system-v2/components/V2Stack"

/**
 * 카드 면.
 *
 * ■ tamagui `styled(YStack)` 이었다 (2026-08-19 이행)
 *
 *   `styled` 는 이 레포에서 tamagui 를 붙들고 있던 구조적 의존점 중 하나였고,
 *   이 컴포넌트 하나가 `FaqCard`·`CategoryCard` 등 4개 화면을 함께 묶어 두고 있었다.
 *   실제로 넘겨받는 prop 은 `variant`·`padding`·`gap`·`borderColor` 정도라
 *   `V2VStack` + `StyleSheet` 로 그대로 옮길 수 있다.
 *
 *   바뀐 것 하나: 배경색이 `$cardBackground` 였는데, 그 토큰은 `themes.ts` 에서
 *   `s.card` 를 가리킨다. 여기서는 `useV2Theme().colors.background.default` 로
 *   같은 값을 **직접** 읽는다 — 테마 자동 전환이 없어진 대신 출처가 분명해졌다.
 *
 * ■ 이름은 남겨 둔다
 *
 *   실제로는 유리 효과(블러)가 없고 그림자만 있다. 이름과 구현이 어긋나 있지만
 *   4개 화면이 이 이름으로 부르고 있어 이번 이행에서 같이 바꾸지 않는다 —
 *   계보 이동과 이름 정리를 한 커밋에 섞으면 무엇이 깨졌는지 못 찾는다.
 */
export type GlassmorphicCardProps = V2StackProps & {
  variant?: "default" | "elevated" | "flat"
}

export const GlassmorphicCard = forwardRef<View, GlassmorphicCardProps>(
  function GlassmorphicCard({ variant = "default", style, ...rest }, ref) {
    const { colors } = useV2Theme()

    return (
      <V2VStack
        ref={ref}
        padding={16}
        style={[
          styles.base,
          { backgroundColor: colors.background.default },
          SHADOW[variant],
          style,
        ]}
        {...rest}
      />
    )
  },
)

/** tamagui `variants.variant` 를 그대로 옮긴 값. */
const SHADOW: Record<string, ViewStyle> = {
  default: { shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  elevated: { shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  flat: { shadowOpacity: 0, elevation: 0 },
}

const styles = StyleSheet.create({
  base: {
    // tamagui `borderRadius="$4"` = radius 스케일 8.
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
  },
})
