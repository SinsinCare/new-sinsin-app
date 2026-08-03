import type {
  OnboardingStep,
  OnboardingStepRs,
  OnboardingAnswer,
  OnboardingSubmitRq,
  OnboardingValueOption,
} from "@/src/types/onboarding"
import i18n from "@/src/i18n"

/**
 * input 필드 메타. API 는 `{ key, value: 단위 }` 만 주고 입력 타입·라벨·필수 여부는
 * 알려주지 않으므로 키로 붙인다. 모르는 키는 자유 입력 텍스트로 떨어진다.
 */
const INPUT_FIELD_META: Record<
  string,
  {
    type: "number"
    unit: string
    labelKey: "onboarding.weight" | "onboarding.height"
    required: boolean
  }
> = {
  weight: {
    type: "number",
    unit: "kg",
    labelKey: "onboarding.weight",
    required: true,
  },
  height: {
    type: "number",
    unit: "cm",
    labelKey: "onboarding.height",
    // 키는 없어도 온보딩을 막지 않는다 — 한도 계산에 쓰이지 않는다.
    required: false,
  },
}

function toInputField(option: OnboardingValueOption): OnboardingValueOption {
  const meta = INPUT_FIELD_META[option.key]
  if (!meta) {
    // 모르는 키는 자유 입력으로 둔다. 서버가 필드를 추가해도 화면이 비지 않는다.
    // 서버의 `value` 는 단위 문자열이다(예: "kg").
    return { key: option.key, value: "", unit: option.value || undefined }
  }
  return {
    key: option.key,
    value: "",
    type: meta.type,
    unit: meta.unit,
    label: i18n.t(meta.labelKey, { ns: "auth" }),
    required: meta.required,
  }
}

/**
 * API 응답(OnboardingStepRs[])을 클라이언트 모델(OnboardingStep[])로 변환
 * - input 타입: API에 필드 메타가 없으므로 서버가 준 key 순서에 클라이언트 메타를 붙인다
 */
export function convertStepRsToSteps(
  rsArray: OnboardingStepRs[],
): OnboardingStep[] {
  return rsArray.map((rs) => ({
    step: rs.step,
    title: rs.title,
    subTitle: rs.subTitle,
    type: rs.type,
    values: rs.type === "input" ? rs.values.map(toInputField) : rs.values,
    // 서버가 안 보내면 없는 것으로 둔다 — 구버전 서버에 붙어도 화면이 비지 않는다.
    followUp: rs.followUp ?? null,
  }))
}

/**
 * 클라이언트 답변(OnboardingAnswer[])을 API 요청(OnboardingSubmitRq)으로 변환
 * - only/multi: selectedKeys → { key, value: key }
 * - input/date: inputValues → { key: fieldKey, value: inputText }
 *
 * 빈 값은 보내지 않는다. 선택 입력(키·진단 연월)을 비워 둔 채 넘어가면 서버가
 * 빈 문자열을 잘못된 값으로 읽는 대신 답이 없는 것으로 본다.
 */
export function convertAnswersToSubmitRq(
  hasCkd: boolean,
  answers: OnboardingAnswer[],
): OnboardingSubmitRq {
  return {
    hasCkd,
    answers: answers.map((answer) => ({
      step: answer.step,
      values:
        answer.type === "input" || answer.type === "date"
          ? Object.entries(answer.inputValues ?? {})
              .filter(([, value]) => value.trim() !== "")
              .map(([key, value]) => ({ key, value: value.trim() }))
          : (answer.selectedKeys ?? []).map((key) => ({ key, value: key })),
    })),
  }
}
