import { FoodNutrients } from "../types"
import { RAW_FOOD_DATA, RawFoodRow } from "./generatedFoodData"

function toFoodNutrients(r: RawFoodRow): FoodNutrients {
  return {
    name: r.n,
    energy: r.e,
    water: r.w,
    protein: r.pr,
    fat: r.f,
    ash: r.a,
    carbohydrate: r.ch,
    sugar: r.su,
    fiber: r.fi,
    calcium: r.ca,
    iron: r.ir,
    magnesium: r.mg,
    phosphorus: r.ph,
    potassium: r.k,
    sodium: r.na,
    vitaminD: r.vd,
    totalAminoAcid: r.ta,
    essentialAminoAcid: r.ea,
  }
}

let _cachedData: FoodNutrients[] | null = null

export function getAllFoodData(): FoodNutrients[] {
  if (_cachedData) return _cachedData
  _cachedData = RAW_FOOD_DATA.map(toFoodNutrients)
  return _cachedData
}

export function searchFoods(query: string): FoodNutrients[] {
  if (!query.trim()) return getAllFoodData()
  const lower = query.toLowerCase()
  return getAllFoodData().filter((f) => f.name.toLowerCase().includes(lower))
}
