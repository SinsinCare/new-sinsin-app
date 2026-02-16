import { Tabs } from "expo-router"
import React from "react"

import { HapticTab } from "@/components/haptic-tab"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { tokens } from "@/src/theme/tokens"

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tokens.color.grey1.val,
        tabBarInactiveTintColor: tokens.color.grey7.val,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "홈",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              size={26}
              name="home-outline"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="consult"
        options={{
          title: "상담",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              size={24}
              name="chat-processing-outline"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="recipe"
        options={{
          title: "레시피",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              size={26}
              name="chef-hat-outline"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="restaurant"
        options={{
          title: "식당",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              size={26}
              name="map-marker-outline"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="all"
        options={{
          title: "전체",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons size={24} name="menu" color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
