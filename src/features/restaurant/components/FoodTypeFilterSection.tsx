import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text, YStack } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import { FOOD_TYPES } from "../data/filterData"
import KoreanIcon from "@/assets/images/korean.svg"
import ChineseIcon from "@/assets/images/chinese.svg"
import JapaneseIcon from "@/assets/images/japanese.svg"
import AmericanIcon from "@/assets/images/american.svg"
import GlobeIcon from "@/assets/images/globe.svg"

const NUM_COLUMNS = 3
const GAP = 10
const HORIZONTAL_PADDING = 16

const ICON_MAP: Record<string, React.FC<{ width: number; height: number }>> = {
  korean: KoreanIcon,
  chinese: ChineseIcon,
  japanese: JapaneseIcon,
  american: AmericanIcon,
  globe: GlobeIcon,
}

interface FoodTypeFilterSectionProps {
  selectedFoodTypes: string[]
  onToggle: (foodType: string) => void
}

export function FoodTypeFilterSection({
  selectedFoodTypes,
  onToggle,
}: FoodTypeFilterSectionProps) {
  const isDarkMode = useAppColorScheme() === "dark"
  const { width: screenWidth } = useWindowDimensions()

  const textColor = isDarkMode ? tokens.color.textDarkSub.val : "#474758"
  const defaultBorder = isDarkMode ? tokens.color.cardBgDark.val : tokens.color.borderLight.val
  const selectedBorder = tokens.color.primaryAccent.val
  const headingColor = isDarkMode ? tokens.color.textDark.val : tokens.color.textLight.val

  const availableWidth = screenWidth - HORIZONTAL_PADDING * 2
  const cardWidth = (availableWidth - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS

  return (
    <YStack paddingHorizontal={HORIZONTAL_PADDING} paddingVertical={16} gap={12}>
      <Text fontFamily="$body" fontWeight="600" fontSize={15} color={headingColor}>
        음식 종류
      </Text>
      <View style={styles.grid}>
        {FOOD_TYPES.map((food) => {
          const isSelected = selectedFoodTypes.includes(food.key)
          const IconComponent = ICON_MAP[food.icon]
          return (
            <Pressable
              key={food.key}
              onPress={() => onToggle(food.key)}
              style={[
                styles.card,
                {
                  width: cardWidth,
                  borderColor: isSelected ? selectedBorder : defaultBorder,
                },
              ]}
            >
              {IconComponent && <IconComponent width={36} height={36} />}
              <Text
                fontFamily="$body"
                fontWeight="500"
                fontSize={13}
                color={isSelected ? selectedBorder : textColor}
                marginTop={6}
              >
                {food.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </YStack>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  card: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
})
