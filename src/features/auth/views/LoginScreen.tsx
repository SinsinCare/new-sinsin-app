import { Platform, Pressable, useWindowDimensions } from "react-native"
import { YStack, XStack, Text, Spinner } from "tamagui"
import { Link, router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Image } from "expo-image"
import GoogleLogo from "@/assets/images/google-logo.svg"
import KakaoLogo from "@/assets/images/kakao-logo.svg"
import { Ionicons } from "@expo/vector-icons"
import { useAuthColors, useSocialLogin } from "../hooks"
import { AUTH_RADIUS } from "../hooks/useAuthColors"
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
    <Pressable onPress={onPress} disabled={disabled}>
      {({ pressed }) => (
        <XStack
          backgroundColor={bg}
          height={54}
          borderRadius={AUTH_RADIUS}
          alignItems="center"
          paddingHorizontal={20}
          opacity={disabled ? 0.6 : pressed ? 0.85 : 1}
        >
          {/* 아이콘은 왼쪽 고정, 라벨은 버튼 중앙 — 목업과 같은 배치 */}
          <XStack width={24} alignItems="center" justifyContent="center">
            {icon}
          </XStack>
          <Text
            flex={1}
            textAlign="center"
            color={color}
            fontSize={16}
            fontWeight="600"
            letterSpacing={-0.3}
            marginRight={24}
          >
            {label}
          </Text>
        </XStack>
      )}
    </Pressable>
  )
}

export function LoginScreen() {
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

  const handleEmailLogin = () => {
    router.push("/(auth)/email-login")
  }

  return (
    <YStack flex={1} backgroundColor={colors.sheetBg} position="relative">
      {/* 배경 일러스트. 타이틀이 이미지에 구워져 있어서 top:0 으로 두면
          다이나믹 아일랜드·상태바에 물린다. 안전영역만큼 내려서 시작한다. */}
      <Image
        source={LOGIN_BG}
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

      {/* 타이틀("신장 건강 관리는 / 신신당부")은 배경 이미지에 이미 포함돼 있다.
          텍스트로 다시 얹으면 겹친다. 문구를 바꿔야 하면 이미지를 교체해야 한다. */}
      <YStack flex={1} />

      {/* 하단 시트 */}
      <YStack
        backgroundColor={colors.sheetBg}
        borderTopLeftRadius={AUTH_RADIUS}
        borderTopRightRadius={AUTH_RADIUS}
        paddingHorizontal={20}
        paddingTop={24}
        paddingBottom={insets.bottom + 20}
        gap={10}
      >
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

        <Pressable onPress={handleEmailLogin}>
          {({ pressed }) => (
            <YStack
              backgroundColor={colors.primaryBg}
              height={54}
              borderRadius={AUTH_RADIUS}
              alignItems="center"
              justifyContent="center"
              opacity={pressed ? 0.85 : 1}
            >
              <Text
                color={colors.primaryText}
                fontSize={16}
                fontWeight="600"
                letterSpacing={-0.3}
              >
                이메일 로그인
              </Text>
            </YStack>
          )}
        </Pressable>

        <SocialButton
          label="구글로 시작하기"
          bg={colors.googleBg}
          color={colors.googleText}
          icon={<GoogleLogo width={20} height={20} />}
          onPress={() => loginWithProvider("google")}
          disabled={socialLoading}
        />

        <SocialButton
          label="카카오로 시작하기"
          bg={colors.kakaoBg}
          color={colors.kakaoText}
          icon={<KakaoLogo width={20} height={20} />}
          onPress={() => loginWithProvider("kakao")}
          disabled={socialLoading}
        />

        {Platform.OS === "ios" && (
          <SocialButton
            label="애플로 시작하기"
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
            아직 신신당부 회원이 아니신가요?
          </Text>
          <Link href="/(auth)/terms-agreement" asChild>
            <Text
              color={colors.text}
              fontSize={13}
              fontWeight="600"
              letterSpacing={-0.26}
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
            colors.isDark ? "rgba(28,28,30,0.92)" : "rgba(255,255,255,0.92)"
          }
          justifyContent="center"
          alignItems="center"
          gap={14}
          paddingHorizontal={24}
        >
          <Spinner size="large" color={tokens.color.sub6.val} />
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
