/** Public snapshot. Keep aligned with the mobile wire reader; never parse profile prose. */
export const CONSULT_NUTRIENTS = [
  "sodium",
  "potassium",
  "phosphorus",
  "protein",
  "water",
] as const
export type ConsultNutrient = (typeof CONSULT_NUTRIENTS)[number]
export const CONSULT_NUTRIENT_UNITS = {
  sodium: "mg",
  potassium: "mg",
  phosphorus: "mg",
  protein: "g",
  water: "mL",
} as const
export type ConsultNutritionCard = {
  version: 1
  kind: "targets" | "intake"
  date: string
  asOf: string
  recorded: boolean
  proteinBasisKg: number | null
  rows: {
    nutrient: ConsultNutrient
    unit: "mg" | "g" | "mL"
    target: number | null
    consumed: number | null
  }[]
}
const amount = (value: unknown): value is number | null =>
  value === null ||
  (typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1_000_000)
export function readConsultNutritionCard(
  value: unknown,
): ConsultNutritionCard | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return
  const v = value as Record<string, unknown>
  if (
    v.version !== 1 ||
    (v.kind !== "targets" && v.kind !== "intake") ||
    typeof v.recorded !== "boolean"
  )
    return
  if (
    typeof v.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v.date) ||
    !Number.isFinite(Date.parse(v.date)) ||
    new Date(v.date).toISOString().slice(0, 10) !== v.date
  )
    return
  if (
    typeof v.asOf !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v.asOf) ||
    !Number.isFinite(Date.parse(v.asOf)) ||
    new Date(v.asOf).toISOString() !== v.asOf
  )
    return
  if (
    v.proteinBasisKg !== null &&
    (typeof v.proteinBasisKg !== "number" ||
      !Number.isFinite(v.proteinBasisKg) ||
      v.proteinBasisKg <= 0 ||
      v.proteinBasisKg > 500)
  )
    return
  if (!Array.isArray(v.rows) || v.rows.length !== CONSULT_NUTRIENTS.length)
    return
  const rows: ConsultNutritionCard["rows"] = []
  for (const nutrient of CONSULT_NUTRIENTS) {
    const matches = v.rows.filter(
      (row) =>
        row &&
        typeof row === "object" &&
        !Array.isArray(row) &&
        row.nutrient === nutrient,
    )
    if (matches.length !== 1) return
    const row = matches[0]
    if (
      row.unit !== CONSULT_NUTRIENT_UNITS[nutrient] ||
      !amount(row.target) ||
      row.target === 0 ||
      !amount(row.consumed)
    )
      return
    if ((v.kind === "targets" || !v.recorded) && row.consumed !== null) return
    if (v.kind === "targets" && !v.recorded && row.target !== null) return
    rows.push({
      nutrient,
      unit: CONSULT_NUTRIENT_UNITS[nutrient],
      target: row.target,
      consumed: row.consumed,
    })
  }
  return {
    version: 1,
    kind: v.kind,
    date: v.date,
    asOf: v.asOf,
    recorded: v.recorded,
    proteinBasisKg: v.proteinBasisKg,
    rows,
  }
}

export function nutritionReceipt(
  action: unknown,
  status: unknown,
  value: unknown,
): ConsultNutritionCard | undefined {
  if (status !== "complete") return
  const card = readConsultNutritionCard(value)
  return card &&
    ((action === "profile" && card.kind === "targets") ||
      (action === "intake" && card.kind === "intake"))
    ? card
    : undefined
}
