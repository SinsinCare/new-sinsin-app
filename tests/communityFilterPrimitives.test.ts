/**
 * 커뮤니티 재디자인의 **필터·정렬·액션 표면** 계약 — `CategoryChipRail` · `SortDropdown`
 * · `CommunityActionSheet`.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.5 · §2.6 · §2.17 · §5.8
 * · 판정 `01-DECISIONS.md` **D3** · **D11** · **D13**.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 왜 소스 문자열이 아니라 컴포넌트를 **호출**하나
 *
 * 이 저장소의 jest 에는 렌더러가 없다. 그래서 흔히 쓰던 두 수법이 아무것도 보증하지 못한다
 * (`v2CommunityGaps.test.ts` 머리말): 로직을 테스트에 다시 쓰면 **사본**을 시험한 것이고,
 * 소스를 grep 하면 **주석이 계약을 대신 만족**시킨다. 여기서는 함수 컴포넌트를 그대로 불러
 * 돌려받은 엘리먼트 트리를 읽는다 — 스타일 계산은 컴포넌트 자신의 것이다.
 * 치수·색·타이포는 토큰에서 읽어와 비교하므로 토큰이 바뀌면 같이 따라간다.
 *
 * ■ 이 파일이 지키는 것 중 가장 중요한 넷
 *
 *  1. **D11 — 칩은 선택해도 굵기가 안 바뀐다.** 굵기가 바뀌면 칩 폭이 바뀌고 가로 레일이
 *     통째로 밀린다. `V2Chip` 을 그냥 쓰면 조용히 깨지는 자리라 **두 상태의 타이포 토큰이
 *     같은지**를 직접 묻는다.
 *  2. **레일 총 높이 64 / 52 가 하단 1px 을 포함한다.** Yoga 는 테두리를 상자 높이에
 *     넣으므로(D13·D17 과 같은 산술) 패딩으로 쌓으면 1px 씩 밀린다.
 *  3. **앵커는 재서 넘긴다.** 실측 두 자리(필 하단 +8 · 정렬바 top+40)가 한 식에서 나온다 —
 *     상수로 박으면 스크롤된 화면에서 카드가 엉뚱한 곳에 뜬다.
 *  4. **D3 — 액션 시트에는 브랜드 강조가 없다.** 시안이 `관심없음`·`수정하기` 를 강조로
 *     그렸고 §2.17 이 그걸 뒤집었다. `selected` 가 다시 켜지면 판정이 사라진다.
 */
/* eslint-disable import/first -- RN·네이티브 의존을 모듈 로드 **전에** 갈아 끼워야 한다. */

// react-native 는 Flow 원본이라 이 프리셋에서 파싱이 안 된다(tests/helpers/reactNativeStub.js).
// 호스트 컴포넌트는 **문자열 태그**다 — 흉내 낸 구현을 두면 "렌더러 없이 렌더한" 셈이 된다.
jest.mock("react-native", () => ({
  Platform: { OS: "ios", select: (spec: Record<string, unknown>) => spec.ios },
  StyleSheet: { create: <T>(styles: T): T => styles },
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
}))
// `V2Menu` 가 안전영역을 들여온다(네이티브 스펙 → ESM). 여기서는 메뉴를 **부르지 않고**
// 프롭만 읽으므로 값은 아무거나면 된다.
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock("react-i18next", () => ({
  // 키를 그대로 돌려준다 — 여기서 보는 것은 "어느 키를 골랐나" 다.
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "ko" } }),
}))
// SVG 를 (전이적으로라도) 들여오면 스위트째로 죽는다 — 아이콘은 태그로 둔다.
jest.mock("@/src/design-system-v2/components/V2Icon", () => ({
  V2Icon: "V2Icon",
}))
/*
  레일이 고정 슬롯 앞의 페이드를 그리면서 `EdgeFade` → `expo-linear-gradient` 를 끌고 온다.
  그 패키지는 `jest.config.ts` 의 `moduleNameMapper` 가 **전역으로** 태그 스텁으로 바꾼다
  (여기 목을 다는 것도 되지만, 이 의존은 전이적이라 스위트마다 잊힌다 — 실제로 그래서
  두 스위트가 로드에 실패했다). 그라디언트 **자신의** 계약은
  `communityTabsAndGradients.test.ts` 가 지킨다 — 여기서는 "그 자리에 선다" 만 본다.
*/
/*
  `V2BottomSheet` 는 gorhom·AppModal·계측을 끌고 온다. 여기서 보고 싶은 것은 "액션 시트가
  **그 시트 계보**를 쓰는가"(§5.8)와 시트에 무엇을 넘기는가지, 시트의 내부 동작이 아니다.
  태그로 바꾸면 `type` 비교가 곧 "그 모듈을 쓴다" 는 뜻이 된다 — 손으로 만든 모달로
  갈아타면 여기서 깨진다.
*/
jest.mock("@/src/design-system-v2/components/V2BottomSheet", () => ({
  V2BottomSheet: "V2BottomSheet",
}))
// `V2BottomCTA` 는 expo-linear-gradient·키보드 훅을 끌고 온다. `fade` 를 넘겼는지만 본다.
jest.mock("@/src/design-system-v2/components/V2BottomCTA", () => ({
  V2BottomCTA: "V2BottomCTA",
}))
jest.mock("@/src/hooks/useAppColorScheme", () => ({
  useAppColorScheme: () => mockMode,
}))
/*
  `SortDropdown` 이 쓰는 훅은 `useRef`(트리거) + `useState`(앵커) 둘이다. 렌더러가 없으므로
  그 두 칸을 대신하고, **재는 쪽**(`measureInWindow`)과 **잰 결과**(`setState`)를 밖에서
  들여다본다. 이게 있어야 "앵커를 상수로 박지 않았다" 를 실제로 확인할 수 있다.
*/
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useRef: () => mockTriggerRef,
  useState: (initial: unknown) => [
    initial === null ? mockAnchor : initial,
    mockSetState,
  ],
}))

