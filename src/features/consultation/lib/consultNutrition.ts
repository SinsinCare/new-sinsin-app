import type { ConsultActivity } from "@/src/types/chat"
import type { ConsultNutritionCard } from "@/src/types/consultNutritionCard"

/** Keep the latest receipt of each kind in this answer; the intake card already includes targets. */
export function consultNutritionCards(
  activities: readonly ConsultActivity[],
): ConsultNutritionCard[] {
  const latest = new Map<ConsultNutritionCard["kind"], ConsultNutritionCard>()
  for (const activity of activities) {
    if (activity.status === "complete" && activity.nutrition)
      latest.set(activity.nutrition.kind, activity.nutrition)
  }
  const intake = latest.get("intake")
  const targets = latest.get("targets")
  if (
    intake &&
    targets &&
    intake.date === targets.date &&
    intake.rows.every((row, i) => row.target === targets.rows[i]?.target) &&
    intake.proteinBasisKg === targets.proteinBasisKg
  )
    latest.delete("targets")
  return [...latest.values()]
}

export function nutrientComparison(row: ConsultNutritionCard["rows"][number]) {
  if (row.consumed === null || row.target === null)
    return { ratio: null, difference: null, direction: "unknown" } as const
  const difference = Math.round((row.consumed - row.target) * 10) / 10
  return {
    ratio: Math.max(0, Math.min(1, row.consumed / row.target)),
    difference,
    direction: difference > 0 ? "over" : difference < 0 ? "under" : "equal",
  } as const
}
