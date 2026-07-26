import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import * as ts from "typescript"
import { ApiError } from "../src/services/core/apiError"
import { getPostAuthenticationDestination } from "../src/features/auth/data/emailLoginFlow"
import {
  canVerifyPasswordResetOtp,
  createInitialPasswordResetFlowState,
  passwordResetFlowReducer,
} from "../src/features/auth/data/passwordResetFlow"
import { getPasswordFlowToken } from "../src/features/auth/data/passwordFlow"
import {
  getSocialLoginErrorAction,
  getSocialLoginSuccessAction,
} from "../src/features/auth/utils/socialLoginFlow"
import { getWithdrawalPendingResult } from "../src/features/auth/utils/withdrawalPending"

const mockRouterReplace = jest.fn()
const mockSignOut = jest.fn()
const mockSetColorScheme = jest.fn()
const mockNotificationListener = jest.fn(() => ({ remove: jest.fn() }))

let mockSegments: string[] = ["(auth)", "login"]
let mockAuthState = {
  isAuthenticated: false,
  isLoading: false,
  accountState: null as string | null,
  requiresAdditionalInfo: false,
  entryGate: "HOME" as "HOME" | "PROFILE" | "ONBOARDING",
  signOut: mockSignOut,
}

jest.mock("react", () => {
  const actual = jest.requireActual<typeof import("react")>("react")
  return {
    ...actual,
    useEffect: (effect: () => void | (() => void)) => effect(),
    useMemo: <T>(factory: () => T) => factory(),
    useRef: <T>(initialValue: T) => ({ current: initialValue }),
  }
})

jest.mock("react-native", () => ({
  Appearance: { setColorScheme: mockSetColorScheme },
  useColorScheme: () => "light",
}))

jest.mock("react-native-gesture-handler", () => ({
  Gesture: {},
  GestureDetector: "GestureDetector",
  GestureHandlerRootView: "GestureHandlerRootView",
}))

jest.mock("@tamagui/sheet/setup-gesture-handler", () => ({
  setupGestureHandler: jest.fn(),
}))

jest.mock("tamagui", () => ({
  TamaguiProvider: "TamaguiProvider",
  Theme: "Theme",
}))

jest.mock("@tamagui/portal", () => ({ PortalProvider: "PortalProvider" }))
jest.mock("@tanstack/react-query", () => ({
  QueryClientProvider: "QueryClientProvider",
}))
jest.mock("expo-font", () => ({ useFonts: () => [true] }))

jest.mock("expo-router", () => {
  const Stack = Object.assign(jest.fn(), { Screen: jest.fn() })
  return {
    Stack,
    useRouter: () => ({
      replace: mockRouterReplace,
    }),
    useSegments: () => mockSegments,
  }
})

jest.mock("expo-status-bar", () => ({ StatusBar: "StatusBar" }))
jest.mock("expo-notifications", () => ({
  addNotificationResponseReceivedListener: mockNotificationListener,
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
}))
jest.mock("react-native-keyboard-controller", () => ({
  KeyboardProvider: "KeyboardProvider",
}))
jest.mock("../tamagui.config", () => ({ __esModule: true, default: {} }))
jest.mock("@/src/i18n", () => ({}))
jest.mock("@/src/services", () => ({ queryClient: {} }))
jest.mock("@/src/hooks", () => ({
  useAuth: () => mockAuthState,
  useAuthSessionBootstrap: jest.fn(),
}))
jest.mock("@/src/stores", () => ({
  useAuthStore: (selector: (state: { user: null }) => unknown) =>
    selector({ user: null }),
  useSignupStore: (
    selector: (state: { isSignupInProgress: boolean }) => unknown,
  ) => selector({ isSignupInProgress: false }),
  useOnboardingStore: (
    selector: (state: { isOnboardingInProgress: boolean }) => unknown,
  ) => selector({ isOnboardingInProgress: false }),
  useThemeStore: (selector: (state: { themeMode: "light" }) => unknown) =>
    selector({ themeMode: "light" }),
}))
jest.mock("@/src/shared/components", () => ({
  LoadingScreen: "LoadingScreen",
  Toast: "Toast",
}))
jest.mock("@/src/hooks/useNotifications", () => ({
  useNotifications: jest.fn(),
}))
jest.mock("@/src/features/mobilePolicy", () => ({
  AppPolicyGate: "AppPolicyGate",
}))
jest.mock("@/src/services/notificationRoutingService", () => ({
  routeFromPushData: jest.fn(),
}))
jest.mock("@/src/features/home/hooks/useFoodAnalysisRecovery", () => ({
  useFoodAnalysisRecovery: jest.fn(),
}))
jest.mock("@/src/features/home/services/foodAnalysisRecovery", () => ({
  foodAnalysisRecovery: { recoverFoodAnalysisRequest: jest.fn() },
}))
jest.mock("@/src/features/analytics", () => ({
  useAnalyticsLifecycle: jest.fn(),
}))

