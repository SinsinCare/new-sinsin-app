import type { EntryGate, SessionPersistence } from "@/src/types"

interface ProfileSetupModeInput {
  accountState: string | null
  entryGate: EntryGate
  sessionPersistence: SessionPersistence
  requiresAdditionalInfo: boolean
}

/**
 * The server entry gate is authoritative for an incomplete signup session.
 * Account state alone may still be a legacy value while the user must complete
 * their profile before reaching onboarding.
 */
export function isProfileSetupCompletionMode({
  accountState,
  entryGate,
  sessionPersistence,
  requiresAdditionalInfo,
}: ProfileSetupModeInput) {
  return (
    (entryGate === "PROFILE" && sessionPersistence === "ephemeral") ||
    (accountState === "ACTIVE" && requiresAdditionalInfo)
  )
}

/**
 * 프로필 입력 **첫 스텝에서 나갈 때 갈 수 있는 곳**.
 *
 *  - `"signOut"` — 로그아웃해서 로그인 화면으로. 그 길밖에 없다.
 *  - `"back"` — 로그아웃하지 않고 앱으로 돌아간다.
 *
 * ■ 왜 `isProfileSetupCompletionMode` 로 못 가르나
 *
 * 이 화면에 갇히느냐 마느냐를 정하는 것은 **루트 가드**(`shared/navigation/guard.ts`
 * 의 `mustFinishProfile`)다. 가드가 붙잡는 상태에서 앱 쪽으로 돌아가면 다음 판정이
 * 곧바로 `/(auth)/profile-setup` 으로 되돌려 놓는다 — 사용자에게는 "뒤로가기를
 * 눌렀는데 아무 일도 안 일어난다" 로 보이고, 갇힌 것은 그대로다.
 *
 * 그 붙잡는 조건이 `entryGate === "PROFILE" || accountState === "PENDING_PROFILE"`
 * 이라 **여기도 같은 식을 쓴다.** 완성 모드(`isProfileSetupCompletionMode`)와는
 * 일부러 다른 축이다:
 *
 *  - 소셜 가입 도중(gate=PROFILE, 임시 세션) → 가드가 붙잡는다 → `"signOut"`.
 *  - 추가정보 backfill(ACTIVE + requiresAdditionalInfo) 은 **둘로 갈린다.**
 *    gate 가 아직 PROFILE 이면 가드가 똑같이 붙잡으므로 `"signOut"`, gate 가 이미
 *    HOME/ONBOARDING 으로 넘어갔으면 붙잡히지 않으므로 `"back"` — 이미 쓰던 계정을
 *    돌려보내면 그만인 자리에서 로그아웃까지 시키지 않는다.
 *  - 이메일 가입(로그인 전) 은 애초에 가드의 대상이 아니다 → `"back"`.
 */
export type ProfileSetupExit = "signOut" | "back"

export function resolveProfileSetupExit({
  accountState,
  entryGate,
  isAuthenticated,
}: {
  accountState: string | null
  entryGate: EntryGate
  isAuthenticated: boolean
}): ProfileSetupExit {
  // 가드는 로그인한 사람만 붙잡는다(`resolveGuard` 의 `!isAuthenticated` 갈래).
  if (!isAuthenticated) return "back"
  if (entryGate === "PROFILE" || accountState === "PENDING_PROFILE") {
    return "signOut"
  }
  return "back"
}
