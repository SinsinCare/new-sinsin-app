/**
 * 커뮤니티 재디자인의 **상단 탭 스트립과 그라디언트 2종**(WBS 1.13 · 1.15)의 계약.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.15 · §2.19 · §4-G18 · §5.18.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 왜 컴포넌트를 부르나
 *
 * 렌더러가 없는 저장소라(`tests/helpers/hookHarness.ts` 머리말) 소스 grep 이나 로직 복사로
 * 초록을 만들기 쉽다. 여기서는 함수 컴포넌트를 그대로 호출해 **엘리먼트 트리를 읽는다**
 * (`tests/v2CommunityGaps.test.ts` 와 같은 방법).
 *
 * ■ 이 파일이 지키는 것 셋
 *
 *  1. **인디케이터 폭 62 / 96** — `V2Tab` 을 다시 만들지 않아도 된다는 판정(§4 "갭이 아닌 것")
 *     전체가 이 산술 위에 서 있다. 그래서 인셋을 테스트가 다시 적지 않고 **`V2Tab` 자신이
 *     그린 인디케이터에서 읽어** 계산한다.
 *  2. **하단선이 한 겹의 full-bleed** — `V2Tab` 의 선을 안 끄면 탭 아래만 두 겹으로 진해지고,
 *     스트립이 안 그리면 프로필 아이콘 밑이 비어 보인다. 둘 다 눈으로는 잘 안 보인다.
 *  3. **그라디언트 끝점이 `"transparent"` 가 아니다** — RN 의 transparent 는 투명한 *검정*
 *     이라 흰 면으로 사라지는 페이드의 중간이 회색으로 뜬다(안드로이드에서 특히).
 *     이건 앱에서 실제로 한 번 고친 결함이다(`WriteSubmitBar` 머리말).
 */
/* eslint-disable import/first -- RN·네이티브 의존을 모듈 로드 **전에** 갈아 끼워야 한다. */

jest.mock("react-native", () => ({
  Platform: { OS: "ios", select: (spec: Record<string, unknown>) => spec.ios },
  StyleSheet: { create: <T>(styles: T): T => styles },
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
}))
jest.mock("expo-linear-gradient", () => ({ LinearGradient: "LinearGradient" }))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/src/design-system-v2/components/V2Icon", () => ({
  V2Icon: "V2Icon",
}))
// `V2Avatar` 는 그려지지 않고 엘리먼트로만 남지만, 그 모듈이 expo-image 를 끌고 온다.
jest.mock("expo-image", () => ({ Image: "Image" }))
// 테마는 이 파일이 정한다(다크 단언이 있다). 훅 본체는 스토어를 보므로 그 한 칸만 바꾼다.
jest.mock("@/src/hooks/useAppColorScheme", () => ({
  useAppColorScheme: () => mockMode,
}))

let mockMode: "light" | "dark" = "light"

import { resolveTheme } from "@/src/design-system-v2/theme"
import { V2Tab } from "@/src/design-system-v2/components/V2Tab"
import { V2Avatar } from "@/src/design-system-v2/components/V2Avatar"
import { primitives } from "@/src/design-system-v2/tokens/colors"
import { borderWidth } from "@/src/design-system-v2/tokens/size"
import { ROW } from "@/src/features/recipe/components/community/communityLayout"
import {
  CommunityTopTabs,
  TAB_RAIL_WIDTH,
} from "@/src/features/recipe/components/community/CommunityTopTabs"
import {
  EdgeFade,
  EDGE_FADE_HEIGHT,
  EDGE_FADE_PEEK_ALPHA,
  EDGE_FADE_WIDTH,
} from "@/src/features/recipe/components/community/EdgeFade"
import {
  PhotoScrim,
  PHOTO_SCRIM_HEIGHT,
} from "@/src/features/recipe/components/community/PhotoScrim"

const light = resolveTheme("light").colors
const dark = resolveTheme("dark").colors

/** 시안 프레임 폭. `fill` 배치의 셀 산술이 이 값 위에서 96 을 만든다(§2.15). */
const FRAME_WIDTH = 375

