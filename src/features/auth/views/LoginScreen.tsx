import { useState } from "react"
import { Platform, Pressable } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { Link, router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Toast from "react-native-toast-message"
import MainLogo from "@/assets/images/main-logo.svg"
import MainTextLogo from "@/assets/images/main-text-logo.svg"
import GoogleLogo from "@/assets/images/google-logo.svg"
import { useAuth } from "@/src/hooks/useAuth"
import { Ionicons } from "@expo/vector-icons"
import { logger } from "@/src/lib/logger"

export function LoginScreen() {
  const insets = useSafeAreaInsets()
  const { signInWithGoogle, signInWithApple, isUserCancelledError } = useAuth()
  const [socialLoading, setSocialLoading] = useState(false)

  const handleEmailLogin = () => {
    router.push("/(auth)/email-login")
  }

  const handleGoogleLogin = async () => {
    if (socialLoading) return
    setSocialLoading(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      if (!isUserCancelledError(error)) {
        const msg =
          error instanceof Error ? error.message : JSON.stringify(error)
        logger.debug("[LoginScreen] Google 로그인 에러", msg)
        Toast.show({
          type: "error",
          text1: "Google 로그인 실패",
          text2: msg,
          visibilityTime: 5000,
        })
      }
    } finally {
      setSocialLoading(false)
    }
  }

  const handleAppleLogin = async () => {
    if (socialLoading) return
    setSocialLoading(true)
    try {
      await signInWithApple()
    } catch (error) {
      if (!isUserCancelledError(error)) {
        const msg =
          error instanceof Error ? error.message : JSON.stringify(error)
        logger.debug("[LoginScreen] Apple 로그인 에러", msg)
        Toast.show({
          type: "error",
          text1: "Apple 로그인 실패",
          text2: msg,
          visibilityTime: 5000,
        })
      }
    } finally {
      setSocialLoading(false)
    }
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
      <YStack gap={12}>
        {/* 이메일 로그인 */}
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

        {/* 구분선 */}
        <XStack alignItems="center" gap={12} marginVertical={4}>
          <YStack flex={1} height={1} backgroundColor="#2A2C30" />
          <Text color="#6B7280" fontSize={13}>
            또는
          </Text>
          <YStack flex={1} height={1} backgroundColor="#2A2C30" />
        </XStack>

        {/* Google 로그인 */}
        <Pressable onPress={handleGoogleLogin} disabled={socialLoading}>
          <XStack
            backgroundColor="#FFFFFF"
            paddingVertical={16}
            paddingHorizontal={24}
            borderRadius={8}
            alignItems="center"
            justifyContent="center"
            gap={10}
            opacity={socialLoading ? 0.6 : 1}
          >
            <GoogleLogo width={20} height={20} />
            <Text
              color="#1F1F1F"
              fontSize={16}
              fontWeight="500"
              letterSpacing={-0.3}
              lineHeight={20}
            >
              Google로 계속하기
            </Text>
          </XStack>
        </Pressable>

        {/* Apple 로그인 (iOS만) */}
        {Platform.OS === "ios" && (
          <Pressable onPress={handleAppleLogin} disabled={socialLoading}>
            <XStack
              backgroundColor="#000000"
              paddingVertical={16}
              paddingHorizontal={24}
              borderRadius={8}
              alignItems="center"
              justifyContent="center"
              gap={10}
              opacity={socialLoading ? 0.6 : 1}
            >
              <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
              <Text
                color="#FFFFFF"
                fontSize={16}
                fontWeight="500"
                letterSpacing={-0.3}
                lineHeight={20}
              >
                Apple로 계속하기
              </Text>
            </XStack>
          </Pressable>
        )}

        {/* 회원가입 링크 */}
        <XStack
          justifyContent="center"
          alignItems="center"
          gap={8}
          marginTop={8}
        >
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
