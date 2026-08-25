const mockGoogleSignin = {
  configure: jest.fn(),
  getTokens: jest.fn(),
  hasPlayServices: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}
const mockPlatform = { OS: "android" }
let mockReauthenticationRequired = false
const mockIsSocialReauthenticationRequired = jest.fn(
  async () => mockReauthenticationRequired,
)
const mockConsumeSocialReauthenticationIntent = jest.fn(async () => {
  mockReauthenticationRequired = false
})
const mockKakaoLogin = jest.fn()
const mockIsKakaoTalkLoginAvailable = jest.fn()
const mockAppleSignIn = jest.fn()

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: mockGoogleSignin,
  isCancelledResponse: jest.fn((response) => response?.type === "cancelled"),
  isErrorWithCode: jest.fn((error) => !!error?.code),
  statusCodes: {
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
  },
}))

/*
  AppState 는 `withKakaoReturnDeadline` 이 "인증 화면에서 앱으로 돌아온 순간"을 아는
  유일한 신호다. 테스트가 전이를 직접 쏠 수 있게 리스너를 밖으로 노출한다.
*/
const appStateListeners = new Set<(state: string) => void>()
const emitAppState = (state: string) => {
  for (const listener of [...appStateListeners]) listener(state)
}
const mockAppState = {
  addEventListener: jest.fn((_type: string, listener: (s: string) => void) => {
    appStateListeners.add(listener)
    return { remove: () => appStateListeners.delete(listener) }
  }),
}

jest.mock("react-native", () => ({
  AppState: mockAppState,
  Platform: mockPlatform,
}))

jest.mock("expo-apple-authentication", () => ({
  AppleAuthenticationScope: {
    EMAIL: "EMAIL",
    FULL_NAME: "FULL_NAME",
  },
  signInAsync: mockAppleSignIn,
}))

jest.mock("@react-native-kakao/user", () => ({
  isKakaoTalkLoginAvailable: mockIsKakaoTalkLoginAvailable,
  login: mockKakaoLogin,
}))

jest.mock("@react-native-kakao/core", () => ({
  getKeyHashAndroid: jest.fn(),
  initializeKakaoSDK: jest.fn(),
}))

jest.mock("../src/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock("../src/services/auth/authService", () => ({
  consumeSocialReauthenticationIntent: mockConsumeSocialReauthenticationIntent,
  isSocialReauthenticationRequired: mockIsSocialReauthenticationRequired,
}))

// eslint-disable-next-line import/first
import {
  isUserCancelledError,
  signInWithApple,
  signInWithGoogle,
  signInWithKakao,
} from "../src/services/auth/socialAuthService"
// eslint-disable-next-line import/first
import { logger } from "../src/lib/logger"

