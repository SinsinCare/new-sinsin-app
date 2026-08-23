/**
 * **프로필 입력 첫 스텝에서 나갈 수 있는가** — 실기기 영상으로 확인된 가둠(2026-08-23).
 *
 * ## 무엇이 있었나
 *
 * `SignupStepsScreen` 은 소셜 가입 도중 첫 스텝에서
 *
 *  - 하드웨어 백을 **삼켰고**(`return isCompletionMode`),
 *  - `canGoBack === false` 라 헤더 컨트롤을 **안 그렸고**,
 *  - `gestureEnabled` 도 껐다.
 *
 * 근거로 적힌 주석은 "빠져나갈 곳이 없다(로그인은 이미 끝났다)" 였는데 **그 전제가
 * 틀렸다** — 로그아웃하면 로그인 화면으로 돌아갈 수 있다. 게다가 iOS 에는 하드웨어
 * 백이 없어 `BackHandler` 가 돌지도 않으므로, iOS 사용자에게는 **아무 통로도** 없었다.
 * 안드로이드만 고치면 절반만 고치는 것이다.
 *
 * ## 이 파일이 고정하는 것
 *
 *  1. 소셜 가입 첫 스텝에도 **보이는 탈출 컨트롤**이 있다(레이아웃이 실제로 그린다).
 *  2. 하드웨어 백과 그 컨트롤이 **같은 함수**(`goBack`)를 지난다 — 갈라 두면 한쪽만
 *     고쳐진다. 그리고 하드웨어 백은 이벤트를 삼킨다(네이티브 팝과 겹치지 않게).
 *  3. **확인 없이는 로그아웃되지 않는다.** 확인하면 `signOut("explicit")` 뒤
 *     로그인 화면으로 간다.
 *  4. `stepIndex > 0` 은 종전대로 **한 스텝 뒤로**, 일반(이메일) 가입 첫 스텝은
 *     종전대로 **이전 화면으로**.
 *  5. 로그아웃/뒤로 판정(`resolveProfileSetupExit`)이 **루트 가드와 같다** — backfill 을
 *     한 덩어리로 뭉개지 않고, 가드가 붙잡는 상태에서만 로그아웃을 시킨다.
 *
 * ## 어떻게 보나
 *
 * 이 저장소에는 렌더러가 없다(`tests/helpers/hookHarness.ts` 머리말). 그래서
 *  - 훅은 effect 까지 도는 하네스(`helpers/effectHookHarness.ts`)로 **본문을 돌리고**,
 *  - 화면·레이아웃은 **함수로 그대로 불러 돌려받은 엘리먼트 트리를 읽는다**
 *    (선례: `communityFeedSectionWiring.test.ts`).
 *
 * 소스 문자열을 훑지 않는다 — 여기서 지켜야 할 것의 절반은 "핸들러가 무엇을 부르는가"
 * 라 grep 으로는 증명이 안 된다.
 */
/* eslint-disable import/first -- 네이티브·라우터 의존을 모듈 로드 **전에** 갈아 끼워야 한다. */

/* ── react: effect 까지 도는 하네스로 ──────────────────────────────────────── */
jest.mock("react", () => {
  const actual = jest.requireActual("react")
  const harness = jest.requireActual("./helpers/effectHookHarness")
  return {
    ...actual,
    useState: harness.useState,
    useRef: harness.useRef,
    useMemo: harness.useMemo,
    useCallback: harness.useCallback,
    useEffect: harness.useEffect,
  }
})

/*
  react-native 는 Flow 원본이라 이 프리셋에서 파싱이 안 된다(helpers/reactNativeStub.js).
  호스트 컴포넌트는 **문자열 태그**다 — 흉내 낸 구현을 두면 "렌더러 없이 렌더한" 셈이 된다.
  `BackHandler` 만 진짜로 등록을 받아 둔다(그 등록이 이 파일의 절반이다).
*/
jest.mock("react-native", () => {
  type BackListener = () => boolean
  const state = { handlers: [] as BackListener[] }
  return {
    __esModule: true,
    __backHandlerState: state,
    Platform: {
      OS: "ios",
      select: (spec: Record<string, unknown>) => spec.ios,
    },
    StyleSheet: {
      create: <T>(styles: T): T => styles,
      absoluteFillObject: {},
    },
    View: "View",
    Text: "Text",
    Pressable: "Pressable",
    Keyboard: { dismiss: jest.fn() },
    BackHandler: {
      addEventListener: (_type: string, handler: BackListener) => {
        state.handlers.push(handler)
        return {
          remove: () => {
            state.handlers = state.handlers.filter((h) => h !== handler)
          },
        }
      },
    },
  }
})

