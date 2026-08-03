const POSITIVE_DECIMAL_PATTERN = /^(?:\d+(?:\.\d+)?|\.\d+)$/
const NUMERIC_INPUT_ERROR = "숫자를 입력해주세요"
const POSITIVE_NUMBER_ERROR = "0보다 큰 값을 입력해주세요"

export function getPositiveDecimalValidationError(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim()
  if (!normalized) return null

  const numberValue = Number(normalized)
  if (Number.isFinite(numberValue) && numberValue <= 0) {
    return POSITIVE_NUMBER_ERROR
  }
  if (
    !POSITIVE_DECIMAL_PATTERN.test(normalized) ||
    !Number.isFinite(numberValue)
  ) {
    return NUMERIC_INPUT_ERROR
  }

  return null
}

export function isValidPositiveDecimal(
  value: string | null | undefined,
): boolean {
  const normalized = value?.trim()
  return !!normalized && getPositiveDecimalValidationError(normalized) === null
}

export function canNavigateOnboardingBack(isSubmitting: boolean): boolean {
  return !isSubmitting
}
