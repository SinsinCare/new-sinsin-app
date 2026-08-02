import type {
  FoodAnalysisConsumptionRevision,
  FoodAnalysisJob,
  FoodAnalysisRevision,
  FoodAnalysisRevisionItem,
  FoodAnalysisStatus,
  FoodCameraAnalyzeResult,
  FoodCameraEvaluation,
  FoodCameraFood,
  FoodCameraNutritionTotal,
  FoodNutritionProvenance,
} from "@/src/types"
import { getAppLanguage } from "@/src/i18n"
import { romanizedDisplayName } from "@/src/shared/utils/koreanRomanization"

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

const NULLABLE_NUTRIENT_KEYS = new Set<
  "sodium" | "potassium" | "phosphorus" | "water"
>(["sodium", "potassium", "phosphorus", "water"])

const HANGUL_PATTERN = /[ㄱ-ㅎㅏ-ㅣ가-힣]/
const LATIN_PATTERN = /[A-Za-z]/
const VERIFIED_ENGLISH_FOOD_NAMES: Record<string, string> = {
  밥: "Rice",
  흰쌀밥: "White rice",
  현미밥: "Brown rice",
  김치: "Kimchi",
  배추김치: "Napa cabbage kimchi",
  김치찌개: "Kimchi stew",
  된장찌개: "Soybean paste stew",
  닭가슴살: "Chicken breast",
  샐러드: "Salad",
  우유: "Milk",
  계란: "Egg",
  달걀: "Egg",
  "삶은 계란": "Boiled egg",
  두부: "Tofu",
  "초콜릿 머핀": "Chocolate muffin",
  마들렌: "Madeleine",
  "견과 타르트": "Nut tart",
  "호두 브라우니": "Walnut brownie",
  호떡: "Hotteok",
  삼립호떡: "Samlip hotteok",
  삽립호떡: "Samlip hotteok",
}
const VERIFIED_ENGLISH_UNITS: Record<string, string> = {
  인분: "serving",
  개: "piece",
  잔: "cup",
  컵: "cup",
  공기: "bowl",
  국그릇: "bowl",
  대접: "large bowl",
  조각: "piece",
  큰술: "tbsp",
  작은술: "tsp",
}

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

function fallbackFoodName(): string {
  return getAppLanguage() === "en" ? "Food" : "음식"
}

function englishFoodName(value: string): string {
  const name = value.replace(/\s+/g, " ").trim()
  if (!name) return "Food"
  const verified = VERIFIED_ENGLISH_FOOD_NAMES[name]
  if (verified) return verified
  if (!HANGUL_PATTERN.test(name)) return name
  const latinOnly = name
    .replace(/[ㄱ-ㅎㅏ-ㅣ가-힣]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s\-_/(),]+|[\s\-_/(),]+$/g, "")
  if (LATIN_PATTERN.test(latinOnly)) return latinOnly
  // 검증된 번역이 없다고 "Food" 로 지우지 않는다. 한 끼에 음식이 여러 개면
  // 화면에 "Food 1 + 2 more" 같은 아무 뜻 없는 제목이 떴다 — 무엇을 먹었는지가
  // 핵심인 앱에서 가장 중요한 정보를 지운 셈이다. 번역을 지어내지 않으면서
  // 읽을 수 있도록 로마자로 옮긴다. (감자조림 → Gamjajorim)
  return romanizedDisplayName(name)
}

function numberedEnglishFoodName(
  value: string,
  index: number,
  count: number,
): string {
  const name = englishFoodName(value)
  // 이제 "Food" 는 이름이 아예 비었을 때만 나온다. 그때만 번호를 붙인다.
  return name === "Food" && count > 1 ? `Food ${index + 1}` : name
}

function safeEnglishCopy(value: string, fallback: string): string {
  return value && !HANGUL_PATTERN.test(value) ? value : fallback
}

function projectEnglishEvaluation(
  evaluation: FoodCameraEvaluation,
): FoodCameraEvaluation {
  const cautionCount = evaluation.cautionFoods.length
  return {
    ...evaluation,
    comment: safeEnglishCopy(
      evaluation.comment,
      "Review the nutrition details recorded for this meal.",
    ),
    cautionFoods: evaluation.cautionFoods.map((item, index) => ({
      food: item.food
        ? numberedEnglishFoodName(item.food, index, cautionCount)
        : "",
      reason: safeEnglishCopy(
        item.reason,
        "Review this food’s nutrition details and portion.",
      ),
    })),
    detail: {
      riskFactors: safeEnglishCopy(evaluation.detail.riskFactors, ""),
      disclaimer: safeEnglishCopy(
        evaluation.detail.disclaimer,
        "Use this estimate as a reference for your food log and conversations with your care team.",
      ),
    },
  }
}

