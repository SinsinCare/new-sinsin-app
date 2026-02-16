import type { OnboardingStep, OnboardingSubmitRequest } from "../../../types"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const MOCK_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    step: 1,
    title: "현재 신장 상태를 알려주세요",
    subTitle: "잘 모르셔도 괜찮아요\n" + "나중에 언제든지 수정할 수 있어요",
    type: "only",
    values: [
      { key: "1", value: "1기 (eGFR 90이상)" },
      { key: "2", value: "2기 (eGFR 60~89)" },
      { key: "3-a", value: "3a기 (eGFR 45~59)" },
      { key: "3-b", value: "3b기 (eGFR 30~44)" },
      { key: "4", value: "4기 (eGFR 15~29)" },
      { key: "5", value: "5기 (eGFR 15미만)" },
      { key: "ing", value: "현재 투석중이에요" },
      { key: "have", value: "신장 결석이 있어요 (만성 질환은 아니에요)" },
      { key: "unknown", value: "잘 모르겠어요" },
    ],
  },
  {
    step: 2,
    title: "진단 시기를 알려주세요",
    subTitle: "언제 진단 받으셨나요?",
    type: "only",
    values: [
      { key: "1", value: "1개월 이내" },
      { key: "2", value: "6개월 이내" },
      { key: "3", value: "6개월 ~ 2년 전" },
      { key: "4", value: "2년 이상" },
      { key: "5", value: "진단은 없고 예방 목적" },
    ],
  },
  {
    step: 3,
    title: "함께 관리중인 질환이 있나요?",
    subTitle:
      "영양소 제한에 영향을 줄 수 있어요\n" + "해당되는 것에 모두 체크해주세요",
    type: "multi",
    values: [
      { key: "당뇨", value: "당뇨병" },
      { key: "고혈압", value: "고혈압" },
      { key: "심장질환", value: "심장질환" },
      { key: "통풍", value: "통풍" },
      { key: "빈혈", value: "빈혈" },
      { key: "뼈 및 미네랄 이상", value: "뼈 및 미네랄 이상" },
      { key: "해당없음", value: "해당없음" },
    ],
  },
  {
    step: 4,
    title: "현재 체중을 알려주세요",
    subTitle: "단백질 섭취량 계산에 사용돼요",
    type: "input",
    values: [
      { key: "weight", value: "", type: "number", unit: "kg", label: "몸무게" },
    ],
  },
  {
    step: 5,
    title: "신장 식이에 대해 \n" + "얼마나 알고 계신가요?",
    subTitle: "교육 콘텐츠를 맞춤 제공하는데에 도움이 돼요",
    type: "only",
    values: [
      { key: "1", value: "이제 막 알아가는 중이에요" },
      { key: "2", value: "기본적인 내용은 알고 있어요" },
      { key: "3", value: "꽤 잘 알고 있어요" },
      { key: "4", value: "잘 알고 있는데 기록과 관리가 필요해요" },
    ],
  },
  {
    step: 6,
    title: "신장 식이 관리에서 어려운점은\n" + "무엇인가요?",
    subTitle: "(복수 선택)",
    type: "multi",
    values: [
      { key: "1", value: "영양 성분표 읽기가 어려워요" },
      { key: "2", value: "숨어 있는 인을 찾기 어려워요" },
      { key: "3", value: "외식할때 선택이 어려워요" },
      { key: "4", value: "적절한 1회 섭취량을 모르겠어요" },
      { key: "5", value: "칼륨이 많은 음식을 구분하기 어려워요" },
      { key: "6", value: "맛있게 먹을 수 있는 식단을 찾기 어려워요" },
      { key: "7", value: "나트륨 섭취를 제한하기 어려워요" },
      { key: "8", value: "수분 섭취량 관리가 어려워요 " },
      { key: "9", value: "매일 꾸준히 실천하기가 어려워요" },
    ],
  },
  {
    step: 7,
    title: "평소 식사는 어떻게 하시나요?",
    subTitle: "",
    type: "only",
    values: [
      { key: "1", value: "집에서 직접 해먹는 편이에요" },
      { key: "2", value: "집밥과 외식을 섞어서 먹어요" },
      { key: "3", value: "외식이나 배달이 대부분이에요" },
      { key: "4", value: "미리 식단을 준비해두고 먹어요" },
      { key: "5", value: "다른 사람이 주로 해줘요" },
    ],
  },
  {
    step: 8,
    title: "외식은 얼마나 자주 하시나요?",
    subTitle: "",
    type: "only",
    values: [
      { key: "1", value: "거의 안해요 (한 달에 1~2번)" },
      { key: "2", value: "가끔 해요 (주 1회 정도)" },
      { key: "3", value: "자주 해요 (주 2~3회)" },
      { key: "4", value: "매우 자주 해요 (주 4회 이상)" },
    ],
  },
]

export const mockOnboardingService = {
  async getSteps(): Promise<OnboardingStep[]> {
    await delay(300)
    return MOCK_ONBOARDING_STEPS
  },

  async submitAnswers(_request: OnboardingSubmitRequest): Promise<void> {
    await delay(300)
    // Mock: 답변 제출 성공
  },
}
