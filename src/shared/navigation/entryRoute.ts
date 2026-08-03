/**
 * 인증 상태 → 진입 경로. 렌더 단계 가드(app/index.tsx)와 상태 변화 감시
 * (app/_layout.tsx)가 같은 규칙을 쓰도록 한 곳에 모읍니다.
 *
 * 이전에는 app/index.tsx 가 무조건 /(tabs)/home 으로 Redirect 하고,
 * _layout 의 useEffect 가 뒤늦게 /(auth)/login 으로 replace 했습니다.
 * Redirect 는 렌더 단계, useEffect 는 커밋 이후라 항상 홈이 먼저 마운트되어
 * 비로그인 상태로 인증 API를 쏘고(401) 화면이 옆에서 밀려 들어왔습니다.
 */
export type EntryGate = "HOME" | "PROFILE" | "ONBOARDING" | null

export interface EntryRouteInput {
  isAuthenticated: boolean
  accountState: string | null
  requiresAdditionalInfo: boolean
  entryGate: EntryGate
}

export type EntryRoute =
  | "/(auth)/login"
  | "/(auth)/profile-setup"
  | "/onboarding"
  | "/(tabs)/home"

export function resolveEntryRoute(input: EntryRouteInput): EntryRoute {
  if (!input.isAuthenticated) return "/(auth)/login"

  /*
    관문 판정은 `entryGate` **또는** `accountState` 다 — resolveGuard(guard.ts)와
    같은 규칙. 종전에는 여기가 entryGate 만 봐서, 두 값이 어긋난 계정
    (accountState=PENDING_ONBOARDING, entryGate=HOME)이 홈에 먼저 착지해 기능
    (AI 상담 필 등)이 온보딩보다 먼저 보였다. 가드가 뒤늦게 되돌리긴 하지만
    잘못된 화면이 마운트됐다 밀려나는 것 자체가 이 파일이 막으려던 일이다.
  */
  const needsProfile =
    input.entryGate === "PROFILE" || input.accountState === "PENDING_PROFILE"
  const needsAdditionalInfo =
    input.entryGate === "PROFILE" &&
    input.accountState === "ACTIVE" &&
    input.requiresAdditionalInfo

  if (needsProfile || needsAdditionalInfo) return "/(auth)/profile-setup"
  if (
    input.entryGate === "ONBOARDING" ||
    input.accountState === "PENDING_ONBOARDING"
  ) {
    return "/onboarding"
  }
  return "/(tabs)/home"
}
