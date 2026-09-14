/**
 * 진입 가드의 진리표(`src/shared/navigation/guard.ts`).
 *
 * ## 왜 진리표인가
 *
 * 이 판정은 상태 여섯 개(로그인 여부·계정 상태·추가정보 필요·진입 게이트·가입 진행·
 * 온보딩 진행)와 **현재 화면**의 조합이다. 조합 중 상당수는 실제 앱에서 손으로 만들기
 * 어렵다 — "소셜 가입 도중인데 추가정보도 필요한 상태로 약관 화면에 있다" 를 재현하려면
 * 계정을 그 상태로 만들어야 한다.
 *
 * 그래서 조합을 코드로 적어 둔다. 이 표가 곧 "어떤 화면이 언제 열리는가" 의 명세다.
 */
import { resolveGuard, type GuardInput } from "../src/shared/navigation/guard"

function input(overrides: Partial<GuardInput> = {}): GuardInput {
  return {
    isLoading: false,
    isAuthenticated: true,
    accountState: "ACTIVE",
    requiresAdditionalInfo: false,
    entryGate: "HOME",
    isSignupInProgress: false,
    isOnboardingInProgress: false,
    segments: ["(tabs)", "home"],
    isDev: false,
    ...overrides,
  }
}

describe("navigation guard", () => {
  it("decides nothing until the session is restored", () => {
    // 여기서 움직이면 로그인 상태를 알기도 전에 로그인 화면으로 보내게 된다.
    expect(
      resolveGuard(
        input({
          isLoading: true,
          isAuthenticated: false,
          segments: ["(tabs)", "home"],
        }),
      ),
    ).toEqual({ type: "stay" })
  })

  describe("signed out", () => {
    const signedOut = { isAuthenticated: false, accountState: null } as const

    it("sends an app screen to login", () => {
      expect(
        resolveGuard(input({ ...signedOut, segments: ["(tabs)", "home"] })),
      ).toEqual({ type: "redirect", href: "/(auth)/login" })
      expect(
        resolveGuard(input({ ...signedOut, segments: ["restaurant", "[id]"] })),
      ).toEqual({ type: "redirect", href: "/(auth)/login" })
    })

    it("leaves the auth group alone", () => {
      expect(
        resolveGuard(input({ ...signedOut, segments: ["(auth)", "login"] })),
      ).toEqual({ type: "stay" })
      expect(
        resolveGuard(
          input({ ...signedOut, segments: ["(auth)", "signup-email"] }),
        ),
      ).toEqual({ type: "stay" })
    })

    it("keeps the two public screens open", () => {
      // 약관: 로그인 화면의 링크가 여기로 온다. 동의 전에 읽어야 한다.
      expect(
        resolveGuard(
          input({ ...signedOut, segments: ["(settings)", "legal-document"] }),
        ),
      ).toEqual({ type: "stay" })
      // 탈퇴 완료: 이미 로그아웃 상태다. 가드가 낚아채면 "탈퇴됐다" 를 못 본다.
      expect(
        resolveGuard(
          input({
            ...signedOut,
            segments: ["(settings)", "withdrawal-complete"],
          }),
        ),
      ).toEqual({ type: "stay" })
    })

    it("does not redirect login to login", () => {
      // 같은 곳으로의 replace 는 화면을 다시 마운트한다.
      expect(
        resolveGuard(input({ ...signedOut, segments: ["(auth)", "login"] })),
      ).toEqual({ type: "stay" })
    })
  })

  describe("signed in, nothing left to do", () => {
    it("stays wherever the user is", () => {
      expect(resolveGuard(input({ segments: ["(tabs)", "recipe"] }))).toEqual({
        type: "stay",
      })
      expect(
        resolveGuard(input({ segments: ["(settings)", "checkup-list"] })),
      ).toEqual({ type: "stay" })
    })

    it("pushes the user out of the auth group", () => {
      expect(resolveGuard(input({ segments: ["(auth)", "login"] }))).toEqual({
        type: "redirect",
        href: "/(tabs)/home",
      })
    })
  })

  describe("signup in progress", () => {
    it("keeps the user in the auth group between steps", () => {
      expect(
        resolveGuard(
          input({
            isSignupInProgress: true,
            entryGate: "PROFILE",
            accountState: "PENDING_PROFILE",
            segments: ["(auth)", "signup-password"],
          }),
        ),
      ).toEqual({ type: "stay" })
    })

    it("keeps social email linking open even though the user is signed in", () => {
      expect(
        resolveGuard(input({ segments: ["(auth)", "social-link-email"] })),
      ).toEqual({ type: "stay" })
    })
  })

  describe("profile gate", () => {
    const needsProfile = {
      entryGate: "PROFILE",
      accountState: "PENDING_PROFILE",
    } as const

    it("pins any app screen to profile setup", () => {
      expect(
        resolveGuard(input({ ...needsProfile, segments: ["(tabs)", "home"] })),
      ).toEqual({ type: "redirect", href: "/(auth)/profile-setup" })
    })

    it("leaves profile setup itself alone", () => {
      expect(
        resolveGuard(
          input({ ...needsProfile, segments: ["(auth)", "profile-setup"] }),
        ),
      ).toEqual({ type: "stay" })
    })

    it("routes an auth screen to profile setup, not to home", () => {
      expect(
        resolveGuard(
          input({ ...needsProfile, segments: ["(auth)", "signup-complete"] }),
        ),
      ).toEqual({ type: "redirect", href: "/(auth)/profile-setup" })
    })

    it("also fires for an ACTIVE account that still owes extra info", () => {
      expect(
        resolveGuard(
          input({
            entryGate: "PROFILE",
            accountState: "ACTIVE",
            requiresAdditionalInfo: true,
            segments: ["(tabs)", "home"],
          }),
        ),
      ).toEqual({ type: "redirect", href: "/(auth)/profile-setup" })
    })

    it("still lets the user read the terms", () => {
      expect(
        resolveGuard(
          input({
            ...needsProfile,
            segments: ["(settings)", "legal-document"],
          }),
        ),
      ).toEqual({ type: "stay" })
    })
  })

  describe("onboarding gate", () => {
    const needsOnboarding = {
      entryGate: "ONBOARDING",
      accountState: "PENDING_ONBOARDING",
    } as const

    it("pins any app screen to onboarding", () => {
      expect(
        resolveGuard(
          input({ ...needsOnboarding, segments: ["(tabs)", "home"] }),
        ),
      ).toEqual({ type: "redirect", href: "/onboarding" })
    })

    /*
      서버 가드는 accountState 로만 판정하는데 앱이 entryGate 만 보면, 두 값이 어긋난
      계정은 "돌아다닐 수는 있지만 무엇을 눌러도 403" 에 갇힌다(2026-08-02 실제 사고).
      온보딩으로 돌아갈 길이 화면에 없으니 스스로 빠져나올 수도 없었다.
    */
    it("entryGate 가 HOME 이라도 accountState 가 미완료면 온보딩으로 끌어온다", () => {
      expect(
        resolveGuard(
          input({
            entryGate: "HOME",
            accountState: "PENDING_ONBOARDING",
            segments: ["(tabs)", "community"],
          }),
        ),
      ).toEqual({ type: "redirect", href: "/onboarding" })
    })

    it("프로필 미완료도 같은 규칙 — entryGate 와 무관하게 프로필로", () => {
      expect(
        resolveGuard(
          input({
            entryGate: "HOME",
            accountState: "PENDING_PROFILE",
            segments: ["(tabs)", "home"],
          }),
        ),
      ).toEqual({ type: "redirect", href: "/(auth)/profile-setup" })
    })

    it("leaves onboarding itself alone", () => {
      expect(
        resolveGuard(input({ ...needsOnboarding, segments: ["onboarding"] })),
      ).toEqual({ type: "stay" })
    })

    it("does not yank the user out mid-onboarding", () => {
      // 온보딩이 마지막 단계에서 홈으로 replace 하는 그 순간, 게이트는 아직
      // ONBOARDING 이다. 여기서 되돌리면 홈에 도착하지 못한다.
      expect(
        resolveGuard(
          input({
            ...needsOnboarding,
            isOnboardingInProgress: true,
            segments: ["(tabs)", "home"],
          }),
        ),
      ).toEqual({ type: "stay" })
    })

    it.each([["consult"], ["stories"], ["statistics"]])(
      "kicks a feature surface (%s) opened over onboarding back to the gate",
      (surface) => {
        // 진행 중 STAY 는 완주 착지(탭)용이다. 여기서 전역 모달까지 허용하면
        // iOS 가 presented 모달을 카드 위에 남겨 둬서 온보딩이 기능 화면 **뒤에
        // 깔려 안 보인다**(2026-08-03 "AI상담이 온보딩보다 앞에").
        expect(
          resolveGuard(
            input({
              ...needsOnboarding,
              isOnboardingInProgress: true,
              segments: [surface],
            }),
          ),
        ).toEqual({ type: "redirect", href: "/onboarding" })
      },
    )
  })

  describe("blocked accounts", () => {
    it.each(["SUSPENDED", "WITHDRAWAL_PENDING"])(
      "signs out a %s account instead of redirecting",
      (accountState) => {
        expect(resolveGuard(input({ accountState }))).toEqual({
          type: "signOut",
        })
      },
    )
  })

  describe("v2 showcase", () => {
    it("is open in dev without a login", () => {
      expect(
        resolveGuard(
          input({
            isDev: true,
            isAuthenticated: false,
            accountState: null,
            segments: ["v2-showcase"],
          }),
        ),
      ).toEqual({ type: "stay" })
    })

    it("is unreachable in production even by deep link", () => {
      expect(
        resolveGuard(input({ isDev: false, segments: ["v2-showcase"] })),
      ).toEqual({ type: "redirect", href: "/(tabs)/home" })
      expect(
        resolveGuard(
          input({
            isDev: false,
            isAuthenticated: false,
            accountState: null,
            segments: ["v2-showcase"],
          }),
        ),
      ).toEqual({ type: "redirect", href: "/(auth)/login" })
    })
  })
})
