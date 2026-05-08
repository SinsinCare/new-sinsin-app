import { Pressable, StyleSheet, View } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text, XStack, YStack } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import { NUTRIENTS } from "../data/filterData"

interface NutrientFilterSectionProps {
  selectedNutrients: string[]
  onToggle: (nutrient: string) => void
  onReset: () => void
}

export function NutrientFilterSection({
  selectedNutrients,
  onToggle,
  onReset,
}: NutrientFilterSectionProps) {
  const isDarkMode = useAppColorScheme() === "dark"

  const textColor = isDarkMode ? tokens.color.textDarkSub.val : "#474758"
  const resetColor = isDarkMode ? tokens.color.textDarkSub.val : "#474758"
  const defaultBorder = isDarkMode ? tokens.color.cardBgDark.val : tokens.color.borderLight.val
  const selectedBorder = isDarkMode ? tokens.color.cardBgDark.val : tokens.color.borderLight.val
  const selectedBg = isDarkMode ? "#D56E321A" : "#FCEBE1"
  const headingColor = isDarkMode ? tokens.color.textDark.val : tokens.color.textLight.val

  return (
    <YStack paddingHorizontal={16} paddingVertical={16} gap={12}>
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontFamily="$body" fontWeight="600" fontSize={15} color={headingColor}>
          영양소 제한
        </Text>
        <Pressable onPress={onReset}>
          <Text fontFamily="$body" fontSize={13} color={resetColor}>
            ↻ 초기화
          </Text>
        </Pressable>
      </XStack>
      <View style={styles.chipWrap}>
        {NUTRIENTS.map((nutrient) => {
          const isSelected = selectedNutrients.includes(nutrient.key)
          return (
            <Pressable
              key={nutrient.key}
              onPress={() => onToggle(nutrient.key)}
              style={[
                styles.chip,
                {
                  borderColor: isSelected ? selectedBorder : defaultBorder,
                  backgroundColor: isSelected ? selectedBg : "transparent",
                },
              ]}
            >
              <Text fontFamily="$body" fontSize={13} color={textColor}>
                {nutrient.label}
              </Text>
              {isSelected && (
                <Text fontFamily="$body" fontSize={11} color={textColor} marginLeft={4}>
                  ✕
                </Text>
              )}
            </Pressable>
          )
        })}
      </View>
    </YStack>
  )
}

const styles = StyleSheet.create({
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
})
