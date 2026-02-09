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
    answer:
      "만성신장질환 환자의 하루 육류 섭취량은 CKD 단계에 따라 다릅니다. 일반적으로 체중 1kg당 0.6~0.8g의 단백질이 권장되며, 이는 60kg 성인 기준 하루 약 36~48g입니다. 육류 100g에 약 20g의 단백질이 포함되어 있으므로, 하루 육류 섭취량은 150~200g 이내로 제한하는 것이 좋습니다. 투석 중인 경우에는 단백질 소모가 크므로 주치의와 상담하여 섭취량을 조절하세요.",
  },
  {
    id: "faq-2",
    category: "diet",
    question: "칼륨 수치가 높을 때 과일 섭취 제한은?",
    answer:
      "고칼륨혈증이 있을 때는 칼륨이 높은 과일(바나나, 멜론, 키위, 오렌지, 건포도)을 피해야 합니다. 비교적 칼륨이 낮은 사과, 배, 포도, 블루베리 등을 소량 섭취하는 것이 좋습니다. 과일 통조림은 시럽에 칼륨이 빠져나가 생과일보다 칼륨이 낮지만, 당분이 높으니 주의하세요. 하루 과일 섭취량은 1회 분량(주먹 크기) 이내로 제한하세요.",
  },
  {
    id: "faq-3",
    category: "diet",
    question: "저인식이에서 유제품 대체 식품은?",
    answer:
      "유제품은 인 함량이 높아 신장질환 환자에게 제한됩니다. 대체 식품으로는 쌀 우유, 아몬드 우유(무첨가 인산염 제품), 코코넛 밀크 등이 있습니다. 치즈 대신 크림치즈를 소량 사용하거나, 두부로 단백질을 보충할 수 있습니다. 가공식품에 포함된 인산염 첨가물(식품 성분표에서 '인산' 확인)은 흡수율이 90% 이상이므로 특히 주의하세요.",
  },
  {
    id: "faq-4",
    category: "dialysis",
    question: "투석 환자의 수분 섭취 기준은?",
    answer:
      "혈액투석 환자의 수분 섭취 기준은 하루 소변량 + 500~700ml입니다. 소변이 거의 나오지 않는 경우 하루 총 수분 섭취를 700~1,000ml로 제한합니다. 수분에는 물뿐만 아니라 국, 죽, 과일, 아이스크림 등에 포함된 수분도 포함됩니다. 투석 간 체중 증가가 건체중의 3~5% 이내가 되도록 관리하세요. 복막투석 환자는 상대적으로 제한이 덜하지만 주치의 지시를 따르세요.",
  },
  {
    id: "faq-5",
    category: "diet",
    question: "신장 환자에게 좋은 간식은?",
    answer:
      "신장 환자에게 적합한 간식으로는 흰 빵 크래커, 무염 팝콘, 사과 슬라이스, 젤리, 하드캔디, 소량의 쌀과자 등이 있습니다. 견과류와 초콜릿은 칼륨과 인이 높으므로 피하세요. 간식 선택 시 나트륨, 칼륨, 인 함량을 확인하고, 하루 총 영양소 제한량 내에서 섭취하는 것이 중요합니다.",
  },
  {
    id: "faq-6",
    category: "diet",
    question: "나트륨 줄이는 조리법은?",
    answer:
      "나트륨을 줄이려면 소금 대신 레몬즙, 식초, 후추, 생강, 마늘 등 천연 양념을 활용하세요. 국과 찌개는 건더기 위주로 먹고, 국물 섭취를 절반 이하로 줄입니다. 식재료를 물에 담가 나트륨을 빼고, 소금은 조리 마지막에 표면에 뿌려 적은 양으로도 짠맛을 느낄 수 있게 합니다. 하루 나트륨 섭취 목표는 2,000mg(소금 5g) 이하입니다.",
  },
  {
    id: "faq-7",
    category: "diet",
    question: "단백질 제한 식단에서 영양 보충 방법은?",
    answer:
      "단백질을 제한하면 열량이 부족해질 수 있으므로, 탄수화물과 건강한 지방으로 칼로리를 보충해야 합니다. 올리브유, 들기름을 요리에 추가하고, 꿀이나 잼으로 열량을 높일 수 있습니다. 저단백 쌀, 저단백 국수 등 특수 식품도 도움이 됩니다. 필요시 신장 전문 영양보충제(케토산 등)를 주치의와 상의하여 복용하세요.",
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
