/**
 * 커뮤니티 재디자인의 **가장자리 페이드**(`EdgeFade`, WBS 1.15)의 계약.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.19 · §4-G18.
 *
 * 상단 탭 스트립(`CommunityTopTabs`, WBS 1.13 · §2.15)과 사진 스크림(`PhotoScrim`,
 * §5.18)의 계약도 여기 있었다. 둘 다 어디서도 import 되지 않는 죽은 파일이라
 * 컴포넌트와 함께 지웠다(2026-09-09).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 왜 컴포넌트를 부르나
 *
 * 렌더러가 없는 저장소라(`tests/helpers/hookHarness.ts` 머리말) 소스 grep 이나 로직 복사로
 * 초록을 만들기 쉽다. 여기서는 함수 컴포넌트를 그대로 호출해 **엘리먼트 트리를 읽는다**
 * (`tests/v2CommunityGaps.test.ts` 와 같은 방법).
 *
 * ■ 이 파일이 지키는 것
 *
 *  **그라디언트 끝점이 `"transparent"` 가 아니다** — RN 의 transparent 는 투명한 *검정*
 *  이라 흰 면으로 사라지는 페이드의 중간이 회색으로 뜬다(안드로이드에서 특히).
 *  이건 앱에서 실제로 한 번 고친 결함이다(`WriteSubmitBar` 머리말).
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
// 테마는 이 파일이 정한다(다크 단언이 있다). 훅 본체는 스토어를 보므로 그 한 칸만 바꾼다.
jest.mock("@/src/hooks/useAppColorScheme", () => ({
  useAppColorScheme: () => mockMode,
}))

let mockMode: "light" | "dark" = "light"

import { resolveTheme } from "@/src/design-system-v2/theme"
import {
  EdgeFade,
  EDGE_FADE_HEIGHT,
  EDGE_FADE_PEEK_ALPHA,
  EDGE_FADE_WIDTH,
} from "@/src/features/recipe/components/community/EdgeFade"

const light = resolveTheme("light").colors
const dark = resolveTheme("dark").colors

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

const render = <P>(component: (props: P) => unknown, props: P): Element => {
  const out = component(props)
  if (!isElement(out)) throw new Error("엘리먼트를 돌려주지 않았다")
  return out
}

afterEach(() => {
  mockMode = "light"
})

/* ══ 1.15 · EdgeFade — §2.19 ═════════════════════════════════════════════ */

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
