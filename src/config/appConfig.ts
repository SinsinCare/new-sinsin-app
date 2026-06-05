export const appConfig = {
  useMockAuth: process.env.EXPO_PUBLIC_USE_MOCK_AUTH === "true",
  mockNoUser: process.env.EXPO_PUBLIC_MOCK_NO_USER === "true",
  useMockMode: process.env.EXPO_PUBLIC_USE_MOCK_MODE === "true",
} as const

export function getBackendUrl(): string {
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim()

  if (!backendUrl) {
    throw new Error(
      "Missing EXPO_PUBLIC_BACKEND_URL. Load a gitignored env file before running the app.",
    )
  }

  return backendUrl
}

/**
 * Mock 모드를 사용하는 경우:
 * - EXPO_PUBLIC_USE_MOCK_AUTH=true 명시적 설정
 */
export function isMockMode(): boolean {
  return appConfig.useMockMode
}

export function isMockUser(): boolean {
  return appConfig.useMockAuth
}
