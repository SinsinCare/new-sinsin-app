/**
 * 영양 출처 설명 시트 — 수치 배지를 누르면 "이 값이 어디서 왔나" 를 말한다.
 * `V2BottomSheet` 의 제목·닫기 CTA 를 그대로 쓰고 본문만 v2 타이포로 그린다
 * (예전엔 `theme/surface` 의 `TYPE`/`LAYOUT` 과 자체 닫기 버튼을 따로 들고 있었다).
 */

import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import {
  CARD_RADIUS,
  V2BottomSheet,
  V2Text,
  radius,
  spacing,
  useV2Theme,
} from "@/src/design-system-v2"
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
  const { colors } = useV2Theme()
  return (
    <V2BottomSheet
      surface="recipe_provenance"
      visible={visible}
      onClose={onClose}
      title={t("detail.nutrition.provenanceTitle")}
      primaryLabel={t("action.close")}
      onPrimary={onClose}
    >
      <View style={styles.body}>
        {nutrition == null ? (
          <V2Text
            token="subtext.large"
            color={colors.label.alternative}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("detail.nutrition.unavailableBody")}
          </V2Text>
        ) : (
          <>
            <View
              style={[styles.badge, { backgroundColor: colors.fill.normal }]}
            >
              <V2Text
                token="label.xSmall"
                color={colors.label.neutral}
                lineBreakStrategyIOS="hangul-word"
              >
                {t(PROVENANCE_BADGE_KEYS[nutrition.provenance])}
              </V2Text>
            </View>
            <V2Text
              token="body.mediumWeak"
              color={colors.label.normal}
              lineBreakStrategyIOS="hangul-word"
            >
              {t(PROVENANCE_EXPLAIN_KEYS[nutrition.provenance])}
            </V2Text>
            <V2Text
              token="subtext.medium"
              color={colors.label.alternative}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("detail.nutrition.explainScope")}
            </V2Text>
            {nutrition.unmatchedIngredients.length > 0 && (
              <View
                style={[
                  styles.unmatched,
                  { backgroundColor: colors.fill.alternative },
                ]}
              >
                <V2Text
                  token="label.xSmall"
                  color={colors.label.normal}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t("detail.nutrition.unmatchedTitle")}
                </V2Text>
                <V2Text
                  token="subtext.medium"
                  color={colors.label.neutral}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t("detail.nutrition.unmatchedBody")}
                </V2Text>
                <V2Text token="subtext.medium" color={colors.label.neutral}>
                  {nutrition.unmatchedIngredients.join(" · ")}
                </V2Text>
              </View>
            )}
          </>
        )}
      </View>
    </V2BottomSheet>
  )
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing[24], gap: spacing[12] },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
  },
  unmatched: {
    gap: spacing[4],
    padding: spacing[12],
    borderRadius: CARD_RADIUS,
  },
})
