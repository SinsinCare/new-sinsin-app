/**
 * 작성 화면에서 **초안이 사고로 날아가는 길**을 막아 둔 것이 그대로인지 본다.
 *
 * ## 왜 소스를 읽는가
 *
 * 여기서 지키려는 것은 값도 함수도 아니라 **라우터에 넘긴 옵션**이다. 렌더 테스트로
 * 보려면 expo-router + react-native-screens 를 통째로 띄워야 하는데 이 스위트는
 * `testEnvironment: node` 라 RN 이 스텁이다(`tests/helpers/reactNativeStub.js`).
 * `app/restaurant/_layout.tsx` 의 같은 처방도 지금까지 아무 테스트가 없었고, 그래서
 * `app/(write)/_layout.tsx` 는 맨 `<Stack>` 인 채로 남아 있었다 — 실측으로 iOS 엣지
 * 스와이프 한 번에 제목·본문·사진 다섯 장이 확인창 없이 사라졌다.
 *
 * ## 무엇을 고정하나
 *
 * 1. `(write)` 아래 **모든 라우트**가 레이아웃에 적혀 있을 것. 새 작성 화면을 추가하면
 *    "이 화면은 잃을 것이 있나" 를 여기서 한 번은 정하게 된다. 빠뜨리면 기본값
 *    (제스처 켜짐)으로 조용히 들어간다.
 * 2. 초안을 들고 있는 화면 넷은 `gestureEnabled: false`.
 * 3. 잃을 것이 없는 화면(`recipe/edit/[id]` — "수정은 아직 없습니다" 안내 한 장)은
 *    **막지 않는다.** 아무 이득 없이 뒤로가기만 불편해진다.
 * 4. 태그 입력의 자동 포커스는 **옵트인**일 것(T7).
 */
import fs from "node:fs"
import path from "node:path"

const ROOT = path.join(__dirname, "..")
const WRITE_DIR = path.join(ROOT, "app", "(write)")
const LAYOUT = path.join(WRITE_DIR, "_layout.tsx")
const TAG_INPUT = path.join(
  ROOT,
  "src",
  "features",
  "recipe",
  "components",
  "TagInput.tsx",
)

/** 초안을 들고 있는 화면 — 스와이프 한 번에 날아가면 안 되는 곳. */
const DRAFT_ROUTES = ["free/new", "free/[id]", "recipe/new", "story/new"]

/** 잃을 것이 없는 화면 — 확인창도 제스처 차단도 붙이지 않는다. */
const NOTHING_TO_LOSE_ROUTES = ["recipe/edit/[id]"]

function routeKeys(dir: string, prefix = ""): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const next = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory())
        return routeKeys(path.join(dir, entry.name), next)
      if (!/\.tsx?$/u.test(entry.name)) return []
      const key = next.replace(/\.tsx?$/u, "").replace(/\/index$/u, "")
      if (key === "_layout" || key.startsWith("+")) return []
      return [key]
    })
    .sort()
}

interface ScreenEntry {
  name: string
  gestureDisabled: boolean
}

function declaredScreens(): ScreenEntry[] {
  const source = fs.readFileSync(LAYOUT, "utf8")
  const tags = source.match(/<Stack\.Screen\b[^>]*\/>/gu) ?? []
  return tags.map((tag) => {
    const name = /name="([^"]+)"/u.exec(tag)?.[1] ?? ""
    return {
      name,
      gestureDisabled: /gestureEnabled:\s*false/u.test(tag),
    }
  })
}

describe("(write) 스택 — 초안이 날아가는 길 (T6)", () => {
  const screens = declaredScreens()
  const byName = new Map(screens.map((entry) => [entry.name, entry]))

  it("검사 자체가 비어 있지 않다", () => {
    expect(screens.length).toBeGreaterThanOrEqual(5)
    expect(screens.every((entry) => entry.name.length > 0)).toBe(true)
  })

  it("`(write)` 아래 모든 라우트가 레이아웃에 적혀 있다", () => {
    const missing = routeKeys(WRITE_DIR).filter((key) => !byName.has(key))
    expect(missing).toEqual([])
  })

  it("레이아웃에 없는 화면을 적어 두지 않았다", () => {
    const files = new Set(routeKeys(WRITE_DIR))
    expect(
      screens.map((entry) => entry.name).filter((n) => !files.has(n)),
    ).toEqual([])
  })

  it.each(DRAFT_ROUTES)("%s 는 엣지 스와이프로 닫히지 않는다", (route) => {
    expect({
      route,
      gestureDisabled: byName.get(route)?.gestureDisabled,
    }).toEqual({ route, gestureDisabled: true })
  })

  it.each(NOTHING_TO_LOSE_ROUTES)(
    "%s 는 잃을 것이 없으므로 그대로 둔다",
    (route) => {
      expect({
        route,
        gestureDisabled: byName.get(route)?.gestureDisabled,
      }).toEqual({ route, gestureDisabled: false })
    },
  )

  it("식당 후기 작성과 같은 처방을 쓴다", () => {
    // 이 처방의 출처. 저쪽이 사라지면 여기 머리말의 근거도 사라진 것이다.
    const restaurant = fs.readFileSync(
      path.join(ROOT, "app", "restaurant", "_layout.tsx"),
      "utf8",
    )
    expect(restaurant).toMatch(/gestureEnabled:\s*false/u)
  })
})

describe("TagInput — 자동 포커스는 옵트인 (T7)", () => {
  const source = fs.readFileSync(TAG_INPUT, "utf8")

  it("기본값이 꺼짐이다", () => {
    expect(source).toMatch(/autoFocus\s*=\s*false/u)
    expect(source).not.toMatch(/autoFocus\s*=\s*true/u)
  })

  it("포커스를 거는 effect 가 그 값으로 잠겨 있다", () => {
    const effects =
      source.match(/useEffect\(\(\) => \{[\s\S]*?\n {2}\}, \[/gu) ?? []
    const focusEffects = effects.filter((body) => body.includes(".focus()"))

    expect(focusEffects).toHaveLength(1)
    expect(focusEffects[0]).toMatch(/if\s*\(!autoFocus\)\s*return/u)
  })

  it("TextInput 자체의 autoFocus 로 우회하지 않았다", () => {
    expect(source).not.toMatch(/autoFocus\s*(\/>|\n|=\{true\})/u)
  })
})
