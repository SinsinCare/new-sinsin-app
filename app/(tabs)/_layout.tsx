import { Tabs } from "expo-router"
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

export default function TabLayout() {
  const { t } = useTranslation("common")
  const isDarkMode = useColorScheme() === "dark"
  const insets = useSafeAreaInsets()
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

      {/* 상담은 탭이 아니라 전역 플로팅 — 어느 탭에서든 같은 자리에서 연다. */}
      <FloatingAiButton
        bottom={insets.bottom + TAB_BAR_HEIGHT + FLOATING_AI_BUTTON_BOTTOM}
      />
    </View>
  )
}
