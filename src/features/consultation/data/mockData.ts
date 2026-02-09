import type { CategoryMeta, FaqItem, ConsultHistoryItem } from "../types"

export const CATEGORY_LIST: CategoryMeta[] = [
  {
    key: "diet",
    label: "식단 및 영양제",
    icon: "restaurant-outline",
    color: "#4A90D9",
  },
  {
    key: "medicine",
    label: "의약품 및 진료",
    icon: "medical-outline",
    color: "#4CAF50",
  },
  {
    key: "dialysis",
    label: "신부전 및 투석",
    icon: "water-outline",
    color: "#5C7AB5",
  },
  {
    key: "checkup",
    label: "검사 및 진단",
    icon: "clipboard-outline",
    color: "#9C6ADE",
  },
  {
    key: "transplant",
    label: "신장 이식",
    icon: "heart-outline",
    color: "#FF8C42",
  },
  {
    key: "welfare",
    label: "복지 및 지원",
    icon: "people-outline",
    color: "#26A69A",
  },
]

export const MOCK_FAQ_LIST: FaqItem[] = [
  {
    id: "faq-1",
    category: "diet",
    question: "만성신장질환에서 하루 육류 적정 섭취량은?",
  },
  {
    id: "faq-2",
    category: "diet",
    question: "칼륨 수치가 높을 때 과일 섭취 제한은?",
  },
  {
    id: "faq-3",
    category: "diet",
    question: "저인식이에서 유제품 대체 식품은?",
  },
  {
    id: "faq-4",
    category: "dialysis",
    question: "투석 환자의 수분 섭취 기준은?",
  },
  { id: "faq-5", category: "diet", question: "신장 환자에게 좋은 간식은?" },
  { id: "faq-6", category: "diet", question: "나트륨 줄이는 조리법은?" },
  {
    id: "faq-7",
    category: "diet",
    question: "단백질 제한 식단에서 영양 보충 방법은?",
  },
]

const now = new Date()
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

export const MOCK_HISTORY_LIST: ConsultHistoryItem[] = [
  {
    id: "hist-1",
    category: "diet",
    firstQuestion: "하루 육류 적정 섭취량이 궁금합니다",
    timestamp: new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      10,
      45,
    ),
  },
  {
    id: "hist-2",
    category: "dialysis",
    firstQuestion: "커피가 수분 섭취에 미치는 영향은?",
    timestamp: yesterday,
  },
  {
    id: "hist-3",
    category: "checkup",
    firstQuestion: "GFR 수치 해석 방법이 궁금합니다",
    timestamp: twoDaysAgo,
  },
]

/** 카테고리 key로 메타 정보 조회 */
export function getCategoryMeta(key: string): CategoryMeta | undefined {
  return CATEGORY_LIST.find((c) => c.key === key)
}