jest.mock("expo-router", () => {
  const state = {
    router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
    navigation: { setOptions: jest.fn(), addListener: () => () => {} },
  }
  return {
    __esModule: true,
    __routerState: state,
    router: state.router,
    useRouter: () => state.router,
    useNavigation: () => state.navigation,
    useSegments: () => ["(auth)", "profile-setup"],
    useLocalSearchParams: () => ({}),
  }
})

jest.mock("react-i18next", () => ({
  __esModule: true,
  // `src/i18n` 이 로드되며 `.use(initReactI18next)` 를 부른다 — 빼면 스위트가 통째로 죽는다.
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({ t: (key: string) => key }),
}))

jest.mock("@/src/hooks", () => {
  const state = {
    accountState: null as string | null,
    entryGate: "HOME" as string,
    sessionPersistence: "persistent" as string,
    requiresAdditionalInfo: false,
    isAuthenticated: false,
    signOut: jest.fn(async () => {}),
    completeProfile: jest.fn(async () => ({})),
    getProfile: jest.fn(async () => ({ nickName: "" })),
  }
  return { __esModule: true, __authState: state, useAuth: () => state }
})

jest.mock("@/src/stores", () => {
  const signup = {
    signupToken: "",
    password: "",
    termsOfServiceAgree: false,
    privacyPolicyAgree: false,
    marketingAgree: false,
    setNickname: jest.fn(),
  }
  const auth = {
    setUser: jest.fn(),
    setAccountState: jest.fn(),
    setRequiresAdditionalInfo: jest.fn(),
    setEntryGate: jest.fn(),
    setSessionPersistence: jest.fn(),
  }
  type Select<S> = (state: S) => unknown
  return {
    __esModule: true,
    useSignupStore: (select?: Select<typeof signup>) =>
      select ? select(signup) : signup,
    useAuthStore: (select?: Select<typeof auth>) =>
      select ? select(auth) : auth,
  }
})

jest.mock("@/src/services", () => ({
  __esModule: true,
  authService: { signup: jest.fn() },
  nicknameService: { checkNicknameAvailability: jest.fn(async () => true) },
}))

jest.mock("@/src/features/analytics", () => ({
  __esModule: true,
  trackAnalyticsEvent: jest.fn(),
  identifyAnalyticsUser: jest.fn(),
}))

jest.mock("@/src/shared/navigation", () => {
  const exitSignup = jest.fn()
  return {
    __esModule: true,
    __exitSignup: exitSignup,
    useGoBack: () => exitSignup,
  }
})

jest.mock("@/src/lib/dialog", () => ({
  __esModule: true,
  showConfirm: jest.fn(async () => false),
}))

jest.mock("@/src/lib/haptics", () => ({
  __esModule: true,
  hapticInvalid: jest.fn(),
  hapticStepAdvance: jest.fn(),
}))

/* 화면이 그리는 잎들. 화면이 **훅에서 받은 값을 어디에 꽂는지**만 보면 되므로 태그로 둔다. */
jest.mock("@/src/features/auth/components", () => ({
  __esModule: true,
  SignupStepLayout: "SignupStepLayout",
  StepTextInput: "StepTextInput",
  StepFieldLabel: "StepFieldLabel",
  StepHelperText: "StepHelperText",
  GenderSelect: "GenderSelect",
  GenderOtherOption: "GenderOtherOption",
  AcquisitionSourceField: "AcquisitionSourceField",
}))

/* 화면은 훅을 목으로 받는다(훅 자체는 아래에서 `requireActual` 로 진짜를 돌린다). */
jest.mock("@/src/features/auth/hooks/useSignupSteps", () => ({
  __esModule: true,
  useSignupSteps: jest.fn(),
}))

