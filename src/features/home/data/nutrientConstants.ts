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
  나트륨: 1200,
  칼륨: 1800,
  인: 1200,
  수분: 1000,
}
