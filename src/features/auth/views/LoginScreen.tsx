import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native"
import { Link, router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import SigninBackground from "@/assets/images/sinsin_signin_bg_260727.svg"
import GoogleLogo from "@/assets/images/google-logo.svg"
import KakaoLogo from "@/assets/images/kakao-logo.svg"
import { Ionicons } from "@expo/vector-icons"
import { useSocialLogin } from "../hooks"
import {
  V2Button,
  V2LoadingState,
  controlHeight,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { AuthWithdrawalRecoveryModal } from "../components/AuthWithdrawalRecoveryModal"
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
  const { colors, mode } = useV2Theme()
  const supportingTextColor =
    mode === "dark" ? colors.label.normal : colors.label.alternative
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
    <View
      style={[styles.screen, { backgroundColor: colors.background.default }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.screenContent,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom + spacing[24],
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Figma 6010:41988 / background 6010:41989 artwork. */}
        {heroLayout.height > 0 && (
          <View style={{ width: heroLayout.width, height: heroLayout.height }}>
            <SigninBackground
              width={heroLayout.width}
              height={heroLayout.height}
              preserveAspectRatio={heroLayout.preserveAspectRatio}
            />
          </View>
        )}

        <View style={styles.actions}>
          <AuthWithdrawalRecoveryModal
            visible={!!withdrawalPending}
            isCancelling={isCancellingWithdrawal}
            onDismiss={dismissWithdrawalPending}
            onConfirm={confirmWithdrawalCancellation}
          />

          <V2Button
            size="xl"
            color="brand"
            fullWidth
            onPress={handleEmailLogin}
            accessibilityLabel="이메일 로그인"
          >
            이메일 로그인
          </V2Button>

          <View style={styles.dividerRow}>
            <View
              style={[styles.divider, { backgroundColor: colors.line.normal }]}
            />
            <Text
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[
                typography.subtext.medium,
                { color: supportingTextColor },
              ]}
            >
              또는
            </Text>
            <View
              style={[styles.divider, { backgroundColor: colors.line.normal }]}
            />
          </View>

          <Pressable
            onPress={() => loginWithProvider("google")}
            disabled={socialLoading}
            accessibilityRole="button"
            accessibilityLabel="Google로 계속하기"
            accessibilityState={{ disabled: socialLoading }}
            style={({ pressed }) => [
              styles.socialButton,
              { backgroundColor: colors.static.white },
              pressed && !socialLoading && styles.pressed,
              socialLoading && styles.disabled,
            ]}
          >
            <GoogleLogo width={20} height={20} />
            <Text
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[
                typography.label.medium,
                styles.socialLabel,
                { color: colors.static.black },
              ]}
            >
              Google로 계속하기
            </Text>
          </Pressable>

          <Pressable
            onPress={() => loginWithProvider("kakao")}
            disabled={socialLoading}
            accessibilityRole="button"
            accessibilityLabel="카카오로 계속하기"
            accessibilityState={{ disabled: socialLoading }}
            style={({ pressed }) => [
              styles.socialButton,
              styles.kakaoButton,
              pressed && !socialLoading && styles.pressed,
              socialLoading && styles.disabled,
            ]}
          >
            <KakaoLogo width={20} height={20} />
            <Text
              style={[
                typography.label.medium,
                styles.socialLabel,
                { color: colors.static.black },
              ]}
            >
              카카오로 계속하기
            </Text>
          </Pressable>

          {/* Apple 로그인 (iOS만) */}
          {Platform.OS === "ios" && (
            <Pressable
              onPress={() => loginWithProvider("apple")}
              disabled={socialLoading}
              accessibilityRole="button"
              accessibilityLabel="Apple로 계속하기"
              accessibilityState={{ disabled: socialLoading }}
              style={({ pressed }) => [
                styles.socialButton,
                styles.appleButton,
                pressed && !socialLoading && styles.pressed,
                socialLoading && styles.disabled,
              ]}
            >
              <Ionicons
                name="logo-apple"
                size={20}
                color={colors.static.white}
              />
              <Text
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={[
                  typography.label.medium,
                  styles.socialLabel,
                  { color: colors.static.white },
                ]}
              >
                Apple로 계속하기
              </Text>
            </Pressable>
          )}

          <View style={styles.signupPrompt}>
            <Text
              style={[
                typography.subtext.medium,
                styles.signupPromptText,
                { color: supportingTextColor },
              ]}
            >
              신신당부가 처음이신가요?
            </Text>
            <Link href="/(auth)/terms-agreement" asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="회원가입하기"
                style={styles.signupPromptLink}
              >
                <Text
                  style={[
                    typography.subtext.large,
                    styles.underline,
                    { color: supportingTextColor },
                  ]}
                >
                  회원가입하기
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>

      {socialLoading && (
        <View
          style={[
            styles.loadingOverlay,
            { backgroundColor: colors.background.dim },
          ]}
        >
          <V2LoadingState message={socialLoadingMessage} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, position: "relative" },
  screenContent: { flexGrow: 1 },
  actions: { paddingHorizontal: spacing[20], gap: spacing[12] },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    marginVertical: spacing[4],
  },
  divider: { flex: 1, height: 1 },
  socialButton: {
    minHeight: controlHeight.xl,
    paddingHorizontal: spacing[28],
    paddingVertical: spacing[2],
    borderRadius: radius["2xl"],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    gap: spacing[10],
  },
  socialLabel: { flexShrink: 1, textAlign: "center" },
  kakaoButton: { backgroundColor: "#FEE500" },
  appleButton: { backgroundColor: "#000000" },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
  signupPrompt: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    alignContent: "center",
    gap: spacing[8],
    marginTop: spacing[8],
  },
  signupPromptText: { flexShrink: 1, textAlign: "center" },
  signupPromptLink: { maxWidth: "100%" },
  underline: { textDecorationLine: "underline" },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    justifyContent: "center",
    alignItems: "center",
  },
})