/* ── 레이아웃(진짜로 그리는 쪽)이 기대는 네이티브·테마 잎 ─────────────────── */
jest.mock("react-native-reanimated", () => {
  const passthrough = <T>(value: T) => value
  return {
    __esModule: true,
    default: { View: "Animated.View", Text: "Animated.Text" },
    View: "Animated.View",
    Text: "Animated.Text",
    Easing: { bezier: () => "ease" },
    ReduceMotion: { System: "system" },
    FadeIn: { duration: () => "fadeIn" },
    FadeOut: { duration: () => "fadeOut" },
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withTiming: passthrough,
    withSpring: passthrough,
    interpolateColor: () => "brand",
  }
})
jest.mock("@expo/vector-icons/Ionicons", () => ({
  __esModule: true,
  default: "Ionicons",
}))
jest.mock("react-native-safe-area-context", () => ({
  __esModule: true,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock("@/src/shared/components/AppText", () => ({
  __esModule: true,
  Text: "AppText",
}))
jest.mock("@/src/design-system-v2", () => ({
  __esModule: true,
  V2DotLoader: "V2DotLoader",
}))
jest.mock("@/src/features/auth/components/AuthKeyboardFooter", () => ({
  __esModule: true,
  AuthKeyboardFooter: "AuthKeyboardFooter",
}))
/* 색은 이 파일의 관심사가 아니다 — 자리 표시 문자열이면 트리를 읽는 데 충분하다. */
jest.mock("@/src/hooks/useSurface", () => ({
  __esModule: true,
  useSurface: () => ({
    canvas: "canvas",
    hairline: "hairline",
    brand: "brand",
    onBrand: "onBrand",
    textStrong: "textStrong",
    textWeak: "textWeak",
    ctaOffBg: "ctaOffBg",
    ctaOffText: "ctaOffText",
  }),
}))

import type { ReactElement } from "react"

import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useSignupSteps } from "@/src/features/auth/hooks/useSignupSteps"
import { SignupStepsScreen } from "@/src/features/auth/views/SignupStepsScreen"
import { SignupStepLayout } from "@/src/features/auth/components/SignupStepLayout"
import { resolveProfileSetupExit } from "@/src/features/auth/utils/profileSetupMode"
import { resolveGuard } from "@/src/shared/navigation/guard"

/** 훅 본문은 목이 아니라 **진짜**를 돌린다(화면 쪽에서만 목을 쓴다). */
const useRealSignupSteps = (
  jest.requireActual("@/src/features/auth/hooks/useSignupSteps") as {
    useSignupSteps: typeof useSignupSteps
  }
).useSignupSteps

const useSignupStepsMock = useSignupSteps as unknown as jest.Mock

const authState = (
  jest.requireMock("@/src/hooks") as {
    __authState: {
      accountState: string | null
      entryGate: string
      sessionPersistence: string
      requiresAdditionalInfo: boolean
      isAuthenticated: boolean
      signOut: jest.Mock
      getProfile: jest.Mock
    }
  }
).__authState

const exitSignup = (
  jest.requireMock("@/src/shared/navigation") as { __exitSignup: jest.Mock }
).__exitSignup

const routerState = (
  jest.requireMock("expo-router") as {
    __routerState: {
      router: { replace: jest.Mock }
      navigation: { setOptions: jest.Mock }
    }
  }
).__routerState

const backHandlerState = (
  jest.requireMock("react-native") as {
    __backHandlerState: { handlers: (() => boolean)[] }
  }
).__backHandlerState

const showConfirm = (
  jest.requireMock("@/src/lib/dialog") as { showConfirm: jest.Mock }
).showConfirm

/** 마이크로태스크 사슬(확인창 → 로그아웃 → 이동)을 끝까지 흘린다. */
function flush() {
  return new Promise((resolve) => setImmediate(resolve))
}

/** 소셜 가입 도중 — 서버가 프로필 관문을 걸었고 세션은 임시다. */
function asSocialSignup() {
  authState.accountState = "PENDING_PROFILE"
  authState.entryGate = "PROFILE"
  authState.sessionPersistence = "ephemeral"
  authState.requiresAdditionalInfo = false
  authState.isAuthenticated = true
}

/** 이메일 가입 — 아직 로그인 전이다. */
function asEmailSignup() {
  authState.accountState = null
  authState.entryGate = "HOME"
  authState.sessionPersistence = "persistent"
  authState.requiresAdditionalInfo = false
  authState.isAuthenticated = false
}

/** 이미 쓰던 계정이 빠진 정보를 채우러 들어왔다. */
function asBackfill(entryGate: "PROFILE" | "HOME") {
  authState.accountState = "ACTIVE"
  authState.entryGate = entryGate
  authState.sessionPersistence = "persistent"
  authState.requiresAdditionalInfo = true
  authState.isAuthenticated = true
}

beforeEach(() => {
  jest.clearAllMocks()
  backHandlerState.handlers = []
  showConfirm.mockResolvedValue(false)
  asEmailSignup()
})

/* ── 엘리먼트 트리 훑기 ────────────────────────────────────────────────────── */

interface Node {
  type: unknown
  props: Record<string, unknown>
}

function walk(node: unknown, visit: (node: Node) => void) {
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, visit))
    return
  }
  if (!node || typeof node !== "object") return
  const element = node as Node
  if (!element.props) return
  visit(element)
  walk(element.props.children, visit)
}

