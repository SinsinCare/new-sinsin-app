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
    label: "검사·수치 해석",
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
    question: "만성신장질환이 있으면 고기를 하루에 얼마나 먹어야 하나요?",
    answer:
      "하루에 먹을 고기 양은 신장 단계와 체중, 투석 여부, 다른 식사에서 먹는 단백질 양에 따라 달라요. 체중만으로 고기 양을 정하기는 어려워요. 담당 의료진이나 영양사가 정한 하루 단백질 목표에 맞춰 조절하세요.",
  },
  {
    id: "faq-2",
    category: "FOOD_DIET",
    question: "칼륨 수치가 높으면 과일을 얼마나 먹어야 하나요?",
    answer:
      "먹을 수 있는 과일과 양은 현재 칼륨 수치와 치료 계획에 따라 달라요. 바나나, 멜론, 키위, 오렌지, 건과일은 칼륨이 높은 편이고 사과, 배, 포도, 블루베리는 비교적 낮은 편이에요. 최근 검사 결과를 확인한 의료진이나 영양사에게 내 하루 분량을 물어보세요.",
  },
  {
    id: "faq-3",
    category: "FOOD_DIET",
    question: "인을 줄일 때 유제품 대신 무엇을 먹을 수 있나요?",
    answer:
      "유제품과 대체 음료는 제품마다 인과 칼륨 함량이 달라요. 쌀 음료나 아몬드 음료를 고를 때도 영양정보와 원재료명에서 인산염 첨가물을 확인하세요. 내 식단에 맞는 대체 식품은 담당 의료진이나 영양사와 정하는 게 좋아요.",
  },
  {
    id: "faq-4",
    category: "LIFESTYLE",
    question: "투석 중에는 물을 얼마나 마셔야 하나요?",
    answer:
      "투석 중 수분 목표는 소변량과 투석 방식, 부종, 혈압에 따라 달라요. 물뿐 아니라 국, 죽, 과일, 얼음, 아이스크림에 든 수분도 함께 계산해요. 투석실에서 정한 하루 목표와 투석 사이 체중 관리 기준을 따라 주세요.",
  },
  {
    id: "faq-5",
    category: "FOOD_DIET",
    question: "콩팥 건강을 생각하면 어떤 간식이 좋나요?",
    answer:
      "간식은 제품과 양에 따라 나트륨, 칼륨, 인 함량이 달라요. 영양정보를 확인하고 내 하루 기준 안에서 양을 정하세요. 칼륨이나 인을 따로 조절하고 있다면 견과류와 초콜릿도 담당 의료진이나 영양사에게 적정량을 확인해 주세요.",
  },
  {
    id: "faq-6",
    category: "FOOD_DIET",
    question: "요리할 때 나트륨을 어떻게 줄이나요?",
    answer:
      "소금 대신 레몬즙, 식초, 후추, 생강, 마늘 같은 양념을 써 보세요. 국과 찌개는 건더기 위주로 먹고 국물을 남기면 나트륨을 줄이기 쉬워요. 내 하루 나트륨 목표는 검사 결과와 건강 상태에 따라 달라지므로 담당 의료진의 안내를 확인하세요.",
  },
  {
    id: "faq-7",
    category: "FOOD_DIET",
    question: "단백질을 줄이면서 열량은 어떻게 채우나요?",
    answer:
      "단백질과 열량 목표는 신장 단계, 투석 여부, 체중 변화에 따라 달라요. 단백질을 임의로 크게 줄이거나 보충제를 시작하지 말고, 최근 식사 기록을 의료진이나 영양사에게 보여 주며 내 목표와 식품 구성을 정하세요.",
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
    title: "고기는 하루에 얼마나 먹어야 하나요?",
    summary:
      "하루에 먹을 고기 양은 신장 단계와 체중, 투석 여부에 따라 달라요. 담당 의료진이 정한 단백질 목표를 먼저 확인하세요.",
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
      "투석 중에는 커피도 하루 수분량에 포함해요. 마실 수 있는 양은 투석실에서 정한 수분 목표를 확인하세요.",
    status: "ACTIVE",
    category: "LIFESTYLE",
    messageCount: 2,
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    id: 3,
    title: "GFR 수치는 어떻게 보나요?",
    summary:
      "GFR(사구체여과율)은 신장 기능을 보는 지표 중 하나예요. 한 번의 수치만으로 만성신장질환을 판단하지 않고 검사 기간과 다른 결과를 함께 봐요.",
    status: "ACTIVE",
    category: "EXAM",
    messageCount: 2,
    createdAt: twoDaysAgo,
    updatedAt: twoDaysAgo,
  },
  {
    id: 4,
    title: "칼륨 수치가 높으면 과일을 얼마나 먹나요?",
    summary:
      "과일 종류와 양은 최근 칼륨 수치에 따라 달라요. 검사 결과를 확인한 의료진이나 영양사에게 내 하루 분량을 물어보세요.",
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
      "복용 시간과 식사 조건은 약마다 달라요. 처방전과 약 봉투의 안내를 확인하고, 바꾸기 전에는 처방한 의료진이나 약사에게 물어보세요.",
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
      "투석 뒤 피로가 언제부터 얼마나 이어지는지 기록해 투석실에 알려 주세요. 평소와 다르게 심하거나 숨참, 흉통, 의식 저하가 함께 있으면 즉시 의료기관에 연락하세요.",
    status: "ACTIVE",
    category: "LIFESTYLE",
    messageCount: 2,
    createdAt: fiveDaysAgo,
    updatedAt: fiveDaysAgo,
  },
  {
    id: 7,
    title: "인을 줄일 때 유제품 대신 무엇을 먹을까요?",
    summary:
      "대체 음료도 제품마다 인과 칼륨 함량이 달라요. 영양정보와 원재료명을 확인하고, 개인 식단에 맞는 제품과 양은 의료진이나 영양사에게 물어보세요.",
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
    {
      id: "qd-2",
      category: "FOOD_DIET",
      text: "칼륨이 낮은 과일을 추천해 주세요",
    },
    {
      id: "qd-3",
      category: "FOOD_DIET",
      text: "단백질을 하루에 얼마나 먹나요?",
    },
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
    { id: "qdl-1", category: "LIFESTYLE", text: "투석 후 피로를 줄이는 방법" },
    { id: "qdl-2", category: "LIFESTYLE", text: "수분 섭취 기준이 궁금해요" },
    {
      id: "qdl-3",
      category: "LIFESTYLE",
      text: "투석 중에는 어떻게 먹어야 하나요?",
    },
  ],
  EXAM: [
    { id: "qc-1", category: "EXAM", text: "GFR 수치를 어떻게 보나요?" },
    { id: "qc-2", category: "EXAM", text: "혈액검사 항목이 궁금해요" },
    { id: "qc-3", category: "EXAM", text: "다음 검사는 어떻게 준비하나요?" },
  ],
  SYMPTOMS: [
    {
      id: "qt-1",
      category: "SYMPTOMS",
      text: "이식 후에는 어떻게 먹어야 하나요?",
    },
    {
      id: "qt-2",
      category: "SYMPTOMS",
      text: "면역억제제를 먹을 때 주의할 점",
    },
    { id: "qt-3", category: "SYMPTOMS", text: "이식을 기다리며 관리하는 방법" },
  ],
  NONE: [
    { id: "qo-1", category: "NONE", text: "콩팥 건강이 궁금해요" },
    { id: "qo-2", category: "NONE", text: "그 밖에 궁금한 점" },
    { id: "qo-3", category: "NONE", text: "생활 속 콩팥 관리" },
  ],
}

