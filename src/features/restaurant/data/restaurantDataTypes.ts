export type FilterScore = "pass" | "mid" | "fail"

export interface RestaurantMenuNutrition {
  kcal: number
  protein_g: number
  sodium_mg: number
  potassium_mg: number
  phosphorus_mg: number
}

export interface RestaurantMenuFilterScores {
  low_sodium: FilterScore
  low_sugar: FilterScore
  low_protein: FilterScore
  low_potassium: FilterScore
  low_phosphorus: FilterScore
}

export interface RestaurantMenuComposition {
  식재료: string
  분량_g: number
  비고?: string
}

export interface RestaurantMenu {
  id: string
  name: string
  note: string
  estimated_nutrition: RestaurantMenuNutrition
  filter_scores: RestaurantMenuFilterScores
  composition: RestaurantMenuComposition[]
}

export interface RestaurantHours {
  mon?: string
  tue?: string
  wed?: string
  thu?: string
  fri?: string
  sat?: string
  sun?: string
}

export type SafetyTier = "highly_recommended" | "partial" | "limited"

export interface RestaurantDataItem {
  id: string
  name: string
  cuisine: string
  region_si: string
  region_gu: string
  region_dong: string
  address: string
  lat: number
  lng: number
  phone: string
  rating: number
  review_count: number
  price_level: number
  hours: RestaurantHours
  description: string
  features: string[]
  menu_ids: string[]
  menus: RestaurantMenu[]
  safety_tier: SafetyTier
  safe_menu_ratio: number
}

export interface RestaurantFilterDef {
  key: string
  label_ko: string
  threshold_pass_per_meal_mg?: number
  threshold_mid_per_meal_mg?: number
  threshold_pass_per_meal_kcal?: number
  threshold_mid_per_meal_kcal?: number
  threshold_pass_per_meal_g?: number
  threshold_mid_per_meal_g?: number
  rationale: string
}

export interface RestaurantsData {
  version: string
  generated_at: string
  filters: RestaurantFilterDef[]
  data_sources: { name: string; url: string }[]
  disclaimer: string
  restaurants: RestaurantDataItem[]
}
