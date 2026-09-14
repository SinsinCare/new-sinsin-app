import { RAW_FOOD_DATA, RawFoodRow } from "./generatedFoodData"

/**
 * 식품성분표 한 행(100g 기준). 예전에는 `../types` 에 살았는데, 그 타입을 읽던
 * 신장 점수 사슬(`scoringEngine`·`lowPhosphorusFoods`·`useKidneyRecommendations`)은
 * 어디서도 쓰이지 않아 지웠고(2026-09-09) 남은 소비자는 이 파일 하나다.
 *
 * 이 표의 유일한 독자는 레시피 작성의 **개발용 모의 영양 미리보기**
 * (`recipeWriteService.loadMockIndex`)다 — `__DEV__` 뒤에서 동적으로 읽으므로
 * 릴리스 번들에는 885KB 짜리 `generatedFoodData.ts` 가 실리지 않는다.
 */
export interface FoodNutrients {
  name: string
  energy: number
  water: number
  protein: number
  fat: number
  ash: number
  carbohydrate: number
  sugar: number | null
  fiber: number | null
  calcium: number | null
  iron: number | null
  magnesium: number | null
  phosphorus: number | null
  potassium: number | null
  sodium: number | null
  vitaminD: number | null
  totalAminoAcid: number | null
  essentialAminoAcid: number | null
}

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