export const FREQUENTLY_ASKED_QUESTIONS: FaqCardEntry[] = [
  {
    id: "faq-1",
    category: "FOOD_DIET",
    title: "고기 섭취",
    description: "수육이나 오리고기를 먹어도 되나요?",
  },
  {
    id: "faq-2",
    category: "FOOD_DIET",
    title: "과일 섭취량",
    description: "방울토마토·사과·수박은 하루에 얼마나 먹어도 되나요?",
  },
  {
    id: "faq-3",
    category: "FOOD_DIET",
    title: "채소 칼륨 제거",
    description: "칼륨을 줄이려면 채소를 물에 얼마나 담가 둬야 하나요?",
  },
  {
    id: "faq-4",
    category: "FOOD_DIET",
    title: "보리차·허브티",
    description: "맹물 대신 보리차나 허브티를 마셔도 되나요?",
  },
  {
    id: "faq-5",
    category: "MEDICATION",
    title: "영양제 복용",
    description: "오메가3·마그네슘·비타민 D를 먹어도 되나요?",
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
    title: "다른 진료·수술",
    description: "치과나 정형외과 처방약을 신장내과 확인 없이 먹어도 되나요?",
  },
  {
    id: "faq-9",
    category: "SYMPTOMS",
    title: "요독 증상",
    description: "입에서 암모니아 냄새가 나고 메스꺼운데 투석 신호인가요?",
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
    description: "콩팥 건강에 맞는 외식 메뉴를 추천해 주세요",
  },
]

