export const appConfig = {
  useMockAuth: process.env.EXPO_PUBLIC_USE_MOCK_AUTH === "true",
  mockNoUser: process.env.EXPO_PUBLIC_MOCK_NO_USER === "true",
  useMockMode: process.env.EXPO_PUBLIC_USE_MOCK_MODE === "true",
  appEnvironment: process.env.EXPO_PUBLIC_APP_ENV?.trim() || "local",
  // 분석은 자사 백엔드(/api/v1/analytics/batch)로 간다 — Mixpanel 토큰은 더 이상 없다.
  analyticsDisabled: process.env.EXPO_PUBLIC_ANALYTICS_DISABLED === "true",
  // 추가 정보 수집 계약은 유지하되, UI를 다시 설계하기 전까지 노출하지 않는다.
  foodAnalysisConfirmationEnabled:
    process.env.EXPO_PUBLIC_FOOD_ANALYSIS_CONFIRMATION_ENABLED === "true",
} as const

/**
 * 운영 환경의 안정 호스트. 런타임 구현(FastAPI/Bun)이 아니라 environment만 이름에 담는다.
 * `scripts/check-release-config.js` 의 PRODUCTION_BACKEND 와 같은 값을 가리킨다.
 */
const PRODUCTION_BACKEND_HOST =
  "sinsin-api-production-87899379852.asia-northeast3.run.app"

export function getBackendUrl(): string {
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim()

  if (!backendUrl) {
    throw new Error(
      "Missing EXPO_PUBLIC_BACKEND_URL. Load a gitignored env file before running the app.",
    )
  }

  reportBackendMismatch(backendUrl)

  return backendUrl
}

/** 이 빌드가 운영 백엔드를 보는가. URL 은 번들에 박혀 나오므로 실행 중에 바뀌지 않는다. */
export function isProductionBackend(): boolean {
  try {
    return new URL(getBackendUrl()).host === PRODUCTION_BACKEND_HOST
  } catch {
    return false
  }
}

/**
 * 운영 빌드면 null, 아니면 화면에 붙일 짧은 꼬리표.
 *
 * 스토어에 나간 iOS 1.2.1(빌드 70)·안드로이드 1.2.2 는 테스트 백엔드를 보고 있었다.
 * 그 빌드는 APP_ENV=test + 테스트 URL 로 **앞뒤가 맞았다** — 잘못된 것은 조합이 아니라
 * "이 빌드를 스토어에 출시했다"는 사실 하나였다. 그래서 모순 검사로는 절대 안 잡힌다.
 * 대신 손에 들린 빌드가 스스로 정체를 밝히게 한다. 출시 버튼을 누르기 전에
 * 마이페이지 한 번만 열어도 "1.2.1 · TEST" 가 보인다.
 */
export function getBackendBadge(): string | null {
  if (isProductionBackend()) return null

  try {
    const host = new URL(getBackendUrl()).hostname
    return `${appConfig.appEnvironment.toUpperCase()} · ${host}`
  } catch {
    return appConfig.appEnvironment.toUpperCase()
  }
}

// APP_ENV 는 운영이라 적혀 있는데 백엔드가 운영이 아닌 경우. 위의 사고와는 다른 모양이지만
// 로컬 env 파일을 섞어 쓸 때 실제로 난다. 던지지는 않는다 — 이미 설치된 앱을 벽돌로
// 만드는 쪽이 더 나쁘다.
let backendMismatchReported = false

function reportBackendMismatch(backendUrl: string): void {
  if (backendMismatchReported) return
  if (appConfig.appEnvironment !== "production") return
  if (backendUrl.includes(PRODUCTION_BACKEND_HOST)) return

  backendMismatchReported = true
  console.error(
    `[appConfig] APP_ENV=production 인데 백엔드가 운영이 아니다: ${backendUrl}\n` +
      `릴리스 프로파일(production / testflight / playstore)로 다시 빌드해야 한다. ` +
      `이 빌드를 출시하면 운영 사용자가 테스트 DB 에 기록한다.`,
  )
}

/**
 * Mock 모드를 사용하는 경우:
 * - EXPO_PUBLIC_USE_MOCK_MODE=true 명시적 설정
 */
export function isMockMode(): boolean {
  return appConfig.useMockMode
}

export function isMockUser(): boolean {
  return appConfig.useMockAuth
}
