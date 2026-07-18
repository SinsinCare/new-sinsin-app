import type {
  FoodAnalysisConsumptionRevision,
  FoodAnalysisRevision,
  FoodAnalysisRevisionItem,
  FoodAnalysisStatus,
  FoodCameraAnalyzeResult,
  FoodCameraEvaluation,
  FoodCameraFood,
  FoodCameraNutritionTotal,
  FoodNutritionProvenance,
} from "@/src/types"

type UnknownRecord = Record<string, unknown>

const NUTRIENT_KEYS = [
  "calories",
  "protein",
  "carbohydrates",
  "fat",
  "sodium",
  "potassium",
  "phosphorus",
  "water",
] as const

function asRecord(value: unknown): UnknownRecord | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function firstString(...values: unknown[]): string | undefined {
  return values.map(asString).find((value) => value !== undefined)
}

function firstNumber(...values: unknown[]): number | undefined {
  return values.map(asFiniteNumber).find((value) => value !== undefined)
}

function normalizeNutritionTotal(
  ...values: unknown[]
): FoodCameraNutritionTotal {
  const sources = values
    .map(asRecord)
    .filter((value): value is UnknownRecord => value !== null)
  return Object.fromEntries(
    NUTRIENT_KEYS.map((key) => [
      key,
      firstNumber(...sources.map((source) => source[key])) ?? 0,
    ]),
  ) as unknown as FoodCameraNutritionTotal
}

function normalizeProvenance(
  value: unknown,
): FoodNutritionProvenance | undefined {
  const raw = asString(value) ?? asString(asRecord(value)?.type)
  if (!raw) return undefined
  if (raw === "AI_INGREDIENT_ESTIMATE") return "AI_ESTIMATE"
  if (
    raw === "CATALOG" ||
    raw === "RECIPE" ||
    raw === "INGREDIENT_ESTIMATE" ||
    raw === "AI_ESTIMATE"
  ) {
    return raw
  }
  return undefined
}

function normalizeCautionFood(value: unknown) {
  if (typeof value === "string") {
    return value.trim() ? { food: "", reason: value } : null
  }
  const source = asRecord(value)
  if (!source) return null
  const food = firstString(source.food, source.name, source.title) ?? ""
  const reason =
    firstString(source.reason, source.message, source.guidance) ?? ""
  return food || reason ? { food, reason } : null
}

export function normalizeFoodAnalysisEvaluation(
  ...values: unknown[]
): FoodCameraEvaluation {
  const sources = values
    .map(asRecord)
    .filter((value): value is UnknownRecord => value !== null)
  const guidance = sources
    .flatMap((source) => asArray(source.guidance))
    .map(asString)
    .filter((value): value is string => value !== undefined)
  const detailSources = sources
    .map((source) => asRecord(source.detail))
    .filter((value): value is UnknownRecord => value !== null)
  const cautionCandidates = sources
    .flatMap((source) => [
      ...asArray(source.cautionFoods),
      ...asArray(source.alerts),
    ])
    .map(normalizeCautionFood)
    .filter((value): value is NonNullable<typeof value> => value !== null)

  return {
    comment:
      firstString(...sources.map((source) => source.comment)) ??
      guidance[0] ??
      "",
    score: firstNumber(...sources.map((source) => source.score)) ?? 0,
    cautionFoods: cautionCandidates,
    detail: {
      riskFactors:
        firstString(...detailSources.map((source) => source.riskFactors)) ?? "",
      disclaimer:
        firstString(...detailSources.map((source) => source.disclaimer)) ??
        guidance[1] ??
        guidance[0] ??
        "",
    },
  }
}

