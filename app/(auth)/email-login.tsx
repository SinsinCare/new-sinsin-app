import { Pressable } from "react-native"
import { YStack, XStack, Text, Separator } from "tamagui"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useForm } from "react-hook-form"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "../../src/hooks"
import { FormTextField, ErrorMessage } from "../../src/shared/components"

interface LoginForm {
  email: string
  password: string
}

export default function EmailLoginScreen() {
  const { signInWithEmail, isLoading } = useAuth()
  const insets = useSafeAreaInsets()

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<LoginForm>({
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      await signInWithEmail(data.email, data.password)
      router.replace("/(tabs)/home")
    } catch (e: any) {
      // TODO: 서버 에러 처리
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
      <YStack paddingHorizontal={20} gap={54}>
        {/* Title + Fields */}
        <YStack gap={48}>
          <Text
            fontSize={22}
            fontWeight="600"
            color="#17191C"
            letterSpacing={-0.44}
            lineHeight={26.4}
          >
            이메일로 로그인하기
          </Text>

          <YStack gap={36}>
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
        </YStack>

        {/* Login Button */}
        <YStack paddingBottom={32}>
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
                로그인
              </Text>
            </YStack>
          </Pressable>
        </YStack>
      </YStack>

      {/* Footer */}
      <YStack alignItems="center" paddingVertical={20} gap={8}>
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
    </YStack>
  )
}
