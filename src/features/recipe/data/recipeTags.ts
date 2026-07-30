export const NUTRITION_TAGS = [
  "저염",
  "저단백",
  "저칼륨",
  "저인",
  "고열량",
] as const

export const STAGE_TAGS = [
  "CKD 3기",
  "CKD 4기",
  "CKD 5기",
  "당뇨 동반",
  "고혈압 동반",
] as const

export const CUISINE_TAGS = [
  "한식",
  "중식",
  "일식",
  "양식",
  "샐러드",
  "디저트",
  "음료",
] as const

export type NutritionTag = (typeof NUTRITION_TAGS)[number]
export type StageTag = (typeof STAGE_TAGS)[number]
export type CuisineTag = (typeof CUISINE_TAGS)[number]
