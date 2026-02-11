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
import { useUserStore } from "../../src/stores"
import { firestoreService } from "../../src/services/firestoreService"
import { nicknameService } from "../../src/services/nicknameService"
import type { UserProfile } from "../../src/types"

interface NicknameForm {
  nickname: string
}

export default function NicknameSetupScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const { setProfile } = useUserStore()
  const signupState = useSignupStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<NicknameForm>({
    defaultValues: { nickname: "" },
    mode: "onChange",
  })

  const onSubmit = async (data: NicknameForm) => {
    if (!user) return

    setIsLoading(true)
    setError("")
    try {
      const available = await nicknameService.checkNicknameAvailability(
        data.nickname,
      )
      if (!available) {
        setError("이미 사용 중인 닉네임입니다.")
        return
      }

      const birthDate = `${signupState.birthYear}-${signupState.birthMonth}-${signupState.birthDay}`

      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || "",
        displayName: signupState.name,
        nickname: data.nickname,
        birthDate,
        gender: signupState.gender as "male" | "female",
        height: 0,
        weight: 0,
        ckdStage: 3,
        onDialysis: false,
        referralCode: signupState.referralCode || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await firestoreService.setUserProfile(profile)
      setProfile(profile)
      signupState.setNickname(data.nickname)
      router.replace("/(auth)/signup-complete")
    } catch (e: any) {
      setError(e.message || "프로필 저장에 실패했습니다.")
    } finally {
      setIsLoading(false)
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
            닉네임을 설정해주세요.
          </Text>
          <Text fontSize={15} lineHeight={18} color="#787C83" marginBottom={56}>
            한글, 영문, 숫자만 사용 가능 (2~8자)
          </Text>

          <FormTextField<NicknameForm>
            name="nickname"
            control={control}
            label="닉네임"
            placeholder="닉네임을 입력해주세요"
            rules={{
              required: "닉네임을 입력해주세요.",
              minLength: {
                value: 2,
                message: "닉네임은 2자 이상이어야 합니다.",
              },
              maxLength: {
                value: 8,
                message: "닉네임은 8자 이하여야 합니다.",
              },
              pattern: {
                value: /^[가-힣a-zA-Z0-9]+$/,
                message: "한글, 영문, 숫자만 사용 가능합니다.",
              },
            }}
          />

          {error ? (
            <Text
              fontSize={14}
              color="#FF3B30"
              letterSpacing={-0.28}
              marginTop={8}
            >
              {error}
            </Text>
          ) : null}
        </YStack>

        {/* 다음 단계 버튼 */}
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
