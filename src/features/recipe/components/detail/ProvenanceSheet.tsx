/**
 * "무엇이 추정인가" 시트. 영양 카드의 배지를 누르면 열린다(계약 §6.2).
 *
 * 배지만 있고 설명이 없으면 사용자는 "추정값" 을 브랜드 문구로 읽는다. 여기서 두 가지를
 * 분명히 말한다: (1) 이 숫자가 어디서 왔는지, (2) 비율은 내 기록에서 뺀 뺄셈이며
 * 이 레시피가 나에게 맞는지에 대한 판단이 아니라는 것(§1.3).
 */
import { Pressable } from "react-native"
import { V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import { useTranslation } from "react-i18next"
import { V2BottomSheet } from "@/src/design-system-v2"
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

/*
  고정 스냅(52%)을 버렸다. 시트가 **콘텐츠 높이로 자란다**(`V2BottomSheet` → gorhom
  `enableDynamicSizing`). 종전에는 설명이 두세 줄로 늘어나는 조합(667pt 기기)에서
  아래쪽 안내가 52% 밖으로 밀렸고, 스크롤도 없어 읽을 방법이 없었다.
*/
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
    <V2BottomSheet
      surface="recipe_provenance"
      visible={visible}
      onClose={onClose}
    >
      <V2VStack paddingHorizontal={LAYOUT.screenX} gap={16} style={{ paddingTop: 8 }}>
        <V2Text {...TYPE.sheetTitle} color={surface.textStrong} lineBreakStrategyIOS="hangul-word" style={{ fontWeight: "700" }}>
          {t("detail.nutrition.provenanceTitle")}
        </V2Text>

        {nutrition == null ? (
          <V2Text {...TYPE.value} color={surface.textMuted} lineBreakStrategyIOS="hangul-word">
            {t("detail.nutrition.unavailableBody")}
          </V2Text>
        ) : (
          <V2VStack gap={14}>
            <V2HStack paddingHorizontal={10} align="center" style={{ alignSelf: "flex-start", height: LAYOUT.badge.height, borderRadius: LAYOUT.badge.radius, backgroundColor: surface.surface }}>
              <V2Text {...TYPE.caption} color={surface.textStrong} lineBreakStrategyIOS="hangul-word" style={{ fontWeight: "600" }}>
                {t(PROVENANCE_BADGE_KEYS[nutrition.provenance])}
              </V2Text>
            </V2HStack>

            <V2Text {...TYPE.value} color={surface.text} lineBreakStrategyIOS="hangul-word" style={{ lineHeight: 23 }}>
              {t(PROVENANCE_EXPLAIN_KEYS[nutrition.provenance])}
            </V2Text>

            <V2Text {...TYPE.caption} color={surface.textMuted} lineBreakStrategyIOS="hangul-word" style={{ lineHeight: 20 }}>
              {t("detail.nutrition.explainScope")}
            </V2Text>

            {nutrition.unmatchedIngredients.length > 0 && (
              <V2VStack gap={4} padding={14} style={{ borderRadius: 12, backgroundColor: surface.surface }}>
                <V2Text {...TYPE.caption} color={surface.textStrong} lineBreakStrategyIOS="hangul-word" style={{ fontWeight: "600" }}>
                  {t("detail.nutrition.unmatchedTitle")}
                </V2Text>
                <V2Text {...TYPE.caption} color={surface.textMuted} lineBreakStrategyIOS="hangul-word" style={{ lineHeight: 20 }}>
                  {t("detail.nutrition.unmatchedBody")}
                </V2Text>
                <V2Text {...TYPE.caption} color={surface.textMuted}>
                  {nutrition.unmatchedIngredients.join(" · ")}
                </V2Text>
              </V2VStack>
            )}
          </V2VStack>
        )}

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("action.close")}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <V2VStack align="center" justify="center" style={{ height: LAYOUT.ctaCompact.height, borderRadius: LAYOUT.ctaCompact.radius, backgroundColor: surface.surface }}>
            <V2Text {...TYPE.cta} color={surface.textStrong} lineBreakStrategyIOS="hangul-word" style={{ fontWeight: "600" }}>
              {t("action.close")}
            </V2Text>
          </V2VStack>
        </Pressable>
      </V2VStack>
    </V2BottomSheet>
  )
}
