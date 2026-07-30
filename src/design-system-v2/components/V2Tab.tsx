// Design System v2 — Tab (상단 텍스트 탭 바)
// Spec: project/design-system-v2/design-system-base/components/Tab.md (Figma node 228:5665)
//
// 컨트롤드 컴포넌트: `value`로 선택 탭을 외부에서 제어하고 `onChange`로 변경 통지.
// 상태 축은 selected 하나뿐 — **Disabled 상태 없음**(Tab.md).
// 두 계층(컨테이너 Tab + 반복 아이템 Tab Item)을 RN 관점으로 매핑:
//   - alignment(fixed|fluid) → 아이템 레이아웃 + 컨테이너 스크롤 여부
//   - size(l|s)              → 높이/타이포
//   - selected               → 런타임 파생(value === item.value), prop 아님
// 시맨틱 색은 useV2Theme(다크 자동).
//
// 보정: Figma 토큰명 오타 `label/nomal` → `label.normal`로 매핑(선택 텍스트·밑줄 색).

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native"
import { borderWidth, radius, spacing, typography } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"

export type V2TabSize = "l" | "s"
export type V2TabAlignment = "fixed" | "fluid"

/** 탭 아이템. 문자열만 주면 label=value로 취급 */
export type V2TabItem = { label: string; value: string }

export type V2TabProps = {
  /** 탭 목록. `{ label, value }[]` 또는 `string[]`(label=value) */
  items: V2TabItem[] | string[]
  /** 현재 선택된 탭의 value (controlled) */
  value: string
  /** 탭 선택 시 호출 */
  onChange: (value: string) => void
  /** fixed=전체 너비 균등 분할 · fluid=내용 너비 + 가로 스크롤 */
  alignment?: V2TabAlignment
  /** l=17px/51h · s=15px/38h */
  size?: V2TabSize
  style?: ViewStyle
}

/** size → 높이 + 타이포(선택/비선택). 높이는 Tab.md 고정값(컨트롤 사다리와 별개) */
const SIZE = {
  l: {
    minHeight: 51,
    textSelected: typography.label.mediumStrong, // 17 Bold
    textUnselected: typography.label.medium, // 17 Semibold
  },
  s: {
    minHeight: 38,
    textSelected: typography.label.smallStrong, // 15 Bold
    textUnselected: typography.label.small, // 15 Semibold
  },
} as const

/** alignment → 아이템 레이아웃 + 인디케이터 inset(= 아이템 가로 패딩) */
const ALIGN = {
  fixed: {
    paddingHorizontal: spacing[8], // 8 (전방향)
    inset: spacing[8],
    flex: 1, // 균등 분할(full width)
    minWidth: undefined as number | undefined,
  },
  fluid: {
    paddingHorizontal: spacing[12], // 좌우 12
    inset: spacing[12],
    flex: undefined as number | undefined, // 내용 너비
    minWidth: 64,
  },
} as const

export function V2Tab({
  items,
  value,
  onChange,
  alignment = "fixed",
  size = "l",
  style,
}: V2TabProps) {
  const { colors } = useV2Theme()
  const s = SIZE[size]
  const a = ALIGN[alignment]

  // string[] → { label, value } 정규화
  const normalized: V2TabItem[] = items.map((it) =>
    typeof it === "string" ? { label: it, value: it } : it,
  )

  const renderItem = (item: V2TabItem) => {
    const selected = item.value === value
    return (
      <Pressable
        key={item.value}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        onPress={() => onChange(item.value)}
        style={({ pressed }) => [
          styles.item,
          {
            minHeight: s.minHeight,
            paddingHorizontal: a.paddingHorizontal,
            flex: a.flex,
            minWidth: a.minWidth,
          },
          pressed && styles.pressed,
        ]}
      >
        <Text
          style={[
            selected ? s.textSelected : s.textUnselected,
            { color: selected ? colors.label.normal : colors.label.neutral },
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        {/* 밑줄 인디케이터: 선택 시에만, 아이템 하단에 절대 배치 */}
        {selected && (
          <View
            style={[
              styles.indicator,
              {
                left: a.inset,
                right: a.inset,
                backgroundColor: colors.label.normal,
              },
            ]}
          />
        )}
      </Pressable>
    )
  }

  const frame = {
    backgroundColor: colors.background.default,
    borderBottomColor: colors.line.normal,
  }

  // fluid: 내용 너비 아이템을 좌측부터 채우고 넘치면 가로 스크롤
  if (alignment === "fluid") {
    return (
      <ScrollView
        bounces={false}
        overScrollMode="never"
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.frame, frame, style]}
        contentContainerStyle={styles.row}
      >
        {normalized.map(renderItem)}
      </ScrollView>
    )
  }

  // fixed: 아이템이 flex:1로 컨테이너 너비를 균등 분할
  return (
    <View style={[styles.frame, styles.row, frame, style]}>
      {normalized.map(renderItem)}
    </View>
  )
}

const styles = StyleSheet.create({
  // 컨테이너 프레임: 배경 + 하단 구분선(1px line/normal)
  frame: { borderBottomWidth: borderWidth.thin },
  row: { flexDirection: "row", alignItems: "flex-start" },
  item: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[8], // 상하 8
  },
  // Pressed: 눌림 피드백(스펙 상태 아님, 런타임 상호작용). opacity 기반.
  pressed: { opacity: 0.6 },
  indicator: {
    position: "absolute",
    bottom: 0,
    height: borderWidth.thick, // 2
    borderRadius: radius.md, // 10
  },
})