function findButtons(tree: unknown): Node[] {
  const found: Node[] = []
  walk(tree, (node) => {
    if (node.props.accessibilityRole === "button") found.push(node)
  })
  return found
}

/* ══════════════════════════════════════════════════════════════════════════ */

describe("첫 스텝의 탈출구 — 훅", () => {
  it("소셜 가입 첫 스텝: 확인창부터 띄우고, 답하기 전에는 로그아웃하지 않는다", async () => {
    asSocialSignup()
    const hook = renderHookWithEffects(() => useRealSignupSteps())

    expect(hook.result().requiresSignOutToExit).toBe(true)

    hook.result().goBack()

    expect(showConfirm).toHaveBeenCalledTimes(1)
    expect(showConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ destructive: true }),
    )

    // 확인창이 "계속하기" 로 답했다 = 아무 일도 일어나면 안 된다.
    await flush()
    expect(authState.signOut).not.toHaveBeenCalled()
    expect(routerState.router.replace).not.toHaveBeenCalled()
    expect(exitSignup).not.toHaveBeenCalled()
  })

  it("확인하면 사용자가 고른 로그아웃으로 세션을 끊고 로그인 화면으로 보낸다", async () => {
    asSocialSignup()
    showConfirm.mockResolvedValue(true)
    const hook = renderHookWithEffects(() => useRealSignupSteps())

    hook.result().goBack()
    await flush()

    /* `"automatic"` 은 임시 세션이 백그라운드에서 잘린 것 — 사용자가 원한 적 없는
       로그아웃이라, 확인창에서 직접 고른 이 사건과 같은 이름으로 세면 로그인 퍼널의
       재로그인 분모가 섞인다(`useAuth` 의 `signOut` 주석). */
    expect(authState.signOut).toHaveBeenCalledWith("explicit")
    /* 가드는 인증 그룹 안의 비로그인 사용자를 옮기지 않는다(`resolveGuard`) —
       여기서 보내지 않으면 로그아웃된 채 같은 화면에 남는다. */
    expect(routerState.router.replace).toHaveBeenCalledWith("/(auth)/login")
  })

  it("확인창이 떠 있는 동안 다시 눌러도 확인창이 쌓이지 않는다", async () => {
    asSocialSignup()
    let answer: (value: boolean) => void = () => {}
    showConfirm.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          answer = resolve
        }),
    )
    const hook = renderHookWithEffects(() => useRealSignupSteps())

    hook.result().goBack()
    hook.result().goBack()

    expect(showConfirm).toHaveBeenCalledTimes(1)
    answer(false)
    await flush()
  })

  it("stepIndex > 0 은 종전대로 한 스텝만 되돌린다(확인창도 로그아웃도 없다)", async () => {
    asSocialSignup()
    const hook = renderHookWithEffects(() => useRealSignupSteps())

    hook.result().updateDraft({ nickname: "신신이" })
    await hook.result().goNext()
    expect(hook.result().stepIndex).toBe(1)
    expect(hook.result().requiresSignOutToExit).toBe(false)

    hook.result().goBack()
    await flush()

    expect(hook.result().stepIndex).toBe(0)
    expect(hook.result().direction).toBe("backward")
    expect(showConfirm).not.toHaveBeenCalled()
    expect(authState.signOut).not.toHaveBeenCalled()
    expect(exitSignup).not.toHaveBeenCalled()
  })

  it("일반(이메일) 가입 첫 스텝은 종전대로 이전 화면으로 간다", async () => {
    asEmailSignup()
    const hook = renderHookWithEffects(() => useRealSignupSteps())

    expect(hook.result().requiresSignOutToExit).toBe(false)
    hook.result().goBack()
    await flush()

    expect(exitSignup).toHaveBeenCalledTimes(1)
    expect(showConfirm).not.toHaveBeenCalled()
    expect(authState.signOut).not.toHaveBeenCalled()
  })

  it("backfill 은 한 덩어리가 아니다 — 가드가 붙잡는 쪽만 로그아웃한다", async () => {
    /* gate 가 아직 PROFILE = 앱으로 돌아가도 가드가 곧바로 되돌려 놓는다.
       그 상태에서 열려 있는 문은 로그아웃 하나뿐이다. */
    asBackfill("PROFILE")
    const pinned = renderHookWithEffects(() => useRealSignupSteps())
    expect(pinned.result().requiresSignOutToExit).toBe(true)
    pinned.result().goBack()
    await flush()
    expect(showConfirm).toHaveBeenCalledTimes(1)
    expect(exitSignup).not.toHaveBeenCalled()

    jest.clearAllMocks()

    /* gate 가 이미 넘어갔으면 가드가 안 붙잡는다. 이미 쓰던 계정을 로그아웃까지
       시킬 이유가 없다 — 앱으로 돌려보내면 된다. */
    asBackfill("HOME")
    const free = renderHookWithEffects(() => useRealSignupSteps())
    expect(free.result().requiresSignOutToExit).toBe(false)
    free.result().goBack()
    await flush()
    expect(exitSignup).toHaveBeenCalledTimes(1)
    expect(showConfirm).not.toHaveBeenCalled()
    expect(authState.signOut).not.toHaveBeenCalled()
  })
})

