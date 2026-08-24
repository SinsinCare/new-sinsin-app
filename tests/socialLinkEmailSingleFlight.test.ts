/* eslint-disable import/first -- screen dependencies must be mocked before import. */
const mockSendCode = jest.fn()
const mockVerifyCode = jest.fn()
const mockRouterReplace = jest.fn()
const AUTH_ATTEMPT_ID = "12345678-1234-4123-8123-123456789abc"

jest.mock("react", () => {
  const actual = jest.requireActual("react")
  const harness = jest.requireActual("./helpers/effectHookHarness")
  return {
    ...actual,
    useState: harness.useState,
    useRef: harness.useRef,
    useCallback: harness.useCallback,
    useMemo: harness.useMemo,
    useEffect: harness.useEffect,
  }
})
jest.mock("react-native", () => ({
  Keyboard: { dismiss: jest.fn() },
  StyleSheet: { create: (styles: unknown) => styles },
  Text: "Text",
  View: "View",
}))
jest.mock("expo-router", () => ({
  router: { replace: mockRouterReplace },
  useLocalSearchParams: () => ({
    provider: "kakao",
    socialLinkToken: "social-link-token",
    authAttemptId: AUTH_ATTEMPT_ID,
  }),
}))
jest.mock("react-hook-form", () => ({
  Controller: "Controller",
  useForm: () => ({
    control: {},
    getValues: (name: string) =>
      name === "email" ? "user@example.com" : "123456",
  }),
  useWatch: ({ name }: { name: string }) =>
    name === "email" ? "user@example.com" : "123456",
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("../src/hooks/useAuth", () => ({
  useAuth: () => ({
    sendSocialLinkEmailCode: mockSendCode,
    verifySocialLinkEmailCode: mockVerifyCode,
  }),
}))
jest.mock("../src/lib/toast", () => ({ showErrorToast: jest.fn() }))
jest.mock("../src/lib/errorMessage", () => ({
  toAnalyticsFailKind: () => "unknown",
}))
jest.mock("../src/features/analytics", () => ({
  trackAnalyticsEvent: jest.fn(),
}))
jest.mock("../src/features/auth/components", () => ({
  ResendCodeLink: "ResendCodeLink",
  StepHelperText: "StepHelperText",
  StepTextInput: "StepTextInput",
}))
jest.mock("../src/features/auth/hooks/useAuthSurface", () => ({
  useAuthSurface: () => ({ brand: "#000" }),
}))
jest.mock("../src/features/auth/data/authSurface", () => ({
  AUTH_LAYOUT: { questionToField: 0 },
  AUTH_TYPE: { helper: {} },
}))
jest.mock("../src/features/auth/utils/authFailure", () => ({
  presentAuthFailure: () => "failed",
}))
jest.mock("../src/features/auth/utils/accountStateRoute", () => ({
  getDestinationForAccountState: () => "/(tabs)/home",
}))
jest.mock("../src/features/auth/views/AuthScreenLayout", () => ({
  AuthScreenLayout: "AuthScreenLayout",
}))

import { SocialLinkEmailScreen } from "../src/features/auth/views/SocialLinkEmailScreen"
import { renderHookWithEffects } from "./helpers/effectHookHarness"
/* eslint-enable import/first */

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve
  })
  return { promise, resolve }
}

function submitOf(value: unknown): () => Promise<void> {
  return (value as { props: { onSubmit: () => Promise<void> } }).props.onSubmit
}

describe("social link email single-flight and correlation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it("sends and verifies once per captured handler and keeps the original attempt id", async () => {
    const send = deferred<void>()
    const verify = deferred<{
      status: "SOCIAL_CONSENT_REQUIRED"
      provider: "kakao"
      socialSignupToken: string
      authAttemptId: string
    }>()
    mockSendCode.mockReturnValueOnce(send.promise)
    mockVerifyCode.mockReturnValueOnce(verify.promise)

    const screen = renderHookWithEffects(() => SocialLinkEmailScreen())
    const sendHandler = submitOf(screen.result())
    const firstSend = sendHandler()
    const secondSend = sendHandler()

    expect(mockSendCode).toHaveBeenCalledTimes(1)
    expect(mockSendCode).toHaveBeenCalledWith(
      "social-link-token",
      "user@example.com",
      AUTH_ATTEMPT_ID,
    )
    send.resolve()
    await Promise.all([firstSend, secondSend])

    const verifyHandler = submitOf(screen.result())
    const firstVerify = verifyHandler()
    const secondVerify = verifyHandler()
    expect(mockVerifyCode).toHaveBeenCalledTimes(1)
    expect(mockVerifyCode).toHaveBeenCalledWith(
      "social-link-token",
      "user@example.com",
      "123456",
      AUTH_ATTEMPT_ID,
    )

    verify.resolve({
      status: "SOCIAL_CONSENT_REQUIRED",
      provider: "kakao",
      socialSignupToken: "signup-token",
      authAttemptId: AUTH_ATTEMPT_ID,
    })
    await Promise.all([firstVerify, secondVerify])
    expect(mockRouterReplace).toHaveBeenCalledTimes(1)
    expect(mockRouterReplace).toHaveBeenCalledWith({
      pathname: "/(auth)/terms-agreement",
      params: {
        mode: "social",
        provider: "kakao",
        socialSignupToken: "signup-token",
        authAttemptId: AUTH_ATTEMPT_ID,
      },
    })

    await verifyHandler()
    expect(mockVerifyCode).toHaveBeenCalledTimes(1)
    screen.unmount()
  })
})