let mockMode: "light" | "dark" = "light"
let mockAnchor: unknown = null
let mockMeasured: [number, number, number, number] = [20, 179, 70, 32]
let mockSetStateCalls: unknown[] = []
const mockSetState = (value: unknown) => {
  mockSetStateCalls.push(value)
}
const mockTriggerRef = {
  current: {
    measureInWindow: (
      callback: (x: number, y: number, width: number, height: number) => void,
    ) => callback(...mockMeasured),
  },
}

import { resolveTheme } from "@/src/design-system-v2/theme"
import { V2Chip } from "@/src/design-system-v2/components/V2Chip"
import { V2BottomCTA } from "@/src/design-system-v2/components/V2BottomCTA"
import { V2BottomSheet } from "@/src/design-system-v2/components/V2BottomSheet"
import {
  V2Menu,
  type V2MenuItem,
} from "@/src/design-system-v2/components/V2Menu"
import { V2Option } from "@/src/design-system-v2/components/V2Option"
import { V2Text } from "@/src/design-system-v2/components/V2Text"
import { SHEET_GUTTER } from "@/src/design-system-v2/tokens/layout"
import { radius } from "@/src/design-system-v2/tokens/radius"
import { borderWidth } from "@/src/design-system-v2/tokens/size"
import { spacing } from "@/src/design-system-v2/tokens/spacing"
import { typography } from "@/src/design-system-v2/tokens/typography"
import {
  CHIP_GAP,
  COMMUNITY_GUTTER,
  RAIL_INSET,
  ROW,
} from "@/src/features/recipe/components/community/communityLayout"
import {
  CategoryChipRail,
  CHIP_RAIL_INSET_V,
  categoryChipRailHeight,
} from "@/src/features/recipe/components/community/CategoryChipRail"
import { EdgeFade } from "@/src/features/recipe/components/community/EdgeFade"
import {
  SORT_LABEL_KEYS,
  SORT_MENU_GAP,
  SortDropdown,
  sortMenuAnchor,
} from "@/src/features/recipe/components/community/SortDropdown"
import { CommunityActionSheet } from "@/src/features/recipe/components/community/CommunityActionSheet"

const light = resolveTheme("light").colors
const dark = resolveTheme("dark").colors

/* ── 엘리먼트 트리 읽기 ──────────────────────────────────────────────────── */

type Element = { type: unknown; props: Record<string, unknown> }
type Style = Record<string, unknown>

const isElement = (node: unknown): node is Element =>
  typeof node === "object" && node !== null && "props" in node && "type" in node

/** style 배열/함수/중첩을 RN 과 같은 순서(뒤가 이김)로 편다. falsy 는 무시. */
function flatten(style: unknown, pressed = false): Style {
  if (typeof style === "function") {
    return flatten(
      (style as (s: { pressed: boolean }) => unknown)({ pressed }),
      pressed,
    )
  }
  if (Array.isArray(style)) {
    return style.reduce<Style>(
      (acc, item) => ({ ...acc, ...flatten(item, pressed) }),
      {},
    )
  }
  if (style && typeof style === "object") return { ...(style as Style) }
  return {}
}

const styleOf = (element: Element, pressed = false): Style =>
  flatten(element.props.style, pressed)

function childrenOf(element: Element): Element[] {
  const raw = element.props.children
  const list = Array.isArray(raw) ? raw.flat(Infinity) : [raw]
  return list.filter(isElement)
}

