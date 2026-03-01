import type { ChatCategory, Chat } from "@/src/types/chat"
import type {
  CategoryMeta,
  FaqItem,
  QuickQuestion,
  FaqCardEntry,
} from "../types"

export const CATEGORY_LIST: CategoryMeta[] = [
  {
    key: "FOOD_DIET",
    label: "음식·식단",
    icon: "fork-knife",
  },
  {
    key: "MEDICATION",
    label: "약·영양제",
    icon: "pill",
  },
  {
    key: "LIFESTYLE",
    label: "생활관리",
    icon: "heart-text",
  },
  {
    key: "SYMPTOMS",
    label: "증상",
    icon: "cross",
  },
  {
    key: "EXAM",
    label: "검사·수치해석",
    icon: "mail",
  },
  {
    key: "NONE",
    label: "기타",
    icon: "chat",
  },
]

export const MOCK_FAQ_LIST: FaqItem[] = [
  {
    id: "faq-1",
    category: "FOOD_DIET",
    question: "만성신장질환에서 하루 육류 적정 섭취량은?",
    answer:
      "만성신장질환 환자의 하루 육류 섭취량은 CKD 단계에 따라 다릅니다. 일반적으로 체중 1kg당 0.6~0.8g의 단백질이 권장되며, 이는 60kg 성인 기준 하루 약 36~48g입니다. 육류 100g에 약 20g의 단백질이 포함되어 있으므로, 하루 육류 섭취량은 150~200g 이내로 제한하는 것이 좋습니다. 투석 중인 경우에는 단백질 소모가 크므로 주치의와 상담하여 섭취량을 조절하세요.",
  },
  {
    id: "faq-2",
    category: "FOOD_DIET",
    question: "칼륨 수치가 높을 때 과일 섭취 제한은?",
    answer:
      "고칼륨혈증이 있을 때는 칼륨이 높은 과일(바나나, 멜론, 키위, 오렌지, 건포도)을 피해야 합니다. 비교적 칼륨이 낮은 사과, 배, 포도, 블루베리 등을 소량 섭취하는 것이 좋습니다. 과일 통조림은 시럽에 칼륨이 빠져나가 생과일보다 칼륨이 낮지만, 당분이 높으니 주의하세요. 하루 과일 섭취량은 1회 분량(주먹 크기) 이내로 제한하세요.",
  },
  {
    id: "faq-3",
    category: "FOOD_DIET",
    question: "저인식이에서 유제품 대체 식품은?",
    answer:
      "유제품은 인 함량이 높아 신장질환 환자에게 제한됩니다. 대체 식품으로는 쌀 우유, 아몬드 우유(무첨가 인산염 제품), 코코넛 밀크 등이 있습니다. 치즈 대신 크림치즈를 소량 사용하거나, 두부로 단백질을 보충할 수 있습니다. 가공식품에 포함된 인산염 첨가물(식품 성분표에서 '인산' 확인)은 흡수율이 90% 이상이므로 특히 주의하세요.",
  },
  {
    id: "faq-4",
    category: "LIFESTYLE",
    question: "투석 환자의 수분 섭취 기준은?",
    answer:
      "혈액투석 환자의 수분 섭취 기준은 하루 소변량 + 500~700ml입니다. 소변이 거의 나오지 않는 경우 하루 총 수분 섭취를 700~1,000ml로 제한합니다. 수분에는 물뿐만 아니라 국, 죽, 과일, 아이스크림 등에 포함된 수분도 포함됩니다. 투석 간 체중 증가가 건체중의 3~5% 이내가 되도록 관리하세요. 복막투석 환자는 상대적으로 제한이 덜하지만 주치의 지시를 따르세요.",
  },
  {
    id: "faq-5",
    category: "FOOD_DIET",
    question: "신장 환자에게 좋은 간식은?",
    answer:
      "신장 환자에게 적합한 간식으로는 흰 빵 크래커, 무염 팝콘, 사과 슬라이스, 젤리, 하드캔디, 소량의 쌀과자 등이 있습니다. 견과류와 초콜릿은 칼륨과 인이 높으므로 피하세요. 간식 선택 시 나트륨, 칼륨, 인 함량을 확인하고, 하루 총 영양소 제한량 내에서 섭취하는 것이 중요합니다.",
  },
  {
    id: "faq-6",
    category: "FOOD_DIET",
    question: "나트륨 줄이는 조리법은?",
    answer:
      "나트륨을 줄이려면 소금 대신 레몬즙, 식초, 후추, 생강, 마늘 등 천연 양념을 활용하세요. 국과 찌개는 건더기 위주로 먹고, 국물 섭취를 절반 이하로 줄입니다. 식재료를 물에 담가 나트륨을 빼고, 소금은 조리 마지막에 표면에 뿌려 적은 양으로도 짠맛을 느낄 수 있게 합니다. 하루 나트륨 섭취 목표는 2,000mg(소금 5g) 이하입니다.",
  },
  {
    id: "faq-7",
    category: "FOOD_DIET",
    question: "단백질 제한 식단에서 영양 보충 방법은?",
    answer:
      "단백질을 제한하면 열량이 부족해질 수 있으므로, 탄수화물과 건강한 지방으로 칼로리를 보충해야 합니다. 올리브유, 들기름을 요리에 추가하고, 꿀이나 잼으로 열량을 높일 수 있습니다. 저단백 쌀, 저단백 국수 등 특수 식품도 도움이 됩니다. 필요시 신장 전문 영양보충제(케토산 등)를 주치의와 상의하여 복용하세요.",
  },
]

