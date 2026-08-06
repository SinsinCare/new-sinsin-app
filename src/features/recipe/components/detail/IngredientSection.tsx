/**
 * 재료 — 인분 스테퍼 + 준비 체크 + **정직한 불확실성**.
 *
 * ═══ 1. 인분 스테퍼가 이 화면에서 가장 쓸모 있는 컨트롤이다 ═════════════════
 * 누르면 재료의 그램과 영양 카드 네 수치가 **함께** 바뀐다. 그래서 인분 상태는 이
 * 컴포넌트가 갖지 않고 화면(`app/recipe/[id]/index.tsx`)이 갖는다 — 여기서 들고 있으면
 * 영양 카드가 따라올 수 없다.
 *
 * 종전 스테퍼는 섹션 제목 오른쪽에 붙은 높이 36 의 회색 알약이었다. 제목과 같은 줄에서
 * 폭을 다투느라 버튼이 28×28 로 작았고(터치 타깃 미달), 무엇이 바뀌는지 말하지 않았다.
 * 지금은 제목 줄에서 떼어 **한 줄을 통째로 준다**: 왼쪽에 "N인분 기준 분량", 오른쪽에
 * 44pt 버튼. 누르면 무엇이 달라지는지가 같은 줄에 적혀 있다(계약 §6.4 "결과 예측 가능").
 *
 * ═══ 2. 정상은 조용하게, 불확실한 것은 읽히게 ═══════════════════════════════
 * 종전에는 `matched === false` 인 모든 줄에 회색 문장을 한 줄씩 더 깔았다. 실측하면
 * 그 비율이 60~100% 다(21번 4/10, 61번 **4/4**, 195번 15/20). 거의 모든 줄이 경고를
 * 달고 있으면 그건 경고가 아니라 배경이고, 정작 어느 줄이 다른지는 안 보인다.
 *
 * 게다가 오늘 데이터에서 그 문장은 **아무 숫자도 바꾸지 않는다.** 175/175 의 provenance 가
 * `reference_estimate` — 영양 수치를 재료로 계산한 것이 아니라 한 그릇 단위로 받은 값이다.
 * 서버도 같은 말을 한다: 21번은 `matched:false` 가 4건인데 `unmatchedIngredients` 는
 * **빈 배열**이다. 화면만 "빠진 것 같은" 문장을 4줄 그리고 있었다.
 *
 * 그래서 판단을 `ingredientUncertainty` 한 곳으로 옮기고 **결과가 있을 때만** 표시한다.
 * 표시는 문장이 아니라 수량 옆의 짧은 꼬리표(`인분 고정` / `계산 제외`)이고,
 * 그 꼬리표가 무슨 뜻인지는 목록 아래 legend 가 **한 번** 말한다.
 * 정직을 지운 것이 아니라 옮긴 것이다 — 그리고 종전에 아무 데서도 하지 않던 말,
 * "이 수치는 아래 재료를 더한 값이 아니다"(`ingredientCoverage`)를 새로 한다.
 *
 * ═══ 3. 체크는 화면 상태다 ════════════════════════════════════════════════
 * 서버에 보내지 않는다. 장을 보거나 조리하면서 짚는 용도라 화면을 떠나면 사라진다.
 * 진행률을 막대로 보여 준다 — `0/10` 이라는 숫자만으로는 훑을 때 안 읽힌다.
 */
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import {
  CARD_RADIUS,
  GUTTER,
  SECTION_TITLE_GAP,
  V2Checkbox,
  V2Icon,
  V2ProgressBar,
  radius,
  spacing,
  touchTarget,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import {
  SERVINGS_MAX,
  SERVINGS_MIN,
  ingredientCoverage,
  ingredientUncertainty,
  preparedPercent,
  type IngredientUncertainty,
  type ScaledIngredient,
} from "./recipeDetailModel"
import type { RecipeNutritionProvenance } from "@/src/features/recipe/types/recipeV2"

export interface IngredientSectionProps {
  /**
   * 영양 수치의 출처. **줄 표시를 켤지 끌지를 여기서 가른다.**
   * `computed_from_ingredients` 일 때만 "이 재료가 빠져서 수치가 낮다" 가 사실이다.
   * 자세한 이유는 `ingredientUncertainty` 머리말.
   */
  provenance: RecipeNutritionProvenance
  ingredients: ScaledIngredient[]
  /** 인분 조절 UI 를 열어도 되는가(원본 인분을 알고 비례 가능한 재료가 있는가) */
  adjustable: boolean
  servings: number
  onChangeServings: (next: number) => void
  checkedOrdinals: ReadonlySet<number>
  onToggleChecked: (ordinal: number) => void
}

export function IngredientSection({
  ingredients,
  adjustable,
  provenance,
  servings,
  onChangeServings,
  checkedOrdinals,
  onToggleChecked,
}: IngredientSectionProps) {
  const { t } = useTranslation("recipe")
  const { colors } = useV2Theme()

  const checkedCount = ingredients.filter((item) =>
    checkedOrdinals.has(item.ordinal),
  ).length
  const marks = ingredients.map((item) =>
    ingredientUncertainty(item, { provenance, adjustable }),
  )
  const hasFixed = marks.includes("not_scalable")
  const hasExcluded = marks.includes("not_counted")
  const coverage = ingredientCoverage(ingredients, provenance)

  return (
    <View style={styles.root}>
      <Text
        style={[styles.sectionTitle, { color: colors.label.normal }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {t("detail.ingredients.title")}
      </Text>

      {ingredients.length === 0 ? (
        <Text
          style={[styles.note, { color: colors.label.alternative }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("detail.ingredients.empty")}
        </Text>
      ) : (
        <>
          {/*
           * 스테퍼 줄. 제목과 같은 줄에 두지 않는 이유는 머리말 §1.
           * 조절할 수 없는 레시피에서는 줄 자체가 없다 — 눌러도 안 되는 버튼을 두지 않는다.
           */}
          {adjustable && (
            <View
              style={[
                styles.servingsBar,
                { backgroundColor: colors.fill.alternative },
              ]}
            >
              <Text
                style={[styles.servingsBasis, { color: colors.label.neutral }]}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("detail.ingredients.servingsBasis", { count: servings })}
              </Text>
              <View style={styles.stepper}>
                <StepperButton
                  icon="minus"
                  label={t("detail.ingredients.decrease")}
                  enabled={servings > SERVINGS_MIN}
                  onPress={() => onChangeServings(servings - 1)}
                />
                <Text
                  style={[styles.servingsValue, { color: colors.label.normal }]}
                  lineBreakStrategyIOS="hangul-word"
                  textBreakStrategy="balanced"
                >
                  {t("curated.servings", { count: servings })}
                </Text>
                <StepperButton
                  icon="plus"
                  label={t("detail.ingredients.increase")}
                  enabled={servings < SERVINGS_MAX}
                  onPress={() => onChangeServings(servings + 1)}
                />
              </View>
            </View>
          )}

          {/* 진행률. 숫자만으로는 훑을 때 안 읽혀서 막대를 같이 둔다. */}
          <View
            style={styles.progressBlock}
            accessibilityLabel={t("detail.ingredients.checked", {
              checked: checkedCount,
              total: ingredients.length,
            })}
          >
            <View style={styles.progressHead}>
              <Text
                style={[styles.progressLabel, { color: colors.label.neutral }]}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("detail.ingredients.preparedLabel")}
              </Text>
              <Text
                style={[
                  styles.progressCount,
                  {
                    color:
                      checkedCount > 0
                        ? colors.label.normal
                        : colors.label.assistive,
                  },
                ]}
                lineBreakStrategyIOS="hangul-word"
              >
                {/*
                 * 왼쪽 라벨이 이미 "준비" 다. 여기서 `checked`("0/10 준비했어요")를 쓰면
                 * 한 줄에 "준비" 가 두 번 온다(실측 스크린샷에서 그렇게 보였다).
                 * 접근성 라벨에는 문장을 그대로 실어 준다 — 화면에서는 라벨이 왼쪽에
                 * 붙어 있지만 보이스오버는 두 Text 를 따로 읽는다.
                 */}
                {t("detail.ingredients.preparedCount", {
                  checked: checkedCount,
                  total: ingredients.length,
                })}
              </Text>
            </View>
            <V2ProgressBar
              size="s"
              color="brand"
              value={preparedPercent(checkedCount, ingredients.length)}
            />
          </View>

          <View>
            {ingredients.map((ingredient, index) => (
              <IngredientRow
                key={ingredient.ordinal}
                ingredient={ingredient}
                uncertainty={marks[index] ?? "none"}
                checked={checkedOrdinals.has(ingredient.ordinal)}
                onToggle={() => onToggleChecked(ingredient.ordinal)}
              />
            ))}
          </View>

          {/*
           * 목록 아래 한 덩어리. 위에서부터: 꼬리표 뜻(있을 때만) → 수치와 재료의 관계.
           * 회색 면으로 묶어 재료 줄과 다른 층이라는 것을 보인다 — 선을 그으면
           * 재료 목록의 마지막 줄처럼 읽힌다.
           */}
          <View
            style={[
              styles.legend,
              { backgroundColor: colors.fill.alternative },
            ]}
          >
            {hasExcluded && (
              <LegendLine
                text={t("detail.ingredients.excludedLegend")}
                color={colors.label.neutral}
              />
            )}
            {hasFixed && (
              <LegendLine
                text={t("detail.ingredients.fixedAmount")}
                color={colors.label.neutral}
              />
            )}
            <LegendLine
              text={
                coverage.kind === "counted"
                  ? t("detail.ingredients.coverage.counted", {
                      counted: coverage.counted,
                      total: coverage.total,
                    })
                  : t("detail.ingredients.coverage.wholeDish")
              }
              color={colors.label.alternative}
            />
          </View>
        </>
      )}
    </View>
  )
}

function LegendLine({ text, color }: { text: string; color: string }) {
  return <Text style={[styles.legendLine, { color }]}>{text}</Text>
}

function StepperButton({
  icon,
  label,
  enabled,
  onPress,
}: {
  icon: "plus" | "minus"
  label: string
  enabled: boolean
  onPress: () => void
}) {
  const { colors } = useV2Theme()
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      style={({ pressed }) => [
        styles.stepperButton,
        {
          backgroundColor: colors.background.default,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      {/*
       * 비활성 이유가 보이도록 색으로 알린다. 아이콘을 지우면 버튼이 사라진 것처럼
       * 보여서 "왜 못 줄이지" 가 아니라 "버튼이 없네" 가 된다.
       *
       * 빼기는 DS 아이콘 세트에 없다(`plus` 만 있다). `close`(×)를 돌려 쓰면 45° 에서
       * `+` 가 되어 더하기와 구분이 안 된다 — 그래서 막대 하나를 직접 그린다.
       * 아이콘을 새로 만드는 것은 DS 변경이라 이 작업의 범위 밖이다.
       */}
      {icon === "plus" ? (
        <V2Icon
          name="plus"
          size={16}
          color={enabled ? colors.label.normal : colors.label.disable}
        />
      ) : (
        <View
          style={[
            styles.minusGlyph,
            {
              backgroundColor: enabled
                ? colors.label.normal
                : colors.label.disable,
            },
          ]}
        />
      )}
    </Pressable>
  )
}

function IngredientRow({
  ingredient,
  uncertainty,
  checked,
  onToggle,
}: {
  ingredient: ScaledIngredient
  uncertainty: IngredientUncertainty
  checked: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation("recipe")
  const { colors } = useV2Theme()

  const tagText =
    uncertainty === "not_counted"
      ? t("detail.ingredients.tag.notCounted")
      : uncertainty === "not_scalable"
        ? t("detail.ingredients.tag.notScalable")
        : null

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={t("detail.ingredients.toggle", {
        name: ingredient.name,
      })}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      {/*
       * 체크는 DS 컴포넌트를 그대로 쓴다(손으로 만든 원 + 아이콘을 쓰지 않는다).
       * 줄 전체가 누르는 자리라 체크박스 자신은 터치를 받지 않게 막고
       * (`pointerEvents="none"`), 접근성 role/state 는 바깥 Pressable 이 갖는다 —
       * 둘 다 role="checkbox" 면 보이스오버가 같은 줄을 두 번 읽는다.
       */}
      <V2Checkbox
        checked={checked}
        variant="circle"
        size="m"
        pointerEvents="none"
        importantForAccessibility="no"
      />

      <Text
        numberOfLines={2}
        style={[
          styles.name,
          {
            color: checked ? colors.label.assistive : colors.label.normal,
            textDecorationLine: checked ? "line-through" : "none",
          },
        ]}
      >
        {ingredient.name}
      </Text>

      {/*
       * 꼬리표는 **수량 바로 왼쪽**에 둔다. 두 표시가 모두 "이 숫자를 어떻게 읽어야 하나" 를
       * 말하기 때문이다. 이름 아래 두 번째 줄로 내리면 줄 높이가 재료마다 달라져
       * 목록이 들쭉날쭉해진다(종전 화면의 실제 증상).
       */}
      {tagText != null && (
        <Text style={[styles.tag, { color: colors.label.assistive }]}>
          {tagText}
        </Text>
      )}

      <Text
        style={[
          ingredient.scalable ? styles.amountStrong : styles.amount,
          {
            color: ingredient.scalable
              ? colors.label.normal
              : colors.label.assistive,
          },
        ]}
      >
        {ingredient.displayAmount}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: GUTTER, gap: SECTION_TITLE_GAP },
  sectionTitle: { ...typography.title.xSmall },
  note: { ...typography.subtext.large },

  servingsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
    paddingLeft: spacing[16],
    paddingRight: spacing[6],
    paddingVertical: spacing[6],
    borderRadius: radius.full,
  },
  servingsBasis: { ...typography.subtext.large, flexShrink: 1 },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing[4] },
  stepperButton: {
    width: touchTarget.min,
    height: touchTarget.min - spacing[6],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
  servingsValue: {
    ...typography.label.small,
    minWidth: 54,
    textAlign: "center",
  },
  /** 빼기 기호. DS 아이콘 세트에 minus 가 없어 막대 하나로 그린다(위 주석 참고). */
  minusGlyph: { width: 14, height: 2, borderRadius: 1 },

  progressBlock: { gap: spacing[6] },
  progressHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: { ...typography.subtext.large },
  progressCount: { ...typography.label.smallWeak },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    // 줄마다 밑줄을 긋지 않는다 — 재료 열 개면 가로줄이 열 개다. 줄은 여백으로 나눈다.
    paddingVertical: spacing[10],
  },
  name: { ...typography.body.mediumWeak, flex: 1 },
  tag: { ...typography.subtext.medium },
  amount: { ...typography.subtext.large },
  amountStrong: { ...typography.label.small },

  legend: {
    gap: spacing[4],
    padding: spacing[12],
    borderRadius: CARD_RADIUS,
  },
  legendLine: { ...typography.subtext.medium },
})
