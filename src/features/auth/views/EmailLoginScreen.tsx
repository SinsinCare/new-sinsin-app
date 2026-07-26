import { Pressable, StyleSheet, Text, View } from "react-native"
import { router } from "expo-router"
import { useForm } from "react-hook-form"
import { spacing, typography, useV2Theme } from "@/src/design-system-v2"
import { AuthScreenLayout } from "./AuthScreenLayout"
import { AuthWithdrawalRecoveryModal } from "../components/AuthWithdrawalRecoveryModal"
import { V2AuthFormTextField } from "../components/V2AuthFormTextField"
import { useEmailLogin } from "../hooks"
import type { LoginForm } from "../types"

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
  const { colors } = useV2Theme()

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
      buttonAccessory={
        <View style={styles.signupPrompt}>
          <Text
            style={[
              typography.subtext.medium,
              { color: colors.label.alternative },
            ]}
          >
            계정이 없으신가요?
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="회원가입하기"
            onPress={() => router.push("/(auth)/terms-agreement")}
          >
            <Text
              style={[
                typography.subtext.large,
                styles.underline,
                { color: colors.label.alternative },
              ]}
            >
              회원가입하기
            </Text>
          </Pressable>
        </View>
      }
      onSubmit={handleSubmit(onSubmit)}
      scrollable
      keyboardAvoiding
    >
      <AuthWithdrawalRecoveryModal
        visible={!!withdrawalPending}
        isCancelling={isCancellingWithdrawal}
        onDismiss={dismissWithdrawalPending}
        onConfirm={confirmWithdrawalCancel}
      />

      <View style={styles.form}>
        <V2AuthFormTextField<LoginForm>
          name="email"
          control={control}
          label="이메일"
          placeholder="이메일 주소를 입력해주세요"
          inputType="email"
          keyboardContentType="username"
          autoComplete="email"
          rules={{
            required: "이메일을 입력해주세요.",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "올바른 이메일 형식이 아닙니다.",
            },
          }}
        />

        <View>
          <V2AuthFormTextField<LoginForm>
            name="password"
            control={control}
            label="비밀번호"
            placeholder="비밀번호를 입력해주세요"
            inputType="password"
            keyboardContentType="password"
            autoComplete="current-password"
            showPasswordToggle
            rules={{
              required: "비밀번호를 입력해주세요.",
              onChange: clearLoginError,
            }}
          />
          {loginError && (
            <Text
              style={[
                typography.subtext.medium,
                styles.loginError,
                { color: colors.status.negative },
              ]}
            >
              {loginError}
            </Text>
          )}
        </View>

        <View style={styles.passwordHelp}>
          <Text
            style={[
              typography.subtext.mediumStrong,
              { color: colors.label.normal },
            ]}
          >
            비밀번호를 잊으셨나요?
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="비밀번호 찾기"
            onPress={() => router.push("/(auth)/forgot-password")}
          >
            <Text
              style={[
                typography.subtext.large,
                styles.underline,
                { color: colors.label.alternative },
              ]}
            >
              비밀번호 찾기
            </Text>
          </Pressable>
        </View>
      </View>
    </AuthScreenLayout>
  )
}

const styles = StyleSheet.create({
  form: { gap: spacing[32], marginTop: spacing[32] },
  signupPrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[8],
    marginBottom: spacing[16],
  },
  passwordHelp: { alignItems: "center", gap: spacing[8] },
  loginError: { marginTop: spacing[6] },
  underline: { textDecorationLine: "underline" },
})
