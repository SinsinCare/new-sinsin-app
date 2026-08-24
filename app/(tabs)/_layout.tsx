import { Tabs, usePathname } from "expo-router"
import React, { useMemo, useState } from "react"
import { StyleSheet, View } from "react-native"
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import {
  tabBarBackdrop,
  useV2Theme,
  V2TabBar,
  type V2TabBarItem,
} from "@/src/design-system-v2"
import { hapticSelection } from "@/src/lib/haptics"
import {
  runTabReset,
  TabResetProvider,
  useTabResetRegistry,
} from "@/src/shared/navigation"
import {
  FLOATING_AI_BUTTON_BOTTOM,
  FloatingAiButton,
} from "@/src/shared/components/FloatingAiButton"
import { TAB_BAR_HEIGHT } from "@/src/shared/utils/bottomSafeArea"

/**
 * 전역 `AI 상담` 필을 띄우지 않는 탭.
 *
 * ## 왜 식당 탭만 예외인가
 *
 * 이 필은 우하단 고정이고 탭바 위 16px 에 뜬다. 다른 네 탭은 그 자리가 비어 있지만
 * **식당 탭은 그 자리에 바텀시트가 산다.** 시트가 collapsed 일 때 필은 sticky 필터칩 행의
 * `음식 종류` 칩을 덮고, 시트를 올리면 목록 카드를 덮는다. 지도면 자체도 우하단에
 * FAB 스택(저장한 곳/내 위치)과 `현재 지도에서 찾기` pill 을 이미 쓰고 있어서, 같은
 * 구석에 세 번째 떠 있는 것이 겹친다.
 *
 * ## 왜 숨기는 쪽을 골랐나 (다른 두 안을 버린 이유)
 *
 * - **시트가 자리를 비워 준다**: 필터칩 행에 오른쪽 여백 150px 를 주면 그 행은 가로
 *   스크롤이라 칩이 여백 뒤로 사라질 뿐이고, 아래 카드들은 여전히 덮인다. 한 탭 때문에
 *   공용 컴포넌트의 레이아웃을 비트는 값이기도 하다.
 * - **위치를 옮긴다**: 나머지 네 탭에서 멀쩡히 동작하는 배치를 한 탭 때문에 전부 바꾸는
 *   것이다. 목업(`Home_restaurant*`)에도 이 필은 식당 화면에 없다.
 *
 * 잃는 것은 분명히 적어 둔다 — 이 탭에서는 상담으로 가는 한 번 탭 경로가 없다. 상담은
 * 나머지 네 탭 어디에서든 같은 자리에 있으므로 한 번 더 눌러야 한다는 뜻이다.
 * (칩 레일의 `AI 검색` 은 식당 필터를 만드는 다른 기능이다. 상담의 대체가 아니다.)
 */
const TABS_WITHOUT_AI_PILL = new Set(["/restaurant", "/community-popular"])

/**
 * 라우트 이름 ↔ 탭 바 아이템. 이 배열의 순서가 곧 화면 순서다.
 * `as const` 라서 `labelKey` 가 i18n 키 타입으로 좁혀진다 — 오타는 tsc 가 잡는다.
 */
/**
 * **탭에 속하지만 루트가 아닌 화면.** 값은 그 탭의 루트 라우트다.
 *
 * 탭 바는 이 화면들에서도 부모 탭을 선택 상태로 그린다(인기글 화면에서 `커뮤니티` 가
 * 켜져 있다). 사용자에게는 "지금 이 탭" 이므로 다시 누르면 루트로 돌아오는 것이
 * 기대다 — 리셋 사다리 2번(`runTabReset`)이 이 표를 근거로 선다.
 * 되돌아갈 곳은 `routeGraph` 의 뒤로가기 목적지와 같은 값이다.
 */
const TAB_ROOT_OF: Record<string, string> = {
  "community-popular": "community",
}

const TABS = [
  { route: "home", icon: "tabHome", labelKey: "nav.home" },
  { route: "community", icon: "tabCommunity", labelKey: "nav.community" },
  { route: "recipe", icon: "tabRecipe", labelKey: "nav.recipes" },
  { route: "restaurant", icon: "tabRestaurant", labelKey: "nav.restaurants" },
  { route: "all", icon: "tabAll", labelKey: "nav.myPage" },
] as const satisfies readonly {
  route: string
  icon: V2TabBarItem["icon"]
  labelKey: string
}[]

