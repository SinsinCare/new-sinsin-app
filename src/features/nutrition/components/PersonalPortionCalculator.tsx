import { useState } from "react"
import { Pressable, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Text } from "@/src/design-system-v2/primitives/NativeText"
import { spacing, typography, useV2Theme } from "@/src/design-system-v2"
import { dynamicKey } from "@/src/i18n/dynamicKey"
import {
  kstDateString,
  personalPortion,
  portionLabel,
  portionNutrients,
  type PersonalPortionInput,
  type PersonalPortionSelection,
} from "../utils/portionReference"

export function PersonalPortionCalculator({
  input,
  menu,
  onConsult,
  isRefreshing = false,
}: {
  input: PersonalPortionInput
  menu: boolean
  isRefreshing?: boolean
  onConsult?: (selection: PersonalPortionSelection) => void
}) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const [confirmed, setConfirmed] = useState(false)
  const [meals, setMeals] = useState(2)
  const [share, setShare] = useState(0.5)
  const today = kstDateString()
  const result = personalPortion(input, confirmed, meals, share, today)
  const textStyle = [typography.subtext.small, { color: colors.label.neutral }]
  const labelStyle = [typography.label.small, { color: colors.label.normal }]
  function option(
    label: string,
    selected: boolean,
    onPress: () => void,
    disabled = false,
  ) {
    return (
      <Pressable
        key={label}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled }}
        style={{
          minHeight: 44,
          paddingHorizontal: spacing[12],
          justifyContent: "center",
          borderWidth: 1,
          borderColor: selected
            ? colors.label.normal
            : colors.label.alternative,
          borderRadius: 12,
        }}
      >
        <Text style={textStyle}>{label}</Text>
      </Pressable>
    )
  }
  return (
    <View style={{ gap: spacing[12], paddingTop: spacing[12] }}>
      <Text style={labelStyle}>{t("portionGuide.personalTitle")}</Text>
      <View style={{ gap: spacing[4] }}>
        <Text style={textStyle}>{t("portionGuide.dailyTargets")}</Text>
        {portionNutrients.map((key) => (
          <View
            key={key}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: spacing[12],
            }}
          >
            <Text style={textStyle}>
              {t(dynamicKey(`mealReport.nutrients.${key}`))}
            </Text>
            <Text style={textStyle}>
              {input.targets[key].toLocaleString()}{" "}
              {key === "protein" ? "g" : "mg"}
            </Text>
          </View>
        ))}
      </View>
      {input.intake.status === "incomplete" || input.intake.date !== today ? (
        <Text style={textStyle}>{t("portionGuide.incompleteIntake")}</Text>
      ) : (
        <>
          <Text style={textStyle}>
            {t(
              input.intake.status === "none"
                ? "portionGuide.noRecords"
                : "portionGuide.checkRecords",
            )}
          </Text>
          {input.intake.values && (
            <Text style={textStyle}>
              {portionNutrients
                .map(
                  (key) =>
                    `${t(dynamicKey(`mealReport.nutrients.${key}`))} ${Math.round(input.intake.values![key] * 10) / 10}${key === "protein" ? "g" : "mg"}`,
                )
                .join(" · ")}
            </Text>
          )}
          {option(
            t(
              input.intake.status === "none"
                ? "portionGuide.confirmNone"
                : "portionGuide.confirmRecords",
            ),
            confirmed,
            () => setConfirmed(!confirmed),
          )}
          <Text style={labelStyle}>{t("portionGuide.mealsLeft")}</Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[8] }}
          >
            {[1, 2, 3].map((n) =>
              option(t("portionGuide.meals", { count: n }), meals === n, () =>
                setMeals(n),
              ),
            )}
          </View>
          <Text style={labelStyle}>{t("portionGuide.companionTitle")}</Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[8] }}
          >
            {option(t("portionGuide.reserveHalf"), share === 0.5, () =>
              setShare(0.5),
            )}
            {option(t("portionGuide.onlyDish"), share === 1, () => setShare(1))}
          </View>
          {result && (
            <View accessibilityLiveRegion="polite" style={{ gap: spacing[4] }}>
              <Text style={labelStyle}>
                {result.fraction === null
                  ? t("portionGuide.personalBelowQuarter")
                  : t(
                      menu
                        ? "portionGuide.personalMenu"
                        : "portionGuide.personalRecipe",
                      { amount: portionLabel(result.fraction) },
                    )}
              </Text>
              <Text style={textStyle}>
                {t("portionGuide.personalBasis", {
                  nutrient: t(
                    dynamicKey(`mealReport.nutrients.${result.driver}`),
                  ),
                  meals,
                  percent: share * 100,
                })}
              </Text>
              <Text style={textStyle}>{t("portionGuide.personalCaution")}</Text>
              {onConsult &&
                option(
                  t(
                    isRefreshing
                      ? "portionGuide.refreshing"
                      : "portionGuide.consultAmount",
                  ),
                  false,
                  () => {
                    // 렌더 시점이 아니라 누른 시점의 날짜 — 자정을 넘긴 화면에서 옛 날짜로 상담을 열지 않는다.
                    const freshDay = kstDateString()
                    if (
                      personalPortion(input, confirmed, meals, share, freshDay)
                    )
                      onConsult({ input, meals, share })
                    else setConfirmed(false)
                  },
                  isRefreshing,
                )}
            </View>
          )}
        </>
      )}
    </View>
  )
}
