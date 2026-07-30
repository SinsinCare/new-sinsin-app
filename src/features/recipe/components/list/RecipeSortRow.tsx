/**
 * 정렬 줄 — `추천 | 최신 | 별점 | 저장많은 | 빨리되는`(계약 §3.1 sort 5종).
 *
 * `빨리되는`(quick)은 시안에 없다. 하지만 "지금 뭐 먹지" 는 실제 질의다 — 조리시간이
 * 15분인지 45분인지가 오늘 그걸 만드는지 마는지를 정한다.
 *
 * 왜 칩이 아니라 글자인가: 위의 적용된 필터 칩과 생김새가 같으면 하나는 "빼는 것",
 * 하나는 "고르는 것" 인데 사용자가 구별할 수 없다. 정렬은 항상 하나가 켜져 있고
 * 지울 수 없으므로 X 가 붙는 칩과 다른 문법을 준다(§6.4 결과 예측 가능).
 */
import { Pressable, ScrollView } from "react-native"
import { Text, View, YStack } from "tamagui"
import { useTranslation } from "react-i18next"

import { useSurface } from "@/src/hooks/useSurface"
import { tokens } from "@/src/theme/tokens"

import { RECIPE_SORT_KEYS, type RecipeSortKey } from "../../types/recipeListV2"

const SORT_LABEL_KEYS = {
  recommended: "list.sort.recommended",
  recent: "list.sort.recent",
  rating: "list.sort.rating",
  saves: "list.sort.saves",
  quick: "list.sort.quick",
} as const satisfies Record<RecipeSortKey, string>

interface RecipeSortRowProps {
  sort: RecipeSortKey
  onChange: (sort: RecipeSortKey) => void
}

export function RecipeSortRow({ sort, onChange }: RecipeSortRowProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: 18, paddingRight: 4 }}
    >
      {RECIPE_SORT_KEYS.map((key) => {
        const isActive = key === sort
        const label = t(SORT_LABEL_KEYS[key])
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="button"
            accessibilityLabel={t("list.sortAccessibility", { label })}
            accessibilityState={{ selected: isActive }}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <YStack gap={5} alignItems="center">
              <Text
                fontFamily="$body"
                fontSize={14}
                lineHeight={20}
                fontWeight={isActive ? "700" : "500"}
                letterSpacing={-0.28}
                color={isActive ? tokens.color.primary.val : surface.textMuted}
              >
                {label}
              </Text>
              <View
                height={2}
                borderRadius={2}
                alignSelf="stretch"
                backgroundColor={
                  isActive ? tokens.color.primary.val : "transparent"
                }
              />
            </YStack>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
