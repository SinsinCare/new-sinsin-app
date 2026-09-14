import type { ChatCategory, FaqCardEntry } from "../types"

/**
 * 환영 화면의 주제 칩 순서. 라벨은 `consult.categories.<key>` 로 i18n 에서 오고 아이콘은
 * 그리지 않는다 — 예전 `CategoryMeta` 의 `label`·`icon`·`color` 는 어디서도 읽지 않는
 * 한국어 하드코딩이었다.
 */
export const CATEGORY_LIST: readonly ChatCategory[] = [
  "FOOD_DIET",
  "MEDICATION",
  "LIFESTYLE",
  "SYMPTOMS",
  "EXAM",
  "NONE",
]

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

const EN_FREQUENTLY_ASKED_QUESTIONS: FaqCardEntry[] = [
  {
    id: "faq-1",
    category: "FOOD_DIET",
    title: "Meat portions",
    description: "How do I fit pork or duck into my meal plan?",
  },
  {
    id: "faq-2",
    category: "FOOD_DIET",
    title: "Fruit portions",
    description: "How much tomato, apple, or watermelon can I have?",
  },
  {
    id: "faq-3",
    category: "FOOD_DIET",
    title: "Lowering potassium",
    description: "Can soaking vegetables reduce potassium?",
  },
  {
    id: "faq-4",
    category: "FOOD_DIET",
    title: "Tea and fluids",
    description: "Do barley tea and herbal tea count toward my fluid limit?",
  },
  {
    id: "faq-5",
    category: "MEDICATION",
    title: "Supplements",
    description: "Can I take omega-3, magnesium, or vitamin D?",
  },
  {
    id: "faq-6",
    category: "MEDICATION",
    title: "Pain relievers",
    description: "What should I check before choosing a headache medicine?",
  },
  {
    id: "faq-7",
    category: "EXAM",
    title: "Understanding labs",
    description: "What can high creatinine with a normal cystatin C mean?",
  },
  {
    id: "faq-8",
    category: "MEDICATION",
    title: "Other prescriptions",
    description:
      "Should my kidney care team review medicine from another clinician?",
  },
  {
    id: "faq-9",
    category: "SYMPTOMS",
    title: "New symptoms",
    description:
      "I feel nauseated and notice an ammonia-like breath odor. What should I do?",
  },
  {
    id: "faq-10",
    category: "SYMPTOMS",
    title: "Dialysis access",
    description:
      "How do fistulas and grafts differ, and how are they cared for?",
  },
  {
    id: "faq-11",
    category: "FOOD_DIET",
    title: "Eggs and proteinuria",
    description: "How do egg whites and yolks differ in a kidney meal plan?",
  },
  {
    id: "faq-12",
    category: "FOOD_DIET",
    title: "Eating out",
    description: "Help me compare restaurant choices with my personal limits",
  },
]

export function getLocalizedFrequentlyAskedQuestions(
  language: string,
): FaqCardEntry[] {
  return language.toLowerCase().startsWith("en")
    ? EN_FREQUENTLY_ASKED_QUESTIONS
    : FREQUENTLY_ASKED_QUESTIONS
}
