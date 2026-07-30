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

export const passwordCriteriaText = i18n.t("validation.passwordCriteria", {
  ns: "auth",
})

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

export const passwordRules: RegisterOptions<PasswordForm, "password"> = {
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

export const confirmPasswordRules = (
  password: string,
): RegisterOptions<PasswordForm, "confirmPassword"> => ({
  required: i18n.t("validation.confirmPasswordRequired", { ns: "auth" }),
  validate: (value) =>
    value === password || i18n.t("validation.passwordMismatch", { ns: "auth" }),
})

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
