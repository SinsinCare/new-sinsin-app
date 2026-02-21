type OnboardingStepType = "multi" | "only" | "input"

export interface OnboardingValueOption {
  key: string
  value: string
  type?: "text" | "number"
  unit?: string
  label?: string
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
    step: number,
    values: OnboardingAnswerRq[]
  }[]
}
