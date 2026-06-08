import { useState } from "react"
import { Platform, Pressable } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { Link, router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Toast from "react-native-toast-message"
import MainLogo from "@/assets/images/main-logo.svg"
import MainTextLogo from "@/assets/images/main-text-logo.svg"
import GoogleLogo from "@/assets/images/google-logo.svg"
import KakaoLogo from "@/assets/images/kakao-logo.svg"
import { useAuth } from "@/src/hooks/useAuth"
import { Ionicons } from "@expo/vector-icons"
import { logger } from "@/src/lib/logger"
import { useAuthColors } from "../hooks"
import { ConfirmModal } from "@/src/shared/components/ConfirmModal"
import { getWithdrawalPendingResult } from "../utils/withdrawalPending"
import type { WithdrawalPendingResult } from "@/src/types"

export function LoginScreen() {
  const insets = useSafeAreaInsets()
  const {
    signInWithGoogle,
    signInWithApple,
    signInWithKakao,
    cancelWithdrawal,
    isUserCancelledError,
  } = useAuth()
  const [socialLoading, setSocialLoading] = useState(false)
  const [withdrawalPending, setWithdrawalPending] =
    useState<WithdrawalPendingResult | null>(null)
  const [isCancellingWithdrawal, setIsCancellingWithdrawal] = useState(false)
  const colors = useAuthColors()

  const handleWithdrawalCancel = async () => {
    if (!withdrawalPending || isCancellingWithdrawal) return
    setIsCancellingWithdrawal(true)
    try {
      await cancelWithdrawal(withdrawalPending.cancelToken)
      setWithdrawalPending(null)
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "회원탈퇴 취소 중 문제가 발생했습니다."
      Toast.show({
        type: "error",
        text1: "회원탈퇴 취소 실패",
        text2: msg,
        visibilityTime: 5000,
      })
    } finally {
      setIsCancellingWithdrawal(false)
    }
  }

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
        const pending = getWithdrawalPendingResult(error)
        if (pending) {
          setWithdrawalPending(pending)
          return
        }
        const msg =
          error instanceof Error
            ? error.message
            : "로그인 중 문제가 발생했습니다."
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
        const pending = getWithdrawalPendingResult(error)
        if (pending) {
          setWithdrawalPending(pending)
          return
        }
        const msg =
          error instanceof Error
            ? error.message
            : "로그인 중 문제가 발생했습니다."
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

  const handleKakaoLogin = async () => {
    if (socialLoading) return
    logger.debug("[LoginScreen] Kakao 로그인 시작")
    setSocialLoading(true)
    try {
      await signInWithKakao()
      logger.debug("[LoginScreen] Kakao 로그인 성공")
    } catch (error) {
      const cancelled = isUserCancelledError(error)
      logger.debug("[LoginScreen] Kakao 로그인 에러", { cancelled })
      if (!cancelled) {
        const pending = getWithdrawalPendingResult(error)
        if (pending) {
          setWithdrawalPending(pending)
          return
        }
        const msg =
          error instanceof Error
            ? error.message
            : "로그인 중 문제가 발생했습니다."
        Toast.show({
          type: "error",
          text1: "카카오 로그인 실패",
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
      backgroundColor={colors.bg}
      paddingTop={insets.top}
      paddingBottom={insets.bottom + 24}
      paddingHorizontal={20}
    >
      {/* 로고 영역 */}
      <YStack flex={1} justifyContent="center" alignItems="center" gap={24}>
        <YStack alignItems="center" gap={0}>
          <Text
            color={colors.text}
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
        <ConfirmModal
          visible={!!withdrawalPending}
          title="회원탈퇴 처리중입니다."
          description="회원 탈퇴를 취소하고 다시 로그인하겠습니까?"
          cancelText="아니오"
          confirmText={
            isCancellingWithdrawal ? "처리 중..." : "탈퇴 취소 후 로그인"
          }
          onCancel={() => setWithdrawalPending(null)}
          onConfirm={handleWithdrawalCancel}
        />

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
          <YStack flex={1} height={1} backgroundColor={colors.border} />
          <Text color={colors.textSub} fontSize={13}>
            또는
          </Text>
          <YStack flex={1} height={1} backgroundColor={colors.border} />
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

        {/* 카카오 로그인 */}
        <Pressable onPress={handleKakaoLogin} disabled={socialLoading}>
          <XStack
            backgroundColor="#FEE500"
            paddingVertical={16}
            paddingHorizontal={24}
            borderRadius={8}
            alignItems="center"
            justifyContent="center"
            gap={10}
            opacity={socialLoading ? 0.6 : 1}
          >
            <KakaoLogo width={20} height={20} />
            <Text
              color="#191919"
              fontSize={16}
              fontWeight="500"
              letterSpacing={-0.3}
              lineHeight={20}
            >
              카카오로 계속하기
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
            color={colors.textSub}
            fontSize={13}
            letterSpacing={-0.26}
            lineHeight={16.9}
          >
            신신당부가 처음이신가요?
          </Text>
          <Link href="/(auth)/terms-agreement" asChild>
            <Text
              color={colors.textSub}
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
