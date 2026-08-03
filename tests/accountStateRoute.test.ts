import { getDestinationForAccountState } from "../src/features/auth/utils/accountStateRoute"

describe("auth entry gate routing", () => {
  /*
    관문 판정은 entryGate **또는** accountState 다 — resolveGuard(guard.ts)와
    같은 규칙. 예전에는 "서버 entry gate 가 legacy accountState 보다 우선"이라
    gate=HOME 이면 PENDING_ONBOARDING 이어도 홈으로 보냈는데, 그 계정은 서버
    쓰기 가드(accountState 판정)에 전부 403 을 맞으면서 기능 화면(AI 상담 등)이
    관문보다 먼저 보였다(2026-08-03). 미완 상태가 남아 있으면 그쪽이 이긴다.
  */
  it("does not let entryGate=HOME override an unfinished account state", () => {
    expect(
      getDestinationForAccountState("PENDING_ONBOARDING", false, "HOME"),
    ).toBe("/onboarding")
    expect(
      getDestinationForAccountState("PENDING_PROFILE", false, "HOME"),
    ).toBe("/(auth)/profile-setup")
    expect(getDestinationForAccountState("ACTIVE", true, "HOME")).toBe(
      "/(auth)/profile-setup",
    )
  })

  it("sends a finished account home when the gate says home", () => {
    expect(getDestinationForAccountState("ACTIVE", false, "HOME")).toBe(
      "/(tabs)/home",
    )
  })

  it("keeps a new incomplete account in its required gate", () => {
    expect(
      getDestinationForAccountState("PENDING_PROFILE", false, "PROFILE"),
    ).toBe("/(auth)/profile-setup")
    expect(
      getDestinationForAccountState("PENDING_ONBOARDING", false, "ONBOARDING"),
    ).toBe("/onboarding")
  })
})
