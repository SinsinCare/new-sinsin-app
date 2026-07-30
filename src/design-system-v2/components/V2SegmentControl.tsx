// Design System v2 — Segment Control
// Spec: project/design-system-v2/design-system-base/components/Segment-Control.md (Figma node 227:5473)
//
// 회색 트랙(fill.normal) 안에 세그먼트 2개 이상이 놓이고, 선택된 세그먼트만
// 흰색 알약(pill, background.default + elevation[1])으로 떠올라 강조되는 컨트롤드 토글.
//  - size: l · s  → 트랙/pill 치수 + 타이포 룩업
//  - alignment: fixed(전체 너비 균등 분할) · fluid(내용 너비 + 가로 스크롤)
//  - selected 상태는 value === item.value에서 파생 (별도 상태 축 없음)
//
// 패턴: size→{치수·타이포} 룩업 + selected→{배경·글자색·타이포} 분기. 시맨틱 색은 useV2Theme(다크 자동).

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native"
import {
  controlHeight,
  elevation,
  radius,
  spacing,
  typography,
} from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"

export type V2SegmentControlSize = "l" | "s"
export type V2SegmentControlAlignment = "fixed" | "fluid"

/** 세그먼트 아이템. 문자열만 주면 label === value로 취급. */
export type V2SegmentItem = { label: string; value: string }

export type V2SegmentControlProps = {
  /** 세그먼트 목록 (2개 이상). {label,value}[] 또는 string[] */
  items: (V2SegmentItem | string)[]
  /** 선택된 세그먼트의 value */
  value: string
  /** 세그먼트 선택 시 호출 */
  onChange: (value: string) => void
  size?: V2SegmentControlSize
  alignment?: V2SegmentControlAlignment
  style?: ViewStyle
}

/** size → 트랙/세그먼트 치수 + 타이포 (Segment-Control.md 스펙) */
const SIZE = {
  l: {
    // 트랙: radius 14(xl), 패딩 ~5/4 → spacing[4]로 스냅
    trackRadius: radius.xl,
    trackPadding: spacing[4],
    // pill: height 40(대응 controlHeight 토큰 없음 → 리터럴), radius 10(md)
    segmentHeight: 40,
    segmentRadius: radius.md,
    paddingFixed: spacing[8], // 8
    paddingFluid: spacing[12], // 12
    textSelected: typography.label.medium, // 17 / Semibold
    textUnselected: typography.label.mediumWeak, // 17 / Medium
  },
  s: {
    // 트랙: radius 10(md), 패딩 ~3/3 → spacing[2]로 스냅
    trackRadius: radius.md,
    trackPadding: spacing[2],
    // pill: height 32(controlHeight.sm), radius 8(sm)
    segmentHeight: controlHeight.sm,
    segmentRadius: radius.sm,
    paddingFixed: spacing[8], // 8
    paddingFluid: spacing[12], // 13 → 12로 스냅
    textSelected: typography.label.small, // 15 / Semibold
    textUnselected: typography.label.smallWeak, // 15 / Medium
  },
} as const

/** string[] | V2SegmentItem[] → V2SegmentItem[] 정규화 */
function normalizeItems(
  items: V2SegmentControlProps["items"],
): V2SegmentItem[] {
  return items.map((it) =>
    typeof it === "string" ? { label: it, value: it } : it,
  )
}

export function V2SegmentControl({
  items,
  value,
  onChange,
  size = "l",
  alignment = "fixed",
  style,
}: V2SegmentControlProps) {
  const { colors } = useV2Theme()
  const s = SIZE[size]
  const data = normalizeItems(items)
  const isFluid = alignment === "fluid"

  const renderSegment = (item: V2SegmentItem) => {
    const selected = item.value === value
    return (
      <Pressable
        key={item.value}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => {
          if (!selected) onChange(item.value)
        }}
        style={({ pressed }) => [
          styles.segment,
          {
            minHeight: s.segmentHeight,
            borderRadius: s.segmentRadius,
            paddingHorizontal: isFluid ? s.paddingFluid : s.paddingFixed,
          },
          // Fixed: 트랙 너비 균등 분할 / Fluid: 내용 너비
          isFluid ? styles.segmentFluid : styles.segmentFixed,
          // 선택 pill: 흰색 배경 + 살짝 뜬 그림자
          selected && {
            backgroundColor: colors.background.default,
            ...elevation[1],
          },
          pressed && !selected && styles.pressed,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            selected ? s.textSelected : s.textUnselected,
            { color: selected ? colors.label.normal : colors.label.neutral },
          ]}
        >
          {item.label}
        </Text>
      </Pressable>
    )
  }

  // Fluid: 가로 스크롤 트랙 (내용이 넘치면 스크롤). 페이드/화살표 보조요소는 이 API 범위 밖.
  if (isFluid) {
    return (
      <ScrollView
        bounces={false}
        overScrollMode="never"
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[
          styles.fluidTrack,
          {
            backgroundColor: colors.fill.normal,
            borderRadius: s.trackRadius,
          },
          style,
        ]}
        contentContainerStyle={{ padding: s.trackPadding }}
      >
        {data.map(renderSegment)}
      </ScrollView>
    )
  }

  // Fixed: 전체 너비, 세그먼트 균등 분할
  return (
    <View
      style={[
        styles.fixedTrack,
        {
          backgroundColor: colors.fill.normal,
          borderRadius: s.trackRadius,
          padding: s.trackPadding,
        },
        style,
      ]}
    >
      {data.map(renderSegment)}
    </View>
  )
}

const styles = StyleSheet.create({
  fixedTrack: {
    flexDirection: "row",
    alignItems: "center",
  },
  // 가로 스크롤 시 세로로 늘어나지 않도록 (트랙 높이 = 내용 높이)
  fluidTrack: {
    flexGrow: 0,
    alignSelf: "flex-start",
  },
  segment: {
    alignItems: "center",
    justifyContent: "center",
  },
  segmentFixed: { flex: 1 },
  segmentFluid: { flexShrink: 0 },
  // Pressed: 눌림 피드백. 정확한 pressed 토큰 미추출 → opacity 기반(V2Button과 동일 접근).
  pressed: { opacity: 0.6 },
})