/* ── 엘리먼트 트리 읽기 ──────────────────────────────────────────────────── */

type Element = { type: unknown; props: Record<string, unknown> }
type Style = Record<string, unknown>

const isElement = (node: unknown): node is Element =>
  typeof node === "object" && node !== null && "props" in node && "type" in node

function flatten(style: unknown): Style {
  if (typeof style === "function") {
    return flatten(
      (style as (s: { pressed: boolean }) => unknown)({ pressed: false }),
    )
  }
  if (Array.isArray(style)) {
    return style.reduce<Style>(
      (acc, item) => ({ ...acc, ...flatten(item) }),
      {},
    )
  }
  if (style && typeof style === "object") return { ...(style as Style) }
  return {}
}

const styleOf = (element: Element): Style => flatten(element.props.style)

function childrenOf(element: Element): Element[] {
  const raw = element.props.children
  const list = Array.isArray(raw) ? raw.flat(Infinity) : [raw]
  return list.filter(isElement)
}

function walk(element: Element): Element[] {
  return childrenOf(element).reduce<Element[]>(
    (acc, child) => [...acc, ...walk(child)],
    [element],
  )
}

const findAll = (root: Element, type: unknown): Element[] =>
  walk(root).filter((el) => el.type === type)

const render = <P>(component: (props: P) => unknown, props: P): Element => {
  const out = component(props)
  if (!isElement(out)) throw new Error("엘리먼트를 돌려주지 않았다")
  return out
}

afterEach(() => {
  mockMode = "light"
})

/* ══ 1.13 · CommunityTopTabs — §2.15 ═════════════════════════════════════ */

const TABS = ["레시피", "자유글", "스토리"]

const strip = (extra: Record<string, unknown> = {}) =>
  render(CommunityTopTabs, {
    items: TABS,
    value: "자유글",
    onChange: () => {},
    ...extra,
  } as never)

const tabOf = (root: Element): Element => findAll(root, V2Tab)[0]

/**
 * `V2Tab` 이 **자신이 그린** 인디케이터에서 읽은 좌우 인셋.
 * 테스트가 8 을 다시 적으면 `V2Tab` 이 바뀌어도 초록으로 남는다.
 */
function indicatorInset(): number {
  const tab = render(V2Tab, {
    items: TABS,
    value: TABS[0],
    onChange: () => {},
    alignment: "fixed",
    size: "l",
  })
  const selected = childrenOf(tab)[0]
  const indicator = childrenOf(selected).find(
    (el) => flatten(el.props.style).position === "absolute",
  )
  return flatten(indicator?.props.style).left as number
}

/** 셀 폭에서 인셋을 뺀 것이 인디케이터 폭이다. */
const indicatorWidth = (railWidth: number, cells: number) =>
  Math.round(railWidth / cells - indicatorInset() * 2)

describe("CommunityTopTabs — 폭만 정해 주면 인디케이터가 실측과 맞는다 (§2.15)", () => {
  it("rail 233 → 인디케이터 62 (피드 3탭 · 프로필 3탭)", () => {
    expect(TAB_RAIL_WIDTH).toBe(233)
    expect(indicatorWidth(TAB_RAIL_WIDTH, TABS.length)).toBe(62)

    const tab = tabOf(strip())
    expect(tab.props.alignment).toBe("fixed")
    expect(tab.props.size).toBe("l")
    const style = styleOf(tab)
    expect(style.width).toBe(TAB_RAIL_WIDTH)
    expect(style.marginLeft).toBe(20)
  })

  it("fill(좌우 20) → 인디케이터 96 (인기글 기간탭)", () => {
    const style = styleOf(tabOf(strip({ layout: "fill" })))
    expect(style.paddingHorizontal).toBe(20)
    expect(style.flex).toBe(1)
    expect(style.width).toBeUndefined()

    const usable = FRAME_WIDTH - (style.paddingHorizontal as number) * 2
    expect(indicatorWidth(usable, TABS.length)).toBe(96)
  })

  it("탭 조작은 그대로 통과한다", () => {
    const seen: string[] = []
    const tab = tabOf(
      strip({ value: "스토리", onChange: (next: string) => seen.push(next) }),
    )
    expect(tab.props.items).toEqual(TABS)
    expect(tab.props.value).toBe("스토리")
    ;(tab.props.onChange as (v: string) => void)("레시피")
    expect(seen).toEqual(["레시피"])
  })
})

