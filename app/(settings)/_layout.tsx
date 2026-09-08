import { Stack } from "expo-router"
import { setStatusBarStyle } from "expo-status-bar"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"

export default function SettingsLayout() {
  const mode = useAppColorScheme()
  return (
    <Stack
      screenListeners={{
        transitionEnd: () =>
          setStatusBarStyle(mode === "dark" ? "light" : "dark"),
      }}
      screenOptions={{
        headerShown: false,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="phone-number-edit" />
      <Stack.Screen
        name="withdrawal-complete"
        options={{ gestureEnabled: false }}
      />
    </Stack>
  )
}
