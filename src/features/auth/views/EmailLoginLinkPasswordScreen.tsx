import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Text, YStack } from "tamagui"
import { FormTextField } from "@/src/shared/components"
import { useAuth } from "@/src/hooks/useAuth"
import { showErrorToast } from "@/src/lib/toast"
import { passwordRules, confirmPasswordRules } from "../data/passwordValidation"
import { AuthScreenLayout } from "./AuthScreenLayout"
import type { PasswordForm } from "../types"
import { tokens } from "@/src/theme/tokens"

export function EmailLoginLinkPasswordScreen() {
  const { email, emailLinkToken } = useLocalSearchParams<{
    email?: string
    emailLinkToken?: string
  }>()
  const { completeEmailLoginLink } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  const { control, handleSubmit, watch, setError } = useForm<PasswordForm>({
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  })

  const password = watch("password")
  const tokenValue =
    typeof emailLinkToken === "string" && emailLinkToken.length > 0
      ? emailLinkToken
      : null
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
        result.accountState === "PENDING_ONBOARDING"
          ? "/onboarding"
          : "/(tabs)/home",
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
      buttonDisabled={submitting}
      buttonLoading={submitting}
      onSubmit={handleSubmit(submit)}
    >
      <YStack gap={36} marginTop={56}>
        <Text
          fontSize={14}
          lineHeight={20}
          color={tokens.color.grey6.val}
          letterSpacing={-0.28}
        >
          비밀번호는 영문 대문자, 영문 소문자, 숫자, 특수문자를 모두 포함해
          6~18자로 입력해주세요.
        </Text>

        <FormTextField<PasswordForm>
          name="password"
          control={control}
          label="비밀번호"
          placeholder="비밀번호를 형식에 맞춰 입력해주세요"
          inputType="password"
          showPasswordToggle
          rules={passwordRules}
        />

        <FormTextField<PasswordForm>
          name="confirmPassword"
          control={control}
          label="비밀번호 확인"
          placeholder="입력한 비밀번호를 다시 입력해주세요"
          inputType="password"
          showPasswordToggle
          rules={confirmPasswordRules(password)}
        />
      </YStack>
    </AuthScreenLayout>
  )
}
