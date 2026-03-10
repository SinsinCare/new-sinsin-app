import { Tabs } from "expo-router"
import React, { useMemo } from "react"

import { HapticTab } from "@/components/haptic-tab"
import { Icon } from "@/src/shared/components"
import { useColorScheme } from "react-native"

export default function TabLayout() {
  const isDarkMode = useColorScheme() === "dark"
  const styles = useMemo(
    () => ({
      activeColor: isDarkMode ? "#E7E7EE" : "#2A2A37",
      inactiveColor: isDarkMode ? "#595960" : "#A5A5AF",
      backgroundColor: isDarkMode ? "#1f1f21" : "#FDFDFD",
      borderColor: isDarkMode ? "#313138" : "#EAEAF0",
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
      {/* <Tabs.Screen
        name="restaurant"
        options={{
          title: "식당",
          tabBarIcon: ({ color }) => <Icon name="location" color={color} />,
        }}
      /> */}
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
