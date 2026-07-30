/**
 * 레시피 v2 **작성** 서비스 — `POST /recipes/nutrition/preview` 와 `POST /recipes`.
 *
 * ## `useMock` 플래그
 * 서버 갈래와 앱 갈래가 병렬로 만들어진다. 서버가 아직 없어도 작성 화면을 끝까지
 * 검증할 수 있어야 하므로, 계약 §3.5 의 예시 payload 모양을 그대로 돌려주는 경로를
 * 둔다. **오케스트레이터는 서버를 붙일 때 `recipeWriteApiConfig.useMock = false`
 * 한 줄만 끄면 된다**(또는 `EXPO_PUBLIC_RECIPE_V2_MOCK=false`).
 *
 * 모의 응답은 화면에 하드코딩하지 않고 여기서만 만든다. 그리고 **입력에 반응한다** —
 * 앱에 이미 있는 식품표(`data/foodNutritionData`)와 계약 §4.3 파서로 실제로 계산한다.
 * 고정 payload 를 돌려주면 "재료를 고쳐도 숫자가 안 바뀌는" 화면을 검증한 셈이 되고,
 * 그건 시안의 검색 화면(`Typing` = `Typed`)이 틀렸던 방식과 같은 실수다.
 *
 * 모의 계산은 서버와 **다를 수 있다**(별칭 표가 없다). 화면에 뜨는 진짜 수치는 언제나
 * 서버가 계산한 것이다 — 이 경로는 개발용이다.
 */

import { api } from "@/src/services/core/apiClient"
import { parseAmountToGrams } from "@/src/features/recipe/utils/recipeAmountText"
import type {
  CreateRecipeRequestV2,
  CreatedRecipeSummary,
  NutrientBudget,
  NutrientHeadline,
  NutrientKey,
  NutritionPreviewRequest,
  NutritionPreviewResponse,
  PerIngredientNutrition,
} from "@/src/features/recipe/types/recipeWrite"

/** 서버가 붙으면 `useMock` 을 false 로. 테스트도 이 객체를 뒤집어 쓴다. */
export const recipeWriteApiConfig = {
  useMock: process.env.EXPO_PUBLIC_RECIPE_V2_MOCK !== "false",
}

export const recipeWriteService = {
  /** 계약 §3.5. 상한(50개 / 100자 / 40자)은 호출부가 이미 맞춰 보낸다. */
  async previewNutrition(
    request: NutritionPreviewRequest,
  ): Promise<NutritionPreviewResponse> {
    if (recipeWriteApiConfig.useMock) return mockPreviewNutrition(request)
    const { data } = await api.post("/recipes/nutrition/preview", request)
    return data.result as NutritionPreviewResponse
  },

  /** 계약 §3.6. 응답은 `RecipeDetail` 이고 작성 화면은 그중 셋만 읽는다. */
  async createRecipe(
    request: CreateRecipeRequestV2,
  ): Promise<CreatedRecipeSummary> {
    if (recipeWriteApiConfig.useMock) return mockCreateRecipe(request)
    const { data } = await api.post("/recipes", request)
    return data.result as CreatedRecipeSummary
  },
}

/* ══════════════════════════ 모의 경로 ══════════════════════════ */

/**
 * 모의 "오늘 남은 참고량". `proteinG` 를 **일부러 null 로 둔다** — 체중 기록이 없어
 * 단백질 한도를 못 만드는 경우(계약 §1.3)가 가장 잘 잊히는 분기라서, 개발 빌드를
 * 열면 바로 보이는 쪽이 낫다.
 */
const MOCK_BUDGET: NutrientBudget = {
  sodiumMg: 1550,
  potassiumMg: 1820,
  phosphorusMg: 640,
  proteinG: null,
}

const NUTRIENT_ORDER: NutrientKey[] = [
  "sodium",
  "potassium",
  "phosphorus",
  "protein",
]

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * 남은 양 대비 비율(0~999). 남은 양이 0 이하이거나 한도를 모르면 **null** 이고,
 * 그때 화면은 비율을 숨기고 절대값만 그린다(계약 §3.2).
 */
export function percentOfRemaining(
  amount: number,
  remaining: number | null,
): number | null {
  if (remaining === null || remaining <= 0) return null
  return Math.min(999, Math.round((amount / remaining) * 100))
}

export function buildNutrientBreakdown(
  nutrition: {
    sodiumMg: number
    potassiumMg: number
    phosphorusMg: number
    proteinG: number
  },
  budget: NutrientBudget,
): NutrientHeadline[] {
  const amounts: Record<NutrientKey, { amount: number; unit: "mg" | "g" }> = {
    sodium: { amount: nutrition.sodiumMg, unit: "mg" },
    potassium: { amount: nutrition.potassiumMg, unit: "mg" },
    phosphorus: { amount: nutrition.phosphorusMg, unit: "mg" },
    protein: { amount: nutrition.proteinG, unit: "g" },
  }
  const remaining: Record<NutrientKey, number | null> = {
    sodium: budget.sodiumMg,
    potassium: budget.potassiumMg,
    phosphorus: budget.phosphorusMg,
    protein: budget.proteinG,
  }
  return NUTRIENT_ORDER.map((key) => ({
    key,
    amount: round1(amounts[key].amount),
    unit: amounts[key].unit,
    percentOfRemaining: percentOfRemaining(amounts[key].amount, remaining[key]),
  }))
}

