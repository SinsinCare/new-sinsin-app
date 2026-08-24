/* eslint-disable import/first -- jest mocks must be installed before the real modules load. */
/*
  로그인 화면 재포커스가 single-flight 래치를 푸는지 잰다.

  2026-08-25 리뷰 적발: 409 약관 동의·이메일 연결 갈래는 `navigationOwnsAttempt` 로
  래치를 잠근 채 push 하는데, push 는 LoginScreen 을 언마운트하지 않는다. 사용자가
  그 화면에서 **뒤로 돌아오면**(이번 작업분이 약관 화면의 뒤로가기를 replace →
  goBack 으로 바꿔 정확히 그 인스턴스로 돌아온다) 래치가 잠긴 채 남아 카카오·구글·
  애플 버튼 전부가 스피너도 없이 영구히 죽었다 — 사용자가 보고한 "카카오 로그인이
  안 된다"를 diff 가 재생산하는 blocker 였다.

  처방은 포커스 복귀 시 래치 해제다. 이 스위트는 세 가지를 한 흐름으로 잰다:
  ① 같은 렌더의 이중 탭은 여전히 한 번만 들어간다(원래 래치의 존재 이유),
  ② push 뒤 래치는 잠겨 있다, ③ 재포커스가 래치를 풀어 재시도가 실제로 나간다.
  ③만 자르면(useFocusEffect 제거) 이 테스트가 죽는다 — 변이 검증 2026-08-25.
*/
const mockSignInWithSocialProvider = jest.fn()

jest.mock("react", () => {
  const actual = jest.requireActual("react")
  const harness = jest.requireActual("./helpers/hookHarness")
  return {
    ...actual,
    useState: harness.useState,
    useRef: harness.useRef,
    useCallback: harness.useCallback,
    useMemo: harness.useMemo,
  }
})

/* 포커스 전이를 손에 쥔다 — 전역 목(setup.ts)은 마운트 1회만 불러 재포커스를 못 잰다. */
let focusCallback: (() => void) | null = null
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useFocusEffect: (callback: () => void) => {
    focusCallback = callback
  },
}))

jest.mock("../src/i18n", () => ({ getAppLanguage: () => "ko" }))
jest.mock("../src/lib/errorMessage", () => ({ presentError: jest.fn() }))
jest.mock("../src/features/analytics", () => ({
  trackAnalyticsEvent: jest.fn(),
}))
jest.mock("../src/shared/components/appModalGate", () => ({
  afterModalTransitions: jest.fn(async () => undefined),
}))
jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn() },
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("../src/hooks/useAuth", () => ({
  useAuth: () => ({
    signInWithSocialProvider: mockSignInWithSocialProvider,
    cancelWithdrawal: jest.fn(),
    isUserCancelledError: () => false,
  }),
}))

import { router } from "expo-router"
import { useSocialLogin } from "../src/features/auth/hooks/useSocialLogin"
import { renderHookSync } from "./helpers/hookHarness"
/* eslint-enable import/first */

const CONSENT_REQUIRED = {
  status: "SOCIAL_CONSENT_REQUIRED" as const,
  provider: "kakao" as const,
  socialSignupToken: "signup-token",
}

describe("로그인 화면 재포커스가 소셜 single-flight 래치를 푼다", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    focusCallback = null
    mockSignInWithSocialProvider.mockResolvedValue(CONSENT_REQUIRED)
  })

  it("약관 화면에서 뒤로 돌아오면 소셜 버튼이 다시 산다", async () => {
    const hook = renderHookSync(() => useSocialLogin())
    expect(focusCallback).not.toBeNull()

    // ① 같은 렌더의 이중 탭 — 두 호출 중 하나만 들어간다(래치의 존재 이유는 지킨다).
    await Promise.all([
      hook.result().loginWithProvider("kakao"),
      hook.result().loginWithProvider("kakao"),
    ])
    expect(mockSignInWithSocialProvider).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledTimes(1)

    // ② push 가 흐름을 가져간 뒤에는 래치가 잠겨 있다 — 재포커스 없이는 무반응.
    await hook.result().loginWithProvider("kakao")
    expect(mockSignInWithSocialProvider).toHaveBeenCalledTimes(1)

    // ③ 약관 화면에서 뒤로 → 로그인 화면 재포커스 → 래치 해제 → 재시도가 나간다.
    focusCallback?.()
    await hook.result().loginWithProvider("kakao")
    expect(mockSignInWithSocialProvider).toHaveBeenCalledTimes(2)
    expect(router.push).toHaveBeenCalledTimes(2)
  })

  it("재포커스 해제는 진행 중 시도를 끊지 않는다 — 커스텀 탭이 떠 있는 동안 포커스는 안 바뀐다", async () => {
    /*
      음성 대조를 겸한다: 포커스 해제가 "언제나 열려 있는 뒷문"이면 이중 탭 방지가
      무의미해진다. 진행 중(프라미스 미정산) 재진입은 여전히 한 번만 들어가야 한다.
    */
    let release!: (value: typeof CONSENT_REQUIRED) => void
    mockSignInWithSocialProvider.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve
        }),
    )
    const hook = renderHookSync(() => useSocialLogin())

    const first = hook.result().loginWithProvider("kakao")
    await hook.result().loginWithProvider("kakao")
    expect(mockSignInWithSocialProvider).toHaveBeenCalledTimes(1)

    release(CONSENT_REQUIRED)
    await first
    expect(router.push).toHaveBeenCalledTimes(1)
  })
})