/** 자기 자신 + 자손(프롭 children 을 따라가는 얕은 순회). */
function walk(element: Element): Element[] {
  return childrenOf(element).reduce<Element[]>(
    (acc, child) => [...acc, ...walk(child)],
    [element],
  )
}

const findAll = (root: Element, type: unknown): Element[] =>
  walk(root).filter((el) => el.type === type)

const byTag = (root: Element, tag: string): Element[] =>
  walk(root).filter((el) => el.type === tag)

/** 컴포넌트를 호출해 트리 뿌리를 받는다. 렌더러가 아니라 함수 호출이다. */
const render = <P>(component: (props: P) => unknown, props: P): Element => {
  const out = component(props)
  if (!isElement(out)) throw new Error("엘리먼트를 돌려주지 않았다")
  return out
}

/** 함수 컴포넌트 **엘리먼트**를 그 자리에서 펼친다(익명 내부 컴포넌트를 보기 위해). */
function expand(element: Element): Element {
  if (typeof element.type !== "function")
    throw new Error("함수 컴포넌트가 아니다")
  return render(element.type as (props: unknown) => unknown, element.props)
}

const noop = () => {}

afterEach(() => {
  mockMode = "light"
  mockAnchor = null
  mockMeasured = [20, 179, 70, 32]
  mockSetStateCalls = []
})

/* ══ CategoryChipRail — §2.5 · D11 ═══════════════════════════════════════ */

const CATEGORIES = [
  { key: "question", label: "cat.question" },
  { key: "meal", label: "cat.meal" },
]

const rail = (overrides: Record<string, unknown> = {}) =>
  render(CategoryChipRail, {
    items: CATEGORIES,
    value: null,
    onChange: noop,
    allLabel: "all",
    ...overrides,
  } as never)

/** 레일 안의 칩 엘리먼트(펼치기 전). 첫 번째가 `전체` 다. */
function chipsOf(root: Element): Element[] {
  const scroll = byTag(root, "ScrollView")[0]
  if (!scroll) throw new Error("가로 스크롤이 없다")
  return childrenOf(scroll).filter((el) => typeof el.type === "function")
}

describe("CategoryChipRail — 총 높이는 하단 1px 을 포함한다 (§2.5)", () => {
  it("위·아래 여백 + 칩 32 + 테두리 1 이 실측 64 / 52 를 만든다", () => {
    for (const [density, expected] of [
      ["feed", 64],
      ["results", 52],
    ] as const) {
      const box = styleOf(rail({ density }))
      const measured =
        (box.paddingTop as number) +
        ROW.chip +
        (box.paddingBottom as number) +
        (box.borderBottomWidth as number)

      expect(measured).toBe(expected)
      expect(categoryChipRailHeight(density)).toBe(expected)
      // 칩의 자리(위에서 16 / 10)도 실측 그대로다 — 아래 여백만 테두리를 흡수한다.
      expect(box.paddingTop).toBe(CHIP_RAIL_INSET_V[density])
      expect(box.paddingBottom).toBe(
        CHIP_RAIL_INSET_V[density] - borderWidth.thin,
      )
    }
  })

  it("하단선은 `line.normal` 이고 면은 배경 토큰이다 — 다크도 같은 칸", () => {
    expect(styleOf(rail()).borderBottomColor).toBe(light.line.normal)
    expect(styleOf(rail()).backgroundColor).toBe(light.background.default)

    mockMode = "dark"
    expect(styleOf(rail()).borderBottomColor).toBe(dark.line.normal)
    expect(styleOf(rail()).backgroundColor).toBe(dark.background.default)
  })
})

