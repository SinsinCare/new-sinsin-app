import { useEffect, useMemo, useRef } from "react"
import { Appearance, useColorScheme } from "react-native"
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler"
import { TamaguiProvider, Theme } from "tamagui"
import { setupGestureHandler } from "@tamagui/sheet/setup-gesture-handler"
import { PortalProvider } from "@tamagui/portal"
import { QueryClientProvider } from "@tanstack/react-query"
import { useFonts } from "expo-font"
import { Stack, useRouter, useSegments } from "expo-router"
import { StatusBar } from "expo-status-bar"
import * as Notifications from "expo-notifications"
import { KeyboardProvider } from "react-native-keyboard-controller"
import config from "../tamagui.config"
import "@/src/i18n" // i18n 초기화 (부수효과 import — 앱 로드 시 1회, useTranslation 사용 전 준비)
import { queryClient } from "@/src/services"
import { useAuth, useAuthSessionBootstrap } from "@/src/hooks"
import {
  useAuthStore,
  useSignupStore,
  useOnboardingStore,
  useThemeStore,
} from "@/src/stores"
import { LoadingScreen, Toast } from "@/src/shared/components"
import { useNotifications } from "@/src/hooks/useNotifications"
import { AppPolicyGate } from "@/src/features/mobilePolicy"
import { routeFromPushData } from "@/src/services/notificationRoutingService"
import { useFoodAnalysisRecovery } from "@/src/features/home/hooks/useFoodAnalysisRecovery"
import { foodAnalysisRecovery } from "@/src/features/home/services/foodAnalysisRecovery"
import { useAnalyticsLifecycle } from "@/src/features/analytics"
import { getOnboardingRouteRedirectDestination } from "@/src/features/auth/utils/accountStateRoute"

setupGestureHandler({ Gesture, GestureDetector })

const BLOCKED_ACCOUNT_STATES = new Set(["SUSPENDED", "WITHDRAWAL_PENDING"])

