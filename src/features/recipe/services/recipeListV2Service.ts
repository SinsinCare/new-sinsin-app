/**
 * 레시피 v2 목록·검색 서비스 계층.
 *
 * 두 가지를 한다.
 *  1. 계약(§3.1/§3.2)의 응답을 **방어적으로 정규화**한다. 서버가 아직 없어서 실제
 *     모양을 볼 수 없으니, 필드가 비거나 이름이 다를 때 화면이 죽는 대신 그 항목만
 *     떨어져 나가게 만든다. 특히 `provenance` 가 계약의 네 값이 아니면 그 카드의
 *     `nutrition` 을 **null 로 만들어 그릴 수 없게** 한다 — 계약 §1.1 이 요구하는
 *     "provenance 없이 수치를 그리지 않는다" 를 타입 수준에서 강제하는 유일한 방법이다.
 *  2. 서버가 붙기 전까지 모의 경로로 돌린다(`RECIPE_LIST_V2_MOCK`). 모의 payload 는
 *     화면이 아니라 이 계층에 있다 — 화면에 심으면 서버를 붙일 때 지울 곳을 못 찾는다.
 */
import { api } from "@/src/services/core/apiClient"

import type {
  NutrientBudget,
  NutrientHeadline,
  NutrientKey,
  NutritionProvenance,
  RatingSummary,
  RecipeCard,
  RecipeListQuery,
  RecipeListResponse,
  RecipeNutrition,
  RecipeSuggestion,
} from "../types/recipeListV2"
import { NUTRITION_PROVENANCES } from "../types/recipeListV2"
import {
  MOCK_SUGGEST_LIMIT,
  queryMockRecipeList,
  queryMockSuggestions,
} from "./recipeListV2MockCatalog"

/**
 * 서버 미배포 상태의 기본값. **서버가 붙으면 이 한 줄을 false 로 바꾼다**
 * (또는 `EXPO_PUBLIC_RECIPE_V2_MOCK=false`). env 로 양방향 덮어쓸 수 있게 둔 이유:
 * 오케스트레이터가 코드를 고치지 않고도 붙여 볼 수 있어야 한다.
 */
const MOCK_DEFAULT = true

export const RECIPE_LIST_V2_MOCK: boolean =
  process.env.EXPO_PUBLIC_RECIPE_V2_MOCK === "false"
    ? false
    : process.env.EXPO_PUBLIC_RECIPE_V2_MOCK === "true"
      ? true
      : MOCK_DEFAULT

/** 목록 한 페이지 상한. 서버 상한과 별개로 앱도 걸어 둔다. */
export const RECIPE_LIST_PAGE_SIZE = 20

type Json = Record<string, unknown>

function asRecord(value: unknown): Json | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Json)
    : null
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && /^[+-]?\d+(\.\d+)?$/u.test(value.trim())) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function asNumberOr(value: unknown, fallback: number): number {
  return asFiniteNumber(value) ?? fallback
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => asNullableString(entry))
    .filter((entry): entry is string => entry !== null)
}

function asProvenance(value: unknown): NutritionProvenance | null {
  return typeof value === "string" &&
    (NUTRITION_PROVENANCES as readonly string[]).includes(value)
    ? (value as NutritionProvenance)
    : null
}

/**
 * 계약 §1.1 의 관문. provenance 가 없거나 모르는 값이면 **null** 을 돌려준다.
 * null 이면 카드가 영양 줄을 아예 그리지 않는다.
 */
export function normalizeNutrition(raw: unknown): RecipeNutrition | null {
  const record = asRecord(raw)
  if (!record) return null
  const provenance = asProvenance(record.provenance)
  if (!provenance) return null
  return {
    kcal: asNumberOr(record.kcal, 0),
    proteinG: asNumberOr(record.proteinG, 0),
    sodiumMg: asNumberOr(record.sodiumMg, 0),
    potassiumMg: asNumberOr(record.potassiumMg, 0),
    phosphorusMg: asNumberOr(record.phosphorusMg, 0),
    provenance,
    unmatchedIngredients: asStringArray(record.unmatchedIngredients),
  }
}

const NUTRIENT_KEYS: readonly NutrientKey[] = [
  "sodium",
  "potassium",
  "phosphorus",
  "protein",
]

export function normalizeHeadline(raw: unknown): NutrientHeadline | null {
  const record = asRecord(raw)
  if (!record) return null
  const key = record.key
  if (
    typeof key !== "string" ||
    !(NUTRIENT_KEYS as readonly string[]).includes(key)
  ) {
    return null
  }
  const amount = asFiniteNumber(record.amount)
  if (amount == null) return null
  const percent = asFiniteNumber(record.percentOfRemaining)
  return {
    key: key as NutrientKey,
    amount,
    unit: record.unit === "g" ? "g" : "mg",
    // 0~999 밖은 서버 결함이므로 비율을 버린다 — 900% 를 1000% 로 반올림해 보여주지 않는다.
    percentOfRemaining:
      percent == null || percent < 0 || percent > 999
        ? null
        : Math.round(percent),
  }
}

export function normalizeRating(raw: unknown): RatingSummary {
  const record = asRecord(raw)
  const count = Math.max(0, Math.trunc(asNumberOr(record?.count, 0)))
  const averageRaw = asFiniteNumber(record?.average)
  const distributionRaw = Array.isArray(record?.distribution)
    ? record.distribution
    : []
  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0]
  for (let index = 0; index < 5; index += 1) {
    distribution[index] = Math.max(
      0,
      Math.trunc(asNumberOr(distributionRaw[index], 0)),
    )
  }
  return {
    // 리뷰가 0건이면 평균은 null 이다 — 0.0 을 만들지 않는다(계약 §3.4).
    average: count > 0 && averageRaw != null ? averageRaw : null,
    count,
    distribution,
  }
}

