/**
 * "무엇이 추정인가" 시트. 영양 카드의 배지를 누르면 열린다(계약 §6.2).
 *
 * 배지만 있고 설명이 없으면 사용자는 "추정값" 을 브랜드 문구로 읽는다. 여기서 두 가지를
 * 분명히 말한다: (1) 이 숫자가 어디서 왔는지, (2) 비율은 내 기록에서 뺀 뺄셈이며
 * 이 레시피가 나에게 맞는지에 대한 판단이 아니라는 것(§1.3).
 */
import { Pressable } from "react-native"
import { Text, XStack, YStack } from "tamagui"
import { useTranslation } from "react-i18next"
import { AppBottomSheet } from "@/src/shared/components"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import type { RecipeNutrition } from "../../types/recipeV2"

const PROVENANCE_BADGE_KEYS = {
  reference_estimate: "detail.nutrition.badge.reference_estimate",
  computed_from_ingredients: "detail.nutrition.badge.computed_from_ingredients",
  author_supplied: "detail.nutrition.badge.author_supplied",
  nutritionist_reviewed: "detail.nutrition.badge.nutritionist_reviewed",
} as const

const PROVENANCE_EXPLAIN_KEYS = {
  reference_estimate: "detail.nutrition.explain.reference_estimate",
  computed_from_ingredients:
    "detail.nutrition.explain.computed_from_ingredients",
  author_supplied: "detail.nutrition.explain.author_supplied",
  nutritionist_reviewed: "detail.nutrition.explain.nutritionist_reviewed",
} as const

const SNAP_POINTS = [52]

export interface ProvenanceSheetProps {
  visible: boolean
  onClose: () => void
  nutrition: RecipeNutrition | null
}

export function ProvenanceSheet({
  visible,
  onClose,
  nutrition,
}: ProvenanceSheetProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={SNAP_POINTS}
    >
      <YStack paddingHorizontal={LAYOUT.screenX} paddingTop={8} gap={16}>
        <Text
          {...TYPE.sheetTitle}
          fontFamily="$body"
          fontWeight="700"
          color={surface.textStrong}
        >
          {t("detail.nutrition.provenanceTitle")}
        </Text>

        {nutrition == null ? (
          <Text {...TYPE.value} fontFamily="$body" color={surface.textMuted}>
            {t("detail.nutrition.unavailableBody")}
          </Text>
        ) : (
          <YStack gap={14}>
            <XStack
              alignSelf="flex-start"
              height={LAYOUT.badge.height}
              paddingHorizontal={10}
              alignItems="center"
              borderRadius={LAYOUT.badge.radius}
              backgroundColor={surface.surface}
            >
              <Text
                {...TYPE.caption}
                fontFamily="$body"
                fontWeight="600"
                color={surface.textStrong}
              >
                {t(PROVENANCE_BADGE_KEYS[nutrition.provenance])}
              </Text>
            </XStack>

            <Text
              {...TYPE.value}
              fontFamily="$body"
              color={surface.text}
              lineHeight={23}
            >
              {t(PROVENANCE_EXPLAIN_KEYS[nutrition.provenance])}
            </Text>

            <Text
              {...TYPE.caption}
              fontFamily="$body"
              color={surface.textMuted}
              lineHeight={20}
            >
              {t("detail.nutrition.explainScope")}
            </Text>

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
                <Text
                  {...TYPE.caption}
                  fontFamily="$body"
                  color={surface.textMuted}
                  lineHeight={20}
                >
                  {t("detail.nutrition.unmatchedBody")}
                </Text>
                <Text
                  {...TYPE.caption}
                  fontFamily="$body"
                  color={surface.textMuted}
                >
                  {nutrition.unmatchedIngredients.join(" · ")}
                </Text>
              </YStack>
            )}
          </YStack>
        )}

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("action.close")}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <YStack
            height={LAYOUT.ctaCompact.height}
            borderRadius={LAYOUT.ctaCompact.radius}
            backgroundColor={surface.surface}
            alignItems="center"
            justifyContent="center"
          >
            <Text
              {...TYPE.cta}
              fontFamily="$body"
              fontWeight="600"
              color={surface.textStrong}
            >
              {t("action.close")}
            </Text>
          </YStack>
        </Pressable>
      </YStack>
    </AppBottomSheet>
  )
}
