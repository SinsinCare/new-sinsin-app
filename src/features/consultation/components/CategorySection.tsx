import { useTranslation } from "react-i18next"

import { useV2Theme, V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import { getLocalizedCategories } from "../data/mockData"
import { CategoryCard } from "./CategoryCard"
import type { ChatCategory } from "../types"

interface CategorySectionProps {
  onCategoryPress: (key: ChatCategory) => void
}

export function CategorySection({ onCategoryPress }: CategorySectionProps) {
  const { t, i18n } = useTranslation("common")
  const { colors } = useV2Theme()
  const categories = getLocalizedCategories(
    i18n.resolvedLanguage ?? i18n.language,
  )
  return (
    <V2VStack paddingHorizontal={20} gap={12}>
      {/*
        `$grey3` 는 tamagui 팔레트의 진한 회색 — 다크모드에서 테마가 알아서
        뒤집어 주던 값이다. v2 로 오면 그 자동 전환이 없으므로 **의미로 바꾼다**:
        섹션 제목이니 `label.strong`. `useV2Theme()` 가 스킴에 맞는 값을 준다.
      */}
      <V2Text
        token="title.small"
        color={colors.label.strong}
        lineBreakStrategyIOS="hangul-word"
      >
        {t("consult.heroTitle").replace("\n", " ")}
      </V2Text>

      <V2HStack wrap="wrap" gap={12}>
        {categories.map((category) => (
          <V2VStack
            key={category.key}
            style={{ width: "47%", flexGrow: 1, flexShrink: 0 }}
          >
            <CategoryCard category={category} onPress={onCategoryPress} />
          </V2VStack>
        ))}
      </V2HStack>
    </V2VStack>
  )
}
