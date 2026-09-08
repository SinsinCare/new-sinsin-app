/**
 * 탭 라우트로 가면서 **탭 네비게이터를 한 벌 더 쌓는 것**을 막는다.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 실측된 결함
 *
 * 피드 → 글 상세 → 해시태그 → 글 상세 → 해시태그 … 를 반복하면 탭 바가 겹으로
 * 쌓이고, 커뮤니티 탭 버튼이 먹지 않으며, 안드로이드는 되돌아 나가는 데 그 횟수만큼
 * 뒤로가기를 눌러야 한다.
 *
 * ■ 왜 그런가 (expo-router 55.0.17 + @react-navigation/routers 를 실제로 돌려 확인)
 *
 * `(tabs)` 는 루트 Stack 의 **화면 하나**다(`app/_layout.tsx` 가 등록한다). 글 상세
 * (`src/features/recipe/views/PostDetailScreen.tsx`)·검색·보관함은 그 Stack 위에 얹혀 있으므로, 거기서 `/community`
 * 로 가려 하면 expo-router 의 `findDivergentState` 가 **루트 Stack 에서** 갈라진다고
 * 보고 화면 이름 `(tabs)` 로 액션을 만든다:
 *
 * ```
 * 루트 스택 = ["(tabs)", "post/[id]"]  (지금 글 상세)
 *   router.push     → {type:"PUSH",   name:"(tabs)"} → ["(tabs)","post/[id]","(tabs)"]
 *   router.navigate → {type:"NAVIGATE",name:"(tabs)"} → ["(tabs)","post/[id]","(tabs)"]
 *   router.dismissTo→ {type:"POP_TO", name:"(tabs)"} → ["(tabs)"]
 * ```
 *
 * `navigate` 도 똑같이 쌓인다는 것이 핵심이다 — StackRouter 의 NAVIGATE 갈래는
 * **지금 떠 있는 화면과 이름이 같을 때**(또는 `getId`/`pop` 이 있을 때)만 기존
 * 라우트를 재사용하고, 아니면 그대로 밀어 넣는다. `dismissTo`(POP_TO)만이 스택을
 * 뒤로 훑어 이미 있는 `(tabs)` 로 되돌아간다.
 *
 * ■ 탭 **안**에서 부르는 것은 안전하다
 *
 * 이미 `(tabs)` 안에 있으면 갈라지는 지점이 루트가 아니라 **탭 네비게이터**다.
 * 그때 expo-router 는 타입을 NAVIGATE/JUMP_TO 로 낮추고 탭만 바꾼다. 그래서
 * 아래 예외 목록의 판단 기준은 파일 위치가 아니라 **그 컴포넌트가 탭 안에서
 * 그려지는가**다 — 스캐너가 알 수 없는 사실이라 사람이 적는다.
 *
 * ■ 왜 소스를 훑나
 *
 * `router.push("/community")` 는 완벽하게 올바른 코드다. 틀린 것은 타입이 아니라
 * **그 화면이 탭 밖에 있다는 사실**이라 tsc 도 eslint 도 볼 수 없다.
 * (`navigationBackGuard.test.ts` 와 같은 처방.)
 */
import fs from "node:fs"
import path from "node:path"

import type { Router } from "expo-router"

import { routeFromPushData } from "../src/services/notificationRoutingService"
import { codeOnly } from "./helpers/codeOnly"

const ROOT = path.join(__dirname, "..")
const SCAN_DIRS = ["app", "src"]

/** `app/(tabs)/*.tsx` → `/home`, `/community` … 실제 파일에서 만든다(손 목록 금지). */
function tabRoutes(): string[] {
  return fs
    .readdirSync(path.join(ROOT, "app", "(tabs)"), { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/u.test(entry.name))
    .map((entry) => entry.name.replace(/\.tsx?$/u, ""))
    .filter((name) => name !== "_layout")
}

const TAB_ROUTES = tabRoutes()

/**
 * 예외. 새로 추가할 때는 **왜 안전한지**(또는 누가 고치기로 했는지)를 여기 적는다.
 *
 * - `src/features/recipe/components/FreePostTab.tsx`
 *   커뮤니티 **탭 화면 안에서** 그려진다(`app/(tabs)/community.tsx`). 갈라지는 지점이
 *   탭 네비게이터라 탭만 바뀐다. `community-popular` 는 `href: null` 인 탭이다.
 *
 * ── 아래는 안전해서가 아니라 **이 작업의 소유가 아니라서** 여기 있다.
 *    같은 결함이고 각 파일 담당에게 보고했다. 고쳐지면 이 줄을 지운다.
 * - `src/features/recipe/views/PostDetailScreen.tsx` : 해시태그 탭 → `/community` 로 `push`. 위 반복 재현의 당사자.
 *
 * 2026-08-20 에 아래 셋은 **고쳤다**(각각 `dismissTo` 검사로 못 박았다).
 * - `src/features/recipe/archive/RecipeArchiveScreen.tsx`
 * - `src/services/notificationRoutingService.ts`
 * - `app/restaurant/search.tsx`
 */
const ALLOWED = new Set([
  path.join("src", "features", "recipe", "components", "FreePostTab.tsx"),
  path.join("app", "post", "[id].tsx"),
])

function collect(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue
      collect(full, out)
    } else if (/\.tsx?$/u.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      out.push(full)
    }
  }
  return out
}

