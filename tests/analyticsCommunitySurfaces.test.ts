/**
 * 커뮤니티 개편(설계 §D12)이 쓸 `AnalyticsSurface` 값들의 **이름 계약**을 고정한다.
 *
 * ## 왜 유니온에 값이 있는 것만으로는 부족한가
 *
 * 자리 이름이 틀려도 앱은 정상 동작하고 tsc·eslint 는 아무 말도 하지 않는다. 틀린 이름은
 * 대시보드에서만 보이고, 그때는 이미 늦다 — 행에 남는 것은 문자열 하나뿐이라 소급 분해가
 * 안 된다(`events.ts` 머리말). 실제로 신고 화면의 `기타 사유` 시트가 글쓰기의
 * `community_post_category` 를 재사용해 **카테고리 고르기와 한 칸에 섞여 있었다.**
 *
 * 그래서 여기서 지키는 것은 세 가지다.
 *
 *  1. **두 축이 같은 이름을 쓴다.** 화면 하나에 판 하나면 자리 이름은 그 화면의
 *     `AnalyticsScreenName` 과 **글자까지 같다**(표의 28개 값이 그렇다). 갈라 놓으면
 *     `screen_viewed` 와 `empty_state_viewed` 를 나란히 읽을 때 번역표가 필요해진다.
 *  2. **판은 자기가 사는 화면의 이름을 물려받는다.** `<화면명>_<무엇인가>` 라야
 *     브레이크다운에서 부모가 보인다.
 *  3. **아직 없는 라우트는 표에 넣지 않는다.** 화면명 표는 `app/` 트리와 1:1 이라
 *     파일보다 먼저 넣으면 그 순간부터 표가 거짓말을 한다.
 */
import fs from "fs"
import path from "path"

import {
  getAnalyticsScreenName,
  knownAnalyticsRouteKeys,
  type AnalyticsScreenName,
  type AnalyticsSurface,
} from "@/src/features/analytics/events"

import { APP_DIR } from "./helpers/appRouteKeys"

const SOURCE = fs.readFileSync(
  path.join(__dirname, "..", "src", "features", "analytics", "events.ts"),
  "utf8",
)

/**
 * 유니온의 **멤버 줄만** 읽는다(`  | "community_post"`). 주석에 적힌 이름을 값으로 세면
 * "설명은 있는데 값은 없는" 상태를 통과시켜 이 파일 전체가 무의미해진다 — 그래서 따옴표
 * 하나로 찾지 않고 줄 모양으로 찾는다.
 */
function unionMembers(typeName: string): string[] {
  const start = SOURCE.indexOf(`export type ${typeName} =`)
  if (start < 0) throw new Error(`${typeName} 을(를) 못 찾았다`)
  const end = SOURCE.indexOf("\n\n", start)
  const body = SOURCE.slice(start, end < 0 ? undefined : end)
  return Array.from(body.matchAll(/^\s*\|\s*"([a-z0-9_]+)"\s*$/gmu)).map(
    (match) => match[1],
  )
}

const SURFACES = unionMembers("AnalyticsSurface")
const SCREEN_NAMES = unionMembers("AnalyticsScreenName")

/**
 * 이 배열은 **두 번** 검사받는다. `satisfies` 가 컴파일에서(유니온에서 값이 사라지면
 * 스위트가 통째로 죽는다), 아래 `it` 들이 런타임에서.
 */
const REDESIGN_SURFACES = [
  "community_post",
  "community_post_comments",
  "community_reply",
  "community_author",
  "community_connections",
  "community_neighbors",
  "community_story",
  "community_story_comments",
  "community_report_other",
] satisfies readonly AnalyticsSurface[]

/**
 * 화면명이 없어도 되는 커뮤니티 자리와 **그 이유**. 이유를 못 적겠으면 그 자리는
 * 이름이 틀린 것이다.
 */
const SURFACES_WITHOUT_OWN_SCREEN: Record<string, string> = {
  // 하단탭 `커뮤니티`(화면명 `community`) 안의 세 탭 중 하나라 라우트가 없다.
  community_feed: "S1 자유글 탭 — 화면 하나에 탭 셋",
  // 아래 둘은 라우트가 Phase 2 에 생긴다. 그때 화면명 표에 같이 들어간다.
  community_reply: "S5 답글쓰기 — 라우트 예정",
  community_neighbors: "S11 신신이웃 — 라우트 예정",
}

/** 화면 하나 = 자리 하나인 곳. 라우트 → 화면명 → 같은 이름의 자리. */
const SCREEN_LEVEL: readonly (readonly [
  readonly string[],
  AnalyticsScreenName,
])[] = [
  [["post", "[id]"], "community_post"],
  [["stories"], "community_story"],
  [["community", "author", "[id]"], "community_author"],
  [["community", "connections"], "community_connections"],
]