function normalizeRevisionItem(value: unknown): FoodAnalysisRevisionItem {
  const source = asRecord(value) ?? {}
  return {
    analysisItemId: firstString(source.analysisItemId, source.id) ?? "",
    canonicalFoodId:
      firstString(source.canonicalFoodId, source.canonical_food_id) ?? null,
    name: firstString(source.name) ?? "분석된 음식",
    analyzedGrams: firstNumber(source.analyzedGrams) ?? 0,
    fullNutrients: normalizeNutritionTotal(
      source.fullNutrients,
      source.nutrients,
    ),
    provenance: normalizeProvenance(source.provenance) ?? "AI_ESTIMATE",
    confidence: firstNumber(source.confidence) ?? 0,
  }
}

function normalizeRevision(value: unknown): FoodAnalysisRevision | undefined {
  const source = asRecord(value)
  if (!source) return undefined
  const fullTotal = normalizeNutritionTotal(source.fullTotal, source.totals)
  return {
    ...(source as unknown as FoodAnalysisRevision),
    revisionId: firstString(source.revisionId, source.id) ?? "",
    catalogSnapshotId: firstString(source.catalogSnapshotId) ?? "",
    policyVersion: firstString(source.policyVersion) ?? "",
    nutritionFingerprint: firstString(source.nutritionFingerprint) ?? "",
    fullTotal,
    totals: normalizeNutritionTotal(source.totals, fullTotal),
    evaluation: normalizeFoodAnalysisEvaluation(source.evaluation),
    items: asArray(source.items).map(normalizeRevisionItem),
  }
}

function normalizeConsumptionRevision(
  value: unknown,
  fallbackEvaluation: unknown,
): FoodAnalysisConsumptionRevision | null {
  const source = asRecord(value)
  if (!source) return null
  const consumedTotal = normalizeNutritionTotal(
    source.consumedTotal,
    source.totals,
  )
  return {
    ...(source as unknown as FoodAnalysisConsumptionRevision),
    consumptionRevisionId:
      firstString(source.consumptionRevisionId, source.id) ?? "",
    baseRevisionId: firstString(source.baseRevisionId) ?? "",
    items: asArray(source.items).map((value) => {
      const item = asRecord(value) ?? {}
      return {
        analysisItemId: firstString(item.analysisItemId, item.id) ?? "",
        consumedGrams: firstNumber(item.consumedGrams),
        consumedRatio: firstNumber(item.consumedRatio),
        solidConsumedRatio: firstNumber(item.solidConsumedRatio),
        brothConsumedRatio: firstNumber(item.brothConsumedRatio),
        nutrients: normalizeNutritionTotal(item.nutrients),
      }
    }),
    consumedTotal,
    totals: normalizeNutritionTotal(source.totals, consumedTotal),
    evaluation: normalizeFoodAnalysisEvaluation(
      source.evaluation,
      fallbackEvaluation,
    ),
  }
}

function normalizeFood(
  value: unknown,
  revisionItem?: FoodAnalysisRevisionItem,
  consumptionItem?: FoodAnalysisConsumptionRevision["items"][number],
): FoodCameraFood {
  const source = asRecord(value) ?? {}
  const nutrients = consumptionItem
    ? normalizeNutritionTotal(
        consumptionItem.nutrients,
        source,
        revisionItem?.fullNutrients,
      )
    : normalizeNutritionTotal(source, revisionItem?.fullNutrients)
  return {
    id: firstNumber(source.id),
    analysisItemId:
      firstString(source.analysisItemId) ?? revisionItem?.analysisItemId,
    canonicalFoodId:
      firstString(source.canonicalFoodId) ??
      revisionItem?.canonicalFoodId ??
      null,
    name: firstString(source.name) ?? revisionItem?.name ?? "분석된 음식",
    restrictionLevel: firstString(source.restrictionLevel) ?? "",
    servingSizeValue:
      firstNumber(source.servingSizeValue, revisionItem?.analyzedGrams) ?? null,
    servingSizeUnit: firstString(source.servingSizeUnit) ?? "g",
    analyzedGrams:
      firstNumber(source.analyzedGrams, revisionItem?.analyzedGrams) ?? null,
    consumedGrams:
      firstNumber(source.consumedGrams, consumptionItem?.consumedGrams) ?? null,
    confidence:
      firstNumber(source.confidence, revisionItem?.confidence) ?? null,
    provenance:
      normalizeProvenance(source.provenance) ?? revisionItem?.provenance,
    isBroth: typeof source.isBroth === "boolean" ? source.isBroth : undefined,
    ...nutrients,
  }
}