describe("CategoryChipRail — 인셋과 간격 (§2.5)", () => {
  it("첫 인셋 20 은 `contentContainerStyle` 에만 있고 컨테이너에는 없다", () => {
    const root = rail()
    const scroll = byTag(root, "ScrollView")[0] as Element
    const content = flatten(scroll.props.contentContainerStyle)

    expect(content.paddingHorizontal).toBe(RAIL_INSET)
    expect(RAIL_INSET).toBe(COMMUNITY_GUTTER)
    // 컨테이너 padding 은 오른쪽이 스크롤 끝에서 잘린다(§RAIL_INSET) — 있으면 안 된다.
    const box = styleOf(root)
    expect(box.paddingHorizontal).toBeUndefined()
    expect(box.paddingLeft).toBeUndefined()
  })

  it("칩 간격은 6 — v2 전역 `CHIP_GAP` 8 이 아니다 (§5.2)", () => {
    const scroll = byTag(rail(), "ScrollView")[0] as Element
    expect(flatten(scroll.props.contentContainerStyle).gap).toBe(CHIP_GAP)
    expect(CHIP_GAP).toBe(6)
  })

  it("`전체` 가 맨 앞이고 `value === null` 일 때 켜진다", () => {
    const picked: (string | null)[] = []
    const chips = chipsOf(
      rail({ onChange: (key: string | null) => picked.push(key) }),
    )

    expect(chips).toHaveLength(CATEGORIES.length + 1)
    expect(chips[0]?.props.label).toBe("all")
    expect(chips[0]?.props.selected).toBe(true)
    expect(chips[1]?.props.selected).toBe(false)
    ;(chips[0]?.props.onPress as () => void)()
    expect(picked).toEqual([null])
  })

  it("카테고리를 고르면 그 키가 그대로 올라간다 (`전체` 는 꺼진다)", () => {
    const picked: (string | null)[] = []
    const chips = chipsOf(
      rail({
        value: "question",
        onChange: (key: string | null) => picked.push(key),
      }),
    )

    expect(chips[0]?.props.selected).toBe(false)
    expect(chips[1]?.props.selected).toBe(true)
    ;(chips[1]?.props.onPress as () => void)()
    expect(picked).toEqual(["question"])
  })

  it("검색 결과 레일은 정렬 필을 `leading` 슬롯으로 앞에 세운다", () => {
    const root = rail({
      density: "results",
      leading: render(SortDropdown, {
        options: ["recent"],
        value: "recent",
        onChange: noop,
      } as never),
    })
    const scroll = byTag(root, "ScrollView")[0] as Element
    // 슬롯이 칩보다 **앞**이다 — 실측 §7.2 의 1번 항목.
    expect(childrenOf(scroll)[0]?.type).not.toBe(chipsOf(root)[0]?.type)
  })
})

describe("CategoryChipRail — D11/D27: 선택해도 굵기가 안 바뀐다", () => {
  /** 칩이 실제로 그린 라벨의 **계산된 스타일**. `V2Chip` 은 토큰을 style 로 편다. */
  const labelStyleOf = (chip: Element): Style => {
    const [text] = byTag(expand(chip), "Text")
    if (!text) throw new Error("라벨이 없다")
    return flatten(text.props.style)
  }

  it("사설 칩이 아니라 **`V2Chip`** 이고, 굵기 고정을 켜서 쓴다 (D27)", () => {
    /*
      D11 이 요구하고 D27 이 넣은 프롭이다. 레일이 자기 칩을 그리던 시절에는 같은 그림이
      두 벌이었고, 그런 사본은 언제나 한쪽만 고쳐진다.
    */
    const chips = chipsOf(rail({ value: "question" }))
    expect(chips).toHaveLength(CATEGORIES.length + 1)
    for (const chip of chips) {
      expect(chip.type).toBe(V2Chip)
      expect(chip.props.fixedLabelWeight).toBe(true)
      // 기하가 사설 칩과 같은 값을 내는 가지다(32 · padH 12 · brandSoft 면).
      expect(chip.props.size).toBe("s")
      expect(chip.props.tone).toBe("neutral")
    }
  })

  it("두 상태가 **같은 13 SemiBold** 로 그려진다", () => {
    const chips = chipsOf(rail({ value: "question" }))
    const unselected = labelStyleOf(chips[0] as Element)
    const selected = labelStyleOf(chips[1] as Element)

    expect(selected.fontSize).toBe(13)
    expect(selected.fontFamily).toBe(typography.label.xSmall.fontFamily)
    // 굵기는 face 로만 말한다 — 여기가 갈리면 글자 폭이 갈리고 레일이 통째로 밀린다.
    expect(unselected.fontFamily).toBe(selected.fontFamily)
    expect(unselected.fontSize).toBe(selected.fontSize)
    // `V2Chip` 의 기본 동작(미선택 13 Medium)이 **아니다**.
    expect(typography.label.xSmallWeak.fontFamily).not.toBe(
      typography.label.xSmall.fontFamily,
    )
    expect(unselected.fontFamily).not.toBe(
      typography.label.xSmallWeak.fontFamily,
    )
  })

  it("선택 전후 패딩과 테두리가 같아서 칩 폭이 유지된다", () => {
    const chips = chipsOf(rail({ value: "question" }))
    const unselected = styleOf(expand(chips[0] as Element))
    const selected = styleOf(expand(chips[1] as Element))

    expect(selected.borderWidth).toBeUndefined()
    expect(unselected.borderWidth).toBeUndefined()
    expect(selected.paddingHorizontal).toBe(unselected.paddingHorizontal)
    expect(unselected.paddingHorizontal).toBe(spacing[12])
  })

  it("선택 면은 neutral — 명도 반전으로 상태를 구분한다", () => {
    const chips = chipsOf(rail({ value: "question" }))
    const selected = styleOf(expand(chips[1] as Element))
    const unselected = styleOf(expand(chips[0] as Element))

    expect(selected.backgroundColor).toBe(light.label.normal)
    expect(selected.borderColor).toBeUndefined()
    expect(labelStyleOf(chips[1] as Element).color).toBe(
      light.background.default,
    )

    /*
      ─── 2026-08-21: 시안이 잰 값에서 **의도적으로 갈라졌다** ──────────────────────
      `popular.md` §2.4 는 미선택 칩을 `#70737C @8%`(= `fill.normal`)로 재어 두었고
      이 줄은 그 값을 물고 있었다. 그런데 그 8% 는 흰 고정 헤더 위에서 ΔL* **3.79** 라
      알약이 보이지 않는다 — 같은 시안 §2.4 가 요구하는 "미선택도 알약으로 보인다"
      (`전체` 가 언제나 켜져 있어야 한다는 D11 의 전제)와 실제로 충돌한다.

      역할을 가른 칸(`fill.control`, 15% · ΔL* 7.28)으로 옮겼다. **같은 칩**이다 —
      시안이 잰 칩과 우리가 옮긴 칩이 하나이므로 여기서 토큰 이름을 갈아야 하고,
      값을 되돌리면 3.79 로 조용히 되돌아간다. 선택 칩과의 구분은 나빠지지 않는다
      (`brandSoft` 선택 면이 **더 밝아서** 명도차가 1.84 → 5.33 으로 벌어졌다 —
      계산은 `lightContrastAudit` §7). 그래서 아래 두 줄을 같이 못 박는다.
    */
    expect(unselected.backgroundColor).toBe(light.fill.control)
    expect(light.fill.control).not.toBe(light.fill.normal)
    expect(labelStyleOf(chips[0] as Element).color).toBe(light.label.neutral)
  })

  it("칩 높이는 32(`controlHeight.sm`)이고 알약이다", () => {
    const chip = styleOf(expand(chipsOf(rail())[1] as Element))
    expect(chip.height).toBe(ROW.chip)
    expect(ROW.chip).toBe(32)
    expect(chip.borderRadius).toBe(radius.full)
  })
})

