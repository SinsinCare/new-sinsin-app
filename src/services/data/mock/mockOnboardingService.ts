import type { OnboardingStep } from "@/src/types"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const MOCK_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    step: 1,
    title: "현재 신장 상태를 알려 주세요",
    subTitle: "잘 몰라도 괜찮아요\n나중에 언제든 바꿀 수 있어요",
    type: "only",
    values: [
      { key: "1", value: "1기 (eGFR 90 이상)" },
      { key: "2", value: "2기 (eGFR 60~89)" },
      { key: "3-a", value: "3a기 (eGFR 45~59)" },
      { key: "3-b", value: "3b기 (eGFR 30~44)" },
      { key: "4", value: "4기 (eGFR 15~29)" },
      { key: "5", value: "5기 (eGFR 15 미만)" },
      { key: "unknown", value: "잘 모르겠어요" },
    ],
    // 같은 스텝의 두 번째 축. 스텝을 늘리지 않으려고 여기 붙어 있다.
    followUp: {
      title: "투석이나 이식을 받고 있나요?",
      values: [
        { key: "KRT_NONE", value: "아니요" },
        { key: "KRT_HEMODIALYSIS", value: "혈액투석" },
        { key: "KRT_PERITONEAL", value: "복막투석" },
        { key: "KRT_TRANSPLANT", value: "이식받았어요" },
      ],
      requiredFor: ["4", "5", "unknown"],
      defaultKey: "KRT_NONE",
    },
  },
  {
    step: 2,
    title: "신장 질환은 언제 진단받았나요?",
    subTitle: "",
    // 여기 key 는 정본과 같아야 한다 — "예방 목적"을 고르면 뒤의 진단 질문 두 개가
    // 빠지는데, 그 판정이 PREVENTIVE 키로 이뤄진다.
    type: "only",
    values: [
      { key: "WITHIN_1M", value: "1개월 이내" },
      { key: "WITHIN_6M", value: "6개월 이내" },
      { key: "SIX_M_TO_2Y", value: "6개월 ~ 2년 전" },
      { key: "OVER_2Y", value: "2년 이상" },
      { key: "PREVENTIVE", value: "진단은 없고 예방 목적" },
    ],
  },
  // step 9(진단 연·월)는 서버 목록에서 빠졌다 — step 2(진단 시기 버킷)와 같은 사실을
  // 두 번 묻고 있었다. 정확한 날짜는 설정 > 신장 프로필에서 지정한다.
  // (제출 파싱은 서버에 남아 있어서 구버전 앱은 계속 보내도 저장된다.)
  {
    step: 10,
    title: "신장 질환의 주된 원인을 알고 계신가요?",
    subTitle: "해당되는 것을 모두 선택해 주세요.",
    type: "multi",
    values: [
      { key: "DIABETIC_KIDNEY_DISEASE", value: "당뇨병성 신장 질환" },
      { key: "HYPERTENSION", value: "고혈압" },
      { key: "GLOMERULONEPHRITIS", value: "사구체신염" },
      { key: "POLYCYSTIC_KIDNEY_DISEASE", value: "다낭성 신장 질환" },
      { key: "OTHER", value: "기타" },
      { key: "UNKNOWN", value: "잘 모르겠어요" },
    ],
  },
  {
    step: 3,
    title: "함께 관리하는 질환이 있나요?",
    subTitle: "영양 관리에 참고해요\n해당하는 항목을 모두 골라 주세요",
    type: "multi",
    values: [
      { key: "당뇨", value: "당뇨병" },
      { key: "고혈압", value: "고혈압" },
      { key: "심장질환", value: "심장질환" },
      { key: "통풍", value: "통풍" },
      { key: "빈혈", value: "빈혈" },
      { key: "뼈 및 미네랄 이상", value: "뼈 및 미네랄 이상" },
      // 결석은 병기가 아니라 동반 질환이라 여기가 제자리다.
      { key: "KIDNEY_STONE", value: "신장결석" },
      { key: "해당없음", value: "해당 없음" },
    ],
  },
  {
    step: 4,
    title: "키와 체중은 얼마인가요?",
    subTitle:
      "체중은 신장 단계·투석 여부와 함께 하루 권장량을 계산하는 데 사용해요. 키는 선택 사항이에요.",
    type: "input",
    values: [
      {
        key: "height",
        value: "",
        type: "number",
        unit: "cm",
        label: "키",
        required: false,
      },
      {
        key: "weight",
        value: "",
        type: "number",
        unit: "kg",
        label: "몸무게",
        required: true,
      },
    ],
  },
  {
    step: 5,
    title: "신장 식이에 대해\n얼마나 알고 있나요?",
    subTitle: "내게 맞는 난이도의 정보를 볼 수 있어요",
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
    title: "신장 식이를 관리할 때\n무엇이 가장 어렵나요?",
    subTitle: "여러 개 골라도 돼요",
    type: "multi",
    values: [
      { key: "1", value: "영양 성분표 읽기가 어려워요" },
      { key: "2", value: "숨어 있는 인을 찾기 어려워요" },
      { key: "3", value: "외식할 때 선택이 어려워요" },
      { key: "4", value: "적절한 1회 섭취량을 모르겠어요" },
      { key: "5", value: "칼륨이 많은 음식을 구분하기 어려워요" },
      { key: "6", value: "맛있게 먹을 수 있는 식단을 찾기 어려워요" },
      { key: "7", value: "나트륨 섭취를 제한하기 어려워요" },
      { key: "8", value: "수분 섭취량 관리가 어려워요" },
      { key: "9", value: "매일 꾸준히 실천하기가 어려워요" },
    ],
  },
  {
    step: 7,
    title: "평소에 어떻게 식사하나요?",
    subTitle: "",
    type: "only",
    values: [
      { key: "1", value: "집에서 직접 해 먹는 편이에요" },
      { key: "2", value: "집밥과 외식을 섞어서 먹어요" },
      { key: "3", value: "외식이나 배달이 대부분이에요" },
      { key: "4", value: "미리 식단을 준비해 두고 먹어요" },
      { key: "5", value: "다른 사람이 주로 해 줘요" },
    ],
  },
  {
    step: 8,
    title: "외식은 얼마나 자주 하나요?",
    subTitle: "",
    type: "only",
    values: [
      { key: "1", value: "거의 안 해요 (한 달에 1~2번)" },
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

  async submitAnswers(): Promise<void> {
    await delay(300)
  },

  async skipOnboarding(): Promise<void> {
    await delay(300)
  },
}
