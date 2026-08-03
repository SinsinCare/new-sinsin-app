import type { AccountState, EntryGate } from "@/src/types"

export type AuthDestination =
  | "/(auth)/profile-setup"
  | "/onboarding"
  | "/(tabs)/home"

export function getDestinationForAccountState(
  accountState: AccountState | string | null | undefined,
  requiresAdditionalInfo = false,
  entryGate?: EntryGate,
): AuthDestination {
  if (entryGate === "PROFILE") return "/(auth)/profile-setup"
  if (entryGate === "ONBOARDING") return "/onboarding"
  /*
    `entryGate === "HOME"` 이 곧바로 홈을 돌려주지 않는 이유: 관문 판정은
    entryGate **또는** accountState 다(guard.ts 머리말). 두 값이 어긋난 계정
    (gate=HOME, state=PENDING_ONBOARDING)을 홈으로 보내면 기능 화면이 관문보다
    먼저 마운트된다 — 그래서 상태 쪽 미완이 있으면 그쪽이 이긴다.
  */
  if (accountState === "ACTIVE" && requiresAdditionalInfo) {
    return "/(auth)/profile-setup"
  }
  if (accountState === "PENDING_PROFILE") return "/(auth)/profile-setup"
  if (accountState === "PENDING_ONBOARDING") return "/onboarding"
  return "/(tabs)/home"
}