const EN_CATEGORY_LABELS: Record<ChatCategory, string> = {
  FOOD_DIET: "Food and meals",
  MEDICATION: "Medications",
  LIFESTYLE: "Daily habits",
  SYMPTOMS: "Symptoms",
  EXAM: "Lab results",
  NONE: "Something else",
}

const EN_QUICK_QUESTIONS: Record<ChatCategory, string[]> = {
  FOOD_DIET: [
    "What could I eat today?",
    "Which fruits are lower in potassium?",
    "How much protein should I have each day?",
  ],
  MEDICATION: [
    "When should I take my blood pressure medication?",
    "I’m worried about side effects",
    "Can I take this supplement with my medications?",
  ],
  LIFESTYLE: [
    "What can help with fatigue after dialysis?",
    "How do I find my personal fluid limit?",
    "How should I plan meals during dialysis?",
  ],
  EXAM: [
    "How should I read my eGFR result?",
    "What do these blood test results mean?",
    "How should I prepare for my next test?",
  ],
  SYMPTOMS: [
    "How should I eat after a transplant?",
    "What should I know while taking immunosuppressants?",
    "How can I take care of myself while waiting for a transplant?",
  ],
  NONE: [
    "I have a kidney-health question",
    "I have a different question",
    "Everyday kidney care",
  ],
}

const EN_FREQUENTLY_ASKED_QUESTIONS: FaqCardEntry[] = [
  { id: "faq-1", category: "FOOD_DIET", title: "Meat portions", description: "How do I fit pork or duck into my meal plan?" },
  { id: "faq-2", category: "FOOD_DIET", title: "Fruit portions", description: "How much tomato, apple, or watermelon can I have?" },
  { id: "faq-3", category: "FOOD_DIET", title: "Lowering potassium", description: "Can soaking vegetables reduce potassium?" },
  { id: "faq-4", category: "FOOD_DIET", title: "Tea and fluids", description: "Do barley tea and herbal tea count toward my fluid limit?" },
  { id: "faq-5", category: "MEDICATION", title: "Supplements", description: "Can I take omega-3, magnesium, or vitamin D?" },
  { id: "faq-6", category: "MEDICATION", title: "Pain relievers", description: "What should I check before choosing a headache medicine?" },
  { id: "faq-7", category: "EXAM", title: "Understanding labs", description: "What can high creatinine with a normal cystatin C mean?" },
  { id: "faq-8", category: "MEDICATION", title: "Other prescriptions", description: "Should my kidney care team review medicine from another clinician?" },
  { id: "faq-9", category: "SYMPTOMS", title: "New symptoms", description: "I feel nauseated and notice an ammonia-like breath odor. What should I do?" },
  { id: "faq-10", category: "SYMPTOMS", title: "Dialysis access", description: "How do fistulas and grafts differ, and how are they cared for?" },
  { id: "faq-11", category: "FOOD_DIET", title: "Eggs and proteinuria", description: "How do egg whites and yolks differ in a kidney meal plan?" },
  { id: "faq-12", category: "FOOD_DIET", title: "Eating out", description: "Help me compare restaurant choices with my personal limits" },
]

export function getLocalizedCategories(language: string): CategoryMeta[] {
  if (!language.toLowerCase().startsWith("en")) return CATEGORY_LIST
  return CATEGORY_LIST.map((category) => ({
    ...category,
    label: EN_CATEGORY_LABELS[category.key],
  }))
}

export function getLocalizedQuickQuestions(
  category: ChatCategory,
  language: string,
): QuickQuestion[] {
  if (!language.toLowerCase().startsWith("en")) {
    return QUICK_QUESTIONS[category] ?? []
  }
  return EN_QUICK_QUESTIONS[category].map((text, index) => ({
    id: `en-${category}-${index}`,
    category,
    text,
  }))
}

export function getLocalizedFrequentlyAskedQuestions(
  language: string,
): FaqCardEntry[] {
  return language.toLowerCase().startsWith("en")
    ? EN_FREQUENTLY_ASKED_QUESTIONS
    : FREQUENTLY_ASKED_QUESTIONS
}

/** 카테고리 key로 메타 정보 조회 */
export function getCategoryMeta(
  key: string,
  language: string = "ko",
): CategoryMeta | undefined {
  return getLocalizedCategories(language).find((c) => c.key === key)
}
