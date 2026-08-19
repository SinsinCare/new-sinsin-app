import { useEffect, useMemo, useRef, useState } from "react"
import { Appearance, useColorScheme } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { TamaguiProvider, Theme } from "tamagui"
import { PortalProvider } from "@/src/shared/components/Portal"
import { QueryClientProvider } from "@tanstack/react-query"
import { useFonts } from "expo-font"
import { Stack, useRouter, useSegments } from "expo-router"
import { StatusBar } from "expo-status-bar"
import * as Notifications from "expo-notifications"
import { KeyboardProvider } from "react-native-keyboard-controller"
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context"
import { AppKeyboardSurface } from "@/src/shared/components/AppKeyboardSurface"
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
import { V2DialogHost } from "@/src/design-system-v2"
import { resolveGuard } from "@/src/shared/navigation/guard"
import { useConsumeEntryUrl } from "@/src/shared/navigation/useConsumeEntryUrl"
import { useNotifications } from "@/src/hooks/useNotifications"
import { AppPolicyGate } from "@/src/features/mobilePolicy"
import { routeFromPushData } from "@/src/services/notificationRoutingService"
import { useFoodAnalysisRecovery } from "@/src/features/home/hooks/useFoodAnalysisRecovery"
import { foodAnalysisRecovery } from "@/src/features/home/services/foodAnalysisRecovery"
import { useAnalyticsLifecycle } from "@/src/features/analytics"

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

    /*
      콜드스타트 경로만이 아니라 **라이브 리스너도** 앱을 온전히 쓸 수 있는
      계정(`canUseAppNotifications` 와 같은 조건)에서만 건다. 종전에는 리스너가
      무조건 걸려 있어서, 온보딩·프로필 미완료 계정이 푸시를 누르면 상담 같은
      기능 모달이 관문 화면 위로 올라왔다(관문보다 기능이 먼저). 라우팅을 버린
      푸시는 앱을 여는 것으로 족하다 — 관문(resolveGuard)이 갈 곳을 정한다.
    */
    if (
      !(isAuthenticated && accountState === "ACTIVE" && !requiresAdditionalInfo)
    ) {
      return
    }

    const sub =
      Notifications.addNotificationResponseReceivedListener(handleResponse)

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response)
    })

    return () => sub.remove()
  }, [accountState, isAuthenticated, requiresAdditionalInfo, router])

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

    if (decision.type === "redirect") {
      /*
        관문 이동은 **떠 있는 프레젠테이션을 접고 나서** 한다. iOS 네이티브
        스택은 replace 로 카드를 갈아끼워도 presented 모달(상담·스토리)을 그
        위에 남겨 두므로, 모달이 열린 채 온보딩·프로필로 보내면 관문 화면이
        모달 **뒤에 깔려 안 보인다**(2026-08-03 "온보딩이 페이지/시트 뒤에").
        관문 리다이렉트는 전부 "여기 있으면 안 된다" 판정이라, 스택을 처음으로
        접고 목적지 하나로 갈아끼우는 것이 맞는 의미다.
      */
      if (router.canDismiss()) router.dismissAll()
      router.replace(decision.href)
    } else if (decision.type === "signOut") signOut()
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
    return <LoadingScreen surface="app_root" message={t("brand.opening")} />
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
      {/*
        ── 세이프 에어리어는 **여기 하나**에서 나온다 ──────────────────────────

        예전에는 이 자리에 provider 가 없었다. 그러면 인셋을 세워 주는 것은
        `@react-navigation` 이 네비게이터 **안쪽에** 다는 `SafeAreaProviderCompat` 뿐인데,
        그 구조에 문제가 둘 있다.

        1. **네비게이터 밖 화면은 provider 가 없다.** 아래 `Toast`·`V2DialogHost`·
           `AppKeyboardSurface`, 그리고 `isLoading` 일 때 네비게이터 대신 그리는
           `LoadingScreen` 이 전부 그 밖이다. 하단에 무언가를 붙이는 순간 기준이 없다.
        2. **인셋을 모를 때 0 으로 시작한다.** `SafeAreaProviderCompat` 은
           `initialWindowMetrics` 가 null 이면(안드로이드에서 흔하다) `insets` 를 전부 0 인
           값으로 만들어 **먼저 그린다.** 그 한 프레임에 하단 바는 안드로이드 내비게이션 바
           밑에 깔리고, 그때 값을 붙잡아 둔 계산(`useMemo(…, [])`·ref 캐시)은 **끝까지 0 을
           쓴다.** 기기·타이밍에 따라 "하단이 내비게이션 바에 가린다" 가 되는 경로가 이것이다.

        그래서 트리 맨 위에 하나를 세우고, **모르면 0 이라고 하지 않는다** —
        `initialMetrics` 에 `initialWindowMetrics` 를 그대로 넘긴다. 값이 있으면 첫
        프레임부터 정확하고, null 이면 provider 가 실측될 때까지 자식을 그리지 않는다.
        한 프레임 늦는 대신 **틀린 값으로 그리는 프레임이 없다.**
      */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
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
                  showConfirm/showAlert 의 기본 호스트. 화면 단위 호출은 전부
                  여기로 온다. RN Modal 안에서 부르는 확인창은 그 모달 안에
                  <V2DialogHost/> 를 하나 더 얹어야 한다 — 이유는 그쪽 머리말.
                */}
                  <V2DialogHost />
                </PortalProvider>
                {/*
                키보드 탈출구. 숫자 키패드에는 완료 키가 없고, InputAccessoryView 는
                시트 안에서 렌더되지 않는다 — 전역 툴바만이 모든 입력을 덮는다
                (AppKeyboardToolbar 머리말). 기록 시트가 열려 있으면 툴바 대신
                키보드 도킹 CTA 가 선다(AppKeyboardSurface / KeyboardDock 머리말).

                **`PortalProvider` 밖에 둔다.** 안에 두면 안 보인다. 그 provider 는
                자식을 그린 **뒤에** 포털 층을 그리므로(shared/components/Portal),
                포털로 올라간 것은 언제나 provider 자식들 위에 얹힌다. 툴바를 자식으로
                두면 그 아래 깔려 화면에 나오지 않는다 — 1.1.24 QA "여전히 키보드가
                가린다" 가 이것이다. 밖으로 빼면 마지막에 그려져 위에 선다.
                (2026-08-19 이전에는 @tamagui/portal 이었고 순서 규칙은 같다.)
              */}
                <AppKeyboardSurface />
              </Theme>
            </TamaguiProvider>
          </QueryClientProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
