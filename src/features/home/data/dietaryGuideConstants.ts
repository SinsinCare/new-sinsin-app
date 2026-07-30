export type NutrientCategory = "나트륨" | "칼륨" | "인"

export interface CautionFood {
  name: string
}

// TODO: 실제 AI 분석 결과로 교체
export const MOCK_SUMMARY =
  "인 섭취량이 목표보다 많아요.\n인을 많이 먹는 식사가 이어지면 혈중 인 수치가 올라 뼈가 약해지거나 가려움증이 나타날 수 있어요. 장기적으로는 혈관 건강에도 부담이 될 수 있으니, 다음 식사에서는 인이 많은 음식을 줄여 보세요."

export const MOCK_CAUTION_FOODS: CautionFood[] = [
  { name: "소시지" },
  { name: "현미밥" },
  { name: "콜라" },
  { name: "바나나" },
]

export const NUTRIENT_TAG_COLORS: Record<NutrientCategory, string[]> = {
  나트륨: ["#FCEBE1", "#D56E32"],
  칼륨: ["#FFF2D0", "#A77F17"],
  인: ["#FFE9F9", "#C946A6"],
}
