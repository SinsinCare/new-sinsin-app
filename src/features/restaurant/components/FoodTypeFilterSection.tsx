import { Pressable, StyleSheet, useColorScheme, View } from "react-native"
import { Text, YStack } from "tamagui"
import { FOOD_TYPES } from "../data/filterData"
import KoreanIcon from "@/assets/images/korean.svg"
import ChineseIcon from "@/assets/images/chinese.svg"
import JapaneseIcon from "@/assets/images/japanese.svg"
import AmericanIcon from "@/assets/images/american.svg"
import GlobeIcon from "@/assets/images/globe.svg"

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
  const isDarkMode = useColorScheme() === "dark"

  const textColor = isDarkMode ? "#ABABB4" : "#474758"
  const defaultBorder = isDarkMode ? "#313138" : "#EAEAF0"
  const selectedBorder = "#FF7246"
  const headingColor = isDarkMode ? "#E7E7EE" : "#2A2A37"

  return (
    <YStack paddingHorizontal={16} paddingVertical={16} gap={12}>
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
    gap: 10,
  },
  card: {
    width: "30%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
})
