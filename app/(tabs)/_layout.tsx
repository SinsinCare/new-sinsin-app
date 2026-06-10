import { Tabs } from "expo-router"
import React, { useMemo } from "react"

import { HapticTab } from "@/components/haptic-tab"
import { Icon } from "@/src/shared/components"
import { useColorScheme } from "react-native"
import { tokens } from "@/src/theme/tokens"

export default function TabLayout() {
  const isDarkMode = useColorScheme() === "dark"
  const styles = useMemo(
    () => ({
      activeColor: isDarkMode
        ? tokens.color.textDark.val
        : tokens.color.textLight.val,
      inactiveColor: isDarkMode
        ? tokens.color.textLightMuted.val
        : tokens.color.textLightSub.val,
      backgroundColor: isDarkMode
        ? tokens.color.appBgDark.val
        : tokens.color.offWhite.val,
      borderColor: isDarkMode
        ? tokens.color.cardBgDark.val
        : tokens.color.borderLight.val,
    }),
    [isDarkMode],
  )
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: styles.activeColor,
        tabBarInactiveTintColor: styles.inactiveColor,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: styles.backgroundColor,
          paddingHorizontal: 25,
          borderTopWidth: 1,
          borderTopColor: styles.borderColor,
          borderBottomWidth: 0,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "홈",
          tabBarIcon: ({ color }) => <Icon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="consult"
        options={{
          title: "상담",
          tabBarIcon: ({ color }) => <Icon name="chat" color={color} />,
        }}
      />
      <Tabs.Screen
        name="recipe"
        options={{
          title: "레시피",
          tabBarIcon: ({ color }) => <Icon name="recipe" color={color} />,
        }}
      />
      <Tabs.Screen
        name="restaurant"
        options={{
          title: "식당",
          tabBarIcon: ({ color }) => <Icon name="location" color={color} />,
        }}
      />
      <Tabs.Screen
        name="all"
        options={{
          title: "전체",
          tabBarIcon: ({ color }) => <Icon name="menu" color={color} />,
        }}
      />
    </Tabs>
  )
}