function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[()[\]{}]/gu, "")
    .replace(/\s+/gu, "")
}

interface MockFood {
  name: string
  proteinG: number
  sodiumMg: number
  potassiumMg: number
  phosphorusMg: number
  kcal: number
}

/**
 * 식품표를 **처음 쓸 때** 읽는다. 66,000 줄짜리 생성 파일이라 모듈 최상단에서
 * import 하면 이 서비스를 부르는 모든 테스트가 그 파일을 컴파일한다.
 */
let mockIndexPromise: Promise<Map<string, MockFood>> | null = null

async function loadMockIndex(): Promise<Map<string, MockFood>> {
  if (mockIndexPromise) return mockIndexPromise
  mockIndexPromise =
    import("@/src/features/recipe/data/foodNutritionData").then(
      ({ getAllFoodData }) => {
        const index = new Map<string, MockFood>()
        for (const food of getAllFoodData()) {
          const key = normalizeName(food.name)
          const entry: MockFood = {
            name: food.name,
            proteinG: food.protein ?? 0,
            sodiumMg: food.sodium ?? 0,
            potassiumMg: food.potassium ?? 0,
            phosphorusMg: food.phosphorus ?? 0,
            kcal: food.energy ?? 0,
          }
          if (!index.has(key)) index.set(key, entry)
          // 접두어 폴백용: `귀리,겉귀리,도정,생것` 의 첫 토막(`귀리`)도 후보로 둔다.
          // 기본 상태(`생것`)를 우선한다 — Foundation 담당이 실측으로 정한 규칙이다
          // (짧은 이름이 가공품 쪽이라 `소고기` → `소고기, 육포` 가 잡히면 나트륨이 30배가 된다).
          const head = normalizeName(food.name.split(",")[0] ?? "")
          if (head === "" || head === key) continue
          const existing = index.get(head)
          const isBaseState = /생것|날것/u.test(food.name)
          if (
            existing === undefined ||
            (isBaseState && !/생것|날것/u.test(existing.name))
          ) {
            index.set(head, entry)
          }
        }
        return index
      },
    )
  return mockIndexPromise
}

async function mockPreviewNutrition(
  request: NutritionPreviewRequest,
): Promise<NutritionPreviewResponse> {
  const index = await loadMockIndex()
  const perIngredient: PerIngredientNutrition[] = []
  const unmatched: string[] = []
  const total = {
    kcal: 0,
    proteinG: 0,
    sodiumMg: 0,
    potassiumMg: 0,
    phosphorusMg: 0,
  }

  for (const ingredient of request.ingredients) {
    const grams = parseAmountToGrams(ingredient.amountText)
    // 복합 재료(`다진마늘·파·참깨`)는 나누지 않고 통째로 찾는다 — 계약 §4.4-2.
    // 나누면 `소량` 을 셋으로 어떻게 배분할지 지어내야 한다.
    const food = index.get(normalizeName(ingredient.name))
    if (grams === null || food === undefined) {
      unmatched.push(ingredient.name)
      perIngredient.push({
        name: ingredient.name,
        grams,
        // 그램이 없으면 계산에 **못 들어갔다.** 이름이 표에 있어도 `matched: true` 로
        // 내보내면 안 된다 — 0 을 더하면서 "찾았다" 고 말하는 셈이고 서버와도 어긋난다.
        matched: false,
        reason: grams === null ? "unknown_amount" : "not_in_catalog",
        kcal: 0,
        proteinG: 0,
        sodiumMg: 0,
        potassiumMg: 0,
        phosphorusMg: 0,
      })
      continue
    }
    const ratio = grams / 100
    const row: PerIngredientNutrition = {
      name: ingredient.name,
      grams,
      matched: true,
      reason: "matched",
      kcal: round1(food.kcal * ratio),
      proteinG: round1(food.proteinG * ratio),
      sodiumMg: round1(food.sodiumMg * ratio),
      potassiumMg: round1(food.potassiumMg * ratio),
      phosphorusMg: round1(food.phosphorusMg * ratio),
    }
    perIngredient.push(row)
    total.kcal += row.kcal
    total.proteinG += row.proteinG
    total.sodiumMg += row.sodiumMg
    total.potassiumMg += row.potassiumMg
    total.phosphorusMg += row.phosphorusMg
  }

  const servings = Math.max(1, request.servings)
  const perServing = {
    kcal: round1(total.kcal / servings),
    proteinG: round1(total.proteinG / servings),
    sodiumMg: round1(total.sodiumMg / servings),
    potassiumMg: round1(total.potassiumMg / servings),
    phosphorusMg: round1(total.phosphorusMg / servings),
  }

  return {
    nutrition: {
      ...perServing,
      provenance: "computed_from_ingredients",
      unmatchedIngredients: unmatched,
    },
    budget: MOCK_BUDGET,
    nutrientBreakdown: buildNutrientBreakdown(perServing, MOCK_BUDGET),
    perIngredient,
  }
}

async function mockCreateRecipe(
  request: CreateRecipeRequestV2,
): Promise<CreatedRecipeSummary> {
  const preview = await mockPreviewNutrition({
    servings: request.servings ?? 1,
    ingredients: request.ingredients,
  })
  return {
    id: Date.now() % 1_000_000,
    name: request.name,
    nutrition: preview.nutrition,
  }
}
