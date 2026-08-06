import { Platform, Pressable, useWindowDimensions } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { V2DotLoader } from "@/src/design-system-v2"
import { Link, router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Image } from "expo-image"
import GoogleLogo from "@/assets/images/google-logo.svg"
import KakaoLogo from "@/assets/images/kakao-logo.svg"
import { Ionicons } from "@expo/vector-icons"
import { useTranslation } from "react-i18next"
import { useAuthColors, useSocialLogin } from "../hooks"
import { useAuthSurface } from "../hooks/useAuthSurface"
import { AUTH_LAYOUT, AUTH_TYPE } from "../data/authSurface"
import { ConfirmModal } from "@/src/shared/components/ConfirmModal"
import { tokens } from "@/src/theme/tokens"

// 디자인 프레임 375x530 기준. 화면 폭에 맞춰 같은 비율로 늘린다.
const BG_ASPECT = 530 / 375

// 안전영역 아래로 더 내리는 여백. 구워진 타이틀이 상태바에 붙지 않게 한다.
const BG_TOP_OFFSET = 16

// 배경은 base64 를 품은 SVG(1.35MB)로 들어왔다. SVG 로 두면 svg-transformer 가
// JS 컴포넌트로 컴파일해 base64 문자열이 번들에 그대로 실리고 콜드스타트마다 파싱된다.
// PNG 로 분리하고 표시 크기의 3배로 리사이즈했다(1620x2290 -> 853x1206, 986KB -> 500KB).
const LOGIN_BG = require("@/assets/images/login-bg.png")

interface SocialButtonProps {
  label: string
  bg: string
  color: string
  icon: React.ReactNode
  onPress: () => void
  disabled?: boolean
}

function SocialButton({
  label,
  bg,
  color,
  icon,
  onPress,
  disabled,
}: SocialButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
    >
      {({ pressed }) => (
        <XStack
          backgroundColor={bg}
          height={AUTH_LAYOUT.ctaHeight}
          borderRadius={AUTH_LAYOUT.radius.cta}
          alignItems="center"
          paddingHorizontal={20}
          opacity={disabled ? 0.6 : pressed ? 0.92 : 1}
        >
          {/* 아이콘은 왼쪽 고정, 라벨은 버튼 중앙 — 목업과 같은 배치 */}
          <XStack width={24} alignItems="center" justifyContent="center">
            {icon}
          </XStack>
          <Text
            flex={1}
            textAlign="center"
            color={color}
            {...AUTH_TYPE.cta}
            fontWeight="600"
            marginRight={24}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {label}
          </Text>
        </XStack>
      )}
    </Pressable>
  )
}