describe("socialAuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    appStateListeners.clear()
    mockPlatform.OS = "android"
    mockReauthenticationRequired = false
    mockGoogleSignin.hasPlayServices.mockResolvedValue(true)
    mockGoogleSignin.signOut.mockResolvedValue(null)
    mockGoogleSignin.signIn.mockResolvedValue({
      type: "success",
      data: {
        idToken: "id-token",
        user: {
          email: "user@example.com",
          name: "Test User",
        },
      },
    })
    mockKakaoLogin.mockResolvedValue({
      accessToken: "kakao-access-token",
      idToken: null,
      tokenType: "bearer",
      scopes: [],
    })
    mockIsKakaoTalkLoginAvailable.mockResolvedValue(false)
    mockAppleSignIn.mockResolvedValue({
      identityToken: "apple-identity-token",
      email: null,
      fullName: null,
    })
  })

  it("does not clear the native Google session during a normal sign-in", async () => {
    await signInWithGoogle()

    expect(mockGoogleSignin.signOut).not.toHaveBeenCalled()
    expect(mockGoogleSignin.signIn).toHaveBeenCalledTimes(1)
    expect(mockConsumeSocialReauthenticationIntent).not.toHaveBeenCalled()
  })

  it("clears Google once after explicit logout and consumes the intent on provider success", async () => {
    mockReauthenticationRequired = true

    await signInWithGoogle()
    await signInWithGoogle()

    expect(mockGoogleSignin.signOut).toHaveBeenCalledTimes(1)
    expect(mockGoogleSignin.signOut.mock.invocationCallOrder[0]).toBeLessThan(
      mockGoogleSignin.signIn.mock.invocationCallOrder[0],
    )
    expect(mockGoogleSignin.signIn).toHaveBeenCalledTimes(2)
    expect(mockConsumeSocialReauthenticationIntent).toHaveBeenCalledTimes(1)
  })

  it("does not continue or consume the intent if Google cleanup fails", async () => {
    mockReauthenticationRequired = true
    mockGoogleSignin.signOut.mockRejectedValueOnce(new Error("cleanup failed"))

    await expect(signInWithGoogle()).rejects.toThrow("cleanup failed")

    expect(mockGoogleSignin.signIn).not.toHaveBeenCalled()
    expect(mockConsumeSocialReauthenticationIntent).not.toHaveBeenCalled()
    expect(mockReauthenticationRequired).toBe(true)
  })

  it("keeps the Google intent after cancellation and retries cleanup before the next selection", async () => {
    mockReauthenticationRequired = true
    mockGoogleSignin.signIn
      .mockResolvedValueOnce({ type: "cancelled" })
      .mockResolvedValueOnce({
        type: "success",
        data: {
          idToken: "retry-id-token",
          user: { email: "retry@example.com", name: "Retry User" },
        },
      })

    await expect(signInWithGoogle()).rejects.toMatchObject({
      code: "SIGN_IN_CANCELLED",
    })
    expect(mockConsumeSocialReauthenticationIntent).not.toHaveBeenCalled()

    await expect(signInWithGoogle()).resolves.toMatchObject({
      provider: "google",
      idToken: "retry-id-token",
    })

    expect(mockGoogleSignin.signOut).toHaveBeenCalledTimes(2)
    expect(mockConsumeSocialReauthenticationIntent).toHaveBeenCalledTimes(1)
  })

  it("uses Kakao Account reauthentication and bypasses other providers", async () => {
    mockReauthenticationRequired = true

    await expect(signInWithKakao()).resolves.toMatchObject({
      provider: "kakao",
      idToken: "kakao-access-token",
    })

    expect(mockKakaoLogin).toHaveBeenCalledWith({
      useKakaoAccountLogin: true,
      prompts: ["SelectAccount"],
    })
    expect(mockGoogleSignin.signOut).not.toHaveBeenCalled()
    expect(mockAppleSignIn).not.toHaveBeenCalled()
    expect(mockConsumeSocialReauthenticationIntent).toHaveBeenCalledTimes(1)
  })

  it("rejects an empty Kakao access token before consuming reauthentication intent", async () => {
    mockReauthenticationRequired = true
    mockKakaoLogin.mockResolvedValueOnce({
      accessToken: "   ",
      idToken: null,
      scopes: [],
    })

    await expect(signInWithKakao()).rejects.toMatchObject({
      code: "SOCIAL_PROVIDER_TOKEN_MISSING",
    })

    expect(mockConsumeSocialReauthenticationIntent).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith("[Kakao SignIn] accessToken 없음")
  })

  it("키 해시 미등록(Misconfigured)은 설정 오류로 번역된다 — transport.unknown 오진 방지", async () => {
    /*
      2026-08-25 실기기 보고의 재현: 카카오 웹 동의는 끝났는데 SDK 토큰 발급이
      Misconfigured 로 거절되면, 날것 에러는 API 오류도 오프라인도 아니라서
      "지금은 이 작업을 마치지 못했어요"(transport.unknown) 로 떨어졌다.
      사용자가 고칠 수 없는 문제는 그렇게 말해야 한다 — SOCIAL_CONFIG_ERROR.
    */
    mockKakaoLogin.mockRejectedValueOnce(
      Object.assign(new Error("Android keyHash validation failed."), {
        code: "Misconfigured",
      }),
    )

    await expect(signInWithKakao()).rejects.toMatchObject({
      code: "SOCIAL_CONFIG_ERROR",
    })
    // 진단용 키 해시 로그는 그대로 남는다.
    expect(logger.error).toHaveBeenCalledWith(
      "[Kakao SignIn] login 실패",
      expect.objectContaining({ code: "Misconfigured" }),
    )
  })

  it("falls back once from KakaoTalk failure to Kakao Account login", async () => {
    mockIsKakaoTalkLoginAvailable.mockResolvedValueOnce(true)
    mockKakaoLogin
      .mockRejectedValueOnce(
        Object.assign(new Error("talk failed"), { code: "TalkError" }),
      )
      .mockResolvedValueOnce({
        accessToken: "account-access-token",
        idToken: null,
        scopes: [],
      })

    await expect(signInWithKakao()).resolves.toMatchObject({
      provider: "kakao",
      idToken: "account-access-token",
    })
    expect(mockKakaoLogin).toHaveBeenNthCalledWith(1)
    expect(mockKakaoLogin).toHaveBeenNthCalledWith(2, {
      useKakaoAccountLogin: true,
    })
  })

  it("does not turn KakaoTalk cancellation into an Account-login prompt", async () => {
    mockIsKakaoTalkLoginAvailable.mockResolvedValueOnce(true)
    mockKakaoLogin.mockRejectedValueOnce(
      Object.assign(new Error("cancelled"), { code: "Cancelled" }),
    )

    await expect(signInWithKakao()).rejects.toMatchObject({ code: "Cancelled" })
    expect(mockKakaoLogin).toHaveBeenCalledTimes(1)
  })

  describe("카카오 복귀 마감시한 — 인증 화면에서 그냥 돌아오면 취소다", () => {
    /*
      2026-08-24 재현: 커스텀 탭을 닫지 않고 앱으로 돌아오면 AuthCodeHandlerActivity 가
      결과 없이 파괴되고 네이티브 login() 이 영원히 안 풀린다. 이 스위트는 그 상황을
      "안 풀리는 프라미스"로 흉내 내고, 마감시한이 취소로 정산하는지를 본다.
    */
    const GRACE_MS = 10_000

    beforeEach(() => {
      jest.useFakeTimers()
    })
    afterEach(() => {
      jest.useRealTimers()
    })

    const flushMicrotasks = () => jest.advanceTimersByTimeAsync(0)

    it("복귀 후 유예가 지나도록 미정산이면 Cancelled 로 거절한다", async () => {
      mockKakaoLogin.mockReturnValueOnce(new Promise(() => {}))

      const attempt = signInWithKakao()
      const settled = attempt.catch((e: unknown) => e)
      await flushMicrotasks()
      expect(appStateListeners.size).toBe(1)

      emitAppState("background")
      emitAppState("active")
      await jest.advanceTimersByTimeAsync(GRACE_MS)

      const error = (await settled) as Error & { code?: string }
      expect(error.code).toBe("Cancelled")
      expect(isUserCancelledError(error)).toBe(true)
      // 진단은 남긴다 — 취소 분류라도 이 갈래는 결함 신호라서 error 로 찍는다.
      expect(logger.error).toHaveBeenCalledWith(
        "[Kakao SignIn] 인증 화면에서 복귀 후 미정산 — 취소로 처리",
        expect.objectContaining({ graceMs: GRACE_MS }),
      )
      // 리스너 잔류 = 다음 로그인 시도에서 유령 시계가 돈다.
      expect(appStateListeners.size).toBe(0)
    })

    it("유예 안에 성공하면 그대로 성공이고 시계는 걷힌다", async () => {
      let resolveLogin!: (token: unknown) => void
      mockKakaoLogin.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveLogin = resolve
        }),
      )

      const attempt = signInWithKakao()
      await flushMicrotasks()
      emitAppState("background")
      emitAppState("active")
      // 정상 성공도 포그라운드에서 토큰 교환이 돈다 — 유예 안의 지연은 성공이어야 한다.
      await jest.advanceTimersByTimeAsync(GRACE_MS - 1_000)
      resolveLogin({
        accessToken: "kakao-access-token",
        idToken: null,
        scopes: [],
      })

      await expect(attempt).resolves.toMatchObject({ provider: "kakao" })
      expect(appStateListeners.size).toBe(0)
      expect(logger.error).not.toHaveBeenCalled()
    })

    it("다시 인증 화면으로 나가면 시계를 멈춘다", async () => {
      mockKakaoLogin.mockReturnValueOnce(new Promise(() => {}))

      const attempt = signInWithKakao()
      const settled = attempt.catch((e: unknown) => e)
      await flushMicrotasks()

      emitAppState("background")
      emitAppState("active")
      await jest.advanceTimersByTimeAsync(GRACE_MS - 1)
      emitAppState("background")
      // 인증 화면에 머무는 동안은 아무리 지나도 취소하지 않는다.
      await jest.advanceTimersByTimeAsync(GRACE_MS * 3)
      expect(logger.error).not.toHaveBeenCalled()

      emitAppState("active")
      await jest.advanceTimersByTimeAsync(GRACE_MS)
      const error = (await settled) as Error & { code?: string }
      expect(error.code).toBe("Cancelled")
    })

    it("iOS 는 감싸지 않는다 — ASWebAuthenticationSession 이 복귀를 스스로 정산한다", async () => {
      mockPlatform.OS = "ios"

      await expect(signInWithKakao()).resolves.toMatchObject({
        provider: "kakao",
      })
      expect(mockAppState.addEventListener).not.toHaveBeenCalled()
    })
  })

  it("keeps Apple on the OS authentication UI without invoking other providers", async () => {
    mockPlatform.OS = "ios"
    mockReauthenticationRequired = true

    await expect(signInWithApple()).resolves.toMatchObject({
      provider: "apple",
      idToken: "apple-identity-token",
    })

    expect(mockAppleSignIn).toHaveBeenCalledTimes(1)
    expect(mockGoogleSignin.signOut).not.toHaveBeenCalled()
    expect(mockKakaoLogin).not.toHaveBeenCalled()
    expect(mockConsumeSocialReauthenticationIntent).toHaveBeenCalledTimes(1)
  })

  describe("사용자 취소는 에러가 아니다", () => {
    // 취소를 logger.error 로 찍으면 dev 에서 LogBox 가 뜨고,
    // logger.error 는 전 빌드에서 console.error 를 남기므로 디바이스 로그가 오염된다.
    it("카카오 창을 닫아도 error 로 찍지 않는다", async () => {
      // 실제 RNCKakao 가 던지는 형태
      const cancelled = Object.assign(
        new Error("The authentication session has been canceled by user."),
        { code: "Cancelled", domain: "RNCKakaoErrorDomain" },
      )
      mockKakaoLogin.mockRejectedValueOnce(cancelled)

      await expect(signInWithKakao()).rejects.toBe(cancelled)

      expect(isUserCancelledError(cancelled)).toBe(true)
      expect(logger.error).not.toHaveBeenCalled()
      expect(logger.debug).toHaveBeenCalledWith("[Kakao SignIn] 사용자가 취소")
    })

    it("애플 시트를 닫아도 error 로 찍지 않는다", async () => {
      mockPlatform.OS = "ios"
      const cancelled = Object.assign(
        new Error("The user canceled the sign-in flow."),
        {
          code: "ERR_REQUEST_CANCELED",
        },
      )
      mockAppleSignIn.mockRejectedValueOnce(cancelled)

      await expect(signInWithApple()).rejects.toBe(cancelled)

      expect(logger.error).not.toHaveBeenCalled()
      expect(logger.debug).toHaveBeenCalledWith("[Apple SignIn] 사용자가 취소")
    })

    it("진짜 실패는 그대로 error 로 남긴다", async () => {
      const failure = Object.assign(new Error("network unreachable"), {
        code: "NetworkError",
      })
      mockKakaoLogin.mockRejectedValueOnce(failure)

      await expect(signInWithKakao()).rejects.toBe(failure)

      expect(isUserCancelledError(failure)).toBe(false)
      expect(logger.error).toHaveBeenCalledWith(
        "[Kakao SignIn] login 실패",
        expect.objectContaining({ code: "NetworkError" }),
      )
    })
  })
})
