import type { ChatCategory } from "@/src/types/models"
import type {
  CategoryMeta,
  FaqItem,
  ConsultHistoryItem,
  QuickQuestion,
  FaqCardEntry,
} from "../types"

export const CATEGORY_LIST: CategoryMeta[] = [
  {
    key: "diet",
    label: "음식·식단",
    icon: "fork-knife",
  },
  {
    key: "medicine",
    label: "약·영양제",
    icon: "pill",
  },
  {
    key: "lifestyle",
    label: "생활관리",
    icon: "heart-text",
  },
  {
    key: "symptom",
    label: "증상",
    icon: "cross",
  },
  {
    key: "checkup",
    label: "검사·수치해석",
    icon: "mail",
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
    category: "lifestyle",
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

const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)
const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)

export const MOCK_HISTORY_LIST: ConsultHistoryItem[] = [
  {
    id: "hist-1",
    category: "diet",
    firstQuestion: "하루 육류 적정 섭취량이 궁금합니다",
    firstAnswer:
      "만성신장질환 환자의 하루 육류 섭취량은 CKD 단계에 따라 다릅니다. 일반적으로 체중 1kg당 0.6~0.8g의 단백질이 권장됩니다.",
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
    category: "lifestyle",
    firstQuestion: "커피가 수분 섭취에 미치는 영향은?",
    firstAnswer:
      "커피는 이뇨 작용이 있지만 혈액투석 환자의 수분 섭취량에 포함됩니다. 하루 1~2잔 이내로 제한하세요.",
    timestamp: yesterday,
  },
  {
    id: "hist-3",
    category: "checkup",
    firstQuestion: "GFR 수치 해석 방법이 궁금합니다",
    firstAnswer:
      "GFR(사구체여과율)은 신장 기능을 나타내는 핵심 지표입니다. 정상은 90 이상이며, 60 미만이면 만성신장질환으로 분류됩니다.",
    timestamp: twoDaysAgo,
  },
  {
    id: "hist-4",
    category: "diet",
    firstQuestion: "칼륨 수치가 높을 때 과일 섭취 제한은?",
    firstAnswer:
      "고칼륨혈증 시 바나나, 멜론, 키위 등을 피하고, 사과, 배, 블루베리 등 저칼륨 과일을 소량 섭취하세요.",
    timestamp: threeDaysAgo,
  },
  {
    id: "hist-5",
    category: "medicine",
    firstQuestion: "혈압약 복용 시간과 식사의 관계는?",
    firstAnswer:
      "혈압약은 매일 같은 시간에 복용하는 것이 중요합니다. 일부 약물은 공복 시 흡수율이 높으므로 주치의 지시를 따르세요.",
    timestamp: fourDaysAgo,
  },
  {
    id: "hist-6",
    category: "lifestyle",
    firstQuestion: "투석 후 피로감을 줄이는 방법은?",
    firstAnswer:
      "투석 후 피로감은 흔한 증상입니다. 충분한 수면, 가벼운 산책, 투석 중 혈압 관리가 도움이 됩니다.",
    timestamp: fiveDaysAgo,
  },
  {
    id: "hist-7",
    category: "diet",
    firstQuestion: "저인식이에서 유제품 대체 식품은?",
    firstAnswer:
      "유제품 대신 쌀 우유, 아몬드 우유, 코코넛 밀크 등을 활용하세요. 가공식품의 인산염 첨가물은 특히 주의가 필요합니다.",
    timestamp: sixDaysAgo,
  },
]