/* ══ CategoryChipRail — 오른쪽 고정 슬롯(피드 필터 바) ═══════════════════ */

describe("CategoryChipRail — `trailing` 은 칩과 같이 흘러가지 않는다", () => {
  /** 피드(S1)의 필터 바 그대로: 52 레일 + 오른쪽에 붙박인 정렬 필. */
  const bar = (overrides: Record<string, unknown> = {}) =>
    rail({
      density: "results",
      trailing: render(SortDropdown, {
        options: ["recent", "views", "popular"],
        value: "recent",
        onChange: noop,
      } as never),
      ...overrides,
    })

  const scrollOf = (root: Element): Element => {
    const [scroll] = byTag(root, "ScrollView")
    if (!scroll) throw new Error("가로 스크롤이 없다")
    return scroll
  }

  it("`leading` 과 달리 **스크롤 밖**이다 — 필을 찾으러 끝까지 밀 필요가 없다", () => {
    const root = bar()
    /*
      칩은 아직 펼치지 않은 `V2Chip` 엘리먼트라 트리에 `Pressable` 태그가 없다. 즉
      스크롤 안에서 보이는 `Pressable` 은 **정렬 필의 트리거뿐**이다 — 0이어야 한다.
      (`leading` 으로 넘겼다면 여기서 1이 된다. 그것이 검색 결과 헤더의 배치다.)
    */
    expect(byTag(scrollOf(root), "Pressable")).toEqual([])
    // 그런데 레일 어딘가에는 있다 — 스크롤 **밖** 형제로.
    expect(byTag(root, "Pressable")).toHaveLength(1)
  })

  it("레일이 가로로 눕고 스크롤 영역이 남은 폭을 갖는다", () => {
    const root = bar()
    expect(styleOf(root).flexDirection).toBe("row")

    // 스크롤을 감싼 상자가 `flex: 1` — 이게 없으면 칩이 필을 밀어낸다.
    const [scrollBox] = walk(root).filter((el) =>
      childrenOf(el).some((child) => child.type === "ScrollView"),
    )
    expect(styleOf(scrollBox as Element).flex).toBe(1)
  })

  it("고정 슬롯 앞에 **페이드**가 선다 — 잘린 칩이 필에 부딪혀 보이지 않게", () => {
    const [fade] = findAll(bar(), EdgeFade)
    expect(fade).toBeTruthy()
    expect(fade?.props.placement).toBe("leftOfBar")
  })

  it("페이드는 스크롤 영역 **안**이다 — 패딩 있는 상자 위에 얹으면 어긋난다", () => {
    const root = bar()
    const [scrollBox] = walk(root).filter((el) =>
      childrenOf(el).some((child) => child.type === "ScrollView"),
    )
    // `EdgeFade` 는 절대 배치라 기준 상자에 패딩이 있으면 그만큼 밀린다(그 파일 §함정 2).
    expect(styleOf(scrollBox as Element).paddingHorizontal).toBeUndefined()
    expect(findAll(scrollBox as Element, EdgeFade)).toHaveLength(1)
  })

  it("`trailing` 이 없으면 페이드도 없다 — 가릴 것이 없는 자리에 띠만 남는다", () => {
    expect(findAll(rail(), EdgeFade)).toEqual([])
    expect(findAll(rail({ density: "results" }), EdgeFade)).toEqual([])
  })

  it("고정 슬롯의 오른쪽 인셋은 거터 20 이다", () => {
    const root = bar()
    const [slot] = walk(root).filter(
      (el) => (styleOf(el).paddingRight as number) === COMMUNITY_GUTTER,
    )
    expect(slot).toBeTruthy()
    expect(COMMUNITY_GUTTER).toBe(20)
  })
})