describe("탈출 판정은 루트 가드와 같은 식이다", () => {
  /**
   * 로그아웃이 필요한가 = **가드가 이 상태를 프로필 입력에 붙잡는가.**
   * 두 곳이 갈리면 한쪽이 조용히 고장난다(나가도 되는 사람을 로그아웃시키거나,
   * 뒤로가기를 눌렀는데 가드가 되돌려 놓거나). 그래서 진리표를 가드에서 직접 만든다.
   */
  const STATES = [null, "ACTIVE", "PENDING_PROFILE", "PENDING_ONBOARDING"]
  const GATES = ["HOME", "PROFILE", "ONBOARDING"] as const

  it("가드가 붙잡는 상태에서만 로그아웃을 요구한다", () => {
    let sawSignOut = false
    let sawBack = false

    STATES.forEach((accountState) => {
      GATES.forEach((entryGate) => {
        ;[false, true].forEach((requiresAdditionalInfo) => {
          const decision = resolveGuard({
            isLoading: false,
            isAuthenticated: true,
            accountState,
            requiresAdditionalInfo,
            entryGate,
            isSignupInProgress: false,
            isOnboardingInProgress: false,
            // 앱 쪽으로 돌아간 직후의 판정 — 여기서 되돌려지면 나간 것이 아니다.
            segments: ["(tabs)", "home"],
            isDev: false,
          })
          const pinned =
            decision.type === "redirect" &&
            decision.href === "/(auth)/profile-setup"
          const exit = resolveProfileSetupExit({
            accountState,
            entryGate,
            isAuthenticated: true,
          })
          // 어긋난 조합을 사람이 읽을 수 있게 상태를 통째로 비교한다.
          expect({
            accountState,
            entryGate,
            requiresAdditionalInfo,
            exit,
          }).toEqual({
            accountState,
            entryGate,
            requiresAdditionalInfo,
            exit: pinned ? "signOut" : "back",
          })
          sawSignOut ||= pinned
          sawBack ||= !pinned
        })
      })
    })

    // 진리표가 한쪽으로 쏠려 있으면 위 단언이 아무것도 안 지킨다.
    expect(sawSignOut && sawBack).toBe(true)
  })

  it("로그인 전에는 로그아웃할 세션이 없다", () => {
    expect(
      resolveProfileSetupExit({
        accountState: null,
        entryGate: "PROFILE",
        isAuthenticated: false,
      }),
    ).toBe("back")
  })
})

/* ══════════════════════════════════════════════════════════════════════════ */

