import { FoodNutrients, KidneyRecommendedFood } from "../types"
import { getAllFoodData } from "./foodNutritionData"

interface MinMax {
  min: number
  max: number
}

interface NutrientRanges {
  phosphorus: MinMax
  potassium: MinMax
  sodium: MinMax
  protein: MinMax
  water: MinMax
  magnesium: MinMax
  calcium: MinMax
  vitaminD: MinMax
}

const WEIGHTS = {
  phosphorus: 1.0,
  potassium: 1.0,
  sodium: 1.0,
  protein: 0.8,
  water: 0.6,
  magnesium: 0.35,
  calcium: 0.25,
  vitaminD: 0.2,
} as const

const TOTAL_WEIGHT = 5.2

// Penalty nutrients: lower is better → score = 1 - normalized
// Benefit nutrients: higher is better → score = normalized

function computeMinMax(
  foods: FoodNutrients[],
  getter: (f: FoodNutrients) => number | null,
): MinMax {
  let min = Infinity
  let max = -Infinity
  for (const f of foods) {
    const v = getter(f)
    if (v == null) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (min === Infinity) return { min: 0, max: 1 }
  return { min, max }
}

function normalize(value: number | null, range: MinMax): number {
  if (value == null) return 0.5 // neutral for missing
  const span = range.max - range.min
  if (span === 0) return 0.5
  return (value - range.min) / span
}

let _cachedRanges: NutrientRanges | null = null

function getRanges(): NutrientRanges {
  if (_cachedRanges) return _cachedRanges
  const foods = getAllFoodData()
  _cachedRanges = {
    phosphorus: computeMinMax(foods, (f) => f.phosphorus),
    potassium: computeMinMax(foods, (f) => f.potassium),
    sodium: computeMinMax(foods, (f) => f.sodium),
    protein: computeMinMax(foods, (f) => f.protein),
    water: computeMinMax(foods, (f) => f.water),
    magnesium: computeMinMax(foods, (f) => f.magnesium),
    calcium: computeMinMax(foods, (f) => f.calcium),
    vitaminD: computeMinMax(foods, (f) => f.vitaminD),
  }
  return _cachedRanges
}

function generateTags(food: FoodNutrients, ranges: NutrientRanges): string[] {
  const tags: string[] = []
  const threshold = 0.25

  const pNorm = normalize(food.phosphorus, ranges.phosphorus)
  if (pNorm < threshold) tags.push("저인")

  const kNorm = normalize(food.potassium, ranges.potassium)
  if (kNorm < threshold) tags.push("저칼륨")

  const naNorm = normalize(food.sodium, ranges.sodium)
  if (naNorm < threshold) tags.push("저나트륨")

  const prNorm = normalize(food.protein, ranges.protein)
  if (prNorm < threshold) tags.push("저단백")

  const wNorm = normalize(food.water, ranges.water)
  if (wNorm > 0.75) tags.push("고수분")

  return tags
}

export function scoreFood(food: FoodNutrients): KidneyRecommendedFood {
  const ranges = getRanges()

  const pNorm = normalize(food.phosphorus, ranges.phosphorus)
  const kNorm = normalize(food.potassium, ranges.potassium)
  const naNorm = normalize(food.sodium, ranges.sodium)
  const prNorm = normalize(food.protein, ranges.protein)
  const wNorm = normalize(food.water, ranges.water)
  const mgNorm = normalize(food.magnesium, ranges.magnesium)
  const caNorm = normalize(food.calcium, ranges.calcium)
  const vdNorm = normalize(food.vitaminD, ranges.vitaminD)

  const rawScore =
    (WEIGHTS.phosphorus * (1 - pNorm) +
      WEIGHTS.potassium * (1 - kNorm) +
      WEIGHTS.sodium * (1 - naNorm) +
      WEIGHTS.protein * (1 - prNorm) +
      WEIGHTS.water * wNorm +
      WEIGHTS.magnesium * mgNorm +
      WEIGHTS.calcium * caNorm +
      WEIGHTS.vitaminD * vdNorm) /
    TOTAL_WEIGHT

  const score = Math.round(rawScore * 100)

  return {
    food,
    score: Math.max(0, Math.min(100, score)),
    penaltyBreakdown: {
      phosphorus: pNorm,
      potassium: kNorm,
      sodium: naNorm,
      protein: prNorm,
    },
    benefitBreakdown: {
      water: wNorm,
      magnesium: mgNorm,
      calcium: caNorm,
      vitaminD: vdNorm,
    },
    tags: generateTags(food, ranges),
  }
}

let _cachedScored: KidneyRecommendedFood[] | null = null

export function getAllScoredFoods(): KidneyRecommendedFood[] {
  if (_cachedScored) return _cachedScored
  const foods = getAllFoodData()
  _cachedScored = foods.map(scoreFood).sort((a, b) => b.score - a.score)
  return _cachedScored
}