function englishServingUnit(value: string): string {
  const unit = value.trim()
  if (!unit) return "serving"
  return (
    VERIFIED_ENGLISH_UNITS[unit] ??
    (HANGUL_PATTERN.test(unit) ? "serving" : unit)
  )
}

function projectEnglishResult(
  result: FoodCameraAnalyzeResult,
): FoodCameraAnalyzeResult {
  const foods = result.foods.map((food, index, rows) => {
    const servingSizeUnit = englishServingUnit(food.servingSizeUnit)
    return {
      ...food,
      name: numberedEnglishFoodName(food.name, index, rows.length),
      servingSizeUnit,
    }
  })
  const revision = result.revision
    ? {
        ...result.revision,
        evaluation: projectEnglishEvaluation(result.revision.evaluation),
        items: result.revision.items.map((item, index, rows) => ({
          ...item,
          name: numberedEnglishFoodName(item.name, index, rows.length),
        })),
      }
    : undefined
  const consumptionRevision = result.consumptionRevision
    ? {
        ...result.consumptionRevision,
        evaluation: projectEnglishEvaluation(
          result.consumptionRevision.evaluation,
        ),
      }
    : null
  const titleNames =
    foods.length > 0
      ? foods.map((food) => food.name)
      : (revision?.items.map((item) => item.name) ?? [])
  const projectedTitle =
    titleNames.length === 0
      ? "Meal"
      : titleNames.length === 1
        ? titleNames[0]
        : `${titleNames[0]} + ${titleNames.length - 1} more`

  return {
    ...result,
    title: safeEnglishCopy(result.title, projectedTitle),
    foods,
    revision,
    consumptionRevision,
    evaluation: projectEnglishEvaluation(result.evaluation),
  }
}

export function projectFoodAnalysisJobPresentation(
  job: FoodAnalysisJob,
): FoodAnalysisJob {
  if (getAppLanguage() !== "en") return job
  const confirmationQuestions = (job.confirmationQuestions ?? []).map(
    (question) => {
      const fallbackPrompt =
        question.type === "PORTION"
          ? "How much of this food is shown?"
          : question.type === "FOOD_MATCH"
            ? question.observationItemId
              ? "Which food is this?"
              : "We couldn’t identify a food in this photo. Choose the closest match."
            : "Review this detail before continuing."
      const portionLabels = ["A little less", "Photo estimate", "A little more"]
      return {
        ...question,
        prompt: safeEnglishCopy(question.prompt, fallbackPrompt),
        options: question.options.map((option, index, rows) => ({
          ...option,
          label:
            question.type === "PORTION" && index < portionLabels.length
              ? portionLabels[index]
              : safeEnglishCopy(
                  option.label,
                  numberedEnglishFoodName(option.label, index, rows.length),
                ),
        })),
      }
    },
  )
  return {
    ...job,
    confirmationQuestions,
    error:
      job.error == null
        ? job.error
        : safeEnglishCopy(
            job.error,
            "We couldn’t finish the meal analysis. Try it again.",
          ),
    failureMessage:
      job.failureMessage == null
        ? job.failureMessage
        : safeEnglishCopy(
            job.failureMessage,
            "We couldn’t finish the meal analysis. Try it again.",
          ),
  }
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
      firstNumber(...sources.map((source) => source[key])) ??
        (NULLABLE_NUTRIENT_KEYS.has(
          key as "sodium" | "potassium" | "phosphorus" | "water",
        )
          ? null
          : 0),
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
    score: firstNumber(...sources.map((source) => source.score)) ?? null,
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
    name: firstString(source.name) ?? fallbackFoodName(),
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
  const rawRestrictionLevel = firstString(source.restrictionLevel) ?? ""
  const hasUnknownMineral =
    nutrients.sodium === null ||
    nutrients.potassium === null ||
    nutrients.phosphorus === null
  const normalizedRestrictionLevel =
    rawRestrictionLevel.toUpperCase() === "CAUTION" ||
    rawRestrictionLevel.toUpperCase() === "RESTRICTED"
      ? rawRestrictionLevel.toUpperCase()
      : hasUnknownMineral
        ? "UNKNOWN"
        : rawRestrictionLevel
  return {
    id: firstNumber(source.id),
    analysisItemId:
      firstString(source.analysisItemId) ?? revisionItem?.analysisItemId,
    canonicalFoodId:
      firstString(source.canonicalFoodId) ??
      revisionItem?.canonicalFoodId ??
      null,
    name: firstString(source.name) ?? revisionItem?.name ?? fallbackFoodName(),
    restrictionLevel: normalizedRestrictionLevel,
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

  const normalized: FoodCameraAnalyzeResult = {
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
  return getAppLanguage() === "en"
    ? projectEnglishResult(normalized)
    : normalized
}
