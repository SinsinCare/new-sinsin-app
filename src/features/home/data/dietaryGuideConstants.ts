export type NutrientCategory = "나트륨" | "칼륨" | "인"

export interface CautionFood {
  name: string
  category: NutrientCategory
}

// TODO: 실제 AI 분석 결과로 교체
export const MOCK_SUMMARY =
  "인을 건강량보다 많이 섭취했어요.\n인을 과도하게 섭취하면 혈중 인 수치가 올라가면서 뼈가 약해지거나, 가려움증 같은 증상이 나타날 수 있어요. 또한 장기적으로는 혈관 건강에도 부담이 될 수 있으니, 다음 식사부터는 인 함량이 높은 식품을 줄이는 것을 권장해요."

export const MOCK_CAUTION_FOODS: CautionFood[] = [
  { name: "소세지", category: "나트륨" },
  { name: "현미밥", category: "칼륨" },
  { name: "콜라", category: "인" },
  { name: "바나나", category: "칼륨" },
]

export const NUTRIENT_TAG_COLORS: Record<NutrientCategory, string> = {
  나트륨: "$primary",
  칼륨: "$primarySoft",
  인: "$secondary",
}
