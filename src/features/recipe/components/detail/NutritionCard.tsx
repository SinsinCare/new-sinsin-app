/**
 * 영양 카드 — 이 앱의 존재 이유(계약 §6.1)이고, 동시에 가장 위험한 자리다.
 *
 * ─── 서버가 개인 판정을 주는가? 준다고 가정하지 않고 확인했다 ─────────────────
 * 실측(2026-07-31, `GET /api/v1/recipes/21`): 응답에 판정 필드가 **없다.** 있는 것은
 * `budget`(내 하루 참고량)과 `nutrientBreakdown[].percentOfRemaining`(오늘 남은 양 대비
 * 비율) 뿐이다. 즉 서버가 계산하는 것은 **뺄셈**이지 "이 레시피가 나에게 맞다/아니다" 가
 * 아니다. 그래서 이 화면도 판정을 만들지 않는다. `안전`·`괜찮다`·`신장에 좋다` 같은 말이
 * 한 글자도 없어야 하고, 색으로 그 말을 대신해서도 안 된다.
 *
 * 지키는 것:
 *  - `provenance` 없이는 **수치를 그리지 않는다**(§1.1). nutrition 이 null 이면 안내만 남는다.
 *  - `percentOfRemaining` 이 null 이면 비율을 숨기고 절대값만 보인다. 단백질만 null 인 경우
 *    (체중 기록 없음)는 다른 문구를 준다 — "계산할 수 없다"와 "체중을 기록하면 된다"는 다른 말이다.
 *  - 색: 그레이스케일 + 브랜드 하나. `status.*`(초록/노랑/빨강)는 쓰지 않는다 — 그 색들이
 *    곧 판정이다. 막대는 회색이고 **남은 참고량을 넘긴 항목만** 브랜드색이 된다.
 *    (넘겼다는 것은 판정이 아니라 뺄셈의 결과다.)
 *
 * 배치는 세로 네 줄이 아니라 **2×2 타일**이다. 줄로 쌓으면 라벨·수치·막대·설명이
 * 열두 줄로 흘러 어디부터 읽을지가 없다. 타일 안에서는 크기가 순서를 정한다.
 */
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import {
  CARD_PADDING,
  CARD_RADIUS,
  GUTTER,
  SECTION_TITLE_GAP,
  V2Icon,
  V2ProgressBar,
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
          <Text style={[styles.tileLabel, { color: colors.label.normal }]}>
            {t("detail.nutrition.unavailableTitle")}
          </Text>
          <Text style={[styles.basis, { color: colors.label.alternative }]}>
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
        <Text style={[styles.sectionTitle, { color: colors.label.normal }]}>
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
          <Text style={[styles.badgeText, { color: colors.label.neutral }]}>
            {t(PROVENANCE_BADGE_KEYS[nutrition.provenance])}
          </Text>
          <V2Icon name="info" size={14} color={colors.label.alternative} />
        </Pressable>
      </View>

      <Text style={[styles.basis, { color: colors.label.alternative }]}>
        {t("detail.nutrition.basis", { count: servings })}
        {" · "}
        {/* 열량은 막대를 갖지 않는다 — CKD 참고량은 나트륨·칼륨·인·단백질 넷이다. */}
        {`${Math.round(nutrition.kcal)}kcal`}
      </Text>

      {/* 두 줄 × 두 칸. 항목이 넷이 아니어도 깨지지 않게 두 개씩 잘라 넣는다. */}
      <View style={styles.grid}>
        {chunkPairs(rows).map((pair) => (
          <View key={pair[0]?.key ?? "row"} style={styles.gridRow}>
            {pair.map((row) => (
              <NutrientTile
                key={row.key}
                headline={row}
                proteinBudgetMissing={budget.proteinG == null}
              />
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
          <Text style={[styles.unmatchedTitle, { color: colors.label.normal }]}>
            {t("detail.nutrition.unmatchedTitle")}
          </Text>
          <Text
            style={[styles.unmatchedBody, { color: colors.label.alternative }]}
          >
            {t("detail.nutrition.unmatchedBody")}
          </Text>
          <Text
            style={[styles.unmatchedBody, { color: colors.label.alternative }]}
          >
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

function NutrientTile({
  headline,
  proteinBudgetMissing,
}: {
  headline: NutrientHeadline
  proteinBudgetMissing: boolean
}) {
  const { t } = useTranslation("recipe")
  const { colors } = useV2Theme()
  const fill = barFillRatio(headline.percentOfRemaining)
  const over = isOverRemaining(headline.percentOfRemaining)

  const note =
    headline.percentOfRemaining != null
      ? t("detail.nutrition.remaining", {
          percent: formatPercent(headline.percentOfRemaining),
        })
      : headline.key === "protein" && proteinBudgetMissing
        ? t("detail.nutrition.proteinNoWeight")
        : t("detail.nutrition.remainingUnknown")

  return (
    <View style={[styles.tile, { backgroundColor: colors.fill.alternative }]}>
      <Text style={[styles.tileLabel, { color: colors.label.alternative }]}>
        {t(NUTRIENT_LABEL_KEYS[headline.key])}
      </Text>

      {/* 수치가 타일의 주인공이다. 단위는 붙되 한 단계 작고 흐리다. */}
      <View style={styles.tileValueRow}>
        <Text style={[styles.tileValue, { color: colors.label.normal }]}>
          {formatNutrientAmount(headline.amount, headline.unit)}
        </Text>
        <Text style={[styles.tileUnit, { color: colors.label.alternative }]}>
          {headline.unit}
        </Text>
      </View>

      {fill != null && (
        <V2ProgressBar
          size="s"
          color={over ? "brand" : "neutral"}
          value={fill * 100}
          style={styles.tileBar}
        />
      )}

      <Text
        style={[
          styles.tileNote,
          { color: over ? colors.primary.primary : colors.label.assistive },
        ]}
      >
        {note}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: GUTTER, gap: SECTION_TITLE_GAP },
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
    height: 28,
    paddingHorizontal: spacing[10],
    borderRadius: radius.full,
  },
  badgeText: { ...typography.subtext.medium },
  basis: { ...typography.subtext.large },

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
  tileNote: { ...typography.subtext.medium },

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
