/**
 * 필터 시트 푸터 위의 선택 트레이 (목업 -23 / -24).
 * 왼쪽 휴지통 = 전체 해제, 이어서 `강남 ✕` 형태의 제거 가능한 칩이 가로로 스크롤된다.
 *
 * ## 선택이 없으면 아예 없다
 *
 * 빈 트레이를 자리만 잡아 두면 시트가 열릴 때 스크롤 영역이 그만큼 줄고, 첫 칩을 고르는
 * 순간에도 레이아웃이 흔들리지 않는 대신 늘 회색 띠가 남는다. 목업 -22(선택 없음)에는
 * 그 띠가 없다 — 그래서 `null` 을 돌려준다. 높이 변화는 시트가 흡수한다.
 *
 * ## 휴지통은 빨강이지만 파괴적이지 않다
 *
 * 지우는 것은 선택뿐이고 확인 대화상자를 띄우지 않는다. 되돌리는 비용이 "다시 고르기" 라서
 * 확인을 물으면 그게 더 방해다. 대신 색은 목업대로 빨강 계열을 써서 "지운다" 를 말한다.
 */

import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import type { ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"
import {
  controlHeight,
  iconSize,
  radius,
  spacing,
  touchTarget,
  useV2Theme,
  V2Icon,
} from "@/src/design-system-v2"

import { SHEET_GUTTER } from "../layout"
import { dynamicKey } from "@/src/i18n/dynamicKey"

import type { FilterChipEntry } from "../types"
import { SelectableChip } from "./SelectableChip"

export interface SelectedFilterTrayProps {
  chips: FilterChipEntry[]
  onRemove: (entry: FilterChipEntry) => void
  onClearAll: () => void
  style?: ViewStyle
}

export function SelectedFilterTray({
  chips,
  onRemove,
  onClearAll,
  style,
}: SelectedFilterTrayProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()

  if (chips.length === 0) return null

  return (
    <View style={[styles.root, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("restaurant.filter.clearAll")}
        hitSlop={Math.max(0, (touchTarget.min - controlHeight.sm) / 2)}
        onPress={onClearAll}
        style={({ pressed }) => [
          styles.trash,
          { backgroundColor: colors.accentForeground.redWeak },
          pressed && styles.pressed,
        ]}
      >
        <V2Icon
          name="trash"
          size={iconSize.sm}
          color={colors.accentForeground.red}
        />
      </Pressable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={styles.chips}
      >
        {chips.map((entry) => (
          <SelectableChip
            key={`${entry.axis}:${entry.value}`}
            size="s"
            selected
            label={t(dynamicKey(entry.labelKey))}
            onRemove={() => onRemove(entry)}
            // 칩 본체는 누를 데가 없다 — 지우는 것 말고 할 일이 없어서 ✕ 만 인터랙티브다.
            accessibilityLabel={t(dynamicKey(entry.labelKey))}
          />
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingHorizontal: SHEET_GUTTER,
  },
  trash: {
    width: controlHeight.sm,
    height: controlHeight.sm,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  chips: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingRight: spacing[8],
  },
  pressed: { opacity: 0.85 },
})
