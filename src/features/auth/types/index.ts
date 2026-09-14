export interface LoginForm {
  email: string
  password: string
}

export interface EmailForm {
  email: string
  code: string
}

export interface PasswordForm {
  password: string
  confirmPassword: string
}

export interface TermItem {
  id: string
  label: string
  required: boolean
  documentType?: "terms-of-use" | "privacy-policy"
}
