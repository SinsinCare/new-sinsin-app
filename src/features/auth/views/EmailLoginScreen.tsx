import { Pressable } from "react-native"
import { YStack, XStack, Text, Separator } from "tamagui"
import { useForm } from "react-hook-form"
import { FormTextField } from "@/src/shared/components"
import { AuthScreenLayout } from "./AuthScreenLayout"
import { useEmailLogin } from "../hooks"
import type { LoginForm } from "../types"

export function EmailLoginScreen() {
  const { isLoading, submitLogin } = useEmailLogin()

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<LoginForm>({
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      await submitLogin(data)
    } catch {
      // TODO: 서버 에러 처리
    }
  }

  return (
    <AuthScreenLayout
      title="이메일로 로그인하기"
      buttonLabel="로그인"
      buttonDisabled={!isValid}
      buttonLoading={isLoading}
      onSubmit={handleSubmit(onSubmit)}
    >
      <YStack gap={36} marginTop={48}>
        <FormTextField<LoginForm>
          name="email"
          control={control}
          label="아이디"
          placeholder="이메일 주소를 입력해주세요"
          inputType="email"
          rules={{
            required: "이메일을 입력해주세요.",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "올바른 이메일 형식이 아닙니다.",
            },
          }}
        />

        <FormTextField<LoginForm>
          name="password"
          control={control}
          label="비밀번호"
          placeholder="비밀번호를 입력해주세요"
          inputType="password"
          rules={{
            required: "비밀번호를 입력해주세요.",
          }}
        />
      </YStack>

      {/* Footer */}
      <YStack alignItems="center" paddingVertical={20} gap={8} marginTop={54}>
        <Text
          fontSize={13}
          fontWeight="500"
          color="#3F444F"
          letterSpacing={-0.26}
        >
          가입정보를 잊으셨나요?
        </Text>
        <XStack alignItems="center" justifyContent="center" gap={16}>
          <Pressable>
            <Text fontSize={13} color="#007BD9" letterSpacing={-0.26}>
              아이디찾기
            </Text>
          </Pressable>
          <Separator vertical borderColor="#3F444F" height={14} />
          <Pressable>
            <Text fontSize={13} color="#007BD9" letterSpacing={-0.26}>
              비밀번호 찾기
            </Text>
          </Pressable>
        </XStack>
      </YStack>
    </AuthScreenLayout>
  )
}
