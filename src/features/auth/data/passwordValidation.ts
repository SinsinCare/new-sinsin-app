import type { RegisterOptions } from "react-hook-form"
import type { PasswordForm } from "../types"

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
  validate: {
    hasLetter: (v) => /[a-zA-Z]/.test(v) || "영문 대/소문자를 포함해주세요.",
    hasNumber: (v) => /[0-9]/.test(v) || "숫자를 포함해주세요.",
    hasSpecialChar: (v) =>
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v) ||
      "특수문자를 포함해주세요.",
  },
}

export const confirmPasswordRules = (
  password: string,
): RegisterOptions<PasswordForm, "confirmPassword"> => ({
  required: "비밀번호 확인을 입력해주세요.",
  validate: (value) => value === password || "비밀번호가 일치하지 않습니다.",
})
