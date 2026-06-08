import type { RegisterOptions } from "react-hook-form"
import type { PasswordForm } from "../types"

const passwordTypePatterns = [
  /[A-Z]/,
  /[a-z]/,
  /[0-9]/,
  /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
]

export const passwordCriteriaText =
  "비밀번호는 영문 대문자, 영문 소문자, 숫자, 특수문자 중 2가지 이상을 포함해 6~18자로 입력해주세요."

export const passwordRules: RegisterOptions<PasswordForm, "password"> = {
  required: "비밀번호를 입력해주세요.",
  minLength: {
    value: 6,
    message: "비밀번호는 6자 이상이어야 합니다.",
  },
  maxLength: {
    value: 18,
    message: "비밀번호는 18자 이하여야 합니다.",
  },
  validate: (value) =>
    passwordTypePatterns.filter((pattern) => pattern.test(value)).length >= 2 ||
    "영문 대문자, 영문 소문자, 숫자, 특수문자 중 2가지 이상을 포함해주세요.",
}

export const confirmPasswordRules = (
  password: string,
): RegisterOptions<PasswordForm, "confirmPassword"> => ({
  required: "비밀번호 확인을 입력해주세요.",
  validate: (value) => value === password || "비밀번호가 일치하지 않습니다.",
})
