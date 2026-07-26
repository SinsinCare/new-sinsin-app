import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useAuth } from "@/src/hooks/useAuth"
import { showErrorToast } from "@/src/lib/toast"
import { AuthPasswordFields } from "../components/AuthPasswordFields"
import { getPasswordFlowToken } from "../data/passwordFlow"
import { getDestinationForAccountState } from "../utils/accountStateRoute"
import { AuthScreenLayout } from "./AuthScreenLayout"
import type { PasswordForm } from "../types"

export function EmailLoginLinkPasswordScreen() {
  const { email, emailLinkToken } = useLocalSearchParams<{
    email?: string
    emailLinkToken?: string
  }>()
  const { completeEmailLoginLink } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    setError,
    formState: { isValid },
  } = useForm<PasswordForm>({
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange",
    reValidateMode: "onChange",
  })

  const tokenValue = getPasswordFlowToken(emailLinkToken)
  const emailValue = typeof email === "string" ? email : null

  useEffect(() => {
    if (!tokenValue) {
      showErrorToast(
        "이메일 로그인 연결 정보가 만료되었습니다. 다시 시도해주세요.",
      )
      router.replace("/(auth)/signup-email")
    }
  }, [tokenValue])

  const submit = async (data: PasswordForm) => {
    if (!tokenValue || submitting) return
    setSubmitting(true)
    try {
      const result = await completeEmailLoginLink(tokenValue, data.password)
      router.replace(
        getDestinationForAccountState(
          result.accountState,
          result.requiresAdditionalInfo,
          result.entryGate,
        ),
      )
    } catch (error) {
      setError("password", {
        message:
          error instanceof Error
            ? error.message
            : "이메일 로그인 연결에 실패했습니다. 다시 시도해주세요.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthScreenLayout
      title="이메일 로그인 비밀번호를 설정해주세요"
      subtitle={
        emailValue
          ? `${emailValue} 계정으로 로그인할 때 사용할 비밀번호입니다`
          : "이메일 계정으로 로그인할 때 사용할 비밀번호입니다"
      }
      buttonLabel="연결 완료"
      buttonDisabled={!tokenValue || !isValid || submitting}
      buttonLoading={submitting}
      onSubmit={handleSubmit(submit)}
      scrollable
      keyboardAvoiding
    >
      <AuthPasswordFields control={control} />
    </AuthScreenLayout>
  )
}