export function normalizeFoodAnalysisResult(
  value: unknown,
): FoodCameraAnalyzeResult {
  const source = asRecord(value) ?? {}
  const rawRevision = asRecord(source.revision)
  const rawConsumptionRevision = asRecord(source.consumptionRevision)
  const revision = normalizeRevision(rawRevision)
  const consumptionRevision = normalizeConsumptionRevision(
    rawConsumptionRevision,
    rawRevision?.evaluation,
  )
  const revisionById = new Map(
    (revision?.items ?? []).map((item) => [item.analysisItemId, item]),
  )
  const consumptionById = new Map(
    (consumptionRevision?.items ?? []).map((item) => [
      item.analysisItemId,
      item,
    ]),
  )
  const rawFoods = asArray(source.foods)
  const foodSources =
    rawFoods.length > 0 ? rawFoods : (revision?.items ?? []).map(() => ({}))
  const matchedRevisionIds = new Set<string>()
  const foods = foodSources.map((food, index) => {
    const rawFood = asRecord(food)
    const rawAnalysisItemId = firstString(rawFood?.analysisItemId)
    const rawFoodName = firstString(rawFood?.name)
    const nameMatchedRevisionItem = rawFoodName
      ? revision?.items.find(
          (item) =>
            item.name === rawFoodName &&
            !matchedRevisionIds.has(item.analysisItemId),
        )
      : undefined
    const revisionItem =
      (rawAnalysisItemId ? revisionById.get(rawAnalysisItemId) : undefined) ??
      nameMatchedRevisionItem ??
      revision?.items[index]
    if (revisionItem?.analysisItemId) {
      matchedRevisionIds.add(revisionItem.analysisItemId)
    }
    const consumptionItem = consumptionById.get(
      revisionItem?.analysisItemId ?? rawAnalysisItemId ?? "",
    )
    return normalizeFood(food, revisionItem, consumptionItem)
  })
  const evaluation = normalizeFoodAnalysisEvaluation(
    source.evaluation,
    rawConsumptionRevision?.evaluation,
    rawRevision?.evaluation,
  )
  const total = normalizeNutritionTotal(
    source.total,
    rawConsumptionRevision?.consumedTotal,
    rawConsumptionRevision?.totals,
    rawRevision?.fullTotal,
    rawRevision?.totals,
  )

  return {
    ...(source as unknown as FoodCameraAnalyzeResult),
    foodAnalysisResultId: firstNumber(source.foodAnalysisResultId) ?? 0,
    analysisId: firstString(source.analysisId),
    requestId: firstString(source.requestId),
    status: firstString(source.status) as FoodAnalysisStatus | undefined,
    revisionId:
      firstString(source.revisionId) ?? revision?.revisionId ?? undefined,
    catalogSnapshotId:
      firstString(source.catalogSnapshotId) ??
      revision?.catalogSnapshotId ??
      undefined,
    policyVersion:
      firstString(source.policyVersion) ?? revision?.policyVersion ?? undefined,
    coverage: consumptionRevision?.coverage ?? revision?.coverage ?? undefined,
    revision,
    consumptionRevision,
    servings: firstNumber(source.servings) ?? 1,
    eatenPercentage: firstNumber(source.eatenPercentage) ?? 100,
    consumedRatio: firstNumber(source.consumedRatio),
    solidConsumedRatio: firstNumber(source.solidConsumedRatio),
    brothConsumedRatio: firstNumber(source.brothConsumedRatio),
    title:
      firstString(
        source.title,
        foods
          .map((food) => food.name)
          .filter(Boolean)
          .join(", "),
      ) ?? "",
    imageUrl: firstString(source.imageUrl) ?? null,
    foods,
    total,
    evaluation,
  }
}
