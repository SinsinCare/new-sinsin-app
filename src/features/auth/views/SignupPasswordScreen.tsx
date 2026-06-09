import { YStack } from "tamagui"
import { useForm } from "react-hook-form"
import { FormTextField } from "@/src/shared/components"
import { AuthScreenLayout } from "./AuthScreenLayout"
import { PasswordCriteriaText } from "../components"
import { useSignupPassword } from "../hooks"
import { passwordRules, confirmPasswordRules } from "../data/passwordValidation"
import type { PasswordForm } from "../types"

export function SignupPasswordScreen() {
  const { handleNext } = useSignupPassword()

  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid },
  } = useForm<PasswordForm>({
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange",
  })

  const password = watch("password")

  return (
    <AuthScreenLayout
      title="비밀번호를 입력해주세요."
      subtitle="로그인에 사용할 비밀번호를 설정해주세요"
      buttonLabel="다음 단계"
      buttonDisabled={!isValid}
      onSubmit={handleSubmit(handleNext)}
    >
      <YStack gap={36} marginTop={56}>
        <YStack gap={10}>
          <FormTextField<PasswordForm>
            name="password"
            control={control}
            label="비밀번호"
            placeholder="비밀번호를 형식에 맞춰 입력해주세요"
            inputType="password"
            rules={passwordRules}
          />
          <PasswordCriteriaText password={password} />
        </YStack>

        <FormTextField<PasswordForm>
          name="confirmPassword"
          control={control}
          label="비밀번호 확인"
          placeholder="입력한 비밀번호를 다시 입력해주세요"
          inputType="password"
          rules={confirmPasswordRules(password)}
        />
      </YStack>
    </AuthScreenLayout>
  )
}
