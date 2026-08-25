import type { EntryGate, SessionPersistence } from "@/src/types"

interface ProfileSetupModeInput {
  accountState: string | null
  entryGate: EntryGate
  /** @deprecated 판정에서 제외됐다 — 가드와 같은 축만 본다(아래 머리말). 호출부 호환용. */
  sessionPersistence?: SessionPersistence
  requiresAdditionalInfo: boolean
  isAuthenticated: boolean
}

/**
 * **가드가 붙잡는 상태는 전부 완성 모드다** — 이 판정은 루트 가드
 * (`shared/navigation/guard.ts` 의 `mustFinishProfile`: `entryGate === "PROFILE" ||
 * accountState === "PENDING_PROFILE" || 추가정보`)와 같은 축을 봐야 한다.
 *
 * ■ 왜 (2026-08-25 실기기, "닉네임으로 자꾸 되돌아감. 무한반복")
 *
 * 예전 판정은 `entryGate === "PROFILE" && sessionPersistence === "ephemeral"` 로
 * 가드보다 좁았다. 카카오로 로그인한 PENDING_PROFILE 사용자의 스토어가 어떤 경로로든
 * 그 좁은 조건을 벗어나면(실측: 여섯 스텝의 mode 가 전부 "signup" 으로 발화),
 * 제출이 **이메일 가입 분기**를 타고 — 소셜 사용자에게는 없는 `signupToken` 이 비어
 * — `signup-email` 로 replace 하는데, 가드는 여전히 그 사용자를 붙잡고 있으므로
 * 즉시 profile-setup 으로 되돌린다. 리마운트로 입력은 비워지고, 사용자는 여섯 스텝을
 * 다시 채우고, 같은 자리에서 또 튕긴다 — 탈출구가 로그아웃뿐인 무한 루프다.
 *
 * 가드가 붙잡았다 = 이 화면의 제출로만 나갈 수 있다 = 그 제출은
 * `POST /user/profile/complete` 여야 한다. 둘의 판정이 갈라지면 어긋난 폭만큼이
 * 전부 루프다. 그래서 **넓히는 쪽이 아니라 같게 만드는 쪽**이 맞다.
 *
 * `isAuthenticated` 를 함께 보는 이유: 이메일 가입은 **로그인 전에** 이 화면을
 * 지나므로(계정이 아직 없다) 가드의 대상이 아니고, 그쪽은 계속 signup 모드여야 한다.
 */
export function isProfileSetupCompletionMode({
  accountState,
  entryGate,
  requiresAdditionalInfo,
  isAuthenticated,
}: ProfileSetupModeInput) {
  if (!isAuthenticated) return false
  return (
    entryGate === "PROFILE" ||
    accountState === "PENDING_PROFILE" ||
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
