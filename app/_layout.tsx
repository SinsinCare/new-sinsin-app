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
import { queryClient } from "@/src/services"
import { useAuth } from "@/src/hooks"
import { useSignupStore, useOnboardingStore, useThemeStore } from "@/src/stores"
import { LoadingScreen, Toast } from "@/src/shared/components"
import { useNotifications } from "@/src/hooks/useNotifications"
import { AppPolicyGate } from "@/src/features/mobilePolicy"
import { routeFromPushData } from "@/src/services/notificationRoutingService"

setupGestureHandler({ Gesture, GestureDetector })

const BLOCKED_ACCOUNT_STATES = new Set(["SUSPENDED", "WITHDRAWAL_PENDING"])

function RootLayoutNav() {
  const { isAuthenticated, isLoading, accountState, signOut } = useAuth()
  useNotifications(isAuthenticated && accountState === "ACTIVE")
  const isSignupInProgress = useSignupStore((s) => s.isSignupInProgress)
  const isOnboardingInProgress = useOnboardingStore(
    (s) => s.isOnboardingInProgress,
  )
  const segments = useSegments()
  const segmentPath = useMemo(() => segments.map(String), [segments])
  const router = useRouter()
  const handledNotificationIdsRef = useRef(new Set<string>())

  const needsOnboarding = accountState === "PENDING_ONBOARDING"

  // 푸시 data.type 라우팅은 클라이언트가 소유한다. 서버는 앱 내부 경로를 모른다.
  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier
      if (handledNotificationIdsRef.current.has(id)) return
      handledNotificationIdsRef.current.add(id)
      routeFromPushData(response.notification.request.content.data, router)
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
      !inSocialLinkEmail
    ) {
      // 회원가입 진행 중이면 auth 그룹에 유지
      if (needsOnboarding) {
        router.replace("/onboarding")
      } else {
        router.replace("/(tabs)/home")
      }
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
    segmentPath,
    router,
    isSignupInProgress,
    isOnboardingInProgress,
    needsOnboarding,
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
