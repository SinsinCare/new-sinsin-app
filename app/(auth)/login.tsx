import { Pressable } from "react-native"
import { YStack, XStack, Text, Separator } from "tamagui"
import { Link, router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons, FontAwesome } from "@expo/vector-icons"

export default function LoginScreen() {
  const insets = useSafeAreaInsets()

  const handleEmailLogin = () => {
    router.push("/(auth)/email-login")
  }

  const handleKakaoLogin = () => {
    // TODO: Kakao 로그인 구현
  }

  const handleAppleLogin = () => {
    // TODO: Apple 로그인 구현
  }

  const handleSkipLogin = () => {
    router.replace("/(tabs)/home")
  }

  return (
    <YStack
      flex={1}
      backgroundColor="#131416"
      justifyContent="flex-end"
      alignItems="center"
      paddingBottom={insets.bottom + 24}
      paddingHorizontal={20}
      gap={24}
    >
      {/* Login buttons */}
      <YStack width={350} alignSelf="center" gap={12}>
        {/* 이메일 로그인 */}
        <Pressable onPress={handleEmailLogin}>
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
              이메일 로그인
            </Text>
          </YStack>
        </Pressable>

        {/* 카카오로 시작하기 */}
        <Pressable onPress={handleKakaoLogin}>
          <XStack
            backgroundColor="#FEE500"
            paddingVertical={16}
            paddingHorizontal={24}
            borderRadius={8}
            alignItems="center"
            justifyContent="center"
          >
            <YStack position="absolute" left={16}>
              <FontAwesome name="comment" size={28} color="#000000" />
            </YStack>
            <Text
              color="#000000"
              fontSize={16}
              fontWeight="500"
              letterSpacing={-0.3}
              lineHeight={20}
            >
              카카오로 시작하기
            </Text>
          </XStack>
        </Pressable>

        {/* 애플로 시작하기 */}
        <Pressable onPress={handleAppleLogin}>
          <XStack
            backgroundColor="#000000"
            paddingVertical={16}
            paddingHorizontal={24}
            borderRadius={8}
            alignItems="center"
            justifyContent="center"
          >
            <YStack position="absolute" left={16}>
              <Ionicons name="logo-apple" size={28} color="#FFFFFF" />
            </YStack>
            <Text
              color="#FFFFFF"
              fontSize={16}
              fontWeight="500"
              letterSpacing={-0.3}
              lineHeight={20}
            >
              애플로 시작하기
            </Text>
          </XStack>
        </Pressable>
      </YStack>

      {/* Sign up + skip section */}
      <YStack alignItems="center" width="100%" gap={20}>
        {/* 회원가입 */}
        <XStack alignItems="center" gap={8}>
          <Text
            color="#C5C8CE"
            fontSize={13}
            letterSpacing={-0.26}
            lineHeight={16.9}
          >
            아직 헬시어 회원이 아니신가요?
          </Text>
          <Link href="/(auth)/terms-agreement" asChild>
            <Text
              color="#C5C8CE"
              fontSize={14}
              letterSpacing={-0.28}
              lineHeight={18.2}
              textDecorationLine="underline"
            >
              회원가입하기
            </Text>
          </Link>
        </XStack>

        {/* Divider */}
        <Separator borderColor="#1E2127" width="100%" />

        {/* 나중에 로그인 */}
        <YStack alignItems="center" gap={8}>
          <Text
            color="#787C83"
            fontSize={14}
            letterSpacing={-0.28}
            lineHeight={18.2}
          >
            나중에 로그인 하시겠어요?
          </Text>
          <Pressable onPress={handleSkipLogin}>
            <YStack
              backgroundColor="#131416"
              borderWidth={1}
              borderColor="#2E323A"
              paddingVertical={10}
              paddingHorizontal={12}
              borderRadius={16}
              alignItems="center"
            >
              <Text
                color="#787C83"
                fontSize={12}
                letterSpacing={-0.3}
                lineHeight={14}
              >
                홈 둘러보기
              </Text>
            </YStack>
          </Pressable>
        </YStack>
      </YStack>
    </YStack>
  )
}
