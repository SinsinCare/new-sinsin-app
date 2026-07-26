import { Platform, Pressable, useWindowDimensions } from "react-native"
import { YStack, XStack, Text, Spinner } from "tamagui"
import { Link, router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import SigninBackground from "@/assets/images/sinsin_signin_bg_260727.svg"
import GoogleLogo from "@/assets/images/google-logo.svg"
import KakaoLogo from "@/assets/images/kakao-logo.svg"
import { Ionicons } from "@expo/vector-icons"
import { useAuthColors, useSocialLogin } from "../hooks"
import { ConfirmModal } from "@/src/shared/components/ConfirmModal"
import { useV2Theme } from "@/src/design-system-v2"
import { getLoginHeroLayout } from "../data/loginPresentation"

export function LoginScreen() {
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const {
    socialLoading,
    socialLoadingMessage,
    withdrawalPending,
    isCancellingWithdrawal,
    loginWithProvider,
    confirmWithdrawalCancellation,
    dismissWithdrawalPending,
  } = useSocialLogin()
  const colors = useAuthColors()
  const { colors: v2Colors } = useV2Theme()
  const heroLayout = getLoginHeroLayout({
    viewportWidth: width,
    viewportHeight: height,
    topInset: insets.top,
    bottomInset: insets.bottom,
    showsAppleLogin: Platform.OS === "ios",
  })

  const handleEmailLogin = () => {
    router.push("/(auth)/email-login")
  }

  return (
    <YStack
      flex={1}
      backgroundColor={colors.bg}
      paddingTop={insets.top}
      paddingBottom={insets.bottom + 24}
      position="relative"
    >
      {/* Figma 6010:41988 / background 6010:41989 artwork. */}
      {heroLayout.height > 0 && (
        <YStack
          width={heroLayout.width}
          height={heroLayout.height}
          overflow="hidden"
        >
          <SigninBackground
            width={heroLayout.width}
            height={heroLayout.height}
            preserveAspectRatio={heroLayout.preserveAspectRatio}
          />
        </YStack>
      )}

      <YStack paddingHorizontal={20} gap={12}>
        <ConfirmModal
          visible={!!withdrawalPending}
          title="회원탈퇴 처리중입니다."
          description="회원 탈퇴를 취소하고 다시 로그인하겠습니까?"
          cancelText="아니오"
          confirmText={
            isCancellingWithdrawal ? "처리 중..." : "탈퇴 취소 후 로그인"
          }
          onCancel={dismissWithdrawalPending}
          onConfirm={confirmWithdrawalCancellation}
        />

        {/* 이메일 로그인 */}
        <Pressable
          onPress={handleEmailLogin}
          accessibilityRole="button"
          accessibilityLabel="이메일 로그인"
        >
          <YStack
            backgroundColor={v2Colors.primary.primary}
            paddingVertical={16}
            paddingHorizontal={24}
            borderRadius={8}
            alignItems="center"
            justifyContent="center"
          >
            <Text
              color={v2Colors.static.white}
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
        <Pressable
          onPress={() => loginWithProvider("google")}
          disabled={socialLoading}
        >
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
        <Pressable
          onPress={() => loginWithProvider("kakao")}
          disabled={socialLoading}
        >
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
          <Pressable
            onPress={() => loginWithProvider("apple")}
            disabled={socialLoading}
          >
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

      {socialLoading && (
        <YStack
          position="absolute"
          top={0}
          right={0}
          bottom={0}
          left={0}
          zIndex={10}
          backgroundColor={
            colors.isDark ? "rgba(31,31,33,0.92)" : "rgba(255,255,255,0.92)"
          }
          justifyContent="center"
          alignItems="center"
          gap={14}
          paddingHorizontal={24}
        >
          <Spinner size="large" color="#44AF94" />
          <Text
            color={colors.text}
            fontSize={17}
            fontWeight="600"
            lineHeight={24}
            textAlign="center"
          >
            {socialLoadingMessage}
          </Text>
          <Text
            color={colors.textSub}
            fontSize={14}
            lineHeight={20}
            textAlign="center"
          >
            계정 정보를 확인하고 있어요.
          </Text>
        </YStack>
      )}
    </YStack>
  )
}
