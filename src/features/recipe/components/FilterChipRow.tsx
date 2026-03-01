// src/features/recipe/components/FilterChipRow.tsx
import { ScrollView, Pressable, useColorScheme } from "react-native"
import { XStack } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"
import { FilterChip } from "./FilterChip"

interface FilterChipItem {
  key: string
  label: string
}

interface FilterChipRowProps {
  chips: FilterChipItem[]
  selectedChips?: string[]
  onChipPress?: (key: string) => void
  onFilterPress?: () => void
}

const ICON_COLORS = {
  light: "#8E8E93",
  dark: "#66666B",
} as const

export function FilterChipRow({
  chips,
  selectedChips = [],
  onChipPress,
  onFilterPress,
}: FilterChipRowProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const iconColor = isDark ? ICON_COLORS.dark : ICON_COLORS.light

  return (
    <XStack alignItems="center" gap={12}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
        style={{ flex: 1 }}
      >
        {chips.map((chip) => (
          <FilterChip
            key={chip.key}
            label={chip.label}
            isSelected={selectedChips.includes(chip.key)}
            onPress={() => onChipPress?.(chip.key)}
          />
        ))}
      </ScrollView>
      <Pressable
        onPress={onFilterPress}
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Icon name="filter" size={24} color={iconColor} />
      </Pressable>
    </XStack>
  )
}
