import { Platform, Pressable, useWindowDimensions } from "react-native"
import { V2HStack, V2Text, V2VStack, V2DotLoader } from "@/src/design-system-v2"
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
        <V2HStack
          align="center"
          paddingHorizontal={20}
          style={{
            backgroundColor: bg,
            height: AUTH_LAYOUT.ctaHeight,
            borderRadius: AUTH_LAYOUT.radius.cta,
            opacity: disabled ? 0.6 : pressed ? 0.92 : 1,
          }}
        >
          {/* 아이콘은 왼쪽 고정, 라벨은 버튼 중앙 — 목업과 같은 배치 */}
          <V2HStack align="center" justify="center" style={{ width: 24 }}>
            {icon}
          </V2HStack>
          <V2Text
            color={color}
            {...AUTH_TYPE.cta}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
            style={{
              flex: 1,
              textAlign: "center",
              fontWeight: "600",
              marginRight: 24,
            }}
          >
            {label}
          </V2Text>
        </V2HStack>
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
    <V2VStack
      flex={1}
      style={{ backgroundColor: surface.canvas, position: "relative" }}
    >
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
        <V2VStack
          align="center"
          justify="center"
          paddingTop={6}
          style={{
            position: "absolute",
            zIndex: 1,
            top: insets.top + BG_TOP_OFFSET,
            left: 0,
            width: width,
            height: width * 0.31,
            backgroundColor: "#FFFEFE",
          }}
        >
          <V2Text
            color="#9B9B9B"
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
            style={{
              fontSize: 18,
              lineHeight: 24,
              fontWeight: "500",
              textAlign: "center",
            }}
          >
            {t("login.heroEyebrow")}
          </V2Text>
          <V2Text
            color={surface.brand}
            style={{
              fontSize: 36,
              lineHeight: 43,
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            {t("login.heroBrand")}
          </V2Text>
        </V2VStack>
      )}
      <V2VStack flex={1} />

      {/* 하단 시트 */}
      <V2VStack
        paddingHorizontal={AUTH_LAYOUT.screenX}
        paddingTop={28}
        paddingBottom={insets.bottom + 20}
        gap={10}
        style={{
          backgroundColor: surface.canvas,
          borderTopLeftRadius: AUTH_LAYOUT.radius.sheet,
          borderTopRightRadius: AUTH_LAYOUT.radius.sheet,
        }}
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
            <V2VStack
              align="center"
              justify="center"
              style={{
                backgroundColor: surface.brand,
                height: AUTH_LAYOUT.ctaHeight,
                borderRadius: AUTH_LAYOUT.radius.cta,
                opacity: pressed ? 0.92 : 1,
              }}
            >
              <V2Text
                color={surface.onBrand}
                {...AUTH_TYPE.cta}
                style={{ fontWeight: "600" }}
              >
                {t("login.emailButton")}
              </V2Text>
            </V2VStack>
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

        <V2HStack
          justify="center"
          align="center"
          gap={6}
          style={{ marginTop: 8 }}
        >
          <V2Text
            color={colors.textSub}
            style={{ fontSize: 13, letterSpacing: -0.26 }}
          >
            {t("login.newHere")}
          </V2Text>
          <Link href="/(auth)/terms-agreement" asChild>
            <V2Text
              color={colors.text}
              style={{
                fontSize: 13,
                fontWeight: "600",
                letterSpacing: -0.26,
                textDecorationLine: "underline",
              }}
            >
              {t("login.signUp")}
            </V2Text>
          </Link>
        </V2HStack>
      </V2VStack>

      {socialLoading && (
        <V2VStack
          justify="center"
          align="center"
          gap={14}
          paddingHorizontal={24}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 10,
            backgroundColor: colors.isDark
              ? "rgba(28,28,30,0.92)"
              : "rgba(255,255,255,0.92)",
          }}
        >
          <V2DotLoader size="l" color={tokens.color.sub6.val} />
          <V2Text
            color={colors.text}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
            style={{
              fontSize: 17,
              fontWeight: "600",
              lineHeight: 24,
              textAlign: "center",
            }}
          >
            {socialLoadingMessage}
          </V2Text>
          <V2Text
            color={colors.textSub}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
            style={{ fontSize: 14, lineHeight: 20, textAlign: "center" }}
          >
            {t("login.checkingAccount")}
          </V2Text>
        </V2VStack>
      )}
    </V2VStack>
  )
}
