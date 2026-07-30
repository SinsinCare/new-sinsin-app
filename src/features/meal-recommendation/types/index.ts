export interface NutrientBudget {
  sodiumMg: number
  potassiumMg: number
  phosphorusMg: number
  proteinG: number | null
}

export interface RecipeNutrients {
  calories: number
  protein: number
  sodium: number
  potassium: number
  phosphorus: number
}

export interface RecommendedRecipe {
  id: number
  name: string
  category: string
  nutrients: RecipeNutrients
  tags: string[]
  reason: string
  imageUrl: string | null
}

export interface RecommendedRestaurantMenu {
  restaurantId: number
  restaurantName: string
  menuId: number
  menuName: string
  nutrients: RecipeNutrients
  tags: string[]
  reason: string
}

export interface MealRecommendationResponse {
  mealType: "LUNCH" | "DINNER"
  nutrientBudget: NutrientBudget
  recipes: RecommendedRecipe[]
  restaurantMenus: RecommendedRestaurantMenu[]
  aiSummary: string
  generatedAt: string
}

export type MealType = "LUNCH" | "DINNER"
export type RecommendationCategory = "recipe" | "restaurant" | "all"
