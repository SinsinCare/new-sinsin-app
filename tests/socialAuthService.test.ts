const mockGoogleSignin = {
  configure: jest.fn(),
  getTokens: jest.fn(),
  hasPlayServices: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: mockGoogleSignin,
  isCancelledResponse: jest.fn((response) => response?.type === "cancelled"),
  isErrorWithCode: jest.fn((error) => !!error?.code),
  statusCodes: {
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
  },
}))

jest.mock("react-native", () => ({
  Platform: { OS: "android" },
}))

jest.mock("expo-apple-authentication", () => ({
  AppleAuthenticationScope: {
    EMAIL: "EMAIL",
    FULL_NAME: "FULL_NAME",
  },
  signInAsync: jest.fn(),
}))

jest.mock("@react-native-kakao/user", () => ({
  login: jest.fn(),
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

// eslint-disable-next-line import/first
import { signInWithGoogle } from "../src/services/auth/socialAuthService"

describe("signInWithGoogle", () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
  })

  it("clears the previous native Google session before interactive sign-in", async () => {
    await signInWithGoogle()

    expect(mockGoogleSignin.signOut).toHaveBeenCalledTimes(1)
    expect(mockGoogleSignin.signIn).toHaveBeenCalledTimes(1)
    expect(mockGoogleSignin.signOut.mock.invocationCallOrder[0]).toBeLessThan(
      mockGoogleSignin.signIn.mock.invocationCallOrder[0],
    )
  })

  it("still opens Google sign-in if native session cleanup fails", async () => {
    mockGoogleSignin.signOut.mockRejectedValueOnce(new Error("no session"))

    await expect(signInWithGoogle()).resolves.toMatchObject({
      provider: "google",
      idToken: "id-token",
    })
    expect(mockGoogleSignin.signIn).toHaveBeenCalledTimes(1)
  })
})
