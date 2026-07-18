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
const mockAppleSignIn = jest.fn()

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: mockGoogleSignin,
  isCancelledResponse: jest.fn((response) => response?.type === "cancelled"),
  isErrorWithCode: jest.fn((error) => !!error?.code),
  statusCodes: {
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
  },
}))

jest.mock("react-native", () => ({
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
  signInWithApple,
  signInWithGoogle,
  signInWithKakao,
} from "../src/services/auth/socialAuthService"

describe("socialAuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
})
