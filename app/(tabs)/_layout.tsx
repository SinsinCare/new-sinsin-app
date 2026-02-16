import { Tabs } from "expo-router"
import React from "react"

import { HapticTab } from "@/components/haptic-tab"
import { tokens } from "@/src/theme/tokens"
import { Icon } from "@/src/shared/components"

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tokens.color.grey1.val,
        tabBarInactiveTintColor: tokens.color.grey7.val,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: { paddingHorizontal: 25 },
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
