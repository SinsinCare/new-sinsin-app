import { Text } from "@/src/design-system-v2/primitives/NativeText"
// Design System v2 — List Row
// Spec: project/design-system-v2/design-system-base/components/List-Row.md (Figma set 91:11116)
//
// 리스트의 한 항목을 표현하는 기본 행. 3개 슬롯으로 구성:
//   [리딩(아이콘/이미지)] — [가운데 텍스트(제목+설명)] — [트레일링(값·화살표·스위치·배지 등)]
//
// Figma의 4축(verticalPadding / sideMargin / showLeftAcc / showRightAcc)을 RN 관점으로 매핑:
//  - verticalPadding      → props (밀도)
//  - sideMargin           → props (좌우 패딩 — 아래 보정 참고)
//  - showLeftAcc/RightAcc → 슬롯 prop 유무로 흡수(빈 슬롯이면 미렌더)
//  - Theme                → useV2Theme(다크 자동)로 흡수(별도 prop 없음)
//
// 보정:
//  - Figma variant 'Side Margin'은 실제로 Global/Side Padding(S=20 / M=24) 토큰에 바인딩된
//    **좌우 패딩**(margin 아님). prop 이름은 sideMargin으로 두되 paddingHorizontal에 적용.
//  - 제목 색 토큰 Figma 오타 'label/nomal' → 정정된 label.normal 사용.
//  - Pressed/Disabled variant 축은 컴포넌트에 없음 → 눌림 피드백은 감싸는 Pressable이 소유
//    (onPress 넘길 때만 Pressable + pressed opacity). 높이는 콘텐츠 주도(min-height 44 + 상하 패딩).
//  - 트레일링 텍스트(값)는 소비처가 주입하는 ReactNode라 이 컴포넌트가 타이포를 강제하지 않음.
//    (권장: 텍스트 값은 typography.subtext.large(15) / colors.label.neutral)

import { type ReactNode } from "react"
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native"
import { Pressable as GestureHandlerPressable } from "react-native-gesture-handler"
import { spacing, typography } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
import { V2Icon } from "./V2Icon"
import { type V2IconName } from "../icons"

export type V2ListRowVerticalPadding = "s" | "m" | "l" | "xl"
export type V2ListRowSideMargin = "s" | "m"

export type V2ListRowProps = {
  /** 리딩 아이콘 이름 — V2Icon으로 렌더(md=24, label.normal). leading과 함께 넘기면 이 값이 우선 */
  leadingIcon?: V2IconName
  /** 리딩 슬롯 커스텀 노드(이미지·아바타 등). leadingIcon 미지정 시 사용 */
  leading?: ReactNode
  /** 제목 (1줄, 넘치면 말줄임) */
  title: string
  /** 설명 (선택, 1줄, 넘치면 말줄임) */
  subtitle?: string
  /** 트레일링 슬롯 — 소비처가 V2Switch/V2Badge/chevron/값 텍스트 등을 주입 */
  trailing?: ReactNode
  /** 상하 패딩(밀도): s/m/l/xl → 8/12/16/24. 기본 m */
  verticalPadding?: V2ListRowVerticalPadding
  /** 좌우 패딩(화면 여백): s/m → 20/24. 기본 m */
  sideMargin?: V2ListRowSideMargin
  /** 넘기면 행 전체가 Pressable이 되고 pressed 피드백을 줌 */
  onPress?: () => void
  /** gorhom 시트 안(식당 지도 푸터)에서 켠다 — 이유는 V2Button.gestureHandler 주석. */
  gestureHandler?: boolean
  style?: ViewStyle
}

/** verticalPadding → 상하 패딩 (List-Row.md Component/List Row/Vertical Paddings) */
const VERTICAL_PADDING: Record<V2ListRowVerticalPadding, number> = {
  s: spacing[8],
  m: spacing[12],
  l: spacing[16],
  xl: spacing[24],
}

/** sideMargin → 좌우 패딩 (List-Row.md Global/Side Padding) */
const SIDE_PADDING: Record<V2ListRowSideMargin, number> = {
  s: spacing[20],
  m: spacing[24],
}

export function V2ListRow({
  leadingIcon,
  leading,
  title,
  subtitle,
  trailing,
  verticalPadding = "m",
  sideMargin = "m",
  onPress,
  gestureHandler = false,
  style,
}: V2ListRowProps) {
  const { colors } = useV2Theme()

  // 리딩 슬롯: 아이콘 이름이 있으면 V2Icon으로, 없으면 커스텀 노드
  const leadingNode =
    leadingIcon != null ? <V2Icon name={leadingIcon} size="md" /> : leading

  const containerStyle: ViewStyle = {
    paddingVertical: VERTICAL_PADDING[verticalPadding],
    paddingHorizontal: SIDE_PADDING[sideMargin],
    backgroundColor: colors.background.default,
  }

  const content = (
    <>
      {/* 리딩 → 텍스트 gap 12 (텍스트 쪽 marginLeft로 부여, 리딩 없으면 붙음) */}
      {leadingNode != null && <View style={styles.leading}>{leadingNode}</View>}

      <View style={[styles.text, leadingNode != null && styles.textGap]}>
        <Text
          style={[typography.title.xSmall, { color: colors.label.normal }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle != null && (
          <Text
            style={[typography.subtext.medium, { color: colors.label.neutral }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {/* 텍스트 → 트레일링 gap 8 (트레일링 쪽 marginLeft) */}
      {trailing != null && <View style={styles.trailing}>{trailing}</View>}
    </>
  )

  if (onPress != null) {
    const Touchable = gestureHandler ? GestureHandlerPressable : Pressable
    return (
      <Touchable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.base,
          containerStyle,
          pressed && styles.pressed,
          style,
        ]}
      >
        {content}
      </Touchable>
    )
  }

  return <View style={[styles.base, containerStyle, style]}>{content}</View>
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    // 슬롯 넘침 클립(Figma overflow: clip)
    overflow: "hidden",
  },
  leading: {
    // 리딩 리소스가 세로로 커도 첫 줄 기준을 넘지 않도록 중앙 정렬은 base가 담당
    flexShrink: 0,
  },
  text: {
    // 가운데 텍스트가 남는 폭을 차지하고, 넘칠 때 말줄임 동작하도록 축소 허용
    flex: 1,
    minWidth: 0,
  },
  textGap: {
    marginLeft: spacing[12], // 리딩 ↔ 텍스트 gap
  },
  trailing: {
    marginLeft: spacing[8], // 텍스트 ↔ 트레일링 gap
    flexShrink: 0,
  },
  // Pressed: 눌림 피드백. 정확한 pressed 토큰 미추출 → opacity 기반(코드베이스 관례)
  pressed: { opacity: 0.6 },
})