/**
 * 하단 탭 바 — **정본은 `V2TabBar`**(Figma `Design-system_Mobile` node 61:5948).
 *
 * 예전에는 이 자리에서 react-navigation 기본 바를 `screenOptions` 로 흉내 내고 있었다.
 * 컴포넌트는 있는데 화면이 안 쓰는 상태였고, 그래서 스펙과 이렇게 어긋나 있었다:
 *
 * | 항목 | 예전(기본 바) | Figma / V2TabBar |
 * |---|---|---|
 * | 상단 모서리 | 각짐 | **라운드 24** |
 * | 상단 경계 | 없음(`borderTopWidth: 0`) | `line.alternative` 1px |
 * | 아이콘 | 22 | 24 |
 * | 라벨 | 11.5px · 자간 −0.23 | `caption.small`(11/14) · 자간 0 |
 * | 색 | `tokens.color.text*`(레거시 3계보) | `label.neutral` / `label.disable` / `label.alternative` |
 * | 다크 판정 | RN `useColorScheme`(앱 테마 토글 무시) | `useV2Theme`(토글 반영) |
 * | 알림 점 | 없음 | 아이콘 우상단 5×5 |
 *
 * react-navigation 에는 `tabBar` 콜백으로 꽂는다 — 라우팅·상태·제스처는 그대로 두고
 * **그리는 것만** 가져온다. 눌림 햅틱은 기본 바의 `HapticTab` 이 하던 일이라 여기로 옮겼다.
 */