describe("CommunityTopTabs — 하단선은 한 겹의 full-bleed 다 (§2.15)", () => {
  it("스트립이 선을 그리고 `V2Tab` 의 선은 꺼진다", () => {
    for (const layout of ["rail", "fill"] as const) {
      const root = strip({ layout })
      expect(styleOf(root).borderBottomWidth).toBe(borderWidth.thin)
      expect(styleOf(root).borderBottomColor).toBe(light.line.normal)
      // 안 끄면 같은 자리에 알파 22% 가 두 겹 — 탭 아래만 진해진다.
      expect(styleOf(tabOf(root)).borderBottomWidth).toBe(0)
    }
  })

  it("스트립 높이를 박지 않는다 — 51 은 **아이템** 높이고 선 1 이 더해진다 (D13 산술)", () => {
    expect(styleOf(strip()).height).toBeUndefined()
    // `V2Tab size="l"` 의 아이템이 그 51 이다.
    const item = childrenOf(
      render(V2Tab, {
        items: TABS,
        value: TABS[0],
        onChange: () => {},
        alignment: "fixed",
        size: "l",
      }),
    )[0]
    expect(styleOf(item).minHeight).toBe(ROW.tabStrip)
  })

  it("다크에서도 테마 색을 따라간다 — 시안이 라이트 전용이어도", () => {
    mockMode = "dark"
    const root = strip()
    expect(styleOf(root).backgroundColor).toBe(dark.background.default)
    expect(styleOf(root).borderBottomColor).toBe(dark.line.normal)
  })
})

describe("CommunityTopTabs — 우상단 프로필 (§2.15 · D5)", () => {
  it("`onProfilePress` 가 없으면 안 그린다(인기글 기간탭)", () => {
    expect(findAll(strip(), "Pressable")).toHaveLength(0)
  })

  it("원과 글리프는 `V2Avatar` 의 것이다 — 손으로 다시 그리지 않는다 (§4-G12)", () => {
    const root = strip({ onProfilePress: () => {} })
    const [avatar] = findAll(root, V2Avatar)
    expect(avatar.props.size).toBe(24)
    // 면·글리프를 여기서 그리면 두 정본이 생긴다.
    expect(
      styleOf(findAll(root, "Pressable")[0]).backgroundColor,
    ).toBeUndefined()
  })

  it("히트영역 44 · 우측 인셋 20 · 누르면 통과한다", () => {
    const pressed: string[] = []
    const root = strip({ onProfilePress: () => pressed.push("go") })
    const [button] = findAll(root, "Pressable")

    const style = styleOf(button)
    expect(style.marginLeft).toBe("auto")
    expect(style.marginRight).toBe(20)
    // 24 + 10×2 = 44.
    expect(button.props.hitSlop).toBe(10)
    expect(button.props.accessibilityLabel).toBe("community.myActivity")
    ;(button.props.onPress as () => void)()
    expect(pressed).toEqual(["go"])
  })
})

/* ══ 1.15 · EdgeFade / PhotoScrim — §2.19 ════════════════════════════════ */

/** `#rrggbb` + 알파 → 같은 색인지. 대소문자·8자리 표기 차이를 흡수한다. */
const sameRgb = (a: string, b: string) =>
  a.slice(0, 7).toLowerCase() === b.slice(0, 7).toLowerCase()

const colorsOf = (gradient: Element): string[] =>
  gradient.props.colors as string[]

