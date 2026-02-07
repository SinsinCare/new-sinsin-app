import { Tabs } from 'expo-router'
import React from 'react'

import { HapticTab } from '@/components/haptic-tab'
import { IconSymbol } from '@/components/ui/icon-symbol'
import { tokens } from '@/src/theme/tokens'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tokens.color.primary7.val,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="consult"
        options={{
          title: '상담',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="message.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="recipe"
        options={{
          title: '레시피',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="book.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="restaurant"
        options={{
          title: '식당',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="fork.knife" color={color} />,
        }}
      />
      <Tabs.Screen
        name="all"
        options={{
          title: '전체',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="line.3.horizontal" color={color} />,
        }}
      />
    </Tabs>
  )
}
