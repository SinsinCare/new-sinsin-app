import type { RegisterOptions } from "react-hook-form"
import i18n from "@/src/i18n"
import type { PasswordForm } from "../types"

const passwordTypePatterns = [
  /[A-Z]/,
  /[a-z]/,
  /[0-9]/,
  /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
]

export type PasswordCriteriaState = "empty" | "invalid" | "valid"

/**
 * 비밀번호 폼의 **화면 순서**. `form_validation_failed` 의 `first_fail` 을 고를 때 쓴다 —
 * `react-hook-form` 의 errors 키 순서는 화면 순서를 보장하지 않아서, "먼저 막힌 칸" 을
 * 거기서 읽으면 화면마다 다른 답이 나온다. 세 화면(가입·재설정·계정 연결)이 같은 두 칸을
 * 같은 순서로 쓰므로 여기 한 벌만 둔다.
 */
export const PASSWORD_FIELD_ORDER = ["password", "confirmPassword"] as const

export function getPasswordCriteriaText(): string {
  return i18n.t("validation.passwordCriteria", { ns: "auth" })
}

export function isPasswordValid(value: string): boolean {
  const typeCount = passwordTypePatterns.filter((pattern) =>
    pattern.test(value),
  ).length
  return value.length >= 6 && value.length <= 18 && typeCount >= 2
}

export function getPasswordCriteriaState(value: string): PasswordCriteriaState {
  if (value.length === 0) return "empty"
  return isPasswordValid(value) ? "valid" : "invalid"
}

/**
 * iOS 자동 강력 비밀번호(`textContentType="newPassword"`)에 주는 규칙.
 *
 * 규칙이 없으면 iOS 는 20자짜리를 만들어 두 칸에 채운다 — 이 앱의 상한은 18자라
 * 채워지자마자 "18자 이하" 오류가 나고, 사용자는 왜 틀렸는지 모른다(2026-09-12
 * 비밀번호 재설정 오류 제보). 길이·구성은 `getPasswordRules` 와 같은 값이어야 한다.
 */
export const IOS_PASSWORD_RULES =
  "minlength: 6; maxlength: 18; required: lower; required: digit;"

export function getPasswordRules(): RegisterOptions<PasswordForm, "password"> {
  return {
    required: i18n.t("validation.passwordRequired", { ns: "auth" }),
    minLength: {
      value: 6,
      message: i18n.t("validation.passwordMin", { ns: "auth" }),
    },
    maxLength: {
      value: 18,
      message: i18n.t("validation.passwordMax", { ns: "auth" }),
    },
    validate: (value) =>
      isPasswordValid(value) ||
      i18n.t("validation.passwordCombination", { ns: "auth" }),
  }
}

export function getConfirmPasswordRules(
  password: string,
): RegisterOptions<PasswordForm, "confirmPassword"> {
  return {
    required: i18n.t("validation.confirmPasswordRequired", { ns: "auth" }),
    validate: (value) =>
      value === password ||
      i18n.t("validation.passwordMismatch", { ns: "auth" }),
  }
}
