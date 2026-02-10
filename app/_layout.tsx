import "@tamagui/native/setup-teleport"

import { useEffect } from "react"
import { TamaguiProvider } from "tamagui"
import { PortalProvider } from "@tamagui/portal"
import { QueryClientProvider } from "@tanstack/react-query"
import { useFonts } from "expo-font"
import { Stack, useRouter, useSegments } from "expo-router"
import { StatusBar } from "expo-status-bar"
import config from "../tamagui.config"
import { queryClient } from "../src/services/queryClient"
import { useAuth } from "../src/hooks"
import { useSignupStore } from "../src/stores/signupStore"
import { LoadingScreen } from "../src/shared/components"

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth()
  const isSignupInProgress = useSignupStore((s) => s.isSignupInProgress)
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === "(auth)"

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login")
    } else if (isAuthenticated && inAuthGroup && !isSignupInProgress) {
      // 회원가입 진행 중이면 auth 그룹에 유지
      router.replace("/(tabs)/home")
    }
  }, [isAuthenticated, isLoading, segments, router, isSignupInProgress])

  if (isLoading) {
    return <LoadingScreen message="앱을 불러오는 중..." />
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="create-post" />
        <Stack.Screen name="post/[id]" />
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

  if (!loaded) return null

  return (
    <QueryClientProvider client={queryClient}>
      <TamaguiProvider config={config} defaultTheme="light">
        <PortalProvider shouldAddRootHost>
          <RootLayoutNav />
        </PortalProvider>
      </TamaguiProvider>
    </QueryClientProvider>
  )
}
