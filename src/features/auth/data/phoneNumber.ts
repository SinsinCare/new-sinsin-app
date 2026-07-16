const KOREAN_MOBILE_PATTERN = /^010\d{8}$/

export const PHONE_NUMBER_ERROR_MESSAGE =
  "010으로 시작하는 휴대전화 번호 11자리를 입력해주세요."

export function onlyPhoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11)
}

export function formatKoreanMobileInput(value: string): string {
  const digits = onlyPhoneDigits(value)

  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

export function isValidKoreanMobile(value: string): boolean {
  return KOREAN_MOBILE_PATTERN.test(onlyPhoneDigits(value))
}

export function getOptionalPhoneNumberError(value: string): string | null {
  if (onlyPhoneDigits(value).length === 0) return null
  return isValidKoreanMobile(value) ? null : PHONE_NUMBER_ERROR_MESSAGE
}

export function getRequiredPhoneNumberError(value: string): string | null {
  return isValidKoreanMobile(value) ? null : PHONE_NUMBER_ERROR_MESSAGE
}

export function buildOptionalPhoneNumberPayload(value: string): {
  phoneNumber?: string
} {
  const digits = onlyPhoneDigits(value)
  if (digits.length === 0) return {}
  if (!KOREAN_MOBILE_PATTERN.test(digits)) {
    throw new Error(PHONE_NUMBER_ERROR_MESSAGE)
  }
  return { phoneNumber: digits }
}

export function buildRequiredPhoneNumberPayload(value: string): {
  phoneNumber: string
} {
  const digits = onlyPhoneDigits(value)
  if (!KOREAN_MOBILE_PATTERN.test(digits)) {
    throw new Error(PHONE_NUMBER_ERROR_MESSAGE)
  }
  return { phoneNumber: digits }
}

export function buildPhoneProfileUpdatePayload(value: string | null): {
  phoneNumber: string | null
} {
  if (value === null) return { phoneNumber: null }
  return buildRequiredPhoneNumberPayload(value)
}
