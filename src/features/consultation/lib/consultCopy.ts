import type { TFunction } from "i18next"
import { consultSources, type Message } from "@/src/types/chat"
import { consultNutritionCards } from "./consultNutrition"

/** The copied transcript includes the same verified facts, including collapsed sections. */
export function consultCopyText(
  message: Pick<Message, "content" | "activities">,
  t: TFunction<"common">,
): string {
  const sections = [message.content]
  for (const card of consultNutritionCards(message.activities ?? [])) {
    const rows = card.rows.map((row) => {
      const target =
        row.target === null
          ? t("consult.nutritionCard.unset")
          : `${row.target} ${row.unit}`
      const consumed =
        row.consumed === null
          ? t("consult.nutritionCard.unrecorded")
          : `${row.consumed} ${row.unit}`
      return `${t(`consult.nutritionCard.names.${row.nutrient}`)}: ${card.kind === "intake" ? `${consumed} / ` : ""}${target}`
    })
    sections.push(
      [
        t(`consult.nutritionCard.${card.kind}`),
        `${card.date} (${card.asOf})`,
        t(
          `consult.nutritionCard.${card.kind === "intake" ? "columns" : "targetColumn"}`,
        ),
        ...rows,
        t("consult.nutritionCard.source"),
        ...(card.proteinBasisKg === null
          ? []
          : [
              t("consult.nutritionCard.proteinBasis", {
                weight: String(card.proteinBasisKg),
              }),
            ]),
        ...(card.kind === "intake"
          ? [t("consult.nutritionCard.intakeBasis")]
          : []),
      ].join("\n"),
    )
  }
  for (const source of consultSources(message.activities ?? [])) {
    const card = source.recipe
    if (!card) continue
    const meta = [
      ...(card.timeMin === null
        ? []
        : [t("consult.recipeCard.minutes", { count: card.timeMin })]),
      ...(card.servings === null
        ? []
        : [t("consult.recipeCard.servings", { count: card.servings })]),
    ].join(" · ")
    sections.push(
      [
        source.title,
        meta,
        t("consult.recipeCard.ingredients", { count: card.ingredients.length }),
        ...card.ingredients.map(
          (item) => `- ${item.name}${item.amount ? ` ${item.amount}` : ""}`,
        ),
        t("consult.recipeCard.steps", { count: card.steps.length }),
        ...card.steps.map((step, i) => `${i + 1}. ${step}`),
      ]
        .filter(Boolean)
        .join("\n"),
    )
  }
  return sections.filter(Boolean).join("\n\n")
}
