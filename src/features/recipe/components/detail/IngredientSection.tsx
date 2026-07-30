/**
 * 재료 — 체크박스 + 인분 조절(계약 §6.2).
 *
 * 두 가지가 이 화면의 약속이다:
 *  1. **인분을 바꾸면 영양 카드도 같이 바뀐다.** 그래서 인분 상태는 이 컴포넌트가 갖지 않고
 *     화면(`app/recipe/[id].tsx`)이 갖는다. 여기서 갖고 있으면 영양 카드가 따라올 수 없다.
 *  2. `grams` 가 null 인 재료(`소량`·`1개`)는 **비례하지 않는다.** 회색으로 두고 legend 로
 *     이유를 적는다 — 추정으로 채우면 CKD 환자에게 나트륨을 지어내는 것이다(계약 §4.3).
 *
 * 체크는 순수 화면 상태다(서버에 보내지 않는다). 장을 보거나 조리하면서 짚는 용도다.
 */
import { Pressable } from "react-native"
import { Text, View, XStack, YStack } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import {
  SERVINGS_MAX,
  SERVINGS_MIN,
  unmatchedCopyKey,
  type ScaledIngredient,
} from "./recipeDetailModel"
import type { RecipeNutritionProvenance } from "@/src/features/recipe/types/recipeV2"

export interface IngredientSectionProps {
  /**
   * 영양 수치의 출처. **매칭 안 된 재료의 문구를 여기서 가른다.**
   *
   * `computed_from_ingredients` 일 때만 "영양 계산에서 빠졌다" 가 사실이다. 다른 출처
   * (`reference_estimate` = 원본이 준 추정값, `author_supplied`, `nutritionist_reviewed`)는
   * **애초에 재료로 계산하지 않았으므로** 빠진 것이 없다. 그때도 같은 문구를 쓰면
   * "이 재료가 빠져서 나트륨이 낮게 나왔다" 는 뜻이 되는데 그건 거짓이다 —
   * 통째로 다른 출처의 값이다. 그 경우에는 사실만 말한다: 식품표에 없는 재료다.
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
  const computedFromIngredients = provenance === "computed_from_ingredients"
  const { t } = useTranslation("recipe")
  const surface = useSurface()
  const hasFixedAmount = ingredients.some((item) => !item.scalable)
  const checkedCount = ingredients.filter((item) =>
    checkedOrdinals.has(item.ordinal),
  ).length

  return (
    <YStack gap={14}>
      <XStack alignItems="center" justifyContent="space-between" gap={12}>
        <Text
          {...TYPE.sectionTitle}
          fontFamily="$body"
          fontWeight="700"
          color={surface.textStrong}
        >
          {t("detail.ingredients.title")}
        </Text>
        {adjustable && (
          <ServingStepper servings={servings} onChange={onChangeServings} />
        )}
      </XStack>

      {ingredients.length === 0 ? (
        <Text {...TYPE.caption} fontFamily="$body" color={surface.textMuted}>
          {t("detail.ingredients.empty")}
        </Text>
      ) : (
        <>
          <Text {...TYPE.caption} fontFamily="$body" color={surface.textMuted}>
            {t("detail.ingredients.checked", {
              checked: checkedCount,
              total: ingredients.length,
            })}
          </Text>

          <YStack>
            {ingredients.map((ingredient) => (
              <IngredientRow
                key={ingredient.ordinal}
                ingredient={ingredient}
                computedFromIngredients={computedFromIngredients}
                checked={checkedOrdinals.has(ingredient.ordinal)}
                onToggle={() => onToggleChecked(ingredient.ordinal)}
              />
            ))}
          </YStack>

          {hasFixedAmount && adjustable && (
            <Text {...TYPE.caption} fontFamily="$body" color={surface.textWeak}>
              {t("detail.ingredients.fixedAmount")}
            </Text>
          )}
        </>
      )}
    </YStack>
  )
}

function ServingStepper({
  servings,
  onChange,
}: {
  servings: number
  onChange: (next: number) => void
}) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()
  const canDecrease = servings > SERVINGS_MIN
  const canIncrease = servings < SERVINGS_MAX

  return (
    <XStack
      alignItems="center"
      gap={4}
      height={36}
      paddingHorizontal={4}
      borderRadius={LAYOUT.control.radius}
      backgroundColor={surface.surface}
    >
      <StepperButton
        icon="remove"
        label={t("detail.ingredients.decrease")}
        enabled={canDecrease}
        onPress={() => onChange(servings - 1)}
      />
      <Text
        {...TYPE.caption}
        fontFamily="$body"
        fontWeight="600"
        color={surface.textStrong}
        minWidth={54}
        textAlign="center"
      >
        {t("curated.servings", { count: servings })}
      </Text>
      <StepperButton
        icon="add"
        label={t("detail.ingredients.increase")}
        enabled={canIncrease}
        onPress={() => onChange(servings + 1)}
      />
    </XStack>
  )
}

function StepperButton({
  icon,
  label,
  enabled,
  onPress,
}: {
  icon: "add" | "remove"
  label: string
  enabled: boolean
  onPress: () => void
}) {
  const surface = useSurface()
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      hitSlop={6}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <View
        width={28}
        height={28}
        borderRadius={8}
        alignItems="center"
        justifyContent="center"
        backgroundColor={enabled ? surface.card : "transparent"}
      >
        <Ionicons
          name={icon}
          size={16}
          // 비활성 이유가 보이도록 색으로 알린다(§6.4 결과 예측 가능).
          color={enabled ? surface.textStrong : surface.ctaOffText}
        />
      </View>
    </Pressable>
  )
}

function IngredientRow({
  ingredient,
  computedFromIngredients,
  checked,
  onToggle,
}: {
  ingredient: ScaledIngredient
  computedFromIngredients: boolean
  checked: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={t("detail.ingredients.toggle", {
        name: ingredient.name,
      })}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <XStack
        alignItems="center"
        gap={12}
        paddingVertical={12}
        borderBottomWidth={1}
        borderBottomColor={surface.hairline}
      >
        <View
          width={22}
          height={22}
          borderRadius={11}
          borderWidth={1.5}
          borderColor={checked ? surface.brand : surface.border}
          backgroundColor={checked ? surface.brand : "transparent"}
          alignItems="center"
          justifyContent="center"
        >
          {checked && (
            <Ionicons name="checkmark" size={14} color={surface.onBrand} />
          )}
        </View>

        <YStack flex={1} gap={2}>
          <Text
            {...TYPE.value}
            fontFamily="$body"
            color={checked ? surface.textWeak : surface.text}
            textDecorationLine={checked ? "line-through" : "none"}
          >
            {ingredient.name}
          </Text>
          {!ingredient.matched && (
            <Text {...TYPE.caption} fontFamily="$body" color={surface.textWeak}>
              {t(unmatchedCopyKey(ingredient.reason, computedFromIngredients))}
            </Text>
          )}
        </YStack>

        <Text
          {...TYPE.value}
          fontFamily="$body"
          fontWeight={ingredient.scalable ? "600" : "400"}
          // 조절 대상이 아닌 양은 회색으로 둔다 — 인분을 바꿔도 이 숫자는 안 움직인다.
          color={ingredient.scalable ? surface.textStrong : surface.textWeak}
        >
          {ingredient.displayAmount}
        </Text>
      </XStack>
    </Pressable>
  )
}
