import { Tabs } from 'expo-router'
import { Home, Utensils, MessageCircle, User } from '@tamagui/lucide-icons'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0.1,
        },
        headerStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '홈',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="food"
        options={{
          title: '식단',
          tabBarIcon: ({ color, size }) => <Utensils color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="consultation"
        options={{
          title: 'AI 상담',
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}