interface Offender {
  file: string
  line: number
  text: string
}

/** `"/community"` · `"/(tabs)/community"` 처럼 탭 라우트를 가리키는 href 인가. */
function isTabHref(href: string): boolean {
  const clean = href.replace(/^\/\(tabs\)\//u, "/")
  return TAB_ROUTES.some((route) => clean === `/${route}`)
}

const PUSH_STRING = /router\.push\(\s*[`"']([^`"']+)[`"']/gu
const PUSH_OBJECT =
  /router\.push\(\s*\{[^}]*?pathname:\s*[`"']([^`"']+)[`"']/gsu
const NAVIGATE_STRING = /router\.navigate\(\s*[`"']([^`"']+)[`"']/gu
const NAVIGATE_OBJECT =
  /router\.navigate\(\s*\{[^}]*?pathname:\s*[`"']([^`"']+)[`"']/gsu

function scan(file: string): Offender[] {
  const source = codeOnly(fs.readFileSync(file, "utf8"))
  const found: Offender[] = []
  for (const pattern of [
    PUSH_STRING,
    PUSH_OBJECT,
    NAVIGATE_STRING,
    NAVIGATE_OBJECT,
  ]) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(source)) !== null) {
      if (!isTabHref(match[1])) continue
      found.push({
        file: path.relative(ROOT, file),
        line: source.slice(0, match.index).split("\n").length,
        text: match[0].replace(/\s+/gu, " "),
      })
    }
  }
  return found
}

const OFFENDERS: Offender[] = SCAN_DIRS.flatMap((dir) =>
  collect(path.join(ROOT, dir)).flatMap(scan),
)

describe("탭 라우트로 가는 길", () => {
  it("탭 라우트 목록을 파일에서 읽어 온다 (스캐너가 살아 있다는 전제)", () => {
    expect(TAB_ROUTES).toContain("community")
    expect(TAB_ROUTES).toContain("home")
  })

  it("탭 밖에서 push/navigate 로 탭 라우트에 가지 않는다", () => {
    const unexpected = OFFENDERS.filter(
      (offender) => !ALLOWED.has(offender.file),
    )
    expect(unexpected.map((o) => `${o.file}:${o.line}  ${o.text}`)).toEqual([])
  })

  /*
    아래 둘은 "고친 자리가 정말 고쳐진 채로 남아 있는가" 를 본다. 위 검사만 있으면
    두 호출을 통째로 지워도 초록이다 — 태그를 눌러도 아무 일 없는 화면이 되는데.
  */
  it("해시태그는 dismissTo 로 커뮤니티 탭에 되돌아간다 (내 활동 보관함)", () => {
    const source = codeOnly(
      fs.readFileSync(path.join(ROOT, "src/features/recipe/views/CommunityLibraryScreen.tsx"), "utf8"),
    )
    expect(source).toMatch(
      /router\.dismissTo\(\{ pathname: "\/community", params: \{ tag \} \}/u,
    )
  })

  it("해시태그는 dismissTo 로 커뮤니티 탭에 되돌아간다 (커뮤니티 검색)", () => {
    const source = codeOnly(
      fs.readFileSync(
        path.join(ROOT, "src/features/recipe/views/CommunitySearchScreen.tsx"),
        "utf8",
      ),
    )
    expect(source).toMatch(
      /router\.dismissTo\(\{ pathname: "\/community", params: \{ tag \} \}/u,
    )
  })

  /*
    예외 목록은 **줄어들기만 한다.** 이 검사가 없으면 새 위반을 여기 한 줄 적는 것으로
    위 스캔을 영원히 통과시킬 수 있다 — 그러면 목록이 가드가 아니라 우회로가 된다.
  */
  it("예외 목록은 둘뿐이다 (탭 안 · 다른 담당)", () => {
    expect([...ALLOWED].sort()).toEqual(
      [
        path.join("app", "post", "[id].tsx"),
        path.join("src", "features", "recipe", "components", "FreePostTab.tsx"),
      ].sort(),
    )
  })
})

/**
 * 2026-08-20 에 고친 세 자리. 스캔만으로는 **호출을 통째로 지워도 초록**이라
 * (레시피 목록으로 갈 길이 사라진 화면이 되는데) 고친 모양을 따로 못 박는다.
 */
describe("탭 밖에서 탭으로 — 고친 세 자리", () => {
  it("보관함의 `레시피 보러 가기` 는 dismissTo 다", () => {
    const source = codeOnly(
      fs.readFileSync(
        path.join(ROOT, "src/features/recipe/archive/RecipeArchiveScreen.tsx"),
        "utf8",
      ),
    )
    expect(source).toMatch(/router\.dismissTo\("\/recipe" as Href\)/u)
    // 주석까지 걷어낸 코드에 옛 호출이 남아 있으면 안 된다.
    expect(source).not.toMatch(/router\.(?:push|navigate)\(\s*"\/recipe"/u)
  })

  it("식당 검색의 지역 제안은 dismissTo 이고 `ts` 재선택 값을 계속 싣는다", () => {
    const source = codeOnly(
      fs.readFileSync(path.join(ROOT, "app/restaurant/search.tsx"), "utf8"),
    )
    /*
      POP_TO 도 params 를 목적 라우트에 얹는다(StackRouter 의 POP_TO 갈래가
      `createParamsFromAction` 으로 새 params 객체를 만든다). `ts` 가 매번 달라지므로
      이미 떠 있는 지도 탭도 같은 지역을 다시 고를 수 있다 — 그 값을 여기서 지키지
      않으면 "강남 → 부산 → 강남" 이 다시 무반응이 된다.
    */
    expect(source).toMatch(
      /router\.dismissTo\(\{\s*pathname: "\/\(tabs\)\/restaurant",/u,
    )
    expect(source).toMatch(/ts: String\(Date\.now\(\)\)/u)
    expect(source).not.toMatch(
      /router\.(?:push|navigate)\(\{\s*pathname: "\/\(tabs\)\/restaurant"/u,
    )
  })

  /*
    푸시 라우팅만은 **소스를 훑지 않는다.** `routeFromPushData` 는 라우터를 인자로 받는
    순수 함수라 진짜로 불러 볼 수 있고(`expo-router` 는 타입으로만 들여온다), 여기서
    지켜야 하는 것은 "어떤 글자가 쓰였나" 가 아니라 **어디서 눌렸느냐에 따라 다른 동사를
    쓰는가** 이기 때문이다. 한 벌로 통일하면 둘 중 하나가 조용히 깨진다:
      - 전부 push/navigate → 탭 밖에서 누르면 탭 네비게이터가 한 벌 더 쌓인다.
      - 전부 dismissTo    → 탭 안에서 누르면 TabRouter 가 POP_TO 를 모르고, target 이
                            박힌 액션은 위로 올라가지도 않아 **아무 일도 일어나지 않는다**.
  */
  function fakeRouter(canDismiss: boolean) {
    const calls: string[] = []
    const record =
      (name: string) =>
      (href: unknown): void => {
        calls.push(`${name} ${JSON.stringify(href)}`)
      }
    return {
      calls,
      router: {
        canDismiss: () => canDismiss,
        dismissTo: record("dismissTo"),
        navigate: record("navigate"),
        push: record("push"),
      } as unknown as Router,
    }
  }

  it("탭 위에 무언가 얹혀 있으면 접으면서 홈 탭으로 간다", () => {
    const { router, calls } = fakeRouter(true)
    routeFromPushData({ type: "food_analysis_complete" }, router)
    expect(calls).toEqual(['dismissTo "/(tabs)/home"'])
  })

  it("이미 탭 안이면 dismissTo 가 아니라 navigate 다 (POP_TO 는 탭에서 삼켜진다)", () => {
    const { router, calls } = fakeRouter(false)
    routeFromPushData({ type: "food_analysis_complete" }, router)
    expect(calls).toEqual(['navigate "/(tabs)/home"'])
  })

  it("모르는 타입도 같은 규칙으로 홈에 내려놓는다", () => {
    const outside = fakeRouter(true)
    expect(routeFromPushData({ type: "무엇인가" }, outside.router)).toBe(false)
    expect(outside.calls).toEqual(['dismissTo "/(tabs)/home"'])

    const inside = fakeRouter(false)
    expect(routeFromPushData(undefined, inside.router)).toBe(false)
    expect(inside.calls).toEqual(['navigate "/(tabs)/home"'])
  })

  it("공지는 그대로 push 다 — 탭 라우트가 아니라 쌓일 `(tabs)` 가 없다", () => {
    const { router, calls } = fakeRouter(true)
    expect(
      routeFromPushData({ type: "announcement", noticeId: 7 }, router),
    ).toBe(true)
    expect(routeFromPushData({ type: "announcement" }, router)).toBe(true)
    expect(calls).toEqual([
      'push {"pathname":"/(settings)/announcement-detail","params":{"id":"7"}}',
      'push "/(settings)/announcements"',
    ])
  })
})
