import { Pressable } from "react-native"
import { YStack, Text } from "tamagui"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useUserStore } from "../../src/stores"
import { useSignupStore } from "../../src/stores/signupStore"

export default function SignupCompleteScreen() {
  const insets = useSafeAreaInsets()
  const profile = useUserStore((s) => s.profile)
  const signupNickname = useSignupStore((s) => s.nickname)
  const resetSignup = useSignupStore((s) => s.reset)
  const nickname =
    signupNickname || profile?.nickname || profile?.displayName || ""

  return (
    <YStack flex={1} backgroundColor="white" paddingTop={insets.top}>
      {/* Content */}
      <YStack flex={1} paddingHorizontal={20} justifyContent="space-between">
        <YStack flex={1} alignItems="center" justifyContent="center" gap={24}>
          {/* Check Icon */}
          <YStack
            width={80}
            height={80}
            borderRadius={40}
            backgroundColor="#5464F2"
            alignItems="center"
            justifyContent="center"
          >
            <Ionicons name="checkmark" size={40} color="white" />
          </YStack>

          {/* Welcome Text */}
          <YStack alignItems="center" gap={8}>
            <Text
              fontSize={22}
              fontWeight="600"
              color="#17191C"
              letterSpacing={-0.44}
              lineHeight={26.4}
              textAlign="center"
            >
              {nickname}님{"\n"}만나서 반가워요
            </Text>
            <Text
              fontSize={15}
              lineHeight={18}
              color="#787C83"
              textAlign="center"
            >
              회원가입이 완료되었습니다
            </Text>
          </YStack>
        </YStack>

        {/* 시작하기 버튼 */}
        <YStack paddingBottom={insets.bottom + 24}>
          <Pressable
            onPress={() => {
              resetSignup()
              router.replace("/(tabs)/home")
            }}
          >
            <YStack
              backgroundColor="#5464F2"
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
                신신케어 시작하기
              </Text>
            </YStack>
          </Pressable>
        </YStack>
      </YStack>
    </YStack>
  )
}
