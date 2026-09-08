/** Public recipe snapshot v1. Keep this wire reader aligned with the mobile reader. */
export type ConsultRecipeCard = {
  version: 1
  timeMin: number | null
  servings: number | null
  ingredients: { name: string; amount: string }[]
  steps: string[]
}

const text = (value: unknown, max: number): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= max &&
  !/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value)
const numberOrNull = (value: unknown, max: number): value is number | null =>
  value === null ||
  (typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= max)

/** Reject incomplete/oversized snapshots rather than silently truncate food amounts or steps. */
export function readConsultRecipeCard(
  value: unknown,
): ConsultRecipeCard | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return
  const item = value as Record<string, unknown>
  if (
    item.version !== 1 ||
    !numberOrNull(item.timeMin, 10080) ||
    !numberOrNull(item.servings, 1000)
  )
    return
  if (
    !Array.isArray(item.ingredients) ||
    item.ingredients.length > 60 ||
    !Array.isArray(item.steps) ||
    item.steps.length > 40
  )
    return
  const ingredients: ConsultRecipeCard["ingredients"] = []
  for (const ingredient of item.ingredients) {
    if (
      !ingredient ||
      typeof ingredient !== "object" ||
      Array.isArray(ingredient) ||
      !text(ingredient.name, 120)
    )
      return
    if (ingredient.amount !== "" && !text(ingredient.amount, 120)) return
    ingredients.push({
      name: ingredient.name.trim(),
      amount: ingredient.amount.trim(),
    })
  }
  if (!item.steps.every((step) => text(step, 1600))) return
  const card: ConsultRecipeCard = {
    version: 1,
    timeMin: item.timeMin,
    servings: item.servings,
    ingredients,
    steps: item.steps.map((step) => step.trim()),
  }
  if (JSON.stringify(card).length > 16000) return
  return card
}
