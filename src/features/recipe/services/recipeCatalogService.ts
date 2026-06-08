import { api } from "@/src/services/core/apiClient"
import type {
  CuratedRecipe,
  CuratedRecipeAiSummary,
  CuratedRecipeCkdGuide,
  CuratedRecipeIngredient,
  CuratedRecipeNutrition,
  CuratedRecipeStep,
} from "../data/curatedRecipeTypes"

export interface RecipeListParams {
  limit?: number
  cursor?: string
  search?: string
  categories?: string[]
  tags?: string[]
}

export interface RecipeListPage {
  items: CuratedRecipe[]
  nextCursor: string | null
  hasMore: boolean
}

interface ApiRecipeNutrition {
  kcal?: number
  proteinG?: number
  sodiumMg?: number
  potassiumMg?: number
  phosphorusMg?: number
  ckdFriendliness?: CuratedRecipeNutrition["ckd_friendliness"]
  estimated?: boolean
  verificationRequired?: boolean
}

interface ApiRecipeSummary {
  id: number
  sourceKey?: string | null
  source_key?: string | null
  name: string
  description?: string | null
  category: string
  difficulty?: string | null
  timeMin?: number | null
  time_min?: number | null
  servings?: number | null
  tags?: string[] | null
  thumbnailUrl?: string | null
  thumbnail_url?: string | null
  detailImageUrl?: string | null
  detail_image_url?: string | null
  nutrition?: ApiRecipeNutrition | null
  ingredients?: CuratedRecipeIngredient[] | null
  steps?: CuratedRecipeStep[] | null
  ckdGuide?: CuratedRecipeCkdGuide | null
  ckd_guide?: CuratedRecipeCkdGuide | null
  aiSummary?: {
    headline?: string | null
    riskFlags?: Record<string, string> | null
    risk_flags?: Record<string, string> | null
  } | null
  ai_summary?: {
    headline?: string | null
    riskFlags?: Record<string, string> | null
    risk_flags?: Record<string, string> | null
  } | null
  createdAt?: string | null
  created_at?: string | null
}

interface ApiRecipeDetail extends ApiRecipeSummary {
  detailImageUrl?: string | null
}

interface ApiRecipeListResult {
  items: ApiRecipeSummary[]
  nextCursor?: string | null
  hasMore: boolean
}

function mapNutrition(
  nutrition: ApiRecipeNutrition | null | undefined,
): CuratedRecipeNutrition {
  return {
    kcal: nutrition?.kcal ?? 0,
    protein_g: nutrition?.proteinG ?? 0,
    sodium_mg: nutrition?.sodiumMg ?? 0,
    potassium_mg: nutrition?.potassiumMg ?? 0,
    phosphorus_mg: nutrition?.phosphorusMg ?? 0,
    ckd_friendliness: nutrition?.ckdFriendliness ?? "moderate",
    estimated: nutrition?.estimated ?? false,
    verification_required: nutrition?.verificationRequired ?? false,
  }
}

function mapAiSummary(
  aiSummary: ApiRecipeDetail["aiSummary"] | ApiRecipeDetail["ai_summary"],
  fallbackHeadline: string,
): CuratedRecipeAiSummary {
  return {
    headline: aiSummary?.headline ?? fallbackHeadline,
    risk_flags: aiSummary?.riskFlags ?? aiSummary?.risk_flags ?? {},
  }
}

function mapSummary(item: ApiRecipeSummary): CuratedRecipe {
  const sourceKey = item.sourceKey ?? item.source_key ?? null
  const thumbnailUrl = item.thumbnailUrl ?? item.thumbnail_url ?? null
  const detailImageUrl =
    item.detailImageUrl ?? item.detail_image_url ?? thumbnailUrl
  const aiSummary = item.aiSummary ?? item.ai_summary

  return {
    id: item.id,
    sourceKey,
    name: item.name,
    description: item.description ?? "",
    category: item.category,
    difficulty: item.difficulty ?? "",
    time_min: item.timeMin ?? item.time_min ?? 0,
    servings: item.servings ?? 1,
    tags: item.tags ?? [],
    thumbnail_url: thumbnailUrl,
    detail_image_url: detailImageUrl,
    ingredients: item.ingredients ?? [],
    steps: item.steps ?? [],
    nutrition: mapNutrition(item.nutrition),
    ckd_guide: item.ckdGuide ?? item.ckd_guide ?? {},
    ai_summary: mapAiSummary(aiSummary, item.description ?? ""),
    created_at: item.createdAt ?? item.created_at ?? undefined,
  }
}

function mapDetail(item: ApiRecipeDetail): CuratedRecipe {
  const summary = mapSummary(item)
  return {
    ...summary,
    detail_image_url:
      item.detailImageUrl ??
      item.detail_image_url ??
      item.thumbnailUrl ??
      item.thumbnail_url ??
      null,
    ingredients: item.ingredients ?? [],
    steps: item.steps ?? [],
    ckd_guide: item.ckdGuide ?? item.ckd_guide ?? {},
    ai_summary: mapAiSummary(
      item.aiSummary ?? item.ai_summary,
      item.description ?? "",
    ),
    created_at: item.createdAt ?? item.created_at ?? undefined,
  }
}

function buildParams(
  params: RecipeListParams,
): Record<string, string | number> {
  const result: Record<string, string | number> = {
    limit: params.limit ?? 20,
  }
  if (params.cursor) result.cursor = params.cursor
  if (params.search) result.search = params.search
  if (params.categories?.length) result.categories = params.categories.join(",")
  if (params.tags?.length) result.tags = params.tags.join(",")
  return result
}

export const recipeCatalogService = {
  async getRecipes(params: RecipeListParams): Promise<RecipeListPage> {
    const { data } = await api.get("/recipes", { params: buildParams(params) })
    const result = data.result as ApiRecipeListResult
    return {
      items: result.items.map(mapSummary),
      nextCursor: result.nextCursor ?? null,
      hasMore: result.hasMore,
    }
  },

  async getRecipe(id: number): Promise<CuratedRecipe> {
    const { data } = await api.get(`/recipes/${id}`)
    return mapDetail(data.result as ApiRecipeDetail)
  },
}