const now = new Date()
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)
const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)

export const MOCK_HISTORY_LIST: Chat[] = [
  {
    id: 1,
    title: "하루 육류 적정 섭취량이 궁금합니다",
    summary:
      "만성신장질환 환자의 하루 육류 섭취량은 CKD 단계에 따라 다릅니다. 일반적으로 체중 1kg당 0.6~0.8g의 단백질이 권장됩니다.",
    status: "ACTIVE",
    category: "FOOD_DIET",
    messageCount: 2,
    createdAt: new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      10,
      45,
    ),
    updatedAt: new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      10,
      45,
    ),
  },
  {
    id: 2,
    title: "커피가 수분 섭취에 미치는 영향은?",
    summary:
      "커피는 이뇨 작용이 있지만 혈액투석 환자의 수분 섭취량에 포함됩니다. 하루 1~2잔 이내로 제한하세요.",
    status: "ACTIVE",
    category: "LIFESTYLE",
    messageCount: 2,
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    id: 3,
    title: "GFR 수치 해석 방법이 궁금합니다",
    summary:
      "GFR(사구체여과율)은 신장 기능을 나타내는 핵심 지표입니다. 정상은 90 이상이며, 60 미만이면 만성신장질환으로 분류됩니다.",
    status: "ACTIVE",
    category: "EXAM",
    messageCount: 2,
    createdAt: twoDaysAgo,
    updatedAt: twoDaysAgo,
  },
  {
    id: 4,
    title: "칼륨 수치가 높을 때 과일 섭취 제한은?",
    summary:
      "고칼륨혈증 시 바나나, 멜론, 키위 등을 피하고, 사과, 배, 블루베리 등 저칼륨 과일을 소량 섭취하세요.",
    status: "ACTIVE",
    category: "FOOD_DIET",
    messageCount: 2,
    createdAt: threeDaysAgo,
    updatedAt: threeDaysAgo,
  },
  {
    id: 5,
    title: "혈압약 복용 시간과 식사의 관계는?",
    summary:
      "혈압약은 매일 같은 시간에 복용하는 것이 중요합니다. 일부 약물은 공복 시 흡수율이 높으므로 주치의 지시를 따르세요.",
    status: "ACTIVE",
    category: "MEDICATION",
    messageCount: 2,
    createdAt: fourDaysAgo,
    updatedAt: fourDaysAgo,
  },
  {
    id: 6,
    title: "투석 후 피로감을 줄이는 방법은?",
    summary:
      "투석 후 피로감은 흔한 증상입니다. 충분한 수면, 가벼운 산책, 투석 중 혈압 관리가 도움이 됩니다.",
    status: "ACTIVE",
    category: "LIFESTYLE",
    messageCount: 2,
    createdAt: fiveDaysAgo,
    updatedAt: fiveDaysAgo,
  },
  {
    id: 7,
    title: "저인식이에서 유제품 대체 식품은?",
    summary:
      "유제품 대신 쌀 우유, 아몬드 우유, 코코넛 밀크 등을 활용하세요. 가공식품의 인산염 첨가물은 특히 주의가 필요합니다.",
    status: "ACTIVE",
    category: "FOOD_DIET",
    messageCount: 2,
    createdAt: sixDaysAgo,
    updatedAt: sixDaysAgo,
  },
]

