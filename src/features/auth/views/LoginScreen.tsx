import { Pressable } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { Link, router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import MainLogo from "@/assets/images/main-logo.svg"
import MainTextLogo from "@/assets/images/main-text-logo.svg"

export function LoginScreen() {
  const insets = useSafeAreaInsets()

  const handleEmailLogin = () => {
    router.push("/(auth)/email-login")
  }

  return (
    <YStack
      flex={1}
      backgroundColor="#131416"
      paddingTop={insets.top}
      paddingBottom={insets.bottom + 24}
      paddingHorizontal={20}
    >
      {/* 로고 영역 */}
      <YStack flex={1} justifyContent="center" alignItems="center" gap={24}>
        <YStack alignItems="center" gap={0}>
          <Text
            color="#FDFDFD"
            fontSize={24}
            fontWeight="600"
            letterSpacing={-0.3}
            lineHeight={32}
          >
            신장관리 통합 솔루션
          </Text>
          <MainTextLogo width={180} height={40} />
        </YStack>
        <MainLogo width={160} height={172} />
      </YStack>

      {/* 버튼 영역 */}
      <YStack gap={20}>
        <Pressable onPress={handleEmailLogin}>
          <YStack
            backgroundColor="#34D399"
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

        <XStack justifyContent="center" alignItems="center" gap={8}>
          <Text
            color="#C5C8CE"
            fontSize={13}
            letterSpacing={-0.26}
            lineHeight={16.9}
          >
            신신당부가 처음이신가요?
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
      </YStack>
    </YStack>
  )
}
