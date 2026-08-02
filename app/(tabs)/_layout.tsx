import { Tabs, usePathname } from "expo-router"
import React, { useMemo } from "react"
import { View, useColorScheme } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import { HapticTab } from "@/components/haptic-tab"
import { Icon } from "@/src/shared/components"
import {
  FLOATING_AI_BUTTON_BOTTOM,
  FloatingAiButton,
} from "@/src/shared/components/FloatingAiButton"
import { tokens } from "@/src/theme/tokens"

/** RN bottom-tabs 기본 바 높이. 플로팅 버튼을 바 위에 얹는 기준. */
const TAB_BAR_HEIGHT = 49

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
const TABS_WITHOUT_AI_PILL = new Set(["/restaurant"])

export default function TabLayout() {
  const { t } = useTranslation("common")
  const isDarkMode = useColorScheme() === "dark"
  const insets = useSafeAreaInsets()
  /* 라우트 이름이 아니라 경로로 판정한다. 탭 화면 위에 스택 화면이 밀려 올라오면
     (`/restaurant/317`) 그 화면이 이 레이아웃을 통째로 덮으므로 필은 어차피 안 보인다 —
     여기서 판단해야 하는 것은 **탭 화면 자체가 무엇인가** 뿐이다. */
  const pathname = usePathname()
  const showAiPill = !TABS_WITHOUT_AI_PILL.has(pathname)
  const styles = useMemo(
    () => ({
      activeColor: isDarkMode
        ? tokens.color.textDark.val
        : tokens.color.textLight.val,
      inactiveColor: isDarkMode
        ? tokens.color.textLightMuted.val
        : tokens.color.textLightSub.val,
      // 목업의 탭바는 흰 면이다. 본문(회색 바닥) 과의 톤 차이가 곧 경계라
      // 선을 얹지 않는다 — 선 대신 면으로 끊는 규칙을 여기서도 지킨다.
      backgroundColor: isDarkMode
        ? tokens.color.appBgDark.val
        : tokens.color.pureWhite.val,
    }),
    [isDarkMode],
  )
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: styles.activeColor,
          tabBarInactiveTintColor: styles.inactiveColor,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            backgroundColor: styles.backgroundColor,
            // 탭바는 전면 요소다 — 화면 패딩 20 을 물리면 탭 한 칸이 72pt 로
            // 좁아져 "Community" 가 "Commun…" 으로 잘린다. 5개 탭이 화면 폭을
            // 그대로 나눠 쓰게 둔다.
            paddingHorizontal: 0,
            borderTopWidth: 0,
            borderBottomWidth: 0,
            elevation: 0,
          },
          tabBarLabelStyle: {
            fontSize: 11.5,
            lineHeight: 16,
            fontWeight: "600",
            letterSpacing: -0.23,
          },
          // 라벨이 칸 폭을 다 쓰게 한다(기본 아이템 패딩이 좌우를 더 먹는다).
          tabBarItemStyle: { paddingHorizontal: 2 },
          tabBarIconStyle: { marginTop: 2 },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: t("nav.home"),
            tabBarIcon: ({ color }) => (
              <Icon name="home" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: t("nav.community"),
            tabBarIcon: ({ color }) => (
              <Icon name="chat" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="recipe"
          options={{
            title: t("nav.recipes"),
            tabBarIcon: ({ color }) => (
              <Icon name="recipe" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="restaurant"
          options={{
            title: t("nav.restaurants"),
            tabBarIcon: ({ color }) => (
              <Icon name="location" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="all"
          options={{
            title: t("nav.myPage"),
            tabBarIcon: ({ color }) => (
              <Icon name="menu" size={22} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* 상담은 탭이 아니라 전역 플로팅 — 어느 탭에서든 같은 자리에서 연다.
          식당 탭만 예외다(`TABS_WITHOUT_AI_PILL`). */}
      {showAiPill && (
        <FloatingAiButton
          bottom={insets.bottom + TAB_BAR_HEIGHT + FLOATING_AI_BUTTON_BOTTOM}
        />
      )}
    </View>
  )
}