function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation("common")
  const { colors, mode } = useV2Theme()
  /*
    메움 층의 높이는 **바를 재서** 얻는다. 상수를 박으면 안 된다 — 바 높이는
    safe-area(기기마다 다름) + 콘텐츠 + 패딩으로 정해져서, 24 같은 숫자를 넣으면
    기기 하나에서만 맞고 나머지에서는 삼각형이 남거나 넘친다(실측: 첫 시도에서
    라운드 반경 24 만 채웠더니 바 상단 모서리는 그대로 뚫려 있었다).
  */
  const [barHeight, setBarHeight] = useState(0)

  const items = useMemo<V2TabBarItem[]>(
    () =>
      TABS.map(({ route, icon, labelKey }) => ({
        value: route,
        label: t(labelKey),
        icon,
      })),
    [t],
  )

  const activeRoute = state.routes[state.index]?.name ?? "home"
  const current = TAB_ROOT_OF[activeRoute] ?? activeRoute
  const tabReset = useTabResetRegistry()

  return (
    /*
     * 바는 화면 **위에 뜬다**(absolute). 흐름에 두면 화면이 바 위에서 끝나 버려서
     * 깎인 모서리 뒤에 아무것도 없고, 그 자리를 무슨 색으로 칠하든 가짜 조각이 된다.
     * 띄워 두면 라운드가 잘라 내는 것이 **실제 화면**이 된다 — 그게 이 모서리의 용도다.
     *
     * 화면 아래 여백은 각 화면이 이미 `bottomSafeArea` 의 규칙으로 잡는다
     * (`bottomBarSpace` / `scrollBottomSpace` / `aboveTabBarSpace`).
     */
    <View style={styles.floating}>
      {/*
        ■ 모서리 뒤 삼각형 메우기 (2026-08-19)

        이 바는 상단 모서리를 24pt 로 깎는다. 깎여 나간 좌우 두 삼각형에는 그 뒤의
        화면이 비쳐야 하는데, 화면이 거기까지 안 그려지는 탭이 있다 — 식당 탭은
        지도가 시트에서 끝나고 그 아래가 비어서 **지도가 들여다보였다**(실측: 바
        상단 24pt 구간의 좌우 끝 4pt 가 지도색이었다).

        메움은 **바 뒤 전체**에 깐다. 그러면 삼각형 자리가 바와 같은 색으로 채워져
        구멍이 사라진다.

        ⚠️ 그래도 라운드는 살아 있다. 이 메움은 **바와 같은 면**이라 바 자신은 아무
        변화가 없고, 라운드가 실제로 잘라 내는 대상은 그 **위에 얹힌 시트·콘텐츠**다
        (식당 탭의 필터 시트, 홈의 카드). 지도처럼 바 뒤로 지나가는 것만 가려진다.

        `pointerEvents="none"` — 순전히 시각적 메움이라 터치를 먹으면 지도 팬
        제스처를 가로챈다.
      */}
      {barHeight > 0 && (
        <View
          pointerEvents="none"
          style={[
            styles.cornerFill,
            {
              height: barHeight,
              backgroundColor: tabBarBackdrop(colors, mode),
            },
          ]}
        />
      )}
      <V2TabBar
        onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
        items={items}
        value={current}
        onChange={(value) => {
          if (value !== current) {
            hapticSelection()
            navigation.navigate(value)
            return
          }
          /*
            ■ 보고 있는 탭을 다시 눌렀다 — **한 번 누르면 한 걸음**

            종전에는 여기서 그냥 반환했다. 그래서 한국 사용자가 모든 큰 앱에서
            익힌 동작(다시 눌러 시트 닫기 · 루트로 · 맨 위로)이 이 앱에만 없었다.
            **새로고침은 이 사다리의 일이 아니다** — 당겨서 새로고침이 그것을 하고,
            여기 남은 4번은 화면이 고장났을 때의 복구뿐이다(`tabReset.ts` 머리말 §4번).
            반대로 `navigate` 를 부르면 스택이 초기화돼 스크롤이 튄다 — 그래서
            **되돌리는 일은 화면이 등록하고**(`useRegisterTabReset`) 여기서는
            사다리를 한 칸만 돌린다(`runTabReset` 머리말에 순서와 이유).

            react-navigation 기본 바라면 `tabPress` 를 받아 `preventDefault()` 하는
            자리다. 이 바는 그리는 것을 통째로 가져온 **커스텀 바**라 기본 탭 버튼을
            거치지 않고, 그래서 이벤트를 받는 쪽이 아니라 **내는 쪽**이 여기다.
            `navigate` 를 부르지 않는 것이 곧 `preventDefault()` 다.
          */
          const step = runTabReset({
            target: tabReset?.resolve(activeRoute) ?? null,
            /* 인기글처럼 탭 안의 루트가 아닌 화면이면 루트로 되돌린다. */
            popToRoot:
              activeRoute === value ? null : () => navigation.navigate(value),
          })
          /* 아무 일도 안 일어났는데 진동만 오면 "눌렸는데 안 먹었다" 로 읽힌다. */
          if (step !== "none") hapticSelection()
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  floating: { position: "absolute", left: 0, right: 0, bottom: 0 },
  /*
    바의 깎인 두 모서리 **뒤**를 메우는 층. 바보다 먼저 그려져 아래에 깔린다.
    `height` 는 바를 실측해 런타임에 준다 — 상수를 박으면 기기마다 어긋난다.
  */
  cornerFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
})

export default function TabLayout() {
  const insets = useSafeAreaInsets()

  /* 라우트 이름이 아니라 경로로 판정한다. 탭 화면 위에 스택 화면이 밀려 올라오면
     (`/restaurant/317`) 그 화면이 이 레이아웃을 통째로 덮으므로 필은 어차피 안 보인다 —
     여기서 판단해야 하는 것은 **탭 화면 자체가 무엇인가** 뿐이다. */
  const pathname = usePathname()
  const showAiPill = !TABS_WITHOUT_AI_PILL.has(pathname)

  return (
    /* 리셋 등록소의 수명 = 탭 네비게이터의 수명. 모듈 전역에 두면 dev 리로드에서
       죽은 화면의 등록이 남는다(`TabResetProvider` 머리말). */
    <TabResetProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          /*
            ── 뒤로가기는 **방금 있던 탭**으로 (2026-08-24) ──────────────────────
            기본값은 `firstRoute` 다: 첫 탭(홈)이 아닌 어디서든 GO_BACK 이 **홈으로**
            간다. 그래서 `인기글`(탭 네비게이터 안에 사는 화면, `href: null`)에서
            뒤로가면 커뮤니티가 아니라 앱 홈으로 떨어졌다 — 사용자가 겪은 그 증상이다.

            `routeGraph` 에 `(tabs)/community-popular → /(tabs)/community` 라고
            적혀 있는데도 그 표가 안 먹었던 이유가 여기다. 그 표는 `useGoBack` 이
            **히스토리가 없을 때만** 본다. 탭 라우터가 GO_BACK 을 자기가 처리해
            버리니 `canGoBack()` 은 참이고, 표는 읽히지도 않았다.

            `history` 는 "마지막으로 보고 있던 탭" 으로 되돌린다 — 인기글에서는
            커뮤니티로, 커뮤니티에서는 홈(거기서 왔다면)으로. 탭을 옮겨 다닌 경로가
            그대로 되감기므로, 표의 폴백(딥링크·푸시 진입)과도 뜻이 어긋나지 않는다.
          */
          backBehavior="history"
          screenOptions={{
            headerShown: false,
            /* 바가 떠 있으므로 화면은 바 뒤까지 채운다 — 깎인 모서리에 화면이 보이려면
             화면이 거기까지 그려져 있어야 한다. 안 그러면 react-navigation 의 기본
             흰 배경이 드러나고(다크에서 흰 조각 두 개), 색으로 메우면 가짜 조각이 된다. */
            tabBarStyle: { position: "absolute" },
          }}
          tabBar={(props) => <AppTabBar {...props} />}
        >
          <Tabs.Screen name="home" />
          <Tabs.Screen name="community" />
          <Tabs.Screen name="community-popular" options={{ href: null }} />
          <Tabs.Screen name="recipe" />
          <Tabs.Screen name="restaurant" />
          <Tabs.Screen name="all" />
        </Tabs>

        {/* 상담은 탭이 아니라 전역 플로팅 — 어느 탭에서든 같은 자리에서 연다.
          식당 탭만 예외다(`TABS_WITHOUT_AI_PILL`). */}
        {showAiPill && (
          <FloatingAiButton
            bottom={insets.bottom + TAB_BAR_HEIGHT + FLOATING_AI_BUTTON_BOTTOM}
          />
        )}
      </View>
    </TabResetProvider>
  )
}
