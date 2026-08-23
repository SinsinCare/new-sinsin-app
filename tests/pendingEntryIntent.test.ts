/**
 * 로그아웃 상태에서 받은 딥링크의 **목적지가 살아남는가.**
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 실측된 결함
 *
 * 로그인하지 않은 사람이 `sinsin:///post/482` 를 누르면 라우터가 그 화면을 열고
 * 진입 가드가 곧바로 `/(auth)/login` 으로 갈아 끼운다. 그 순간 **어디로 가려
 * 했는지는 아무 데도 남지 않았다** — 저장소 전체에서
 * `pending|returnTo|redirectTo|afterLogin|intendedRoute` 가 하나도 안 나왔다.
 * 로그인을 마치면 `resolveEntryRoute` 가 홈으로 보내고 링크는 조용히 버려진다.
 * 공유 링크가 겨냥하는 사람이 정확히 "아직 로그인하지 않은 사람" 인데도.
 *
 * ■ 이 파일이 지키는 네 가지
 *
 * 1. 로그인으로 보내는 판정을 **알아볼 수 있다**(`isLoginRedirect`) — 그래야
 *    다른 관문(온보딩·프로필)의 리다이렉트에 목적지를 덮어쓰지 않는다.
 * 2. 적어 둘 값과 적지 않을 값이 갈린다(관문 화면 자신·모르는 라우트).
 * 3. **한 번만** 쓰인다. 남겨 두면 다음 로그인·다음 화면 전환에 한 번 더 튄다.
 * 4. 실행부(`app/_layout.tsx`)가 그 계약대로 걸려 있다 — 관문을 다 통과하고
 *    탭에 착지했을 때만 꺼내고, 세션이 끊기면 버린다.
 *
 * 4번이 소스 스캔인 이유는 이 저장소에 렌더러가 없어서다(`hookHarness.ts` 머리말).
 * 나머지 셋은 순수 함수라 그대로 돌린다.
 */
import fs from "node:fs"
import path from "node:path"

import {
  clearEntryIntent,
  rememberEntryIntent,
  takeEntryIntent,
} from "../src/shared/navigation/entryIntent"
import {
  isLoginRedirect,
  resolveGuard,
  type GuardInput,
} from "../src/shared/navigation/guard"

import { codeOnly } from "./helpers/codeOnly"

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

beforeEach(() => {
  clearEntryIntent()
})

describe("로그인 리다이렉트 알아보기", () => {
  it("로그아웃 상태로 글 상세에 있으면 로그인 리다이렉트다", () => {
    const decision = resolveGuard(
      input({
        isAuthenticated: false,
        accountState: null,
        segments: ["post", "[id]"],
      }),
    )
    expect(decision).toEqual({ type: "redirect", href: "/(auth)/login" })
    expect(isLoginRedirect(decision)).toBe(true)
  })

  it("온보딩·프로필 관문은 로그인 리다이렉트가 아니다", () => {
    // 여기서 참이 되면 관문으로 보내는 길에 목적지가 덮여 원래 링크를 잃는다.
    expect(
      isLoginRedirect(
        resolveGuard(
          input({ entryGate: "ONBOARDING", accountState: "ACTIVE" }),
        ),
      ),
    ).toBe(false)
    expect(
      isLoginRedirect(
        resolveGuard(input({ entryGate: "PROFILE", accountState: "ACTIVE" })),
      ),
    ).toBe(false)
    expect(isLoginRedirect({ type: "stay" })).toBe(false)
    expect(isLoginRedirect({ type: "signOut" })).toBe(false)
  })
})

