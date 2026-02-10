import { useState } from "react"
import { Pressable } from "react-native"
import { YStack, Text } from "tamagui"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useForm } from "react-hook-form"
import { Ionicons } from "@expo/vector-icons"
import { FormTextField } from "../../src/shared/components"
import { useAuth } from "../../src/hooks"
import { useSignupStore } from "../../src/stores/signupStore"

interface PasswordForm {
  password: string
  confirmPassword: string
}

export default function SignupPasswordScreen() {
  const insets = useSafeAreaInsets()
  const { signUpWithEmail, isLoading } = useAuth()
  const email = useSignupStore((s) => s.email)
  const setSignupInProgress = useSignupStore((s) => s.setSignupInProgress)
  const [error, setError] = useState("")

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

  const onSubmit = async (data: PasswordForm) => {
    try {
      setError("")
      setSignupInProgress(true)
      await signUpWithEmail(email, data.password)
      router.replace("/(auth)/profile-setup")
    } catch (e: any) {
      setSignupInProgress(false)
      setError(e.message || "회원가입에 실패했습니다.")
    }
  }

  return (
    <YStack flex={1} backgroundColor="white" paddingTop={insets.top}>
      {/* Top Navigation */}
      <YStack height={56} justifyContent="center">
        <Pressable
          onPress={() => router.back()}
          style={{ position: "absolute", left: 9, padding: 4 }}
        >
          <Ionicons name="chevron-back" size={24} color="#17191C" />
        </Pressable>
      </YStack>

      {/* Content */}
      <YStack flex={1} paddingHorizontal={20} justifyContent="space-between">
        <YStack>
          <Text
            fontSize={22}
            fontWeight="600"
            color="#17191C"
            letterSpacing={-0.44}
            lineHeight={26.4}
            marginBottom={8}
          >
            비밀번호를 입력해주세요.
          </Text>
          <Text
            fontSize={15}
            lineHeight="120%"
            color="#787C83"
            marginBottom={56}
          >
            영문 대/소문자, 숫자, 특수문자 포함{"\n"}
            6~18자 이내로 입력해주세요
          </Text>

          <YStack gap={36}>
            <FormTextField<PasswordForm>
              name="password"
              control={control}
              label="비밀번호"
              placeholder="비밀번호를 형식에 맞춰 입력해주세요"
              inputType="password"
              rules={{
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
                  hasLetter: (v) =>
                    /[a-zA-Z]/.test(v) || "영문 대/소문자를 포함해주세요.",
                  hasNumber: (v) => /[0-9]/.test(v) || "숫자를 포함해주세요.",
                  hasSpecialChar: (v) =>
                    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v) ||
                    "특수문자를 포함해주세요.",
                },
              }}
            />

            <FormTextField<PasswordForm>
              name="confirmPassword"
              control={control}
              label="비밀번호 확인"
              placeholder="입력한 비밀번호를 다시 입력해주세요"
              inputType="password"
              rules={{
                required: "비밀번호 확인을 입력해주세요.",
                validate: (value) =>
                  value === password || "비밀번호가 일치하지 않습니다.",
              }}
            />
          </YStack>

          {error ? (
            <Text fontSize={14} color="#FF3B30" letterSpacing={-0.28}>
              {error}
            </Text>
          ) : null}
        </YStack>

        {/* 회원가입 버튼 */}
        <YStack paddingBottom={insets.bottom + 24}>
          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={!isValid || isLoading}
          >
            <YStack
              backgroundColor={isValid ? "#5464F2" : "#5464F247"}
              paddingVertical={16}
              paddingHorizontal={24}
              borderRadius={8}
              alignItems="center"
              justifyContent="center"
            >
              <Text
                color="white"
                fontSize={16}
                fontWeight="500"
                letterSpacing={-0.3}
                lineHeight={20}
              >
                다음 단계
              </Text>
            </YStack>
          </Pressable>
        </YStack>
      </YStack>
    </YStack>
  )
}
