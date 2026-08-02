import { useEffect, useMemo, useRef, useState } from "react"
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
import { AppKeyboardToolbar } from "@/src/shared/components/AppKeyboardToolbar"
import { useTranslation } from "react-i18next"
import config from "../tamagui.config"
import { languageReady } from "@/src/i18n" // 초기화(부수효과) + 저장 언어 복원 약속
import { queryClient } from "@/src/services"
import { useAuth } from "@/src/hooks"
import {
  useAuthStore,
  useSignupStore,
  useOnboardingStore,
  useThemeStore,
} from "@/src/stores"
import { LoadingScreen, Toast } from "@/src/shared/components"
import { resolveGuard } from "@/src/shared/navigation/guard"
import { useConsumeEntryUrl } from "@/src/shared/navigation/useConsumeEntryUrl"
import { useNotifications } from "@/src/hooks/useNotifications"
import { AppPolicyGate } from "@/src/features/mobilePolicy"
import { routeFromPushData } from "@/src/services/notificationRoutingService"
import { useFoodAnalysisRecovery } from "@/src/features/home/hooks/useFoodAnalysisRecovery"
import { foodAnalysisRecovery } from "@/src/features/home/services/foodAnalysisRecovery"
import { useAnalyticsLifecycle } from "@/src/features/analytics"

setupGestureHandler({ Gesture, GestureDetector })

function RootLayoutNav() {
  const { t } = useTranslation()
  /* 진입 URL 은 한 번만 쓰인다. 비우지 않으면 네이티브에 남아서 **리로드할 때마다**
     같은 화면에서 시작한다(`useConsumeEntryUrl` 머리말). */
  useConsumeEntryUrl()
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
  /* 루트 레이아웃은 네비게이터 **바깥**이라 `useAppRouter()` 를 쓸 수 없다
     (`src/shared/navigation/useAppRouter.ts` 머리말). 여기서는 뒤로가기를 부르지
     않고 `replace` 만 하므로 expo-router 의 라우터를 그대로 쓴다. */
  const router = useRouter()
  const handledNotificationIdsRef = useRef(new Set<string>())

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

  /**
   * 진입 가드. **판정은 `resolveGuard` 가, 실행만 여기가 한다.**
   *
   * 판정을 이 effect 안에 두면 상태 조합을 넣어 결과를 확인할 방법이 없어서,
   * 소셜 가입 도중 + 추가정보 필요 같은 조합은 실제 앱을 그 상태로 만들어야만
   * 검증된다. `resolveGuard` 는 순수 함수라 `tests/navigationGuard.test.ts` 가
   * 진리표로 검사한다.
   *
   * `resolveGuard` 는 **목적지가 지금 화면과 같으면 `stay` 를 돌려준다** — 종전에는
   * 같은 곳으로도 `replace` 를 불러서 화면이 한 번 더 마운트되고, 그 사이의 입력과
   * 스크롤 위치가 날아갔다.
   */
  useEffect(() => {
    const decision = resolveGuard({
      isLoading,
      isAuthenticated,
      accountState,
      requiresAdditionalInfo,
      entryGate,
      isSignupInProgress,
      isOnboardingInProgress,
      segments: segmentPath,
      isDev: __DEV__,
    })

    if (decision.type === "redirect") router.replace(decision.href)
    else if (decision.type === "signOut") signOut()
  }, [
    accountState,
    entryGate,
    isAuthenticated,
    isLoading,
    isOnboardingInProgress,
    isSignupInProgress,
    requiresAdditionalInfo,
    router,
    segmentPath,
    signOut,
  ])

  if (isLoading) {
    return <LoadingScreen message={t("brand.opening")} />
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
        {/* AI 상담 — 탭이 아니라 어디서든 띄우는 전역 모달. 아래로 쓸어 닫는다. */}
        <Stack.Screen name="consult" options={{ presentation: "modal" }} />
        {/* 통계 — 홈에서 밀고 들어가는 일반 페이지다. 등록해 두지 않으면
            기본값에 맡겨져 모달처럼 얹혀 보인다. */}
        <Stack.Screen name="statistics" options={{ presentation: "card" }} />
        {/* 식당 상세·검색·목록·저장한 곳·제보 스택. `statistics` 와 같은 이유로 등록한다 —
            빼 두면 기본값에 맡겨져 지도 탭 위에 모달처럼 얹혀 보이고, 카드 전환이 아니라
            아래에서 올라온다. 스택 내부의 화면별 presentation 은
            `app/restaurant/_layout.tsx` 가 정한다. */}
        <Stack.Screen name="restaurant" options={{ presentation: "card" }} />
        {/* 스토리 뷰어 — 전체화면 몰입. 사진이 화면을 다 쓴다. */}
        <Stack.Screen
          name="stories"
          options={{ presentation: "fullScreenModal", animation: "fade" }}
        />
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
  // 폰트와 같은 자리에서 언어도 기다린다. 저장 언어가 붙기 전에 그리면
  // 기기 언어로 한 프레임이 보이고, 그 사이 나간 요청이 서버에 다른 언어로
  // 리포트를 한 벌 더 만들게 한다.
  const [languageLoaded, setLanguageLoaded] = useState(false)
  useEffect(() => {
    let alive = true
    void languageReady.then(() => {
      if (alive) setLanguageLoaded(true)
    })
    return () => {
      alive = false
    }
  }, [])
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

  if (!loaded || !languageLoaded) return null

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
                {/*
                  키보드 탈출구. 숫자 키패드에는 완료 키가 없고, InputAccessoryView 는
                  모달(기록 시트) 안에서 렌더되지 않는다 — 전역 툴바만이 모든 입력을
                  덮는다(AppKeyboardToolbar 머리말).
                */}
                <AppKeyboardToolbar />
              </PortalProvider>
            </Theme>
          </TamaguiProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  )
}
