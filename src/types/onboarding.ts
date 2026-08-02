type OnboardingStepType = "multi" | "only" | "input" | "date"

export interface OnboardingValueOption {
  key: string
  value: string
  type?: "text" | "number"
  unit?: string
  label?: string
  /** input 필드 전용. 기본은 필수 — 명시적으로 false 인 필드만 비워 둔 채 넘어갈 수 있다. */
  required?: boolean
}

export interface OnboardingStep {
  step: number
  title: string
  subTitle: string
  type: OnboardingStepType
  values: OnboardingValueOption[]
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
