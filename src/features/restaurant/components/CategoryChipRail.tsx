import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native"
import { useTranslation } from "react-i18next"
import type React from "react"
import {
  V2Icon,
  iconSize,
  radius,
  spacing,
  touchTarget,
  useV2Theme,
} from "@/src/design-system-v2"
import { dynamicKey } from "@/src/i18n/dynamicKey"
import type { CuisineType } from "../types"
import { RAIL_CUISINE_TYPES } from "../data/filterCatalog"
import { CUISINE_ART } from "./cuisineArt"
import { railChipSurface } from "./categoryChipSurface"
import { RAIL_INSET } from "../layout"
const HEIGHT = touchTarget.min
const RAIL_CHIP_GAP = spacing[8]
const ART_SIZE = iconSize.xs
const RAIL_PAD_VERTICAL = spacing[12]
export interface CategoryChipRailProps {
  selected: CuisineType | null
  onSelect: (type: CuisineType | null) => void
  onPressAiSearch: () => void
  insetHorizontal?: number
  style?: ViewStyle
}
export function CategoryChipRail({
  selected,
  onSelect,
  onPressAiSearch,
  insetHorizontal = RAIL_INSET,
  style,
}: CategoryChipRailProps) {
  const { t } = useTranslation("common")
  return (
    <ScrollView
      horizontal
      bounces={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        { paddingLeft: insetHorizontal, paddingRight: insetHorizontal },
      ]}
      style={[styles.rail, style]}
    >
      <RailChip
        label={t("restaurant.map.aiSearch")}
        onPress={onPressAiSearch}
        leading={<V2Icon name="sparkle" size={iconSize.xs} />}
      />
      {RAIL_CUISINE_TYPES.map((spec) => {
        const Art = CUISINE_ART[spec.value]
        const isSelected = selected === spec.value
        return (
          <RailChip
            key={spec.value}
            label={t(dynamicKey(spec.labelKey))}
            selected={isSelected}
            // 같은 칩을 다시 누르면 해제된다(단일 선택 토글).
            onPress={() => onSelect(isSelected ? null : spec.value)}
            leading={
              Art ? <Art width={ART_SIZE} height={ART_SIZE} /> : undefined
            }
          />
        )
      })}
    </ScrollView>
  )
}
function RailChip({
  label,
  selected,
  onPress,
  leading,
}: {
  label: string
  selected?: boolean
  onPress: () => void
  leading?: React.ReactNode
}) {
  const { colors, mode } = useV2Theme()
  const isToggle = selected !== undefined
  const active = selected === true
  const surface = railChipSurface({ active, mode, colors })
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isToggle ? { selected: active } : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.surface,
          surface.shadow,
          {
            backgroundColor: surface.backgroundColor,
            borderColor: surface.borderColor,
            borderWidth: surface.borderWidth,
          },
        ]}
      />
      {leading}
      <Text
        style={[surface.typography, { color: surface.color }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}
const styles = StyleSheet.create({
  // 가로 ScrollView 기본 flexGrow가 리스트 화면의 남은 세로 공간을 먹지 않게 한다.
  // 지도에서는 absolute overlay라 차이가 없고, 목록에서는 칩 높이만 차지해야 한다.
  rail: { flexGrow: 0, marginVertical: -RAIL_PAD_VERTICAL },
  content: {
    gap: RAIL_CHIP_GAP,
    alignItems: "center",
    paddingVertical: RAIL_PAD_VERTICAL,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    minHeight: HEIGHT,
    minWidth: touchTarget.min,
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[12],
    borderRadius: radius.full,
  },
  // 32-point face inside a full 44-point target; both grow with larger text.
  surface: {
    ...StyleSheet.absoluteFillObject,
    top: spacing[6],
    bottom: spacing[6],
    borderRadius: radius.full,
  },
  pressed: { opacity: 0.85 },
})