/* ══ SortDropdown — §2.6 · D3 ════════════════════════════════════════════ */

const sort = (overrides: Record<string, unknown> = {}) =>
  render(SortDropdown, {
    options: ["recent", "views", "popular"],
    value: "recent",
    onChange: noop,
    ...overrides,
  } as never)

/** 프래그먼트(`pill`)든 바든 트리거 `Pressable` 하나를 집는다. */
function triggerOf(root: Element): Element {
  const pressables = byTag(root, "Pressable")
  const [first] = pressables
  if (!first) throw new Error("트리거가 없다")
  return first
}

describe("sortMenuAnchor — 실측 두 앵커가 한 식에서 나온다 (§2.6)", () => {
  it("필: 하단 +8 · 좌변 정렬 → search.md §7.4 의 카드 top 219", () => {
    // 필 rel y 179..211 (32 높이), 좌 20.
    expect(sortMenuAnchor({ x: 20, y: 179, height: 32 })).toEqual({
      top: 219,
      left: 20,
    })
    // 필은 칩 레일 안에서 스크롤한다 — 좌변이 거터 20 에 고정이라고 보면 안 된다.
    expect(sortMenuAnchor({ x: 96, y: 179, height: 32 })).toEqual({
      top: 219,
      left: 96,
    })
  })

  it("정렬 바: 트리거(라인박스 16)가 48 바의 중앙 → post-detail.md §2.7 의 608", () => {
    // 바 568..616 안에서 16 짜리 트리거는 584..600 이고, +8 이 608 = 바 top + 40 이다.
    const barTop = 568
    const triggerHeight = typography.label.xSmallWeak.lineHeight
    const triggerY = barTop + (ROW.sortBar - triggerHeight) / 2

    expect(
      sortMenuAnchor({ x: 20, y: triggerY, height: triggerHeight }),
    ).toEqual({ top: barTop + 40, left: 20 })
    expect(SORT_MENU_GAP).toBe(8)
  })
})

describe("SortDropdown — 앵커를 상수로 박지 않는다", () => {
  it("누르면 트리거를 **윈도 좌표로 재서** 앵커를 만든다", () => {
    mockMeasured = [20, 300, 70, 32]
    const trigger = triggerOf(sort())
    ;(trigger.props.onPress as () => void)()

    // 화면이 스크롤되면 y 가 달라진다 — 잰 값이 그대로 식에 들어가야 한다.
    expect(mockSetStateCalls).toEqual([{ top: 340, left: 20 }])
  })

  it("앵커가 없으면 메뉴 자체가 트리에 없다 — (0,0) 에 뜨는 한 프레임이 없다", () => {
    expect(findAll(sort(), V2Menu)).toEqual([])
  })
})