export const QUICK_QUESTIONS: Record<ChatCategory, QuickQuestion[]> = {
  FOOD_DIET: [
    { id: "qd-1", category: "FOOD_DIET", text: "오늘 뭐 먹으면 좋을까요?" },
    { id: "qd-2", category: "FOOD_DIET", text: "칼륨 낮은 과일 추천해주세요" },
    { id: "qd-3", category: "FOOD_DIET", text: "하루 단백질 섭취량은?" },
  ],
  MEDICATION: [
    {
      id: "qm-1",
      category: "MEDICATION",
      text: "혈압약 복용 시간이 궁금해요",
    },
    { id: "qm-2", category: "MEDICATION", text: "약 부작용이 걱정돼요" },
    { id: "qm-3", category: "MEDICATION", text: "영양제 같이 먹어도 되나요?" },
  ],
  LIFESTYLE: [
    { id: "qdl-1", category: "LIFESTYLE", text: "투석 후 피로감 줄이는 법" },
    { id: "qdl-2", category: "LIFESTYLE", text: "수분 섭취 기준이 궁금해요" },
    { id: "qdl-3", category: "LIFESTYLE", text: "투석 중 식사는 어떻게?" },
  ],
  EXAM: [
    { id: "qc-1", category: "EXAM", text: "GFR 수치 해석 방법" },
    { id: "qc-2", category: "EXAM", text: "혈액검사 항목이 궁금해요" },
    { id: "qc-3", category: "EXAM", text: "다음 검사 준비사항은?" },
  ],
  SYMPTOMS: [
    { id: "qt-1", category: "SYMPTOMS", text: "이식 후 식단 관리법" },
    { id: "qt-2", category: "SYMPTOMS", text: "면역억제제 복용 주의사항" },
    { id: "qt-3", category: "SYMPTOMS", text: "이식 대기 중 관리법" },
  ],
  NONE: [
    { id: "qo-1", category: "NONE", text: "신장 건강 관련 일반 질문" },
    { id: "qo-2", category: "NONE", text: "기타 궁금한 사항" },
    { id: "qo-3", category: "NONE", text: "생활 속 건강 팁" },
  ],
}

export const FREQUENTLY_ASKED_QUESTIONS: FaqCardEntry[] = [
  {
    id: "faq-1",
    category: "FOOD_DIET",
    title: "고기 섭취",
    description: "고기(수육, 오리 등)을 먹어도 되나요?",
  },
  {
    id: "faq-2",
    category: "FOOD_DIET",
    title: "과일 섭취량",
    description: "과일(방울토마토, 사과, 수박 등)은 몇 개까지 되나요?",
  },
  {
    id: "faq-3",
    category: "FOOD_DIET",
    title: "채소 칼륨 제거",
    description: "칼륨을 줄이려면 물에 채소를 얼마나 담궈뒀야 하나요?",
  },
  {
    id: "faq-4",
    category: "FOOD_DIET",
    title: "보리차/허브티",
    description: "맹물 대신 보리차나 허브티를 마셔도 되나요?",
  },
  {
    id: "faq-5",
    category: "MEDICATION",
    title: "영양제 복용",
    description: "오메가3, 마그네슘, 비타민 D 먹어도 되나요?",
  },
  {
    id: "faq-6",
    category: "MEDICATION",
    title: "진통제 선택",
    description: "두통약으로 타이레놀 말고 다른 건 안 되나요?",
  },
  {
    id: "faq-7",
    category: "EXAM",
    title: "수치 해석",
    description: "크레아티닌은 높은데 시스타틴C는 정상인 경우 어떤 뜻인가요?",
  },
  {
    id: "faq-8",
    category: "MEDICATION",
    title: "타과 진료/수술",
    description: "치과나 정형외과 처방약을 신장내과 확인 없이 먹어도 되나요?",
  },
  {
    id: "faq-9",
    category: "SYMPTOMS",
    title: "요독 증상",
    description: "입에서 암모니아 냄새가 나고 미식거리는데 투석 신호인가요?",
  },
  {
    id: "faq-10",
    category: "SYMPTOMS",
    title: "동정맥루 수술",
    description: "자가혈관과 인조혈관 중 뭐가 좋고 관리는 어떻게 하나요?",
  },
  {
    id: "faq-11",
    category: "FOOD_DIET",
    title: "단백뇨와 계란",
    description: "단백뇨가 있는데 계란 노른자와 흰자 중 뭐가 낫나요?",
  },
  {
    id: "faq-12",
    category: "FOOD_DIET",
    title: "외식 메뉴",
    description: "신장 환자에게 좋은 외식 메뉴(샤브샤브, 비빔밥 등) 알려주세요",
  },
]

/** 카테고리 key로 메타 정보 조회 */
export function getCategoryMeta(key: string): CategoryMeta | undefined {
  return CATEGORY_LIST.find((c) => c.key === key)
}