const isCancelled = (error: unknown) =>
  error instanceof Error && error.message === "cancelled"

interface ElementNode {
  type?: unknown
  props?: { children?: unknown }
}

function findNestedFunctionComponent(node: unknown): (() => unknown) | null {
  if (!node || typeof node !== "object") return null
  const element = node as ElementNode
  if (typeof element.type === "function") {
    return element.type as () => unknown
  }
  const children = element.props?.children
  if (Array.isArray(children)) {
    for (const child of children) {
      const component = findNestedFunctionComponent(child)
      if (component) return component
    }
    return null
  }
  return findNestedFunctionComponent(children)
}

function loadRootLayout(): () => unknown {
  const filename = resolve(__dirname, "../app/_layout.tsx")
  const transpiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText
  const loadedModule: { exports: { default?: () => unknown } } = {
    exports: {},
  }
  const mockedModules = new Set([
    "react",
    "react-native",
    "react-native-gesture-handler",
    "@tamagui/sheet/setup-gesture-handler",
    "tamagui",
    "@tamagui/portal",
    "@tanstack/react-query",
    "expo-font",
    "expo-router",
    "expo-status-bar",
    "expo-notifications",
    "react-native-keyboard-controller",
    "@/src/i18n",
    "@/src/services",
    "@/src/hooks",
    "@/src/stores",
    "@/src/shared/components",
    "@/src/hooks/useNotifications",
    "@/src/features/mobilePolicy",
    "@/src/services/notificationRoutingService",
    "@/src/features/home/hooks/useFoodAnalysisRecovery",
    "@/src/features/home/services/foodAnalysisRecovery",
    "@/src/features/analytics",
  ])
  const requireForLayout = (moduleId: string) => {
    if (moduleId === "react/jsx-runtime") {
      return jest.requireActual("react/jsx-runtime")
    }
    if (moduleId === "../tamagui.config") {
      return jest.requireMock("../tamagui.config")
    }
    if (moduleId.startsWith("../assets/fonts/")) return 1
    if (mockedModules.has(moduleId)) return jest.requireMock(moduleId)
    throw new Error(`Unexpected RootLayout dependency: ${moduleId}`)
  }
  const evaluate = new Function(
    "require",
    "module",
    "exports",
    "__filename",
    "__dirname",
    transpiled,
  )
  evaluate(
    requireForLayout,
    loadedModule,
    loadedModule.exports,
    filename,
    dirname(filename),
  )
  if (!loadedModule.exports.default) {
    throw new Error("RootLayout default export was not found")
  }
  return loadedModule.exports.default
}

const RootLayout = loadRootLayout()

function runRootRouteGuard() {
  const rootTree = RootLayout()
  const rootLayoutNav = findNestedFunctionComponent(rootTree)
  if (!rootLayoutNav) {
    throw new Error("RootLayoutNav component was not found in RootLayout")
  }
  rootLayoutNav()
}

