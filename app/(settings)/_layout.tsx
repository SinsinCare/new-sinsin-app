import { Stack } from "expo-router"

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, headerShadowVisible: false }}>
      <Stack.Screen name="withdrawal-complete" options={{ gestureEnabled: false }} />
    </Stack>
  )
}