/** 화면 안의 독립된 판 → 그 화면의 이름. */
const PANELS: readonly (readonly [
  AnalyticsSurface,
  AnalyticsScreenName,
  readonly string[],
])[] = [
  ["community_post_comments", "community_post", ["post", "[id]"]],
  ["community_story_comments", "community_story", ["stories"]],
  ["community_report_other", "community_report", ["community", "report"]],
]

describe("community redesign analytics surfaces", () => {
  it("reads the unions at all (검사 자체가 비어 있지 않은지)", () => {
    // 파서가 헛돌면 아래 검사가 전부 빈 배열 위에서 통과한다.
    expect(SURFACES.length).toBeGreaterThan(50)
    expect(SCREEN_NAMES.length).toBeGreaterThan(50)
    expect(SURFACES).toContain("community_feed")
  })

  it("gives every redesign screen its own surface, exactly once", () => {
    for (const surface of REDESIGN_SURFACES) {
      expect(SURFACES.filter((value) => value === surface)).toEqual([surface])
    }
  })

  it("spells the screen axis and the surface axis the same (화면 1 = 자리 1)", () => {
    for (const [segments, screen] of SCREEN_LEVEL) {
      // 라우트가 정말 그 화면명으로 떨어지는지 먼저 본다 — 표가 바뀌면 이 대응이 깨진다.
      expect(getAnalyticsScreenName(segments)).toBe(screen)
      // 그리고 **같은 문자열**이 자리 축에도 있어야 한다. `community_post_detail` 처럼
      // 한 글자 다른 이름을 쓰면 여기서 걸린다.
      expect(SURFACES).toContain(screen)
    }
  })

  it("names every panel after the screen it lives in", () => {
    for (const [panel, screen, segments] of PANELS) {
      expect(getAnalyticsScreenName(segments)).toBe(screen)
      expect(panel.startsWith(`${screen}_`)).toBe(true)
      expect(SURFACES).toContain(panel)
      // 판은 화면과 **다른 행**이다. 같으면 "글이 안 열렸다" 와 "댓글만 못 받았다" 가
      // 한 칸에 들어간다.
      expect(panel).not.toBe(screen)
    }
  })

  it("keeps the report sheet out of the write flow's category bucket", () => {
    // 신고의 `기타 사유` 가 자기 자리를 갖는다고 해서 글쓰기의 카테고리 시트 자리가
    // 없어지는 것은 아니다 — 그 값은 `PostCategorySheet` 가 여전히 쓴다. 둘은 **두 행**이다.
    expect(SURFACES).toContain("community_post_category")
    expect(SURFACES).toContain("community_report_other")
  })

  it("keeps every community surface a screen name (or a screen name + suffix)", () => {
    // **`community` 자신은 부모로 치지 않는다.** 그걸 세면 `community_` 로 시작하는
    // 아무 이름이나 통과해 이 검사가 통째로 무의미해진다(하단탭 `커뮤니티` 화면명이
    // 표에 있기 때문이다). 그래서 부모 후보에서 빼고, 부모가 없어도 되는 자리는
    // **이유와 함께** 아래에 적는다.
    const parents = new Set(SCREEN_NAMES.filter((name) => name !== "community"))
    const strays = SURFACES.filter(
      (surface) =>
        surface.startsWith("community_") &&
        !parents.has(surface) &&
        ![...parents].some((parent) => surface.startsWith(`${parent}_`)) &&
        !(surface in SURFACES_WITHOUT_OWN_SCREEN),
    )
    expect(strays).toEqual([])
  })

  it("has no duplicate surface (중복 멤버는 TS 가 말해 주지 않는다)", () => {
    expect(SURFACES).toHaveLength(new Set(SURFACES).size)
  })

  it("registers a future route only when its file lands", () => {
    // Phase 2 의 두 라우트. 표에 미리 넣으면 `analyticsScreenTable` 의 '없는 라우트'
    // 검사가 깨지고, 파일만 만들고 표를 안 넣으면 '이름 없는 화면' 검사가 깨진다.
    // 즉 **둘은 같이 온다** — 자리(surface)는 먼저 있어도 된다.
    for (const key of ["community/reply", "community/neighbors"]) {
      const hasFile = fs.existsSync(path.join(APP_DIR, `${key}.tsx`))
      expect(knownAnalyticsRouteKeys().includes(key)).toBe(hasFile)
    }
    expect(SURFACES).toContain("community_reply")
    expect(SURFACES).toContain("community_neighbors")
  })
})