/** 화면이 훅에서 받는 값. 테스트마다 필요한 것만 덮어쓴다. */
function stepsValue(overrides: Record<string, unknown> = {}) {
  return {
    step: "nickname",
    stepIndex: 0,
    direction: "forward",
    progress: 1 / 6,
    isLastStep: false,
    isCompletionMode: true,
    requiresSignOutToExit: true,
    draft: {
      nickname: "",
      birthDate: "",
      gender: "",
      name: "",
      phoneNumber: "",
      acquisitionSource: "",
      acquisitionSourceOther: "",
    },
    updateDraft: jest.fn(),
    validity: { canProceed: false, message: "" },
    stepError: "",
    submitError: "",
    isBusy: false,
    isPrefilling: false,
    goNext: jest.fn(),
    goBack: jest.fn(),
    reportStepInputBlocked: jest.fn(),
    ...overrides,
  }
}

describe("첫 스텝의 탈출구 — 화면", () => {
  function renderScreen(overrides: Record<string, unknown> = {}) {
    const value = stepsValue(overrides)
    useSignupStepsMock.mockReturnValue(value)
    const handle = renderHookWithEffects(
      () => SignupStepsScreen() as unknown as ReactElement,
    )
    return { value, tree: handle.result() as unknown as Node }
  }

  it("소셜 가입 첫 스텝에도 뒤로 컨트롤이 있고, 나가는 버튼이라고 읽힌다", () => {
    const { value, tree } = renderScreen()

    expect(tree.props.onBack).toBe(value.goBack)
    expect(tree.props.backLabel).toBe("signup.steps.exit.control")
  })

  it("하드웨어 백과 그 컨트롤이 같은 함수를 지난다", () => {
    const { value, tree } = renderScreen()

    expect(backHandlerState.handlers).toHaveLength(1)
    const handled = backHandlerState.handlers[0]()

    expect(value.goBack).toHaveBeenCalledTimes(1)
    // 삼키지 않으면 네이티브가 따로 팝해서 확인창을 지나쳐 버린다.
    expect(handled).toBe(true)
    expect(tree.props.onBack).toBe(value.goBack)
  })

  it("로그아웃해야 나갈 수 있는 자리에서는 엣지 스와이프를 막는다", () => {
    renderScreen()
    expect(routerState.navigation.setOptions).toHaveBeenCalledWith({
      gestureEnabled: false,
    })
  })

  it("스텝 안에서도 하드웨어 백이 같은 함수를 지나고 이름은 '이전 단계' 로 남는다", () => {
    const { value, tree } = renderScreen({
      stepIndex: 1,
      step: "birth",
      requiresSignOutToExit: false,
      isCompletionMode: false,
    })

    expect(tree.props.onBack).toBe(value.goBack)
    expect(tree.props.backLabel).toBeUndefined()
    backHandlerState.handlers[0]()
    expect(value.goBack).toHaveBeenCalledTimes(1)
  })

  it("일반 가입 첫 스텝의 제스처는 종전대로 열려 있다", () => {
    renderScreen({ requiresSignOutToExit: false, isCompletionMode: false })
    expect(routerState.navigation.setOptions).toHaveBeenCalledWith({
      gestureEnabled: true,
    })
  })
})

describe("레이아웃이 탈출 컨트롤을 그린다", () => {
  function renderLayout(
    props: Partial<Parameters<typeof SignupStepLayout>[0]>,
  ) {
    const handle = renderHookWithEffects(
      () =>
        SignupStepLayout({
          stepKey: "nickname",
          title: "제목",
          progress: 1 / 6,
          onCtaPress: jest.fn(),
          children: null,
          ...props,
        }) as unknown as ReactElement,
    )
    return handle.result() as unknown as Node
  }

  it("onBack 을 받으면 눌러서 나갈 수 있는 버튼이 화면에 생긴다", () => {
    const onBack = jest.fn()
    const tree = renderLayout({ onBack, backLabel: "가입 그만두기" })

    const exit = findButtons(tree).find(
      (node) => node.props.accessibilityLabel === "가입 그만두기",
    )
    expect(exit).toBeDefined()
    ;(exit?.props.onPress as () => void)()
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it("이름을 안 주면 '이전 단계' 로 읽힌다", () => {
    const tree = renderLayout({ onBack: jest.fn() })
    expect(
      findButtons(tree).map((node) => node.props.accessibilityLabel),
    ).toContain("common.previousStep")
  })
})
