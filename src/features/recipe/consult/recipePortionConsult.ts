import { buildPersonalPortionContext } from "@/src/features/nutrition/utils/personalPortionContext"
import {
  portionNutrients,
  type PersonalPortionSelection,
} from "@/src/features/nutrition/utils/portionReference"

type Translate = (key: string, options?: Record<string, unknown>) => string
export function buildRecipePortionConsult(input: {
  id: number
  name: string
  selection: PersonalPortionSelection
  t: Translate
}) {
  const { id, name, selection, t } = input
  const plan = buildPersonalPortionContext(selection, t)
  if (!plan || !Number.isSafeInteger(id) || id <= 0 || !name.trim()) return null
  const cleanName = name
    .replace(/[\r\n]/g, " ")
    .trim()
    .slice(0, 200)
  const context = [
    `[${t("portionGuide.recipeContext")}] ${cleanName} (ID ${id})`,
    `[${plan}]`,
    `[${t("portionGuide.recipeBasis")}]`,
    ...portionNutrients.map(
      (key) =>
        `- ${t(`mealReport.nutrients.${key}`)}: ${selection.input.perServing[key]}${key === "protein" ? "g" : "mg"}`,
    ),
  ].join("\n")
  const question = t("portionGuide.consultQuestion", { name: cleanName })
  const prompt = `${question}\n\n${context}`
  // Never silently truncate a personal target or a portion qualification.
  if (prompt.length > 4800) return null
  return {
    consultCategory: "FOOD_DIET",
    consultContext: context,
    consultContextLabel: cleanName,
    consultPrompt: prompt,
  }
}
