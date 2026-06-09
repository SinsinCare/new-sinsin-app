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
