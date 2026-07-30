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
      <Stack.Screen name="email-login-link-password" />
      <Stack.Screen name="signup-password" />
      {/* 닉네임·생년월일·성별·이름·휴대폰·유입경로를 한 라우트 안에서 스텝으로 넘긴다. */}
      <Stack.Screen name="profile-setup" />
      <Stack.Screen
        name="signup-complete"
        options={{ gestureEnabled: false }}
      />
    </Stack>
  )
}
