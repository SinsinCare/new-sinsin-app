import { YStack, XStack, Text } from "tamagui"
import { getLocalizedCategories } from "../data/mockData"
import { CategoryCard } from "./CategoryCard"
import type { ChatCategory } from "../types"
import { useTranslation } from "react-i18next"

interface CategorySectionProps {
  onCategoryPress: (key: ChatCategory) => void
}

export function CategorySection({ onCategoryPress }: CategorySectionProps) {
  const { t, i18n } = useTranslation("common")
  const categories = getLocalizedCategories(
    i18n.resolvedLanguage ?? i18n.language,
  )
  return (
    <YStack paddingHorizontal="$5" gap="$3">
      <Text
        fontSize="$5"
        fontWeight="700"
        color="$grey3"
        lineBreakStrategyIOS="hangul-word"
      >
        {t("consult.heroTitle").replace("\n", " ")}
      </Text>

      <XStack flexWrap="wrap" gap="$3">
        {categories.map((category) => (
          <YStack key={category.key} width="47%" flexGrow={1} flexShrink={0}>
            <CategoryCard category={category} onPress={onCategoryPress} />
          </YStack>
        ))}
      </XStack>
    </YStack>
  )
}