describe("EdgeFade — 36pt · 흐름 밖 (§2.19 · §4-G18)", () => {
  it("바 위쪽 바깥에 뜨고 레이아웃을 차지하지 않는다", () => {
    const fade = render(EdgeFade, {})
    expect(fade.type).toBe("LinearGradient")
    expect(fade.props.pointerEvents).toBe("none")

    const style = styleOf(fade)
    expect(style.height).toBe(EDGE_FADE_HEIGHT)
    expect(EDGE_FADE_HEIGHT).toBe(36)
    expect(style.position).toBe("absolute")
    expect(style.left).toBe(0)
    expect(style.right).toBe(0)
    // 흐름에 넣으면 본문이 36 밀리고 그 자리는 빈 띠가 된다.
    expect(style.top).toBe(-EDGE_FADE_HEIGHT)
  })

  it('끝점은 `"transparent"` 가 아니라 **같은 면 색의 알파 0** 이다', () => {
    const [start, end] = colorsOf(render(EdgeFade, {}))
    expect(start).not.toBe("transparent")
    expect(end).toBe(light.background.default)
    expect(sameRgb(start, light.background.default)).toBe(true)
    expect(start.slice(-2)).toBe("00")
  })

  it("`top` 배치는 방향이 뒤집힌다 — 액션시트 옵션 목록 위(§2.17)", () => {
    const fade = render(EdgeFade, { placement: "top" })
    expect(styleOf(fade).top).toBe(0)
    const [start, end] = colorsOf(fade)
    expect(start).toBe(light.background.default)
    expect(sameRgb(end, light.background.default)).toBe(true)
    expect(end.slice(-2)).toBe("00")
  })

  it("면 색을 넘기면 그 색으로 사라진다(시트·카드 위)", () => {
    const [start, end] = colorsOf(
      render(EdgeFade, { color: light.background.lower }),
    )
    expect(end).toBe(light.background.lower)
    expect(sameRgb(start, light.background.lower)).toBe(true)
  })

  it("다크에서는 다크 배경으로 사라진다", () => {
    mockMode = "dark"
    const [, end] = colorsOf(render(EdgeFade, {}))
    expect(end).toBe(dark.background.default)
    expect(end).not.toBe(light.background.default)
  })
})