export function LoginScreen() {
  const { t, i18n } = useTranslation("auth")
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
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
  const surface = useAuthSurface()
  const isEnglish = i18n.resolvedLanguage?.startsWith("en") ?? false

  const handleEmailLogin = () => {
    router.push("/(auth)/email-login")
  }

  return (
    <YStack flex={1} backgroundColor={surface.canvas} position="relative">
      {/* 배경 일러스트. 타이틀이 이미지에 구워져 있어서 top:0 으로 두면
          다이나믹 아일랜드·상태바에 물린다. 안전영역만큼 내려서 시작한다. */}
      <Image
        source={LOGIN_BG}
        accessible={!isEnglish}
        accessibilityLabel={
          isEnglish
            ? undefined
            : `${t("login.heroEyebrow")} ${t("login.heroBrand")}`
        }
        style={{
          position: "absolute",
          top: insets.top + BG_TOP_OFFSET,
          left: 0,
          width,
          height: width * BG_ASPECT,
        }}
        contentFit="cover"
        transition={0}
      />

      {/* 한국어 타이틀은 이미지에 포함돼 있다. 영어에서는 해당 영역을 가리고
          실제 텍스트를 올려 언어 전환과 접근성 글꼴 크기를 함께 지원한다. */}
      {isEnglish && (
        <YStack
          position="absolute"
          zIndex={1}
          top={insets.top + BG_TOP_OFFSET}
          left={0}
          width={width}
          height={width * 0.31}
          backgroundColor="#FFFEFE"
          alignItems="center"
          justifyContent="center"
          paddingTop={6}
        >
          <Text
            color="#9B9B9B"
            fontSize={18}
            lineHeight={24}
            fontWeight="500"
            textAlign="center"
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {t("login.heroEyebrow")}
          </Text>
          <Text
            color={surface.brand}
            fontSize={36}
            lineHeight={43}
            fontWeight="700"
            textAlign="center"
          >
            {t("login.heroBrand")}
          </Text>
        </YStack>
      )}
      <YStack flex={1} />

      {/* 하단 시트 */}
      <YStack
        backgroundColor={surface.canvas}
        borderTopLeftRadius={AUTH_LAYOUT.radius.sheet}
        borderTopRightRadius={AUTH_LAYOUT.radius.sheet}
        paddingHorizontal={AUTH_LAYOUT.screenX}
        paddingTop={28}
        paddingBottom={insets.bottom + 20}
        gap={10}
      >
        <ConfirmModal
          visible={!!withdrawalPending}
          title={t("withdrawal.pendingTitle")}
          description={t("withdrawal.pendingDescription")}
          cancelText={t("withdrawal.cancel")}
          confirmText={
            isCancellingWithdrawal
              ? t("withdrawal.cancelling")
              : t("withdrawal.cancelAndLogin")
          }
          onCancel={dismissWithdrawalPending}
          onConfirm={confirmWithdrawalCancellation}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("login.emailButton")}
          onPress={handleEmailLogin}
        >
          {({ pressed }) => (
            <YStack
              backgroundColor={surface.brand}
              height={AUTH_LAYOUT.ctaHeight}
              borderRadius={AUTH_LAYOUT.radius.cta}
              alignItems="center"
              justifyContent="center"
              opacity={pressed ? 0.92 : 1}
            >
              <Text color={surface.onBrand} {...AUTH_TYPE.cta} fontWeight="600">
                {t("login.emailButton")}
              </Text>
            </YStack>
          )}
        </Pressable>

        <SocialButton
          label={t("login.continueGoogle")}
          bg={colors.googleBg}
          color={colors.googleText}
          icon={<GoogleLogo width={20} height={20} />}
          onPress={() => loginWithProvider("google")}
          disabled={socialLoading}
        />

        <SocialButton
          label={t("login.continueKakao")}
          bg={colors.kakaoBg}
          color={colors.kakaoText}
          icon={<KakaoLogo width={20} height={20} />}
          onPress={() => loginWithProvider("kakao")}
          disabled={socialLoading}
        />

        {Platform.OS === "ios" && (
          <SocialButton
            label={t("login.continueApple")}
            bg={colors.appleBg}
            color={colors.appleText}
            icon={
              <Ionicons name="logo-apple" size={20} color={colors.appleText} />
            }
            onPress={() => loginWithProvider("apple")}
            disabled={socialLoading}
          />
        )}

        <XStack
          justifyContent="center"
          alignItems="center"
          gap={6}
          marginTop={8}
        >
          <Text color={colors.textSub} fontSize={13} letterSpacing={-0.26}>
            {t("login.newHere")}
          </Text>
          <Link href="/(auth)/terms-agreement" asChild>
            <Text
              color={colors.text}
              fontSize={13}
              fontWeight="600"
              letterSpacing={-0.26}
              textDecorationLine="underline"
            >
              {t("login.signUp")}
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
            colors.isDark ? "rgba(28,28,30,0.92)" : "rgba(255,255,255,0.92)"
          }
          justifyContent="center"
          alignItems="center"
          gap={14}
          paddingHorizontal={24}
        >
          <V2DotLoader size="l" color={tokens.color.sub6.val} />
          <Text
            color={colors.text}
            fontSize={17}
            fontWeight="600"
            lineHeight={24}
            textAlign="center"
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {socialLoadingMessage}
          </Text>
          <Text
            color={colors.textSub}
            fontSize={14}
            lineHeight={20}
            textAlign="center"
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {t("login.checkingAccount")}
          </Text>
        </YStack>
      )}
    </YStack>
  )
}
