import { api } from "../core/apiClient"
import type {
  MealRecommendationResponse,
  MealType,
  RecommendationCategory,
} from "@/src/features/meal-recommendation/types"

function mapResponse(raw: any): MealRecommendationResponse {
  return {
    mealType: raw.meal_type,
    nutrientBudget: {
      sodiumMg: raw.nutrient_budget.sodium_mg,
      potassiumMg: raw.nutrient_budget.potassium_mg,
      phosphorusMg: raw.nutrient_budget.phosphorus_mg,
      proteinG: raw.nutrient_budget.protein_g,
    },
    recipes: (raw.recipes ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      kidneyScore: r.kidney_score,
      nutrients: r.nutrients,
      tags: r.tags,
      reason: r.reason,
      imageUrl: r.image_url,
    })),
    restaurantMenus: (raw.restaurant_menus ?? []).map((m: any) => ({
      restaurantId: m.restaurant_id,
      restaurantName: m.restaurant_name,
      menuId: m.menu_id,
      menuName: m.menu_name,
      riskLevel: m.risk_level,
      nutrients: m.nutrients,
      tags: m.tags,
      reason: m.reason,
    })),
    aiSummary: raw.ai_summary,
    generatedAt: raw.generated_at,
  }
}

export const mealRecommendationService = {
  async getRecommendations(
    mealType?: MealType,
    category: RecommendationCategory = "all",
  ): Promise<MealRecommendationResponse> {
    const params: Record<string, string> = { category }
    if (mealType) params.mealType = mealType
    const { data } = await api.get("/meal-recommendations", { params })
    return mapResponse(data.result)
  },

  async refreshRecommendations(
    mealType?: MealType,
    category: RecommendationCategory = "all",
  ): Promise<MealRecommendationResponse> {
    const params: Record<string, string> = { category }
    if (mealType) params.mealType = mealType
    const { data } = await api.post("/meal-recommendations/refresh", null, {
      params,
    })
    return mapResponse(data.result)
  },

  async dismissRecommendation(
    itemType: "RECIPE" | "RESTAURANT_MENU",
    itemId: number,
  ): Promise<void> {
    await api.post(`/meal-recommendations/${itemType}/${itemId}/dismiss`)
  },

  async toggleBookmark(
    itemType: "RECIPE" | "RESTAURANT_MENU",
    itemId: number,
  ): Promise<{ bookmarked: boolean }> {
    const { data } = await api.post(
      `/meal-recommendations/${itemType}/${itemId}/bookmark`,
    )
    return data.result
  },
}