describe("EdgeFade — `leftOfBar` 는 축이 가로로 눕는다 (피드 필터 바)", () => {
  const fade = () => render(EdgeFade, { placement: "leftOfBar" })

  it("**축을 명시한다** — 안 주면 `LinearGradient` 는 세로라 아무것도 안 가린다", () => {
    /*
      이게 이 배치의 전부다. 세 배치가 같은 `colors` 를 쓰기 때문에, 축을 빠뜨려도
      색·자리는 다 맞고 화면만 조용히 틀린다(칩이 필에 그대로 부딪힌다).
    */
    const gradient = fade()
    expect(gradient.props.start).toEqual({ x: 0, y: 0.5 })
    expect(gradient.props.end).toEqual({ x: 1, y: 0.5 })

    // 세로 배치는 축을 주지 않는다(기본이 세로다) — 여기에 가로축이 새면 그쪽이 깨진다.
    expect(render(EdgeFade, {}).props.start).toBeUndefined()
    expect(render(EdgeFade, { placement: "top" }).props.start).toBeUndefined()
  })

  it("왼쪽이 투명하고 오른쪽이 **끝까지는 안 간다** — 걸린 칩이 남아야 한다", () => {
    const [start, end] = colorsOf(fade())
    expect(start).not.toBe("transparent")
    expect(sameRgb(start, light.background.default)).toBe(true)
    expect(start.slice(-2)).toBe("00")

    /*
      2026-08-21 실기기 피드백("뱃지들이 좌우스크롤이 가능한지 애매해보임"). 세로 페이드는
      **지우는 것**이 일이지만 가로 페이드는 다르다 — 경계에 걸린 칩이 "오른쪽에 더 있다"
      의 유일한 신호이고, 불투명까지 가면 페이드가 그 신호를 지운다(430pt 화면에서는
      걸린 칩 18pt 가 통째로 24pt 페이드 밑으로 들어간다).
    */
    expect(end).not.toBe(light.background.default)
    expect(sameRgb(end, light.background.default)).toBe(true)
    expect(parseInt(end.slice(-2), 16) / 255).toBeCloseTo(
      EDGE_FADE_PEEK_ALPHA,
      2,
    )
    expect(EDGE_FADE_PEEK_ALPHA).toBeLessThan(1)
  })

  it("세로 두 배치는 **여전히 끝까지 간다** — 지우는 것이 그쪽의 일이다", () => {
    expect(colorsOf(render(EdgeFade, {}))[1]).toBe(light.background.default)
    expect(colorsOf(render(EdgeFade, { placement: "top" }))[0]).toBe(
      light.background.default,
    )
  })

  it("폭 24 로 오른쪽 끝에 붙고, **높이는 부모가 정한다**", () => {
    const style = styleOf(fade())
    expect(style.position).toBe("absolute")
    expect(style.width).toBe(EDGE_FADE_WIDTH)
    expect(EDGE_FADE_WIDTH).toBe(24)
    expect(style.right).toBe(0)
    /*
      바의 두께는 밀도(64 / 52)마다 다르다. 높이를 박으면 여기서 한 번 더 정하게 되고,
      52 바 위의 64 페이드는 하단선을 덮는다.
    */
    expect(style.height).toBeUndefined()
    expect(style.top).toBe(0)
    expect(style.bottom).toBe(0)
    // 세로판의 자리(위로 -36)는 안 따라온다.
    expect(style.left).toBeUndefined()
  })

  it("누름을 안 먹는다 — 밑의 칩이 그대로 잡힌다", () => {
    expect(fade().props.pointerEvents).toBe("none")
  })

  it("다크에서는 다크 배경 쪽으로 누그러진다", () => {
    mockMode = "dark"
    const [start, end] = colorsOf(fade())
    expect(sameRgb(end, dark.background.default)).toBe(true)
    expect(sameRgb(end, light.background.default)).toBe(false)
    expect(sameRgb(start, dark.background.default)).toBe(true)
  })
})

describe("PhotoScrim — 140pt 검정 스크림 (§2.19 · §5.18)", () => {
  const scrim30 = primitives.opacityBlack["300"]

  it("미디어 하단에 앵커되고 누름을 안 먹는다", () => {
    const scrim = render(PhotoScrim, {})
    expect(scrim.type).toBe("LinearGradient")
    expect(scrim.props.pointerEvents).toBe("none")

    const style = styleOf(scrim)
    expect(style.height).toBe(PHOTO_SCRIM_HEIGHT)
    expect(PHOTO_SCRIM_HEIGHT).toBe(140)
    expect(style.position).toBe("absolute")
    expect(style.bottom).toBe(0)
    expect(style.top).toBeUndefined()
  })

  it("색은 지어내지 않는다 — 30% 는 원시 팔레트에 이미 있다", () => {
    const [start, end] = colorsOf(render(PhotoScrim, {}))
    // rgba(0,0,0,0.30) == #0000004d.
    expect(end).toBe(scrim30)
    expect(parseInt(scrim30.slice(7, 9), 16) / 255).toBeCloseTo(0.3, 2)
    expect(start).not.toBe("transparent")
    expect(sameRgb(start, scrim30)).toBe(true)
    expect(start.slice(-2)).toBe("00")
  })

  it("상단 앵커는 방향이 뒤집힌다 — 사진 위 다크 글리프의 대비(§5.18 · S13)", () => {
    const scrim = render(PhotoScrim, { anchor: "top" })
    expect(styleOf(scrim).top).toBe(0)
    expect(styleOf(scrim).bottom).toBeUndefined()
    expect(colorsOf(scrim)[0]).toBe(scrim30)
  })

  it("사진 위라 두 모드가 같다", () => {
    const lightColors = colorsOf(render(PhotoScrim, {}))
    mockMode = "dark"
    expect(colorsOf(render(PhotoScrim, {}))).toEqual(lightColors)
  })
})
