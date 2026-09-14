import {
  kstDateString,
  personalPortion,
  portionLabel,
  portionNutrients,
  type PersonalPortionSelection,
} from "./portionReference"

type Translate = (key: string, options?: Record<string, unknown>) => string
/** Shared confirmed planning context, never a consumed-food record. */
export function buildPersonalPortionContext(
  selection: PersonalPortionSelection | undefined,
  t: Translate,
): string | null {
  const selected = selection
  const plan =
    selected &&
    personalPortion(
      selected.input,
      true,
      selected.meals,
      selected.share,
      kstDateString(),
    )
  const personalContext =
    selected && plan
      ? t("portionGuide.planContext", {
          amount:
            plan.fraction === null
              ? t("portionGuide.personalBelowQuarter")
              : portionLabel(plan.fraction),
          meals: selected.meals,
          percent: selected.share * 100,
          date: selected.input.intake.date,
          targets: portionNutrients
            .map(
              (key) =>
                `${t(`mealReport.nutrients.${key}`)} ${selected.input.targets[key]}${key === "protein" ? "g" : "mg"}`,
            )
            .join(", "),
          consumed: portionNutrients
            .map(
              (key) =>
                `${t(`mealReport.nutrients.${key}`)} ${selected.input.intake.values?.[key] ?? 0}${key === "protein" ? "g" : "mg"}`,
            )
            .join(", "),
        })
      : null
  return personalContext
}
