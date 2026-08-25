import { isProfileSetupCompletionMode } from "../src/features/auth/utils/profileSetupMode"

describe("profile setup completion mode", () => {
  it("locks the first required-profile screen from the server entry gate", () => {
    expect(
      isProfileSetupCompletionMode({
        accountState: "PENDING_ONBOARDING",
        entryGate: "PROFILE",
        requiresAdditionalInfo: false,
        isAuthenticated: true,
      }),
    ).toBe(true)
  })

  it("keeps an active account's additional-info backfill in completion mode", () => {
    expect(
      isProfileSetupCompletionMode({
        accountState: "ACTIVE",
        entryGate: "PROFILE",
        requiresAdditionalInfo: true,
        isAuthenticated: true,
      }),
    ).toBe(true)
  })

  it("does not lock the ordinary email-signup form before a session exists", () => {
    expect(
      isProfileSetupCompletionMode({
        accountState: null,
        entryGate: "HOME",
        requiresAdditionalInfo: false,
        isAuthenticated: false,
      }),
    ).toBe(false)
  })
  /*
    2026-08-25 실기기 무한 루프의 회귀 방어.

    가드(`mustFinishProfile`)는 `accountState === "PENDING_PROFILE"` 로도 붙잡는데
    예전 완성 모드 판정은 `entryGate === "PROFILE" && sessionPersistence === "ephemeral"`
    만 봤다. 카카오 로그인 뒤 스토어가 그 좁은 조건을 벗어난 사용자(실측: 여섯 스텝
    mode 가 전부 "signup")는 제출이 이메일 분기를 타 signup-email 로 replace 되고,
    가드가 즉시 프로필 화면으로 되돌려 — 입력이 비워진 채 — 무한 반복했다.
    가드가 붙잡는 상태는 전부 완성 모드여야 한다: 어긋난 폭만큼이 전부 루프다.
  */
  it("가드가 붙잡는 PENDING_PROFILE 은 스토어의 게이트·지속성이 어떻게 오염돼도 완성 모드다", () => {
    expect(
      isProfileSetupCompletionMode({
        accountState: "PENDING_PROFILE",
        entryGate: "HOME",
        requiresAdditionalInfo: false,
        isAuthenticated: true,
      }),
    ).toBe(true)
  })

  it("게이트가 PROFILE 이면 지속성과 무관하게 완성 모드다 — persistent 여도 가드는 붙잡는다", () => {
    expect(
      isProfileSetupCompletionMode({
        accountState: "ACTIVE",
        entryGate: "PROFILE",
        requiresAdditionalInfo: false,
        isAuthenticated: true,
      }),
    ).toBe(true)
  })

  it("로그인 전이면 같은 모양이라도 signup 모드를 유지한다 — 이메일 가입은 가드의 대상이 아니다", () => {
    expect(
      isProfileSetupCompletionMode({
        accountState: "PENDING_PROFILE",
        entryGate: "PROFILE",
        requiresAdditionalInfo: false,
        isAuthenticated: false,
      }),
    ).toBe(false)
  })
})
