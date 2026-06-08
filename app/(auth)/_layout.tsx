import { Stack } from "expo-router"

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerShadowVisible: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="email-login" />
      <Stack.Screen name="terms-agreement" />
      <Stack.Screen name="signup-email" />
      <Stack.Screen name="social-link-email" />
      <Stack.Screen name="signup-password" />
      <Stack.Screen name="profile-setup" />
      <Stack.Screen name="nickname-setup" />
      <Stack.Screen
        name="signup-complete"
        options={{ gestureEnabled: false }}
      />
    </Stack>
  )
}