describe("무엇을 적어 두는가", () => {
  it("딥링크 목적지를 적는다", () => {
    rememberEntryIntent("/post/482")
    expect(takeEntryIntent()).toBe("/post/482")
  })

  it("쿼리는 떼고 경로만 적는다", () => {
    rememberEntryIntent("/recipe/12?from=share")
    expect(takeEntryIntent()).toBe("/recipe/12")
  })

  it("관문 화면 자신은 적지 않는다 (로그인 → 로그인 고리를 만든다)", () => {
    for (const gate of [
      "/",
      "/login",
      "/signup-email",
      "/profile-setup",
      "/onboarding",
      "/home",
    ]) {
      rememberEntryIntent(gate)
      expect(takeEntryIntent()).toBeNull()
    }
  })

  it("우리 라우트가 아닌 경로는 적지 않는다 (+not-found 로 데려간다)", () => {
    rememberEntryIntent("/old-marketing-page")
    expect(takeEntryIntent()).toBeNull()
    rememberEntryIntent("")
    expect(takeEntryIntent()).toBeNull()
  })

  it("칸은 하나다 — 마지막으로 막힌 목적지가 이긴다", () => {
    rememberEntryIntent("/post/1")
    rememberEntryIntent("/recipe/2")
    expect(takeEntryIntent()).toBe("/recipe/2")
  })
})

describe("한 번만 쓰인다", () => {
  it("꺼내면 비워진다", () => {
    rememberEntryIntent("/post/482")
    expect(takeEntryIntent()).toBe("/post/482")
    // 두 번째부터 null 이라 "관계없는 나중 로그인" 에 되살아나지 않는다.
    expect(takeEntryIntent()).toBeNull()
    expect(takeEntryIntent()).toBeNull()
  })

  it("세션이 끊기면 버린다", () => {
    rememberEntryIntent("/post/482")
    clearEntryIntent()
    expect(takeEntryIntent()).toBeNull()
  })

  it("앱을 다시 켜면 남아 있지 않다 (메모리에만 산다)", () => {
    /*
      저장소를 쓰지 않는다는 것을 모듈 소스로 확인한다. 이 파일이 AsyncStorage 를
      들이는 날 "어제 받은 링크가 오늘 아침 로그인에 튀어나오는" 결함이 생긴다.
    */
    const source = codeOnly(
      fs.readFileSync(
        path.join(__dirname, "..", "src/shared/navigation/entryIntent.ts"),
        "utf8",
      ),
    )
    expect(source).not.toMatch(/AsyncStorage|SecureStore|localStorage/u)
  })
})

describe("루트 레이아웃의 실행부", () => {
  const source = codeOnly(
    fs.readFileSync(path.join(__dirname, "..", "app/_layout.tsx"), "utf8"),
  )

  it("로그인으로 보내는 판정일 때만 목적지를 적는다", () => {
    expect(source).toMatch(
      /if \(isLoginRedirect\(decision\)\) rememberEntryIntent\(pathname\)/u,
    )
  })

  it("세그먼트가 아니라 실제 경로를 적는다 (/post/[id] 로는 돌아갈 수 없다)", () => {
    expect(source).toMatch(/const pathname = usePathname\(\)/u)
    expect(source).not.toMatch(/rememberEntryIntent\(segmentPath/u)
  })

  it("관문을 다 통과하고 탭에 착지했을 때만 꺼낸다", () => {
    expect(source).toMatch(
      /if \(!isFullyEntered \|\| segmentPath\[0\] !== "\(tabs\)"\) return\s*\n\s*const pending = takeEntryIntent\(\)/u,
    )
  })

  it("꺼낸 목적지는 push 가 아니라 navigate 로 연다", () => {
    // 목적지가 탭 라우트면 push 는 탭 네비게이터를 한 벌 더 쌓는다
    // (`tests/tabRouteNavigation.test.ts`).
    expect(source).toMatch(/if \(pending\) router\.navigate\(/u)
    expect(source).not.toMatch(/if \(pending\) router\.push\(/u)
  })

  it("세션이 끊기면 목적지를 버린다", () => {
    expect(source).toMatch(
      /decision\.type === "signOut"[\s\S]{0,200}clearEntryIntent\(\)/u,
    )
  })
})
