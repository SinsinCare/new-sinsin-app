import {
  trackAnalyticsEvent,
  type AnalyticsFormName,
} from "@/src/features/analytics"

export type FormValidationState = "neutral" | "empty" | "invalid" | "valid"

interface FormValidationStateInput {
  value: unknown
  hasError: boolean
  showValidState: boolean
}

function hasVisibleValue(value: unknown) {
  if (typeof value === "string") return value.trim().length > 0
  return value !== null && value !== undefined
}

export function getFormValidationState({
  value,
  hasError,
  showValidState,
}: FormValidationStateInput): FormValidationState {
  if (hasError) return "invalid"
  if (!showValidState) return "neutral"
  return hasVisibleValue(value) ? "valid" : "empty"
}

/**
 * 제출이 폼에 막힌 사건의 **모양**. 값이 아니라 모양만 남긴다 — 어느 칸에서 막히는지는
 * 알아야 고칠 수 있고, 무엇을 적었는지는 알 필요가 없다(신장 환자의 자유 입력은
 * 건강정보다).
 *
 * 순수 함수로 갈라 둔 이유는 필드 순서 판정을 테스트로 못 박기 위해서다.
 * `react-hook-form` 의 `errors` 는 키 순서가 폼 정의 순서가 아닐 수 있으므로,
 * "먼저 막힌 칸" 은 화면이 준 필드 순서로 고른다.
 */
export function toFormValidationFailure(
  form: AnalyticsFormName,
  fields: readonly string[],
  failed: Readonly<Record<string, unknown>>,
): { form: AnalyticsFormName; first_fail: string; fail_count: number } | null {
  const order = fields.filter((field) => failed[field] !== undefined)
  // 폼 순서에 없는 이름으로 실패가 오면(루트 에러 등) 셈에서 빠지면 안 된다.
  const extra = Object.keys(failed).filter((key) => !fields.includes(key))
  const first = order[0] ?? extra[0]
  if (first === undefined) return null
  return { form, first_fail: first, fail_count: order.length + extra.length }
}

/** 위 판정을 그대로 이벤트로 보낸다. 폼 화면은 이 한 줄만 부른다. */
export function trackFormValidationFailed(
  form: AnalyticsFormName,
  fields: readonly string[],
  failed: Readonly<Record<string, unknown>>,
): void {
  const failure = toFormValidationFailure(form, fields, failed)
  if (failure) trackAnalyticsEvent("form_validation_failed", failure)
}
