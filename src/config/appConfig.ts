export const appConfig = {
  useMockAuth: process.env.EXPO_PUBLIC_USE_MOCK_AUTH === "true",
  mockNoUser: process.env.EXPO_PUBLIC_MOCK_NO_USER === "true",
} as const

export function isMockMode(): boolean {
  return appConfig.useMockAuth
}