function RootLayoutNav() {
  useAuthSessionBootstrap()
  const {
    isAuthenticated,
    isLoading,
    accountState,
    requiresAdditionalInfo,
    entryGate,
    signOut,
  } = useAuth()
  const user = useAuthStore((s) => s.user)
  useAnalyticsLifecycle(user, isLoading)
  const canUseAppNotifications =
    isAuthenticated && accountState === "ACTIVE" && !requiresAdditionalInfo
  useNotifications(canUseAppNotifications)
  useFoodAnalysisRecovery(canUseAppNotifications)
  const isSignupInProgress = useSignupStore((s) => s.isSignupInProgress)
  const isOnboardingInProgress = useOnboardingStore(
    (s) => s.isOnboardingInProgress,
  )
  const segments = useSegments()
  const segmentPath = useMemo(() => segments.map(String), [segments])
  const router = useRouter()
  const handledNotificationIdsRef = useRef(new Set<string>())

  const needsOnboarding = entryGate === "ONBOARDING"
  const needsProfile = entryGate === "PROFILE"
  const needsAdditionalInfo =
    entryGate === "PROFILE" &&
    accountState === "ACTIVE" &&
    requiresAdditionalInfo
  const onboardingRouteRedirect = getOnboardingRouteRedirectDestination(
    accountState,
    requiresAdditionalInfo,
    entryGate,
    isOnboardingInProgress,
  )

  // 푸시 data.type 라우팅은 클라이언트가 소유한다. 서버는 앱 내부 경로를 모른다.
  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier
      if (handledNotificationIdsRef.current.has(id)) return
      handledNotificationIdsRef.current.add(id)
      const data = response.notification.request.content.data
      routeFromPushData(data, router)
      const requestId =
        typeof data?.requestId === "string" ? data.requestId : undefined
      if (data?.type === "food_analysis_complete" && requestId) {
        foodAnalysisRecovery.recoverFoodAnalysisRequest(requestId)
      }
    }

    const sub =
      Notifications.addNotificationResponseReceivedListener(handleResponse)

    if (isAuthenticated && accountState === "ACTIVE") {
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) handleResponse(response)
      })
    }

    return () => sub.remove()
  }, [accountState, isAuthenticated, router])

  useEffect(() => {
    if (isLoading) return

    // v2 컴포넌트 쇼케이스: dev 전용 검증 화면.
    //  - dev(__DEV__): 인증 리다이렉트에서 제외 → 로그인 없이 바로 확인.
    //  - prod: 딥링크로 진입해도(로그인 유저 포함) 정규 화면으로 돌려보내 접근 차단.
    //    (라우트 코드는 번들에 남지만 더미 데이터 컴포넌트 갤러리라 무해 + 런타임 접근은 막힌다.)
    if (segmentPath[0] === "v2-showcase") {
      if (__DEV__) return
      router.replace(isAuthenticated ? "/(tabs)/home" : "/(auth)/login")
      return
    }

    if (
      isAuthenticated &&
      accountState !== null &&
      BLOCKED_ACCOUNT_STATES.has(accountState)
    ) {
      signOut()
      return
    }

    const inAuthGroup = segmentPath[0] === "(auth)"
    const inOnboarding = segmentPath[0] === "onboarding"
    const inPublicLegalDocument =
      segmentPath[segmentPath.length - 1] === "legal-document"
    const inWithdrawalComplete =
      segmentPath[0] === "(settings)" &&
      segmentPath[1] === "withdrawal-complete"
    const inSocialLinkEmail =
      segmentPath[0] === "(auth)" && segmentPath[1] === "social-link-email"
    const inProfileSetup =
      segmentPath[0] === "(auth)" && segmentPath[1] === "profile-setup"

    if (
      !isAuthenticated &&
      !inAuthGroup &&
      !inPublicLegalDocument &&
      !inWithdrawalComplete
    ) {
      router.replace("/(auth)/login")
    } else if (
      isAuthenticated &&
      inAuthGroup &&
      !isSignupInProgress &&
      !inSocialLinkEmail &&
      !((needsProfile || needsAdditionalInfo) && inProfileSetup)
    ) {
      // 회원가입 진행 중이면 auth 그룹에 유지
      if (needsProfile || needsAdditionalInfo) {
        router.replace("/(auth)/profile-setup")
      } else if (needsOnboarding) {
        router.replace("/onboarding")
      } else {
        router.replace("/(tabs)/home")
      }
    } else if (isAuthenticated && inOnboarding && onboardingRouteRedirect) {
      // Direct onboarding links must respect the canonical account-state gate.
      router.replace(onboardingRouteRedirect)
    } else if (
      isAuthenticated &&
      !inAuthGroup &&
      !inOnboarding &&
      !inProfileSetup &&
      !inPublicLegalDocument &&
      !isOnboardingInProgress &&
      (needsProfile || needsAdditionalInfo)
    ) {
      // 필수 추가정보를 끝내기 전에는 프로필 입력으로 고정
      router.replace("/(auth)/profile-setup")
    } else if (
      isAuthenticated &&
      !inAuthGroup &&
      !inOnboarding &&
      !inPublicLegalDocument &&
      !isOnboardingInProgress &&
      needsOnboarding
    ) {
      // 온보딩 미완료 유저가 다른 화면에 있으면 온보딩으로 이동
      router.replace("/onboarding")
    }
  }, [
    isAuthenticated,
    isLoading,
    accountState,
    entryGate,
    segmentPath,
    router,
    isSignupInProgress,
    isOnboardingInProgress,
    needsOnboarding,
    needsProfile,
    needsAdditionalInfo,
    onboardingRouteRedirect,
    signOut,
  ])

  if (isLoading) {
    return <LoadingScreen message="앱을 불러오는 중..." />
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "transparent" },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(settings)" />
        <Stack.Screen name="(write)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  const [loaded] = useFonts({
    "Pretendard-Regular": require("../assets/fonts/Pretendard-Regular.otf"),
    "Pretendard-Medium": require("../assets/fonts/Pretendard-Medium.otf"),
    "Pretendard-SemiBold": require("../assets/fonts/Pretendard-SemiBold.otf"),
    "Pretendard-Bold": require("../assets/fonts/Pretendard-Bold.otf"),
  })
  const themeMode = useThemeStore((s) => s.themeMode)
  const systemScheme = useColorScheme()
  const effectiveScheme =
    themeMode === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : themeMode

  useEffect(() => {
    Appearance.setColorScheme(
      themeMode === "system" ? "unspecified" : themeMode,
    )
  }, [themeMode])

  if (!loaded) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <TamaguiProvider config={config} defaultTheme={effectiveScheme}>
            <Theme name={effectiveScheme}>
              <PortalProvider>
                <AppPolicyGate>
                  <RootLayoutNav />
                </AppPolicyGate>
                <Toast />
              </PortalProvider>
            </Theme>
          </TamaguiProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  )
}
