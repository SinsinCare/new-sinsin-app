const hasFirebaseConfig = (): boolean => {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID
  return !!(apiKey && projectId && appId)
}

export const appConfig = {
  useMockAuth: process.env.EXPO_PUBLIC_USE_MOCK_AUTH === "true",
  mockNoUser: process.env.EXPO_PUBLIC_MOCK_NO_USER === "true",
} as const

/**
 * Mock 모드를 사용하는 경우:
 * - EXPO_PUBLIC_USE_MOCK_AUTH=true 명시적 설정
 * - Firebase 환경 변수 누락 (EAS production 빌드 시 env 미설정 방지)
 *   → 잘못된 Firebase 초기화로 인한 Hermes crash 방지
 */
export function isMockMode(): boolean {
  if (appConfig.useMockAuth) return true
  if (!hasFirebaseConfig()) return true
  return false
}
