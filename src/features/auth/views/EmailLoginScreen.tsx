import { Pressable } from "react-native"
import { YStack, XStack, Text, Separator } from "tamagui"
import { router } from "expo-router"
import { useForm } from "react-hook-form"
import { ConfirmModal, FormTextField } from "@/src/shared/components"
import { AuthScreenLayout } from "./AuthScreenLayout"
import { useEmailLogin, useAuthColors } from "../hooks"
import type { LoginForm } from "../types"
import { tokens } from "@/src/theme/tokens"

export function EmailLoginScreen() {
  const {
    isLoading,
    loginError,
    withdrawalPending,
    isCancellingWithdrawal,
    clearLoginError,
    dismissWithdrawalPending,
    confirmWithdrawalCancel,
    submitLogin,
  } = useEmailLogin()
  const colors = useAuthColors()

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<LoginForm>({
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  })

  const onSubmit = async (data: LoginForm) => {
    await submitLogin(data)
  }

  return (
    <AuthScreenLayout
      title="이메일로 로그인하기"
      buttonLabel="로그인"
      buttonDisabled={!isValid}
      buttonLoading={isLoading}
      onSubmit={handleSubmit(onSubmit)}
    >
      <ConfirmModal
        visible={!!withdrawalPending}
        title="회원탈퇴 처리중입니다."
        description="회원 탈퇴를 취소하고 다시 로그인하겠습니까?"
        cancelText="아니오"
        confirmText={
          isCancellingWithdrawal ? "처리 중..." : "탈퇴 취소 후 로그인"
        }
        onCancel={dismissWithdrawalPending}
        onConfirm={confirmWithdrawalCancel}
      />

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

        <YStack>
          <FormTextField<LoginForm>
            name="password"
            control={control}
            label="비밀번호"
            placeholder="비밀번호를 입력해주세요"
            inputType="password"
            rules={{
              required: "비밀번호를 입력해주세요.",
              onChange: clearLoginError,
            }}
          />
          {loginError && (
            <Text
              fontSize={12}
              color={tokens.color.error.val}
              letterSpacing={-0.3}
              paddingTop={6}
            >
              {loginError}
            </Text>
          )}
        </YStack>
      </YStack>

      {/* Footer */}
      <YStack alignItems="center" paddingVertical={20} gap={18} marginTop={54}>
        <XStack alignItems="center" justifyContent="center" gap={8}>
          <Text
            fontSize={13}
            color={colors.textSub}
            letterSpacing={-0.26}
            lineHeight={16.9}
          >
            계정이 없으신가요?
          </Text>
          <Pressable onPress={() => router.push("/(auth)/terms-agreement")}>
            <Text
              fontSize={14}
              color={colors.textSub}
              letterSpacing={-0.28}
              lineHeight={18.2}
              textDecorationLine="underline"
            >
              회원가입하기
            </Text>
          </Pressable>
        </XStack>

        <YStack alignItems="center" gap={8}>
          <Text
            fontSize={13}
            fontWeight="500"
            color={colors.text}
            letterSpacing={-0.26}
          >
            가입정보를 잊으셨나요?
          </Text>
          <XStack alignItems="center" justifyContent="center" gap={16}>
            <Pressable>
              <Text fontSize={13} color={colors.textSub} letterSpacing={-0.26}>
                아이디찾기
              </Text>
            </Pressable>
            <Separator vertical borderColor={colors.border} height={14} />
            <Pressable onPress={() => router.push("/(auth)/forgot-password")}>
              <Text fontSize={13} color={colors.textSub} letterSpacing={-0.26}>
                비밀번호 찾기
              </Text>
            </Pressable>
          </XStack>
        </YStack>
      </YStack>
    </AuthScreenLayout>
  )
}
