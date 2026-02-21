import type {
  OnboardingStep,
  OnboardingStepRs,
  OnboardingAnswer,
  OnboardingAnswerRq,
  OnboardingSubmitRq,
  OnboardingValueOption,
} from "@/src/types/onboarding"

const INPUT_STEP_VALUES: OnboardingValueOption[] = [
  { key: "weight", value: "", type: "number", unit: "kg", label: "몸무게" },
]

/**
 * API 응답(OnboardingStepRs[])을 클라이언트 모델(OnboardingStep[])로 변환
 * - input 타입: API에 필드 메타가 없으므로 클라이언트에서 고정값 사용
 */
export function convertStepRsToSteps(
  rsArray: OnboardingStepRs[],
): OnboardingStep[] {
  return rsArray.map((rs) => ({
    step: rs.step,
    title: rs.title,
    subTitle: rs.subTitle,
    type: rs.type,
    values: rs.type === "input" ? INPUT_STEP_VALUES : rs.values,
  }))
}

/**
 * 클라이언트 답변(OnboardingAnswer[])을 API 요청(OnboardingSubmitRq)으로 변환
 * - only/multi: selectedKeys → { key, value: key }
 * - input: inputValues → { key: fieldKey, value: inputText }
 */
export function convertAnswersToSubmitRq(
  hasCkd: boolean,
  answers: OnboardingAnswer[],
): OnboardingSubmitRq {
  return {
    hasCkd,
    answers: answers.map((answer) => ({
      step: answer.step,
      values: answer.type === "input"
        ? Object.entries(answer.inputValues ?? {}).map(([key, value]) => ({
            key,
            value,
          }))
        : (answer.selectedKeys ?? []).map((key) => ({ key, value: key })),
    })),
  }
}
