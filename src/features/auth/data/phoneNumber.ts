import i18n from "@/src/i18n"

const KOREAN_MOBILE_PATTERN = /^010\d{8}$/

/**
 * 모듈 로드 시점의 스냅샷 — **기기 언어**로 고정된다.
 *
 * 저장된 언어는 앱이 뜬 뒤에 붙으므로 이 값은 사용자가 고른 언어와 다를 수 있고
 * 언어를 바꿔도 갱신되지 않는다. 새 코드는 `getPhoneNumberErrorMessage()` 를 쓴다.
 * @deprecated
 */
export const PHONE_NUMBER_ERROR_MESSAGE = i18n.t("validation.phone", {
  ns: "auth",
})

export function getPhoneNumberErrorMessage(): string {
  return i18n.t("validation.phone", { ns: "auth" })
}

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
  return isValidKoreanMobile(value) ? null : getPhoneNumberErrorMessage()
}

export function getRequiredPhoneNumberError(value: string): string | null {
  return isValidKoreanMobile(value) ? null : getPhoneNumberErrorMessage()
}

export function buildOptionalPhoneNumberPayload(value: string): {
  phoneNumber?: string
} {
  const digits = onlyPhoneDigits(value)
  if (digits.length === 0) return {}
  if (!KOREAN_MOBILE_PATTERN.test(digits)) {
    throw new Error(getPhoneNumberErrorMessage())
  }
  return { phoneNumber: digits }
}

export function buildRequiredPhoneNumberPayload(value: string): {
  phoneNumber: string
} {
  const digits = onlyPhoneDigits(value)
  if (!KOREAN_MOBILE_PATTERN.test(digits)) {
    throw new Error(getPhoneNumberErrorMessage())
  }
  return { phoneNumber: digits }
}

export function buildPhoneProfileUpdatePayload(value: string | null): {
  phoneNumber: string | null
} {
  if (value === null) return { phoneNumber: null }
  return buildRequiredPhoneNumberPayload(value)
}
