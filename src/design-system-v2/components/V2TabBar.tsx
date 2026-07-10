// Design System v2 — Tab Bar (하단 고정 탭 바)
// Spec: project/design-system-v2/design-system-base/components/Tab-Bar.md (Figma node 61:5948)
//
// 컨트롤드 컴포넌트: `value`로 선택 탭을 외부에서 제어하고 `onChange`로 변경 통지.
// selected는 런타임 파생(value === item.value) — prop 아님. 상태 축은 selected / redDot 둘뿐(Disabled 없음).
// 세 계층(컨테이너 Tab Bar + 반복 아이템 Tab Item + 아이콘 Tab Bar Icons)을 RN 관점으로 매핑:
//   - `아이폰 X`(safe-area) 축 → useSafeAreaInsets().bottom 으로 대응(홈 인디케이터 영역 자동 반영)
//   - selected / redDot        → value 파생 + item.redDot
// 시맨틱 색은 useV2Theme(다크 자동).
//
// 아이콘 세트 갭(주의): home/location/recipe/menu 등 앱 탭용 mono 아이콘은 아직 v2 아이콘 세트에 없음.
//   컴포넌트는 `icon: V2IconName`으로 제네릭하게 받고, 없는 아이콘은 소비처가 세트(icons/registry.ts)에
//   추가해 넘기는 구조. 여기서 특정 탭 아이콘을 하드코딩하지 않음.
//
// 보정(스펙 그대로 유지): 비선택 상태에서 아이콘은 label.disable(알파 16%), 라벨은 label.alternative(알파 51%)로
//   서로 다른 강도의 토큰이 바인딩돼 아이콘이 라벨보다 흐림. 일반적 탭 바와 어긋나지만 Figma 실제 바인딩을 따름.

import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { borderWidth, radius, spacing, typography } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
import type { V2IconName } from "../icons"
import { V2Icon } from "./V2Icon"

/** 탭 아이템. icon은 v2 아이콘 세트 이름(V2IconName) — 세트에 없는 앱 탭 아이콘은 소비처가 추가해 넘김 */
export type V2TabBarItem = {
  value: string
  label: string
  icon: V2IconName
  /** 아이콘 우상단 알림 뱃지(빨간 점). 선택 여부와 독립 */
  redDot?: boolean
}

export type V2TabBarProps = {
  /** 탭 목록. 화면 전체 폭을 개수만큼 균등 분할 */
  items: V2TabBarItem[]
  /** 현재 선택된 탭의 value (controlled) */
  value: string
  /** 탭 선택 시 호출 */
  onChange: (value: string) => void
  style?: ViewStyle
}

export function V2TabBar({ items, value, onChange, style }: V2TabBarProps) {
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()

  // safe-area(홈 인디케이터) 있으면 그 높이만큼 하단 여백 확보(iOS가 인디케이터 바를 직접 그림 → 우리는 영역만 예약).
  // 없으면 스펙 하단 패딩 11(콘텐츠 행 높이 62). one-off 값이라 토큰 없음.
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 11

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        {
          paddingBottom: bottomPadding,
          backgroundColor: colors.background.default,
          borderTopColor: colors.line.alternative,
        },
        style,
      ]}
    >
      {items.map((item) => {
        const selected = item.value === value
        return (
          <Pressable
            key={item.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={item.label}
            onPress={() => onChange(item.value)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <View style={styles.iconWrap}>
              <V2Icon
                name={item.icon}
                size="md" // 24
                // selected: label.neutral / unselected: label.disable (보정 주석 참고)
                color={selected ? colors.label.neutral : colors.label.disable}
              />
              {item.redDot && (
                <View
                  style={[
                    styles.redDot,
                    { backgroundColor: colors.status.negative },
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                typography.caption.small, // 11px Medium / LH 14 (전용 크기, 세만틱 토큰 대응 없음)
                {
                  color: selected
                    ? colors.label.neutral
                    : colors.label.alternative,
                },
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  // 컨테이너: 상단 라운드 24 + 상단 테두리 1px(line/alternative). 하단은 각짐.
  // 콘텐츠 행 패딩 상 8 / 좌우 18(18은 one-off, 토큰 없음). paddingBottom은 런타임(safe-area).
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderTopWidth: borderWidth.thin,
    borderTopLeftRadius: radius["3xl"], // 24
    borderTopRightRadius: radius["3xl"], // 24
    paddingTop: spacing[8], // 8
    paddingHorizontal: 18,
  },
  // 아이템: 개수만큼 균등 분할(flex 1) + 최소 폭 46. 세로 스택(아이콘↔라벨 gap 3).
  item: {
    flex: 1,
    minWidth: 46,
    alignItems: "center",
    gap: 3, // one-off, 토큰 없음
    paddingHorizontal: spacing[6], // 6
    paddingVertical: 1, // one-off, 토큰 없음
  },
  // Pressed: 눌림 피드백(스펙 상태 아님, 런타임 상호작용). opacity 기반.
  pressed: { opacity: 0.6 },
  // 24 아이콘 기준 relative 래퍼 — red dot 절대배치 기준점(overflow 보임 유지)
  iconWrap: { position: "relative" },
  // Red dot: 5×5 원. 아이콘 우상단(Figma 중심 기준 우 +15.5 / 상 -18 → 코너 근사).
  redDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 5,
    height: 5,
    borderRadius: radius.full, // 원형
  },
})
