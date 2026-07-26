import { useEffect } from "react"
import { router } from "expo-router"
import { useForm } from "react-hook-form"
import { showErrorToast } from "@/src/lib/toast"
import { useSignupStore } from "@/src/stores"
import { AuthScreenLayout } from "./AuthScreenLayout"
import { AuthPasswordFields } from "../components/AuthPasswordFields"
import { useSignupPassword } from "../hooks"
import { getPasswordFlowToken } from "../data/passwordFlow"
import type { PasswordForm } from "../types"

export function SignupPasswordScreen() {
  const { handleNext } = useSignupPassword()
  const signupToken = useSignupStore((state) => state.signupToken)
  const signupTokenValue = getPasswordFlowToken(signupToken)

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<PasswordForm>({
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange",
  })

  useEffect(() => {
    if (signupTokenValue) return
    showErrorToast(
      "회원가입 정보가 만료되었습니다. 이메일 인증부터 다시 시도해주세요.",
    )
    router.replace("/(auth)/signup-email")
  }, [signupTokenValue])

  return (
    <AuthScreenLayout
      title="비밀번호를 입력해주세요."
      subtitle="로그인에 사용할 비밀번호를 설정해주세요"
      buttonLabel="다음 단계"
      buttonDisabled={!signupTokenValue || !isValid}
      onSubmit={handleSubmit(handleNext)}
      scrollable
      keyboardAvoiding
    >
      <AuthPasswordFields control={control} />
    </AuthScreenLayout>
  )
}
