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
  name: string
  description?: string | null
  category: string
  difficulty?: string | null
  timeMin?: number | null
  servings?: number | null
  tags?: string[] | null
  thumbnailUrl?: string | null
  nutrition?: ApiRecipeNutrition | null
}

interface ApiRecipeDetail extends ApiRecipeSummary {
  detailImageUrl?: string | null
  ingredients?: CuratedRecipeIngredient[] | null
  steps?: CuratedRecipeStep[] | null
  ckdGuide?: CuratedRecipeCkdGuide | null
  aiSummary?: {
    headline?: string | null
    riskFlags?: Record<string, string> | null
  } | null
  createdAt?: string | null
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
  aiSummary: ApiRecipeDetail["aiSummary"],
  fallbackHeadline: string,
): CuratedRecipeAiSummary {
  return {
    headline: aiSummary?.headline ?? fallbackHeadline,
    risk_flags: aiSummary?.riskFlags ?? {},
  }
}

function mapSummary(item: ApiRecipeSummary): CuratedRecipe {
  return {
    id: item.id,
    sourceKey: item.sourceKey,
    name: item.name,
    description: item.description ?? "",
    category: item.category,
    difficulty: item.difficulty ?? "",
    time_min: item.timeMin ?? 0,
    servings: item.servings ?? 1,
    tags: item.tags ?? [],
    thumbnail_url: item.thumbnailUrl ?? null,
    detail_image_url: null,
    ingredients: [],
    steps: [],
    nutrition: mapNutrition(item.nutrition),
    ckd_guide: {},
    ai_summary: { headline: item.description ?? "", risk_flags: {} },
  }
}

function mapDetail(item: ApiRecipeDetail): CuratedRecipe {
  const summary = mapSummary(item)
  return {
    ...summary,
    detail_image_url: item.detailImageUrl ?? item.thumbnailUrl ?? null,
    ingredients: item.ingredients ?? [],
    steps: item.steps ?? [],
    ckd_guide: item.ckdGuide ?? {},
    ai_summary: mapAiSummary(item.aiSummary, item.description ?? ""),
    created_at: item.createdAt ?? undefined,
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