export function normalizeBudget(raw: unknown): NutrientBudget {
  const record = asRecord(raw)
  return {
    sodiumMg: asNumberOr(record?.sodiumMg, 0),
    potassiumMg: asNumberOr(record?.potassiumMg, 0),
    phosphorusMg: asNumberOr(record?.phosphorusMg, 0),
    proteinG: asFiniteNumber(record?.proteinG),
  }
}

export function normalizeRecipeCard(raw: unknown): RecipeCard | null {
  const record = asRecord(raw)
  if (!record) return null
  const id = asFiniteNumber(record.id)
  const name = asNullableString(record.name)
  // id 나 이름이 없는 카드는 누를 수도, 읽을 수도 없다. 조용히 버린다.
  if (id == null || !Number.isInteger(id) || !name) return null
  return {
    id,
    name,
    summary: asNullableString(record.summary),
    category: asNullableString(record.category) ?? "",
    difficulty: asNullableString(record.difficulty),
    timeMin: asFiniteNumber(record.timeMin),
    servings: asFiniteNumber(record.servings),
    thumbnailUrl: asNullableString(record.thumbnailUrl),
    tags: asStringArray(record.tags),
    nutrition: normalizeNutrition(record.nutrition),
    headline: normalizeHeadline(record.headline),
    rating: normalizeRating(record.rating),
    saveCount: Math.max(0, Math.trunc(asNumberOr(record.saveCount, 0))),
    saved: record.saved === true,
    authored: record.authored === true,
  }
}

export function normalizeRecipeListResponse(raw: unknown): RecipeListResponse {
  const record = asRecord(raw)
  const itemsRaw = Array.isArray(record?.items) ? record.items : []
  const items = itemsRaw
    .map((entry) => normalizeRecipeCard(entry))
    .filter((entry): entry is RecipeCard => entry !== null)
  const nextCursor = asNullableString(record?.nextCursor)
  return {
    items,
    nextCursor,
    // hasMore 를 믿되, 커서가 없으면 더 받을 방법이 없으므로 false 로 내린다.
    hasMore: record?.hasMore === true && nextCursor !== null,
    budget: normalizeBudget(record?.budget),
    totalCount: asFiniteNumber(record?.totalCount),
  }
}

/**
 * 자동완성 정규화. 계약에 응답 타입이 없어서(§3 누락) 두 모양을 모두 받는다:
 * `["곤드레밥", …]` 과 `[{ text, recipeId, kind }, …]`. 어느 쪽이 오든 화면은 같다.
 */
export function normalizeSuggestions(raw: unknown): RecipeSuggestion[] {
  const record = asRecord(raw)
  const source = Array.isArray(raw)
    ? raw
    : Array.isArray(record?.items)
      ? record.items
      : Array.isArray(record?.suggestions)
        ? record.suggestions
        : []

  const seen = new Set<string>()
  const suggestions: RecipeSuggestion[] = []
  for (const entry of source) {
    if (typeof entry === "string") {
      const text = asNullableString(entry)
      if (!text || seen.has(text)) continue
      seen.add(text)
      suggestions.push({ text, recipeId: null, kind: "keyword" })
      continue
    }
    const entryRecord = asRecord(entry)
    if (!entryRecord) continue
    const text =
      asNullableString(entryRecord.text) ?? asNullableString(entryRecord.name)
    if (!text || seen.has(text)) continue
    const recipeId = asFiniteNumber(entryRecord.recipeId)
    seen.add(text)
    suggestions.push({
      text,
      recipeId:
        recipeId != null && Number.isInteger(recipeId) ? recipeId : null,
      kind:
        entryRecord.kind === "recipe" || recipeId != null
          ? "recipe"
          : "keyword",
    })
  }
  return suggestions.slice(0, MOCK_SUGGEST_LIMIT)
}

function buildListParams(
  query: RecipeListQuery,
): Record<string, string | number> {
  const params: Record<string, string | number> = {
    limit: query.limit ?? RECIPE_LIST_PAGE_SIZE,
  }
  if (query.cursor) params.cursor = query.cursor
  const q = query.q?.trim()
  if (q) params.q = q
  if (query.categories?.length) params.categories = query.categories.join(",")
  if (query.tags?.length) params.tags = query.tags.join(",")
  if (query.sort) params.sort = query.sort
  return params
}

export const recipeListV2Service = {
  /** 계약 §3.1 `GET /recipes`. */
  async getRecipeList(query: RecipeListQuery): Promise<RecipeListResponse> {
    if (RECIPE_LIST_V2_MOCK) {
      return queryMockRecipeList(query)
    }
    const { data } = await api.get("/recipes", {
      params: buildListParams(query),
    })
    return normalizeRecipeListResponse(asRecord(data)?.result)
  },

  /** 계약 §2 `GET /recipes/search/suggest`. */
  async getSuggestions(
    rawQuery: string,
    limit = MOCK_SUGGEST_LIMIT,
  ): Promise<RecipeSuggestion[]> {
    const q = rawQuery.trim()
    if (!q) return []
    if (RECIPE_LIST_V2_MOCK) {
      return queryMockSuggestions(q, limit)
    }
    const { data } = await api.get("/recipes/search/suggest", {
      params: { q, limit },
    })
    return normalizeSuggestions(asRecord(data)?.result)
  },
}
