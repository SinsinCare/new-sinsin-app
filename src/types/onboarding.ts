export type OnboardingStepType = "multi" | "only" | "input" | "date"

export interface OnboardingValueOption {
  key: string
  value: string
  type?: "text" | "number"
  unit?: string
  label?: string
  /** input 필드 전용. 기본은 필수 — 명시적으로 false 인 필드만 비워 둔 채 넘어갈 수 있다. */
  required?: boolean
}

/**
 * 한 스텝 안의 **두 번째 축**. 별도 스텝을 만들지 않기 위한 장치다.
 *
 * 투석·이식은 병기와 직교하는 정보라 따로 물어야 하는데, 스텝을 하나 더 만들면
 * 이미 10개인 온보딩이 11개가 된다. 대신 같은 화면에서 선택지 목록 아래에 낮은
 * 무게(칩)로 붙인다 — 진행률도 뒤로가기 스택도 그대로다.
 */
export interface OnboardingFollowUp {
  title: string
  values: OnboardingValueOption[]
  /** 이 선택지를 고르면 후속 질문에 **명시적으로** 답해야 넘어갈 수 있다. */
  requiredFor: string[]
  /** 나머지 선택지에서 미리 선택되어 보이는 값. */
  defaultKey: string | null
}

export interface OnboardingStep {
  step: number
  title: string
  subTitle: string
  type: OnboardingStepType
  values: OnboardingValueOption[]
  followUp?: OnboardingFollowUp | null
}

export interface OnboardingAnswer {
  step: number
  type: OnboardingStepType
  selectedKeys?: string[] // only, multi용
  inputValues?: Record<string, string> // input용 (key → value)
}

export interface OnboardingSubmitRequest {
  userId: string
  answers: OnboardingAnswer[]
}

export interface OnboardingStepRs {
  step: number
  flow: string
  title: string
  subTitle: string
  type: OnboardingStepType
  values: OnboardingValueOption[]
  followUp?: OnboardingFollowUp | null
}

export interface OnboardingAnswerRq {
  key: string
  value: string
}

export interface OnboardingSubmitRq {
  hasCkd: boolean
  answers: {
    step: number
    values: OnboardingAnswerRq[]
  }[]
}
