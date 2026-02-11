import { YStack, XStack, Text } from "tamagui"
import { CATEGORY_LIST } from "../data/mockData"
import { CategoryCard } from "./CategoryCard"
import type { ChatCategory } from "../types"

interface CategorySectionProps {
  onCategoryPress: (key: ChatCategory) => void
}

export function CategorySection({ onCategoryPress }: CategorySectionProps) {
  return (
    <YStack paddingHorizontal="$5" gap="$3">
      <Text fontSize="$5" fontWeight="700" color="$grey3">
        상담 카테고리
      </Text>

      <XStack flexWrap="wrap" gap="$3">
        {CATEGORY_LIST.map((category) => (
          <YStack
            key={category.key}
            width="47%"
            flexGrow={1}
            flexShrink={0}
          >
            <CategoryCard category={category} onPress={onCategoryPress} />
          </YStack>
        ))}
      </XStack>
    </YStack>
  )
}
