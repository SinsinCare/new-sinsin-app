/**
 * 커뮤니티 리디자인이 요구한 **디자인시스템 확장**(§4-G2·G3·G4·G7·G8·G10·G11)의 계약.
 *
 * ## 왜 소스 문자열이 아니라 컴포넌트를 부르나
 *
 * 이 저장소의 jest 에는 렌더러가 없다(`tests/helpers/hookHarness.ts` 머리말). 그래서
 * 여기서 흔히 쓰던 수법이 두 가지였고 둘 다 아무것도 보증하지 못한다:
 *
 *  - **같은 로직을 테스트에 다시 쓰기** — 사본을 시험한 것이라 원본이 바뀌어도 초록이다.
 *  - **소스에 문자열이 있는지 훑기** — 주석이 계약을 대신 만족시키고(`codeOnly` 머리말),
 *    "쓰여 있다" 가 "그려진다" 를 뜻하지 않는다.
 *
 * 대신 **함수 컴포넌트를 그대로 호출해 돌려받은 엘리먼트 트리를 읽는다.** 이 일곱 개는
 * 상태가 없고(V2EmptyState 의 계측 effect 하나가 예외), 훅은 테마 하나뿐이라 렌더러 없이
 * 본문 전체가 실제로 돈다 — 스타일 계산은 컴포넌트 자신의 것이다. 색·치수는 토큰에서
 * 읽어와 비교하므로 토큰이 바뀌면 같이 따라간다(하드코딩한 hex 를 쓰면 그 순간 두 정본이 생긴다).
 *
 * ## 이 파일이 지키는 것 중 가장 중요한 하나
 *
 * **기존 233개 소비처의 그림이 그대로여야 한다.** 새 prop 은 전부 opt-in 이고, 기본값은
 * 오늘의 렌더와 바이트가 같아야 한다. 그래서 각 항목마다 "기본값 회귀" 단언이 짝으로 있다
 * (`V2Badge` 의 `neutral/weak` 가 `label.disable` 인지, `V2Chip` 의 안 고른 칩이 세 톤에서
 * 완전히 같은지, `V2BottomCTA` 의 상단 패딩이 16 인지 …).
 */
/* eslint-disable import/first -- RN·네이티브 의존을 모듈 로드 **전에** 갈아 끼워야 한다. */

// react-native 는 Flow 원본이라 이 프리셋에서 파싱이 안 된다(tests/helpers/reactNativeStub.js).
// 전역 스텁은 `Platform` 만 갖고 있어 컴포넌트를 못 들여온다 — 이 파일에서만 넓힌다.
// 호스트 컴포넌트는 **문자열 태그**다. 흉내 낸 구현을 두면 "렌더러 없이 렌더한" 셈이 된다.
jest.mock("react-native", () => ({
  Platform: { OS: "ios", select: (spec: Record<string, unknown>) => spec.ios },
  StyleSheet: {
    create: <T>(styles: T): T => styles,
    absoluteFillObject: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
  },
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  // 2026-09-08: `V2ScreenHeader` 가 접근성 글자 배율로 바 높이를 늘린다. 배율 1 = 오늘의 44/54.
  useWindowDimensions: () => ({ fontScale: 1 }),
}))
/*
  2026-09-08 부터 v2 컴포넌트는 `Text` 를 react-native 가 아니라
  `primitives/NativeText`(접근성 확대 상한만 중앙에서 정하는 얇은 래퍼)에서 가져온다.
  스타일은 손대지 않고 그대로 통과시키므로 호스트 태그와 같은 **문자열 태그**로 둔다 —
  안 그러면 위의 `Text: "Text"` 가 라벨에 닿지 않는다(다른 스위트와 같은 처방).
*/
jest.mock("@/src/design-system-v2/primitives/NativeText", () => ({
  Text: "Text",
}))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 50, bottom: 34, left: 0, right: 0 }),
}))
jest.mock("react-i18next", () => ({
  // 키를 그대로 돌려준다 — 여기서 보는 것은 "어느 키를 골랐나" 다.
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("expo-linear-gradient", () => ({ LinearGradient: "LinearGradient" }))
jest.mock("@/src/design-system-v2/components/V2Icon", () => ({
  V2Icon: "V2Icon",
}))
jest.mock("@/src/design-system-v2/components/V2Button", () => ({
  V2Button: "V2Button",
}))
jest.mock("@/src/features/analytics", () => ({ trackAnalyticsEvent: () => {} }))
jest.mock("@/src/hooks/useKeyboardVisibility", () => ({
  useKeyboardVisibility: () => false,
}))
// 테마는 이 파일이 정한다(모드별 단언이 있다). 훅 본체는 스토어를 보므로 그 한 칸만 바꾼다.
jest.mock("@/src/hooks/useAppColorScheme", () => ({
  useAppColorScheme: () => mockMode,
}))
// V2EmptyState 가 훅(useRef/useEffect)을 쓰고, V2ScreenHeader 는 우측 슬롯 폭을
// useState 로 든다(2026-09-08 · 가운데 제목 인셋). 렌더러가 없으므로 셋만 대신한다.
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: (initial: unknown) => [initial, () => {}],
  useRef: <T>(initial: T) => ({ current: initial }),
  useEffect: (fn: () => void) => {
    fn()
  },
}))