describe("root auth route guard integration", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSegments = ["(auth)", "login"]
    mockAuthState = {
      isAuthenticated: false,
      isLoading: false,
      accountState: null,
      requiresAdditionalInfo: false,
      entryGate: "HOME",
      signOut: mockSignOut,
    }
  })

  it("redirects a signed-out user outside public auth routes to login", () => {
    mockSegments = ["(tabs)", "home"]

    runRootRouteGuard()

    expect(mockRouterReplace).toHaveBeenCalledWith("/(auth)/login")
    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it("allows a signed-out user to remain on an auth route", () => {
    runRootRouteGuard()

    expect(mockRouterReplace).not.toHaveBeenCalled()
    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it.each(["SUSPENDED", "WITHDRAWAL_PENDING"])(
    "signs out an authenticated %s account before normal route decisions",
    (accountState) => {
      mockSegments = ["(tabs)", "home"]
      mockAuthState = {
        ...mockAuthState,
        isAuthenticated: true,
        accountState,
      }

      runRootRouteGuard()

      expect(mockSignOut).toHaveBeenCalledTimes(1)
      expect(mockRouterReplace).not.toHaveBeenCalled()
    },
  )
})

describe("auth route decision matrix", () => {
  it.each([
    ["signed-in home", "ACTIVE", false, "HOME", "/(tabs)/home"],
    [
      "profile pending",
      "PENDING_PROFILE",
      false,
      undefined,
      "/(auth)/profile-setup",
    ],
    [
      "active account requiring profile completion",
      "ACTIVE",
      true,
      undefined,
      "/(auth)/profile-setup",
    ],
    [
      "onboarding pending",
      "PENDING_ONBOARDING",
      false,
      undefined,
      "/onboarding",
    ],
    [
      "server profile gate ahead of a legacy active state",
      "ACTIVE",
      false,
      "PROFILE",
      "/(auth)/profile-setup",
    ],
    [
      "server onboarding gate ahead of a legacy active state",
      "ACTIVE",
      false,
      "ONBOARDING",
      "/onboarding",
    ],
  ] as const)(
    "routes %s to the backend-authoritative destination",
    (
      _scenario,
      accountState,
      requiresAdditionalInfo,
      entryGate,
      destination,
    ) => {
      expect(
        getPostAuthenticationDestination({
          accountState,
          requiresAdditionalInfo,
          entryGate,
        }),
      ).toBe(destination)
    },
  )

  it("keeps social signup separate from an authenticated route until consent completes", () => {
    expect(
      getSocialLoginSuccessAction({
        status: "SOCIAL_CONSENT_REQUIRED",
        provider: "google",
        socialSignupToken: "mock-social-signup-token",
      }),
    ).toEqual({
      type: "consent_required",
      provider: "google",
      socialSignupToken: "mock-social-signup-token",
    })

    expect(
      getSocialLoginSuccessAction({
        user: { uid: "mock-user", email: null, displayName: null },
        accountState: "ACTIVE",
        requiresAdditionalInfo: false,
        entryGate: "HOME",
      }),
    ).toEqual({ type: "completed" })
  })

  it("keeps a withdrawal-pending login in recovery instead of a normal error route", () => {
    const pending = new ApiError(
      "withdrawal pending",
      "AUTH_ERROR_008",
      409,
      false,
      undefined,
      {
        cancelToken: "mock-cancel-token",
        withdrawalDueAt: "2099-01-01T00:00:00+09:00",
      },
    )

    expect(getWithdrawalPendingResult(pending)).toEqual({
      cancelToken: "mock-cancel-token",
      withdrawalDueAt: "2099-01-01T00:00:00+09:00",
    })
    expect(getSocialLoginErrorAction(pending, "kakao", isCancelled)).toEqual({
      type: "withdrawal_pending",
      result: {
        cancelToken: "mock-cancel-token",
        withdrawalDueAt: "2099-01-01T00:00:00+09:00",
      },
    })
  })

  it("only routes legacy social-link recovery when a valid provider and opaque token are present", () => {
    const recovery = new ApiError(
      "link required",
      "SOCIAL_EMAIL_NOT_FOUND",
      400,
      false,
      undefined,
      { provider: "apple", socialLinkToken: "mock-link-token" },
    )

    expect(getSocialLoginErrorAction(recovery, "google", isCancelled)).toEqual({
      type: "legacy_social_link_required",
      provider: "apple",
      socialLinkToken: "mock-link-token",
    })
    expect(
      getSocialLoginErrorAction(
        new ApiError(
          "missing token",
          "SOCIAL_EMAIL_NOT_FOUND",
          400,
          false,
          undefined,
          { provider: "apple" },
        ),
        "google",
        isCancelled,
      ),
    ).toEqual({ type: "generic" })
  })

  it("requires an opaque token before signup or email-link password routes can proceed", () => {
    expect(getPasswordFlowToken(undefined)).toBeNull()
    expect(getPasswordFlowToken("   ")).toBeNull()
    expect(getPasswordFlowToken("mock-signup-token")).toBe("mock-signup-token")
    expect(getPasswordFlowToken("mock-email-link-token")).toBe(
      "mock-email-link-token",
    )
  })

  it("returns password reset through OTP before leaving the auth flow, and rejects an expired OTP", () => {
    const sent = passwordResetFlowReducer(
      passwordResetFlowReducer(createInitialPasswordResetFlowState(), {
        type: "send_started",
      }),
      { type: "send_succeeded", email: "qa@example.test" },
    )
    const verifying = passwordResetFlowReducer(sent, {
      type: "verify_started",
      email: "qa@example.test",
    })
    const password = passwordResetFlowReducer(verifying, {
      type: "verify_succeeded",
      resetToken: "mock-reset-token",
    })

    expect(password.step).toBe("password")
    expect(passwordResetFlowReducer(password, { type: "back" })).toMatchObject({
      step: "otp",
      resetToken: null,
    })
    expect(
      canVerifyPasswordResetOtp({ ...sent, timer: 0 }, "qa@example.test"),
    ).toBe(false)
  })
})
