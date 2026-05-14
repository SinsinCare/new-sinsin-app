export interface CuratedRecipeIngredient {
  name: string
  amount: string
}

export interface CuratedRecipeStep {
  order: number
  content: string
}

export interface CuratedRecipeNutrition {
  kcal: number
  protein_g: number
  sodium_mg: number
  potassium_mg: number
  phosphorus_mg: number
  ckd_friendliness: "low_risk" | "moderate" | "high_risk" | "caution"
  estimated: boolean
  verification_required: boolean
}

export interface CuratedRecipeCkdGuide {
  CKD3?: string
  CKD4?: string
  dialysis?: string
}

export interface CuratedRecipeAiSummary {
  headline: string
  risk_flags: Record<string, string>
}

export interface CuratedRecipe {
  id: string
  category: string
  name: string
  description: string
  difficulty: string
  time_min: number
  servings: number
  tags: string[]
  ingredients: CuratedRecipeIngredient[]
  steps: CuratedRecipeStep[]
  nutrition: CuratedRecipeNutrition
  ckd_guide: CuratedRecipeCkdGuide
  ai_summary: CuratedRecipeAiSummary
  created_at?: string
}

export interface CuratedRecipesData {
  schema_version: string
  generated_at: string
  service: string
  category_counts: Record<string, number>
  total: number
  nutrition_disclaimer: string
  ckd_guide_disclaimer: string
  recipes: CuratedRecipe[]
}