export const QUICK_QUESTIONS: Record<ChatCategory, QuickQuestion[]> = {
  diet: [
    { id: "qd-1", category: "diet", text: "오늘 뭐 먹으면 좋을까요?" },
    { id: "qd-2", category: "diet", text: "칼륨 낮은 과일 추천해주세요" },
    { id: "qd-3", category: "diet", text: "하루 단백질 섭취량은?" },
  ],
  medicine: [
    { id: "qm-1", category: "medicine", text: "혈압약 복용 시간이 궁금해요" },
    { id: "qm-2", category: "medicine", text: "약 부작용이 걱정돼요" },
    { id: "qm-3", category: "medicine", text: "영양제 같이 먹어도 되나요?" },
  ],
  lifestyle: [
    { id: "qdl-1", category: "lifestyle", text: "투석 후 피로감 줄이는 법" },
    { id: "qdl-2", category: "lifestyle", text: "수분 섭취 기준이 궁금해요" },
    { id: "qdl-3", category: "lifestyle", text: "투석 중 식사는 어떻게?" },
  ],
  checkup: [
    { id: "qc-1", category: "checkup", text: "GFR 수치 해석 방법" },
    { id: "qc-2", category: "checkup", text: "혈액검사 항목이 궁금해요" },
    { id: "qc-3", category: "checkup", text: "다음 검사 준비사항은?" },
  ],
  symptom: [
    { id: "qt-1", category: "symptom", text: "이식 후 식단 관리법" },
    { id: "qt-2", category: "symptom", text: "면역억제제 복용 주의사항" },
    { id: "qt-3", category: "symptom", text: "이식 대기 중 관리법" },
  ],
}

export const FREQUENTLY_ASKED_QUESTIONS: FaqCardEntry[] = [
  {
    id: "faq-1",
    category: "diet",
    title: "고기 섭취",
    description: "고기(수육, 오리 등)을 먹어도 되나요?",
  },
  {
    id: "faq-2",
    category: "diet",
    title: "과일 섭취량",
    description: "과일(방울토마토, 사과, 수박 등)은 몇 개까지 되나요?",
  },
  {
    id: "faq-3",
    category: "diet",
    title: "채소 칼륨 제거",
    description: "칼륨을 줄이려면 물에 채소를 얼마나 담궈뒀야 하나요?",
  },
  {
    id: "faq-4",
    category: "diet",
    title: "보리차/허브티",
    description: "맹물 대신 보리차나 허브티를 마셔도 되나요?",
  },
  {
    id: "faq-5",
    category: "medicine",
    title: "영양제 복용",
    description: "오메가3, 마그네슘, 비타민 D 먹어도 되나요?",
  },
  {
    id: "faq-6",
    category: "medicine",
    title: "진통제 선택",
    description: "두통약으로 타이레놀 말고 다른 건 안 되나요?",
  },
  {
    id: "faq-7",
    category: "checkup",
    title: "수치 해석",
    description: "크레아티닌은 높은데 시스타틴C는 정상인 경우 어떤 뜻인가요?",
  },
  {
    id: "faq-8",
    category: "medicine",
    title: "타과 진료/수술",
    description: "치과나 정형외과 처방약을 신장내과 확인 없이 먹어도 되나요?",
  },
  {
    id: "faq-9",
    category: "symptom",
    title: "요독 증상",
    description: "입에서 암모니아 냄새가 나고 미식거리는데 투석 신호인가요?",
  },
  {
    id: "faq-10",
    category: "symptom",
    title: "동정맥루 수술",
    description: "자가혈관과 인조혈관 중 뭐가 좋고 관리는 어떻게 하나요?",
  },
  {
    id: "faq-11",
    category: "diet",
    title: "단백뇨와 계란",
    description: "단백뇨가 있는데 계란 노른자와 흰자 중 뭐가 낫나요?",
  },
  {
    id: "faq-12",
    category: "diet",
    title: "외식 메뉴",
    description: "신장 환자에게 좋은 외식 메뉴(샤브샤브, 비빔밥 등) 알려주세요",
  },
]

/** 카테고리 key로 메타 정보 조회 */
export function getCategoryMeta(key: string): CategoryMeta | undefined {
  return CATEGORY_LIST.find((c) => c.key === key)
}
