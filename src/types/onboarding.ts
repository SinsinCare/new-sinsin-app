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
  type: "multi" | "only" | "input"
  values: OnboardingValueOption[]
}

export interface OnboardingAnswer {
  step: number
  type: "multi" | "only" | "input"
  selectedKeys?: string[] // only, multi용
  inputValues?: Record<string, string> // input용 (key → value)
}

export interface OnboardingSubmitRequest {
  userId: string
  answers: OnboardingAnswer[]
}