describe("SortDropdown — 메뉴에 무엇을 넘기나 (§2.6 · D3)", () => {
  const openMenu = (overrides: Record<string, unknown> = {}) => {
    mockAnchor = { top: 219, left: 20 }
    const [menu] = findAll(sort(overrides), V2Menu)
    if (!menu) throw new Error("메뉴가 없다")
    return menu
  }

  it("잰 앵커를 그대로 넘기고 열린 상태로 그린다", () => {
    const menu = openMenu()
    expect(menu.props.anchor).toEqual({ top: 219, left: 20 })
    expect(menu.props.visible).toBe(true)
  })

  it("항목은 준 순서 그대로이고 카피는 정렬 키에서 온다", () => {
    const chosen: string[] = []
    const menu = openMenu({ onChange: (v: string) => chosen.push(v) })
    const items = menu.props.items as V2MenuItem[]

    expect(items.map((item) => item.key)).toEqual([
      "recent",
      "views",
      "popular",
    ])
    expect(items.map((item) => item.label)).toEqual([
      SORT_LABEL_KEYS.recent,
      SORT_LABEL_KEYS.views,
      SORT_LABEL_KEYS.popular,
    ])

    items[1]?.onSelect()
    expect(chosen).toEqual(["views"])
  })

  it("댓글 정렬은 두 항목만 받는다 (§2.6 옵션 카피)", () => {
    const menu = openMenu({ options: ["recent", "popular"], variant: "bar" })
    expect((menu.props.items as V2MenuItem[]).map((i) => i.key)).toEqual([
      "recent",
      "popular",
    ])
  })

  it("D3 — 항목은 `{key,label,onSelect}` 뿐이다(톤·아이콘·체크 없음)", () => {
    const items = openMenu().props.items as V2MenuItem[]
    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual(["key", "label", "onSelect"])
    }
  })
})

describe("SortDropdown — 트리거 두 모양 (§2.6)", () => {
  it("필: 32 · 알약 · **테두리 없는 `fill.normal` 면** · padL12/gap6/padR8", () => {
    const pill = styleOf(triggerOf(sort()))

    expect(pill.height).toBe(ROW.chip)
    expect(pill.borderRadius).toBe(radius.full)
    /*
      ─── 이 줄은 **테두리를 요구하고 있었다** (2026-08-21에 뒤집었다) ─────────────
      `borderWidth: borderWidth.thin` + `borderColor: line.neutral` 을 단언하던 자리다.
      실기기에서 "최신순이 보더 때문인지 왼쪽 다른 탭들과 높이가 잘라 보이고" — 필은
      칩과 **같은 32pt** 인데도 다른 평면으로 읽혔다. 딱딱한 실선 경계와 부드러운 채운
      면은 같은 높이여도 눈에 다르게 앉는다(다크에서 특히).
      그리고 `V2Chip` 머리말이 이미 정해 둔 규칙이기도 하다 — "`brand`·`neutral` 은
      테두리가 없다. 앱 전체가 보더리스이고, 옅은 회색 면이 곧 경계다."
      즉 옛 단언은 시스템 위반을 박제하고 있었다.
    */
    expect(pill.borderWidth).toBeUndefined()
    expect(pill.borderColor).toBeUndefined()
    // 미선택 칩과 **같은 면**이라야 한 줄로 읽힌다. 2026-08-21 에 그 면이
    // `fill.normal` → `fill.control` 로 옮겨 갔고(위 `CategoryChipRail` 절의 근거),
    // 필도 같이 따라갔다 — 안 따라가면 같은 32pt 줄에서 필만 한 단 얕아진다.
    expect(pill.backgroundColor).toBe(light.fill.control)
    expect(styleOf(expand(chipsOf(rail())[1] as Element)).backgroundColor).toBe(
      pill.backgroundColor,
    )

    expect(pill.paddingLeft).toBe(spacing[12])
    expect(pill.paddingRight).toBe(spacing[8])
    expect(pill.gap).toBe(spacing[6])
    // 폭은 카피가 정한다 — 70 을 박으면 `조회순`·en 에서 잘린다.
    expect(pill.width).toBeUndefined()
  })

  it("필과 칩은 **같은 높이**다 — 한 줄에 나란히 앉는 이유", () => {
    expect(styleOf(triggerOf(sort())).height).toBe(
      styleOf(expand(chipsOf(rail())[1] as Element)).height,
    )
  })

  it("바: 48(하단선 포함) · 다른 행과 같은 `line.normal` · 좌우 20", () => {
    const bar = styleOf(sort({ variant: "bar" }))

    expect(bar.height).toBe(ROW.sortBar)
    expect(ROW.sortBar).toBe(48)
    expect(bar.borderBottomWidth).toBe(borderWidth.thin)
    // 모든 커뮤니티 경계는 normal 톤의 1pt 선으로 맞춘다.
    expect(bar.borderBottomColor).toBe(light.line.normal)
    expect(bar.borderBottomColor).not.toBe(light.line.alternative)
    expect(bar.paddingHorizontal).toBe(COMMUNITY_GUTTER)
    // 트리거는 테두리 없는 텍스트 형이다.
    expect(
      styleOf(triggerOf(sort({ variant: "bar" }))).borderWidth,
    ).toBeUndefined()
  })

  it("라벨 13 Medium · 우측 액션 12 Regular (§5.4 — 1px 작다)", () => {
    const root = sort({
      variant: "bar",
      trailing: { label: "toLast", onPress: noop },
    })
    const [label, trailing] = findAll(root, V2Text)

    expect(label?.props.token).toBe("label.xSmallWeak")
    expect(trailing?.props.token).toBe("subtext.small")
    expect(typography.subtext.small.fontSize).toBe(
      typography.label.xSmallWeak.fontSize - 1,
    )
  })

  it("우측 액션은 안 주면 안 그린다", () => {
    expect(byTag(sort({ variant: "bar" }), "Pressable")).toHaveLength(1)
  })
})

