/* eslint-disable import/first -- hook dependencies must be mocked before import. */
const mockCompleteSocialSignup = jest.fn()
const mockGoBack = jest.fn()
const mockSignupStore = {
  reset: jest.fn(),
  setTermsOfServiceAgree: jest.fn(),
  setPrivacyPolicyAgree: jest.fn(),
  setMarketingAgree: jest.fn(),
  setSignupInProgress: jest.fn(),
}
const mockAuthStoreState = {
  setUser: jest.fn(),
  setAccountState: jest.fn(),
  setRequiresAdditionalInfo: jest.fn(),
  setEntryGate: jest.fn(),
  setSessionPersistence: jest.fn(),
}

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
jest.mock("../src/services", () => ({
  authService: { completeSocialSignup: mockCompleteSocialSignup },
}))
jest.mock("../src/stores", () => ({
  useSignupStore: () => mockSignupStore,
  useAuthStore: (selector: (state: typeof mockAuthStoreState) => unknown) =>
    selector(mockAuthStoreState),
}))
jest.mock("../src/i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("../src/lib/toast", () => ({ showErrorToast: jest.fn() }))
jest.mock("../src/lib/errorMessage", () => ({ presentError: jest.fn() }))
jest.mock("../src/features/analytics", () => ({
  identifyAnalyticsUser: jest.fn(),
  trackAnalyticsEvent: jest.fn(),
}))
jest.mock("../src/shared/navigation", () => ({
  useGoBack: () => mockGoBack,
}))
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}))

import { router } from "expo-router"
import { useTermsAgreement } from "../src/features/auth/hooks/useTermsAgreement"
import { renderHookSync } from "./helpers/hookHarness"
/* eslint-enable import/first */

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}

async function flushAsyncHandler(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe("social terms one-shot behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("submits one social-signup request when the same enabled handler is tapped twice", async () => {
    const signup = deferred<{
      user: { uid: string; email: string; displayName: string }
      accountState: "PENDING_PROFILE"
      requiresAdditionalInfo: boolean
      entryGate: "PROFILE"
      sessionPersistence: "ephemeral"
    }>()
    mockCompleteSocialSignup.mockReturnValueOnce(signup.promise)

    const hook = renderHookSync(() =>
      useTermsAgreement({
        mode: "social",
        socialSignupToken: "one-shot-signup-token",
        authAttemptId: "12345678-1234-4123-8123-123456789abc",
      }),
    )
    hook.result().toggleItem("service")
    hook.result().toggleItem("privacy")
    expect(hook.result().canSubmit).toBe(true)

    const sameCapturedHandler = hook.result().handleNext
    sameCapturedHandler()
    sameCapturedHandler()

    expect(mockCompleteSocialSignup).toHaveBeenCalledTimes(1)
    expect(mockCompleteSocialSignup).toHaveBeenCalledWith(
      {
        socialSignupToken: "one-shot-signup-token",
        termsOfServiceAgree: true,
        privacyPolicyAgree: true,
        marketingAgree: false,
      },
      "12345678-1234-4123-8123-123456789abc",
    )

    signup.resolve({
      user: {
        uid: "new-user",
        email: "new@example.com",
        displayName: "New",
      },
      accountState: "PENDING_PROFILE",
      requiresAdditionalInfo: true,
      entryGate: "PROFILE",
      sessionPersistence: "ephemeral",
    })
    await flushAsyncHandler()

    expect(router.replace).toHaveBeenCalledTimes(1)
    expect(router.replace).toHaveBeenCalledWith("/(auth)/profile-setup")
    expect(hook.result().isSubmitting).toBe(false)

    // 서버 성공 뒤 화면이 실제로 unmount되기 전 같은 캡처 핸들러가 다시 와도
    // 소비된 socialSignupToken을 재전송하지 않는다.
    sameCapturedHandler()
    await flushAsyncHandler()
    expect(mockCompleteSocialSignup).toHaveBeenCalledTimes(1)
  })

  it("pops back to the original login instead of replacing it with a duplicate login", () => {
    const hook = renderHookSync(() =>
      useTermsAgreement({
        mode: "social",
        socialSignupToken: "one-shot-signup-token",
      }),
    )

    hook.result().handleBack()

    expect(mockSignupStore.reset).toHaveBeenCalledTimes(1)
    expect(mockGoBack).toHaveBeenCalledTimes(1)
    expect(router.replace).not.toHaveBeenCalled()
  })
})