let mockMode: "light" | "dark" = "light"

import { resolveTheme } from "@/src/design-system-v2/theme"
import {
  borderWidth,
  radius,
  spacing,
  typography,
} from "@/src/design-system-v2/tokens"
import { V2Badge } from "@/src/design-system-v2/components/V2Badge"
import { V2Chip } from "@/src/design-system-v2/components/V2Chip"
import { V2Divider } from "@/src/design-system-v2/components/V2Divider"
import { V2ScreenHeader } from "@/src/design-system-v2/components/V2ScreenHeader"
import { V2BottomCTA } from "@/src/design-system-v2/components/V2BottomCTA"
import { V2ProgressBar } from "@/src/design-system-v2/components/V2ProgressBar"
import { V2EmptyState } from "@/src/design-system-v2/components/V2EmptyState"

const light = resolveTheme("light").colors
const dark = resolveTheme("dark").colors

/* ── 엘리먼트 트리 읽기 ──────────────────────────────────────────────────── */

type Element = { type: unknown; props: Record<string, unknown> }
type Style = Record<string, unknown>

const isElement = (node: unknown): node is Element =>
  typeof node === "object" && node !== null && "props" in node && "type" in node

/** style 배열/함수/중첩을 RN 과 같은 순서(뒤가 이김)로 편다. falsy 는 무시. */
function flatten(style: unknown): Style {
  if (typeof style === "function") {
    // Pressable 의 style 은 ({pressed}) => … 다. 안 눌린 상태를 본다.
    return flatten(
      (style as (s: { pressed: boolean }) => unknown)({
        pressed: false,
      }),
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

/** 트리 전체(자기 자신 포함)를 훑는다. */
function walk(element: Element): Element[] {
  return childrenOf(element).reduce<Element[]>(
    (acc, child) => [...acc, ...walk(child)],
    [element],
  )
}

const findAll = (root: Element, type: unknown): Element[] =>
  walk(root).filter((el) => el.type === type)

const findOne = (root: Element, type: unknown): Element => {
  const [first, ...rest] = findAll(root, type)
  if (!first) throw new Error(`트리에 ${String(type)} 가 없다`)
  if (rest.length > 0) throw new Error(`${String(type)} 가 여러 개다`)
  return first
}

/** 컴포넌트를 호출해 트리 뿌리를 받는다. 렌더러가 아니라 함수 호출이다. */
const render = <P>(component: (props: P) => unknown, props: P): Element => {
  const out = component(props)
  if (!isElement(out)) throw new Error("엘리먼트를 돌려주지 않았다")
  return out
}

afterEach(() => {
  mockMode = "light"
})

/* ── 0.4 · V2Badge (§4-G2) ──────────────────────────────────────────────── */

describe("V2Badge — pill 모양과 잉크/온미디어 면", () => {
  it("기본(shape 미지정)은 오늘의 렌더 그대로다 — size 별 radius 사다리 + 여백 2", () => {
    const xs = styleOf(render(V2Badge, { size: "xs", children: "태그" }))
    expect(xs.borderRadius).toBe(radius.sm)
    expect(xs.paddingVertical).toBe(spacing[2])
    expect(xs.paddingHorizontal).toBe(spacing[8])

    const l = styleOf(render(V2Badge, { children: "기본" }))
    expect(l.borderRadius).toBe(radius.lg)
    expect(l.paddingVertical).toBe(spacing[4])
  })

  it("shape=pill 은 radius.full 이고, xs 만 세로 여백이 커진다", () => {
    const xs = styleOf(render(V2Badge, { size: "xs", shape: "pill" }))
    expect(xs.borderRadius).toBe(radius.full)
    expect(xs.paddingVertical).toBe(spacing[4])

    // 나머지 사이즈는 모양만 바뀌고 여백은 그대로 — pill 이 곧 "더 크다" 가 아니다.
    const m = styleOf(render(V2Badge, { size: "m", shape: "pill" }))
    expect(m.borderRadius).toBe(radius.full)
    expect(m.paddingVertical).toBe(spacing[2])
  })

  it("ink = 잉크 면 + 뒤집힌 글자. 다크에서 흰 글자가 되지 않는다", () => {
    const inkLight = render(V2Badge, { color: "ink", children: "질문·상담" })
    expect(styleOf(inkLight).backgroundColor).toBe(light.label.neutral)
    // 라이트에서는 background.default 가 흰색이라 시안(static.white)과 같은 그림이다.
    expect(flatten(childrenOf(inkLight)[0]?.props.style).color).toBe(
      light.background.default,
    )

    mockMode = "dark"
    const inkDark = render(V2Badge, { color: "ink", children: "질문·상담" })
    const darkLabel = flatten(childrenOf(inkDark)[0]?.props.style).color
    expect(darkLabel).toBe(dark.background.default)
    // 다크의 label.neutral 은 **밝은** 회색이다 — 흰 글자를 얹으면 읽히지 않는다.
    expect(darkLabel).not.toBe(dark.static.white)
  })

  it("ink/weak = 태그 칩 면(fill.normal). neutral/weak 는 건드리지 않는다", () => {
    const tag = render(V2Badge, {
      color: "ink",
      variant: "weak",
      children: "저염",
    })
    expect(styleOf(tag).backgroundColor).toBe(light.fill.normal)
    expect(flatten(childrenOf(tag)[0]?.props.style).color).toBe(
      light.label.neutral,
    )

    /* 시안은 이 면을 `neutral/weak` 자리에 요구했지만, 그 칸은 앱의 다른 화면 3곳이
       이미 쓰고 있다(주차 유·무료 · 검색 제안 종류 · 연결 해지). 그래서 새 이름으로
       열고 옛 칸은 그대로 뒀다. 이 단언이 그 약속이다. */
    const neutralWeak = styleOf(
      render(V2Badge, { color: "neutral", variant: "weak", children: "해지" }),
    )
    expect(neutralWeak.backgroundColor).toBe(light.label.disable)
    expect(neutralWeak.backgroundColor).not.toBe(light.fill.normal)
  })

  it("onMedia = 흰 면 + 브랜드 글자. 사진 위라 두 모드가 같다", () => {
    const seen = (["light", "dark"] as const).map((next) => {
      mockMode = next
      const badge = render(V2Badge, {
        color: "onMedia",
        size: "xs",
        shape: "pill",
        children: "저염식",
      })
      return {
        bg: styleOf(badge).backgroundColor,
        fg: flatten(childrenOf(badge)[0]?.props.style).color,
      }
    })
    expect(seen[0]).toEqual({
      bg: light.static.white,
      fg: light.primary.primary,
    })
    expect(seen[1]).toEqual(seen[0])
  })
})

/* ── 0.5 · V2Chip (§4-G3) ───────────────────────────────────────────────── */

describe("V2Chip — brandSoft(틴트 + 브랜드 테두리)", () => {
  const chip = (props: Record<string, unknown>) =>
    render(V2Chip, { label: "질문·상담", ...props } as never)

  it("선택되면 연한 면 + 1px 브랜드 테두리 + 브랜드 글자", () => {
    const selected = chip({ tone: "brandSoft", selected: true, size: "s" })
    const style = styleOf(selected)
    expect(style.backgroundColor).toBe(light.primary.primaryWeak)
    expect(style.borderWidth).toBe(borderWidth.thin)
    expect(style.borderColor).toBe(light.primary.primary)

    const label = findOne(selected, "Text")
    expect(flatten(label.props.style).color).toBe(light.primary.primary)
  })

  it("테두리가 상자를 키우지 않는다 — 가로 패딩에서 그만큼 뺀다", () => {
    const plain = styleOf(chip({ tone: "brand", selected: true, size: "s" }))
    const bordered = styleOf(
      chip({ tone: "brandSoft", selected: true, size: "s" }),
    )
    const outerOf = (s: Style) =>
      (s.paddingHorizontal as number) + ((s.borderWidth as number) ?? 0)
    expect(outerOf(bordered)).toBe(outerOf(plain))
  })

  it("안 고른 칩은 세 톤이 완전히 같다 — 톤은 **선택**만 말한다", () => {
    const tones = ["brand", "neutral", "brandSoft"] as const
    const [first, ...rest] = tones.map((tone) =>
      styleOf(chip({ tone, selected: false })),
    )
    for (const other of rest) expect(other).toEqual(first)
    expect(first.borderWidth).toBeUndefined()
  })

  it("기존 두 톤의 선택 면은 그대로다(테두리 없음)", () => {
    const brand = styleOf(chip({ tone: "brand", selected: true }))
    expect(brand.backgroundColor).toBe(light.primary.primary)
    expect(brand.borderWidth).toBeUndefined()

    const neutral = styleOf(chip({ tone: "neutral", selected: true }))
    expect(neutral.backgroundColor).toBe(light.label.normal)
    expect(neutral.borderWidth).toBeUndefined()
  })
})

/* ── 0.6 · V2Divider (§4-G4) ────────────────────────────────────────────── */

describe("V2Divider — thick 밴드 높이", () => {
  it("thick 의 기본은 16 이다(기존 9개 사용처)", () => {
    expect(styleOf(render(V2Divider, { variant: "thick" })).height).toBe(16)
  })

  it("size=8 이면 8 — 커뮤니티 섹션 밴드", () => {
    const band = styleOf(render(V2Divider, { variant: "thick", size: 8 }))
    expect(band.height).toBe(8)
    expect(band.backgroundColor).toBe(light.background.lower)
  })

  it("hairline 은 size 와 무관하게 1px 이다", () => {
    const wrap = render(V2Divider, { size: 8 })
    expect(styleOf(childrenOf(wrap)[0] as Element).height).toBe(
      borderWidth.thin,
    )
  })
})

/* ── 0.7 · V2ScreenHeader (§4-G7) ───────────────────────────────────────── */

describe("V2ScreenHeader — 가운데 제목 · 닫기 리딩", () => {
  const header = (props: Record<string, unknown>) =>
    render(V2ScreenHeader, { title: "인기글", onBack: () => {}, ...props })

  /** 바(높이가 있는 행) 안의 직계 자식들 */
  const barChildren = (root: Element) =>
    childrenOf(childrenOf(root)[0] as Element)

  it("기본은 좌측 정렬 — 제목이 리딩 버튼과 같은 줄 컨테이너 안에 있다", () => {
    const root = header({})
    const [left] = barChildren(root)
    const titles = findAll(left as Element, "Text")
    expect(titles).toHaveLength(1)
    expect(titles[0]?.props.children).toBe("인기글")
    // 절대 배치 층은 만들지 않는다.
    expect(walk(root).some((el) => styleOf(el).position === "absolute")).toBe(
      false,
    )
  })

  it("titleAlign=center 는 제목을 바 전체에 걸친 절대 층으로 올린다", () => {
    const root = header({ titleAlign: "center" })
    const [left, ...others] = barChildren(root)
    expect(findAll(left as Element, "Text")).toHaveLength(0)

    const overlay = others.find(
      (el) => styleOf(el).position === "absolute",
    ) as Element
    expect(overlay).toBeDefined()
    const style = styleOf(overlay)
    // 좌우 여백이 대칭이라야 "남는 폭의 가운데" 가 아닌 **바의 가운데**가 된다.
    expect(style.left).toBe(0)
    expect(style.right).toBe(0)
    expect(style.alignItems).toBe("center")
    expect(overlay.props.pointerEvents).toBe("none")
    expect(findOne(overlay, "Text").props.children).toBe("인기글")
  })

  it("가운데 정렬이어도 제목 타이포는 한 벌이다", () => {
    const leading = findOne(header({}), "Text")
    const centered = findOne(header({ titleAlign: "center" }), "Text")
    const typo = (el: Element) => {
      const { color: _color, ...rest } = flatten(el.props.style)
      return rest
    }
    // 선행 여백(좌측 정렬 전용)만 빼면 같은 스타일이어야 한다.
    expect(typo(centered)).toEqual(typo(leading))
    expect(flatten(centered.props.style)).toMatchObject(typography.label.small)
  })

  it("leading=close 는 ✕ 글리프와 닫기 라벨을 쓴다 — 기본은 back", () => {
    const back = findOne(header({}), "Pressable")
    expect(back.props.accessibilityLabel).toBe("action.back")
    expect(findOne(header({}), "V2Icon").props.name).toBe("chevronLeft")

    const close = header({ leading: "close" })
    expect(findOne(close, "Pressable").props.accessibilityLabel).toBe(
      "action.close",
    )
    expect(findOne(close, "V2Icon").props.name).toBe("close")
  })

  it("close 는 OS 관습을 따르지 않는다 — 안드로이드도 같은 ✕", () => {
    expect(findOne(header({ os: "android" }), "V2Icon").props.name).toBe(
      "arrowBack",
    )
    expect(
      findOne(header({ os: "android", leading: "close" }), "V2Icon").props.name,
    ).toBe("close")
  })
})

/* ── 0.8 · V2BottomCTA (§4-G8) ──────────────────────────────────────────── */

describe("V2BottomCTA — 상단 페이드", () => {
  const cta = (props: Record<string, unknown>) =>
    render(V2BottomCTA, {
      primaryLabel: "신고하기",
      onPrimary: () => {},
      ...props,
    })

  it("기본은 페이드 없이 상단 패딩 16 — 오늘의 11개 사용처 그대로", () => {
    const root = cta({})
    expect(styleOf(root).paddingTop).toBe(spacing[16])
    expect(findAll(root, "LinearGradient")).toHaveLength(0)
  })

  it("fade=true 는 상단 패딩 0 + 바 바깥 36pt 그라디언트", () => {
    const root = cta({ fade: true })
    const gradient = findOne(root, "LinearGradient")
    const style = styleOf(gradient)
    expect(style.position).toBe("absolute")
    expect(style.height).toBe(36)
    expect(style.top).toBe(-36) // 레이아웃을 차지하지 않는다 = 바 위쪽 **바깥**
    expect(gradient.props.pointerEvents).toBe("none")

    // 바는 껍데기 안에 있고, 그 상단 패딩은 0 이다.
    const bar = walk(root).find(
      (el) => styleOf(el).paddingHorizontal === spacing[20],
    ) as Element
    expect(styleOf(bar).paddingTop).toBe(0)
  })

  it("페이드 끝점이 'transparent' 가 아니라 같은 배경색의 알파 0 이다", () => {
    for (const next of ["light", "dark"] as const) {
      mockMode = next
      const bg = resolveTheme(next).colors.background.default
      const colors = findOne(cta({ fade: true }), "LinearGradient").props
        .colors as string[]
      // RN 의 transparent 는 투명한 **검정**이라 흰 면으로 사라지면 중간이 회색이 된다.
      expect(colors[0]).not.toBe("transparent")
      expect(colors[0]).toBe(`${bg}00`)
      expect(colors[1]).toBe(bg)
    }
  })

  it("style 은 페이드 유무와 상관없이 가장 바깥 노드에 붙는다", () => {
    const anchored = { position: "absolute", bottom: 0 } as const
    expect(styleOf(cta({ style: anchored }))).toMatchObject(anchored)
    expect(styleOf(cta({ fade: true, style: anchored }))).toMatchObject(
      anchored,
    )
  })
})

/* ── 0.9 · V2ProgressBar (§4-G10) ───────────────────────────────────────── */

describe("V2ProgressBar — 사진 위 흰 fill", () => {
  it("color=static 은 두 모드 모두 흰 fill 이다(트랙은 그대로)", () => {
    for (const next of ["light", "dark"] as const) {
      mockMode = next
      const track = render(V2ProgressBar, {
        value: 40,
        size: "s",
        color: "static",
      })
      const fill = childrenOf(track)[0] as Element
      expect(flatten(fill.props.style).backgroundColor).toBe(
        resolveTheme(next).colors.static.white,
      )
      expect(styleOf(track).backgroundColor).toBe(
        resolveTheme(next).colors.fill.normal,
      )
    }
  })

  it("기본 brand 는 그대로 브랜드색이다", () => {
    const bar = render(V2ProgressBar, { value: 40 })
    expect(
      flatten((childrenOf(bar)[0] as Element).props.style).backgroundColor,
    ).toBe(light.primary.primary)
  })
})

/* ── 0.10 · V2EmptyState (§4-G11) ───────────────────────────────────────── */

describe("V2EmptyState — 조용한 빈상태", () => {
  const empty = (props: Record<string, unknown>) =>
    render(V2EmptyState, {
      surface: "community_feed",
      title: "아직 댓글이 없어요",
      ...props,
    } as never)

  it("기본(loud)은 20 Bold 제목 + 17 설명, 스택 간격 12", () => {
    const root = empty({ description: "첫 댓글을 남겨 보세요" })
    expect(styleOf(root).gap).toBe(spacing[12])

    const [title, description] = findAll(root, "Text")
    expect(flatten(title?.props.style)).toMatchObject(typography.title.small)
    expect(flatten(description?.props.style)).toMatchObject(
      typography.body.mediumWeak,
    )
    expect(flatten(description?.props.style).color).toBe(light.label.neutral)
  })

  it("quiet 는 제목이 없고, 설명이 15 Medium 한 덩어리다 — 색은 loud 와 같다", () => {
    const root = empty({
      tone: "quiet",
      title: undefined,
      description: "아직 댓글이 없어요",
    })
    const texts = findAll(root, "Text")
    expect(texts).toHaveLength(1)
    expect(flatten(texts[0]?.props.style)).toMatchObject(
      typography.label.smallWeak,
    )
    /*
      **조용한 것과 안 보이는 것은 다르다.** `label.assistive` 는 라이트의 어떤 면
      위에서도 1.7:1 이라(흰 면 1.68 · 앱 바닥 1.66) 스토리 빈 레일의 한 줄이 통째로
      사라져 있었다(2026-08-21 사용자 지적). 색은 `loud` 와 같은 `label.neutral` 로
      올리고 — 목소리 크기는 색이 아니라 **크기·굵기·제목 유무**가 말한다.
      바로 아래 `label.smallWeak`(15 Medium) 단언과 제목 0개가 그 축이다.
    */
    expect(flatten(texts[0]?.props.style).color).toBe(light.label.neutral)
    expect(styleOf(root).gap).toBe(spacing[16])
  })

  it("illustration 은 40px 아이콘 캡을 우회한다 — V2Icon 자리를 대신 차지한다", () => {
    const drawing = { type: "Illustration", props: {} }
    const root = empty({
      tone: "quiet",
      title: undefined,
      icon: "chat",
      illustration: drawing,
      description: "아직 댓글이 없어요",
    })
    expect(findAll(root, "V2Icon")).toHaveLength(0)
    expect(findAll(root, "Illustration")).toHaveLength(1)
  })

  it("icon 만 주면 예전처럼 2xl(40) 아이콘이다", () => {
    const icon = findOne(empty({ icon: "chat" }), "V2Icon")
    expect(icon.props.size).toBe("2xl")
    expect(icon.props.color).toBe(light.label.assistive)
  })
})
