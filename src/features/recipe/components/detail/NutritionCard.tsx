/**
 * 영양 카드 — 이 앱의 존재 이유(계약 §6.1 마지막 줄)이고, 동시에 가장 위험한 자리다.
 *
 * 지키는 것:
 *  - `provenance` 없이는 **수치를 그리지 않는다**(§1.1). nutrition 이 null 이면 안내만 남는다.
 *  - 문구에 "안전"·"괜찮다"·"신장에 좋다" 가 없다. 숫자와 비율만 말한다(§1.3).
 *  - `percentOfRemaining` 이 null 이면 비율을 숨기고 절대값만 보인다. 단백질만 null 인 경우
 *    (체중 기록 없음)는 다른 문구를 준다 — "계산할 수 없다"와 "체중을 기록하면 된다"는 다른 말이다.
 *  - 색: 그레이스케일 + 브랜드 하나. `safe*`(틸)는 쓰지 않는다(§6.4). 막대는 회색이고,
 *    남은 참고량을 **넘긴 항목만** 브랜드색이 된다 — 그것이 이 화면의 유일한 강조다.
 *    (넘겼다는 것은 판정이 아니라 뺄셈의 결과다.)
 */
import { Pressable } from "react-native"
import { Text, View, XStack, YStack } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import {
  NUTRIENT_KEYS,
  type NutrientBudget,
  type NutrientHeadline,
  type NutrientKey,
  type RecipeNutrition,
} from "../../types/recipeV2"
import {
  barFillRatio,
  formatNutrientAmount,
  formatPercent,
  isOverRemaining,
  orderBreakdown,
} from "./recipeDetailModel"

const NUTRIENT_LABEL_KEYS = {
  sodium: "curated.sodium",
  potassium: "curated.potassium",
  phosphorus: "curated.phosphorus",
  protein: "curated.protein",
} as const satisfies Record<NutrientKey, string>

const PROVENANCE_BADGE_KEYS = {
  reference_estimate: "detail.nutrition.badge.reference_estimate",
  computed_from_ingredients: "detail.nutrition.badge.computed_from_ingredients",
  author_supplied: "detail.nutrition.badge.author_supplied",
  nutritionist_reviewed: "detail.nutrition.badge.nutritionist_reviewed",
} as const

export interface NutritionCardProps {
  /** null 이면 출처를 확인할 수 없는 응답이다 — 수치를 그리지 않는다. */
  nutrition: RecipeNutrition | null
  /** 이미 인분 배율이 적용된 값 */
  breakdown: NutrientHeadline[]
  budget: NutrientBudget
  /** 지금 화면이 기준으로 삼은 인분 수 */
  servings: number
  onOpenProvenance: () => void
}

export function NutritionCard({
  nutrition,
  breakdown,
  budget,
  servings,
  onOpenProvenance,
}: NutritionCardProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()

  if (nutrition == null) {
    return (
      <YStack
        gap={6}
        padding={LAYOUT.card.padding}
        borderRadius={LAYOUT.card.radius}
        backgroundColor={surface.surface}
      >
        <Text {...TYPE.cardTitle} fontFamily="$body" color={surface.textStrong}>
          {t("detail.nutrition.unavailableTitle")}
        </Text>
        <Text {...TYPE.caption} fontFamily="$body" color={surface.textMuted}>
          {t("detail.nutrition.unavailableBody")}
        </Text>
      </YStack>
    )
  }

  const rows = orderBreakdown(breakdown, NUTRIENT_KEYS)

  return (
    <YStack gap={14}>
      <XStack alignItems="center" justifyContent="space-between" gap={12}>
        <Text
          {...TYPE.sectionTitle}
          fontFamily="$body"
          fontWeight="700"
          color={surface.textStrong}
        >
          {t("curated.nutritionTitle")}
        </Text>
        <Pressable
          onPress={onOpenProvenance}
          accessibilityRole="button"
          accessibilityLabel={t("detail.nutrition.provenanceTitle")}
          accessibilityHint={t("detail.nutrition.provenanceHint")}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <XStack
            alignItems="center"
            gap={4}
            height={LAYOUT.badge.height}
            paddingHorizontal={10}
            borderRadius={LAYOUT.badge.radius}
            backgroundColor={surface.surface}
          >
            <Text
              {...TYPE.caption}
              fontFamily="$body"
              color={surface.textMuted}
            >
              {t(PROVENANCE_BADGE_KEYS[nutrition.provenance])}
            </Text>
            <Ionicons
              name="information-circle-outline"
              size={14}
              color={surface.textMuted}
            />
          </XStack>
        </Pressable>
      </XStack>

      <Text {...TYPE.caption} fontFamily="$body" color={surface.textMuted}>
        {t("detail.nutrition.basis", { count: servings })}
        {" · "}
        {/* 열량은 막대를 갖지 않는다 — CKD 참고량은 나트륨·칼륨·인·단백질 넷이다. */}
        {`${Math.round(nutrition.kcal)}kcal`}
      </Text>

      <YStack gap={16}>
        {rows.map((row) => (
          <NutrientRow
            key={row.key}
            headline={row}
            proteinBudgetMissing={budget.proteinG == null}
          />
        ))}
      </YStack>

      {nutrition.unmatchedIngredients.length > 0 && (
        <YStack
          gap={4}
          padding={14}
          borderRadius={12}
          backgroundColor={surface.surface}
        >
          <Text
            {...TYPE.caption}
            fontFamily="$body"
            fontWeight="600"
            color={surface.textStrong}
          >
            {t("detail.nutrition.unmatchedTitle")}
          </Text>
          <Text {...TYPE.caption} fontFamily="$body" color={surface.textMuted}>
            {t("detail.nutrition.unmatchedBody")}
          </Text>
          <Text {...TYPE.caption} fontFamily="$body" color={surface.textMuted}>
            {nutrition.unmatchedIngredients.join(" · ")}
          </Text>
        </YStack>
      )}
    </YStack>
  )
}

function NutrientRow({
  headline,
  proteinBudgetMissing,
}: {
  headline: NutrientHeadline
  proteinBudgetMissing: boolean
}) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()
  const fill = barFillRatio(headline.percentOfRemaining)
  const over = isOverRemaining(headline.percentOfRemaining)
  const fillColor = over ? surface.brand : surface.textMuted

  const note =
    headline.percentOfRemaining != null
      ? t("detail.nutrition.remaining", {
          percent: formatPercent(headline.percentOfRemaining),
        })
      : headline.key === "protein" && proteinBudgetMissing
        ? t("detail.nutrition.proteinNoWeight")
        : t("detail.nutrition.remainingUnknown")

  return (
    <YStack gap={7}>
      <XStack alignItems="baseline" justifyContent="space-between" gap={12}>
        <Text {...TYPE.value} fontFamily="$body" color={surface.text}>
          {t(NUTRIENT_LABEL_KEYS[headline.key])}
        </Text>
        <Text
          {...TYPE.value}
          fontFamily="$body"
          fontWeight="700"
          color={surface.textStrong}
        >
          {formatNutrientAmount(headline.amount, headline.unit)}
          {headline.unit}
        </Text>
      </XStack>
      {fill != null && (
        <View
          height={6}
          borderRadius={3}
          backgroundColor={surface.surface}
          overflow="hidden"
        >
          <View
            height={6}
            borderRadius={3}
            backgroundColor={fillColor}
            width={`${Math.max(2, fill * 100)}%`}
          />
        </View>
      )}
      <Text
        {...TYPE.caption}
        fontFamily="$body"
        color={over ? surface.brand : surface.textMuted}
      >
        {note}
      </Text>
    </YStack>
  )
}
