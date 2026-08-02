/**
 * 상세 화면의 섹션 껍데기. `메뉴` `사진` `후기` `편의시설 및 서비스` 처럼
 * 제목 + 본문이 반복되는 블록을 한 모양으로 고정한다.
 *
 * 섹션 사이는 **선이 아니라 면**으로 끊는다(`V2Divider variant="thick"` = 16px 회색 블록).
 * 목업이 그렇게 생겼고, 선을 얹으면 회색 면과 선이 겹쳐 두 번 끊긴 것처럼 보인다.
 *
 * `trailing` 은 제목 우측 슬롯이다 — 목업 -19 의 `후기 1,413 ›` 처럼 개수와
 * 화살표가 제목과 같은 줄에 온다.
 */

import { type ReactNode } from "react"
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native"

import {
  iconSize,
  spacing,
  typography,
  useV2Theme,
  V2Icon,
} from "@/src/design-system-v2"

import { GUTTER, SECTION_GAP, SECTION_TITLE_GAP } from "../../layout"

export interface DetailSectionProps {
  title: string
  /** 제목 오른쪽에 붙는 개수 등. 문자열만 받는다(레이아웃이 흔들리지 않게). */
  count?: string | null
  /**
   * 제목 줄 전체를 눌러 어디론가 보낼 때만 준다. 주면 `›` 가 붙는다 —
   * 화살표만 있고 동작이 없는 줄을 만들지 않기 위해 화살표를 콜백에 묶었다.
   */
  onPress?: () => void
  children: ReactNode
  style?: ViewStyle
}

export function DetailSection({
  title,
  count = null,
  onPress,
  children,
  style,
}: DetailSectionProps) {
  const { colors } = useV2Theme()

  const header = (
    <View style={styles.headerRow}>
      <Text style={[typography.title.xSmall, { color: colors.label.normal }]}>
        {title}
      </Text>
      {count !== null && (
        <Text style={[typography.label.small, { color: colors.label.normal }]}>
          {count}
        </Text>
      )}
      {onPress && (
        <V2Icon
          name="chevronRight"
          size={iconSize.sm}
          color={colors.label.alternative}
        />
      )}
    </View>
  )

  return (
    <View style={[styles.section, style]}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityState={{ disabled: false }}
          hitSlop={spacing[8]}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          {header}
        </Pressable>
      ) : (
        header
      )}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: GUTTER, paddingVertical: SECTION_GAP },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    marginBottom: SECTION_TITLE_GAP,
  },
  // 행 전체를 누르는 제목이라 카드(0.9)보다 강한 0.6 을 쓴다 — 목록 행 규칙.
  pressed: { opacity: 0.6 },
})
