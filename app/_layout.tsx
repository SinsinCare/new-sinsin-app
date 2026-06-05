import { useEffect } from "react"
import { Appearance, useColorScheme } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { TamaguiProvider } from "tamagui"
import { PortalProvider } from "@tamagui/portal"
import { QueryClientProvider } from "@tanstack/react-query"
import { useFonts } from "expo-font"
import { Stack, useRouter, useSegments } from "expo-router"
import { StatusBar } from "expo-status-bar"
import * as Notifications from "expo-notifications"
import { Theme } from "tamagui"
import config from "../tamagui.config"
import { queryClient } from "@/src/services"
import { useAuth } from "@/src/hooks"
import { useSignupStore, useOnboardingStore, useThemeStore } from "@/src/stores"
import { LoadingScreen, Toast } from "@/src/shared/components"
import { useNotifications } from "@/src/hooks/useNotifications"

function RootLayoutNav() {
  const { isAuthenticated, isLoading, accountState, signOut } = useAuth()
  useNotifications(isAuthenticated)
  const isSignupInProgress = useSignupStore((s) => s.isSignupInProgress)
  const isOnboardingInProgress = useOnboardingStore(
    (s) => s.isOnboardingInProgress,
  )
  const segments = useSegments()
  const router = useRouter()

  const needsOnboarding = accountState === "PENDING_ONBOARDING"

  // 식단 분석 완료 알림 탭 시 홈 탭으로 이동 (RecordView가 pending 결과를 자동으로 엶)
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data
      if (data?.type === "food_analysis_complete") {
        router.push("/(tabs)/home")
      }
    })
    return () => sub.remove()
  }, [router])

  useEffect(() => {
    if (isLoading) return

    if (isAuthenticated && accountState === "WITHDRAWN") {
      signOut()
      return
    }

    const inAuthGroup = segments[0] === "(auth)"
    const inOnboarding = segments[0] === "onboarding"

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login")
    } else if (isAuthenticated && inAuthGroup && !isSignupInProgress) {
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
    segments,
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
      <Stack screenOptions={{ headerShown: false, headerShadowVisible: false, headerStyle: { backgroundColor: "transparent" } }}>
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
  const effectiveScheme = themeMode === "system"
    ? (systemScheme === "dark" ? "dark" : "light")
    : themeMode

  useEffect(() => {
    Appearance.setColorScheme(themeMode === "system" ? "unspecified" : themeMode)
  }, [themeMode])

  if (!loaded) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <TamaguiProvider config={config} defaultTheme={effectiveScheme}>
          <Theme name={effectiveScheme}>
            <PortalProvider>
              <RootLayoutNav />
              <Toast />
            </PortalProvider>
          </Theme>
        </TamaguiProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
