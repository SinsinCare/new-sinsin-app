export interface NutrientLimit {
  nutrient: string
  max: number
  unit: string
}

export const CKD_NUTRIENT_LIMITS: NutrientLimit[] = [
  { nutrient: "단백질", max: 48, unit: "g" },
  { nutrient: "나트륨", max: 2000, unit: "mg" },
  { nutrient: "칼륨", max: 3000, unit: "mg" },
  { nutrient: "인", max: 1000, unit: "mg" },
  { nutrient: "수분", max: 1500, unit: "ml" },
]

// TODO: 실제 데이터 연결 시 제거
export const MOCK_CURRENT_INTAKE: Record<string, number> = {
  단백질: 32,
  나트륨: 2000, // 제한량과 동일 (at limit)
  칼륨: 4800, // 초과 (limit: 3000)
  인: 0, // 미섭취
  수분: 3000, // 초과 (limit: 1500)
}

export const CIRCLE_SIZE = 12
