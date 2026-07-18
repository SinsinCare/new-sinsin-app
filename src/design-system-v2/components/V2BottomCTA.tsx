// Design System v2 — Bottom CTA
// Spec: project/design-system-v2/design-system-base/components/Bottom-CTA.md (Figma node 89:7358)
//
// 화면 하단에 고정되는 주 액션 바. Button Area(Button.md Size=XL)를 그대로 조립한다.
//  - layout=single      : 풀폭 단일 Fill 버튼
//  - layout=horizontal  : 가로 2분할 (좌=Weak/neutral, 우=Fill/brand), 둘 다 flex:1
//  - layout=vertical    : 세로 2단 (위=Fill/brand, 아래=Weak/neutral)
//
// 보정:
//  - Top Gradient(raster 페이드, node 89:8567)는 생략. 상단 패딩으로 콘텐츠와 시각 분리만 확보.
//  - Safe-area: Figma 프레임엔 홈 인디케이터 레이어가 없음 → RN에선 하단 inset을 확보(spacing[20] 최소).

import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { spacing } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
import { useKeyboardVisibility } from "@/src/hooks/useKeyboardVisibility"
import { V2Button, type V2ButtonProps } from "./V2Button"

export type V2BottomCTALayout = "single" | "horizontal" | "vertical"

/** primary 버튼에 넘길 수 있는 V2Button prop 일부 (label·onPress·size는 컴포넌트가 관리) */
export type V2BottomCTAPrimaryProps = Partial<
  Pick<
    V2ButtonProps,
    "color" | "variant" | "loading" | "disabled" | "leftIcon" | "rightIcon"
  >
>

export type V2BottomCTAProps = {
  /** 주 액션 라벨 (Fill/brand) */
  primaryLabel: string
  onPrimary: () => void
  /** 보조 액션 라벨 (Weak/neutral) — 있으면 2버튼 레이아웃 */
  secondaryLabel?: string
  onSecondary?: () => void
  /** 버튼 배치. 미지정 시 secondaryLabel 유무로 자동 결정(single / horizontal) */
  layout?: V2BottomCTALayout
  /** primary 버튼 prop 오버라이드 (color/variant/loading 등) */
  primaryProps?: V2BottomCTAPrimaryProps
  /** 바깥 컨테이너 스타일 확장 (예: position:absolute 고정 배치) */
  style?: StyleProp<ViewStyle>
}

export function V2BottomCTA({
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  layout,
  primaryProps,
  style,
}: V2BottomCTAProps) {
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()
  const isKeyboardVisible = useKeyboardVisibility()

  // 열린 키보드 위에서는 홈 인디케이터 inset을 다시 더하지 않는다.
  const paddingBottom = isKeyboardVisible
    ? spacing[12]
    : Math.max(insets.bottom, spacing[20])

  // layout 미지정 시 secondary 유무로 결정
  const resolvedLayout: V2BottomCTALayout =
    layout ?? (secondaryLabel ? "horizontal" : "single")
  const isTwoButtons = resolvedLayout !== "single" && !!secondaryLabel

  // Fill/brand 주 액션 (size=XL 고정). primaryProps로 color/variant/loading 등 오버라이드 가능.
  const primaryButton = (
    <V2Button
      size="xl"
      color="brand"
      variant="fill"
      fullWidth
      {...primaryProps}
      onPress={onPrimary}
      style={
        isTwoButtons && resolvedLayout === "horizontal"
          ? styles.flex
          : undefined
      }
    >
      {primaryLabel}
    </V2Button>
  )

  // Weak/neutral 보조 액션 (Bottom-CTA.md의 'Weak · Grey')
  const secondaryButton = isTwoButtons ? (
    <V2Button
      size="xl"
      color="neutral"
      variant="weak"
      fullWidth
      onPress={onSecondary}
      style={resolvedLayout === "horizontal" ? styles.flex : undefined}
    >
      {secondaryLabel}
    </V2Button>
  ) : null

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background.default, paddingBottom },
        style,
      ]}
    >
      {resolvedLayout === "horizontal" && isTwoButtons ? (
        // 가로 2분할: 좌=Weak, 우=Fill. 둘 다 flex:1(균등).
        <View style={styles.row}>
          {secondaryButton}
          {primaryButton}
        </View>
      ) : resolvedLayout === "vertical" && isTwoButtons ? (
        // 세로 2단: 위=Fill, 아래=Weak.
        <View style={styles.column}>
          {primaryButton}
          {secondaryButton}
        </View>
      ) : (
        // 단일 풀폭 Fill
        primaryButton
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    // Button Area 좌우 패딩 20 / 상단 패딩(그라디언트 생략 보정용 시각 여백)
    paddingHorizontal: spacing[20],
    paddingTop: spacing[16],
  },
  // 2 Buttons(가로): gap 8, 균등 분할
  row: {
    flexDirection: "row",
    gap: spacing[8],
  },
  // 2 Buttons (Vertical): gap 8
  column: {
    flexDirection: "column",
    gap: spacing[8],
  },
  flex: { flex: 1 },
})