/* ══ CommunityActionSheet — §2.17 · §5.8 · D3 ════════════════════════════ */

const ACTIONS = [
  { key: "edit", label: "act.edit", onPress: noop },
  { key: "delete", label: "act.delete", onPress: noop },
]

const sheet = (overrides: Record<string, unknown> = {}) =>
  render(CommunityActionSheet, {
    surface: "community_post",
    visible: true,
    onClose: noop,
    actions: ACTIONS,
    ...overrides,
  } as never)

describe("CommunityActionSheet — 시트 계보와 푸터 (§5.8 · §2.17)", () => {
  it("`V2BottomSheet` 계보를 그대로 쓴다(플로팅 카드로 포크하지 않는다)", () => {
    const root = sheet()
    expect(root.type).toBe(V2BottomSheet)
    expect(root.props.surface).toBe("community_post")
    expect(root.props.visible).toBe(true)
  })

  it("푸터는 `V2BottomCTA` 의 **fade** 이고 카피는 `action.cancel` 이다", () => {
    const footer = sheet().props.footer as Element
    expect(footer.type).toBe(V2BottomCTA)
    // 36pt 페이드가 "옵션이 CTA 밑으로 지나간다" 를 말한다(§2.17 상단 페이드).
    expect(footer.props.fade).toBe(true)
    expect(footer.props.primaryLabel).toBe("action.cancel")
  })

  it("취소 CTA 는 시트를 닫는다", () => {
    const closed: string[] = []
    const footer = sheet({ onClose: () => closed.push("close") }).props
      .footer as Element
    ;(footer.props.onPrimary as () => void)()
    expect(closed).toEqual(["close"])
  })
})

describe("CommunityActionSheet — 옵션 (§2.17 · D3)", () => {
  const optionsOf = (root: Element) => findAll(root, V2Option)

  it("D3/§2.17 — 어떤 옵션도 브랜드 강조를 갖지 않는다", () => {
    const options = optionsOf(sheet())
    expect(options).toHaveLength(ACTIONS.length)
    for (const option of options) expect(option.props.selected).toBe(false)

    // 강조를 안 준 결과가 실제로 중립 면인지까지 본다(`V2Option` 을 진짜로 부른다).
    const face = styleOf(expand(options[0] as Element))
    expect(face.backgroundColor).toBe(light.fill.background)
    expect(face.backgroundColor).not.toBe(light.primary.primaryWeak)
    expect(face.borderColor).toBe("transparent")
  })

  it("파괴적/중립을 가르는 축이 아예 없다 — 항목은 `{key,label,onPress}` 뿐", () => {
    for (const action of ACTIONS) {
      expect(Object.keys(action).sort()).toEqual(["key", "label", "onPress"])
    }
    for (const option of optionsOf(sheet())) {
      expect(option.props.description).toBeUndefined()
      expect(option.props.leadingIcon).toBeUndefined()
      expect(option.props.trailing).toBeUndefined()
    }
  })

  it("고르면 액션이 먼저, 그 다음 닫힘 (`V2Menu` 와 같은 순서)", () => {
    const log: string[] = []
    const root = sheet({
      actions: [
        { key: "report", label: "act.report", onPress: () => log.push("act") },
      ],
      onClose: () => log.push("close"),
    })
    ;(optionsOf(root)[0]?.props.onPress as () => void)()
    expect(log).toEqual(["act", "close"])
  })

  it("옵션 목록은 시트 여백 24 · 사이 16", () => {
    const list = childrenOf(sheet())[0] as Element
    const box = styleOf(list)
    expect(box.paddingHorizontal).toBe(SHEET_GUTTER)
    expect(SHEET_GUTTER).toBe(24)
    expect(box.gap).toBe(spacing[16])
  })

  it("D13 — `V2Option` 의 실제 높이는 55 가 아니라 57 이다", () => {
    // 화면에서 55 를 기대하지 말 것: Yoga 는 테두리를 상자 높이에 넣는다.
    const face = styleOf(expand(optionsOf(sheet())[0] as Element))
    const height =
      (face.paddingVertical as number) * 2 +
      typography.title.xSmall.lineHeight +
      (face.borderWidth as number) * 2

    expect(height).toBe(57)
  })
})
