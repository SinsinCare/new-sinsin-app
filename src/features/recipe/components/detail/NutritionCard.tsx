import type { PersonalPortionSelection } from "@/src/features/nutrition/utils/portionReference"
import { PortionGuide } from "@/src/features/nutrition/components/PortionGuide"
import { Text } from "@/src/design-system-v2/primitives/NativeText"
/** Per-serving nutrient facts with a shared, server-calculated meal portion comparison.
 * Cooking yield never changes this personal reference. Unknown sources remain unavailable.
 */
import { Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import {
  CARD_PADDING,
  CARD_RADIUS,
  SECTION_TITLE_GAP,
  V2Icon,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import {
  NUTRIENT_KEYS,
  type NutrientBudget,
  type NutrientHeadline,
  type NutrientKey,
  type RecipeNutrition,
} from "../../types/recipeV2"
import { formatNutrientAmount, orderBreakdown } from "./recipeDetailModel"

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
  portionReference?: unknown
  isRefreshing?: boolean
  onConsultPortion?: (selection: PersonalPortionSelection) => void
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
  portionReference,
  isRefreshing = false,
  onConsultPortion,
  nutrition,
  breakdown,
  servings,
  onOpenProvenance,
}: NutritionCardProps) {
  const { t } = useTranslation("recipe")
  const { colors } = useV2Theme()

  if (nutrition == null) {
    return (
      <View style={styles.root}>
        <View
          style={[
            styles.unavailable,
            { backgroundColor: colors.fill.alternative },
          ]}
        >
          <Text
            style={[styles.tileLabel, { color: colors.label.normal }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("detail.nutrition.unavailableTitle")}
          </Text>
          <Text
            style={[styles.basis, { color: colors.label.neutral }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("detail.nutrition.unavailableBody")}
          </Text>
        </View>
      </View>
    )
  }

  const rows = orderBreakdown(breakdown, NUTRIENT_KEYS)

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text
          style={[styles.sectionTitle, { color: colors.label.normal }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("curated.nutritionTitle")}
        </Text>
        {/*
         * 출처 배지는 **누르는 것**이다. 배지만 있고 설명이 없으면 사용자가 "추정값" 을
         * 브랜드 문구로 읽는다. 눌리는 자리라는 걸 아이콘(ⓘ)으로 알린다.
         */}
        <Pressable
          onPress={onOpenProvenance}
          accessibilityRole="button"
          accessibilityLabel={t("detail.nutrition.provenanceTitle")}
          accessibilityHint={t("detail.nutrition.provenanceHint")}
          hitSlop={8}
          style={({ pressed }) => [
            styles.badge,
            {
              backgroundColor: colors.fill.normal,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Text
            style={[styles.badgeText, { color: colors.label.neutral }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t(PROVENANCE_BADGE_KEYS[nutrition.provenance])}
          </Text>
          <V2Icon name="info" size={14} color={colors.label.neutral} />
        </Pressable>
      </View>

      <Text
        style={[styles.basis, { color: colors.label.neutral }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {t("detail.nutrition.basis", { count: servings })}
        {" · "}
        {/* 열량은 막대를 갖지 않는다 — CKD 참고량은 나트륨·칼륨·인·단백질 넷이다. */}
        {`${Math.round(nutrition.kcal)}kcal`}
      </Text>

      <PortionGuide
        reference={portionReference}
        isRefreshing={isRefreshing}
        onConsult={onConsultPortion}
      />

      {/* 두 줄 × 두 칸. 항목이 넷이 아니어도 깨지지 않게 두 개씩 잘라 넣는다. */}
      <View style={styles.grid}>
        {chunkPairs(rows).map((pair) => (
          <View key={pair[0]?.key ?? "row"} style={styles.gridRow}>
            {pair.map((row) => (
              <NutrientTile key={row.key} headline={row} />
            ))}
            {pair.length === 1 && <View style={styles.gridFiller} />}
          </View>
        ))}
      </View>

      {nutrition.unmatchedIngredients.length > 0 && (
        <View
          style={[
            styles.unmatched,
            { backgroundColor: colors.fill.alternative },
          ]}
        >
          <Text
            style={[styles.unmatchedTitle, { color: colors.label.normal }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("detail.nutrition.unmatchedTitle")}
          </Text>
          <Text
            style={[styles.unmatchedBody, { color: colors.label.neutral }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("detail.nutrition.unmatchedBody")}
          </Text>
          <Text style={[styles.unmatchedBody, { color: colors.label.neutral }]}>
            {nutrition.unmatchedIngredients.join(" · ")}
          </Text>
        </View>
      )}
    </View>
  )
}

/** 넷을 두 개씩 자른다. 셋이거나 하나여도 마지막 줄만 비는 형태로 끝난다. */
function chunkPairs(rows: NutrientHeadline[]): NutrientHeadline[][] {
  const pairs: NutrientHeadline[][] = []
  for (let index = 0; index < rows.length; index += 2) {
    pairs.push(rows.slice(index, index + 2))
  }
  return pairs
}

function NutrientTile({ headline }: { headline: NutrientHeadline }) {
  const { t } = useTranslation("recipe")
  const { colors } = useV2Theme()
  return (
    <View style={[styles.tile, { backgroundColor: colors.fill.alternative }]}>
      <Text
        style={[styles.tileLabel, { color: colors.label.neutral }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {t(NUTRIENT_LABEL_KEYS[headline.key])}
      </Text>

      {/* 수치가 타일의 주인공이다. 단위는 붙되 한 단계 작고 흐리다. */}
      <View style={styles.tileValueRow}>
        <Text style={[styles.tileValue, { color: colors.label.normal }]}>
          {formatNutrientAmount(headline.amount, headline.unit)}
        </Text>
        <Text style={[styles.tileUnit, { color: colors.label.neutral }]}>
          {headline.unit}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: spacing[20], gap: SECTION_TITLE_GAP },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
  },
  sectionTitle: { ...typography.title.xSmall },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    minHeight: 28,
    paddingHorizontal: spacing[10],
    borderRadius: radius.full,
  },
  badgeText: { ...typography.subtext.small },
  basis: { ...typography.subtext.medium },

  grid: { gap: spacing[8] },
  gridRow: { flexDirection: "row", gap: spacing[8] },
  gridFiller: { flex: 1 },
  tile: {
    flex: 1,
    gap: spacing[6],
    padding: spacing[12],
    borderRadius: CARD_RADIUS,
  },
  tileLabel: { ...typography.subtext.medium },
  tileValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing[2],
  },
  tileValue: { ...typography.title.large },
  tileUnit: { ...typography.label.smallWeak },
  tileBar: { marginTop: spacing[2] },
  tileNote: { ...typography.subtext.small },

  unavailable: {
    gap: spacing[6],
    padding: CARD_PADDING,
    borderRadius: CARD_RADIUS,
  },
  unmatched: {
    gap: spacing[4],
    padding: spacing[12],
    borderRadius: CARD_RADIUS,
  },
  unmatchedTitle: { ...typography.label.xSmall },
  unmatchedBody: { ...typography.subtext.medium },
})
