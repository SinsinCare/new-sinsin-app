/**
 * `V2Menu`(§4-G5 · §2.6) — 앵커드 팝오버의 계약.
 *
 * ## 어떻게 보나
 *
 * 이 저장소의 jest 에는 렌더러가 없다(`tests/helpers/hookHarness.ts` 머리말). 그래서
 * **함수 컴포넌트를 그대로 호출해 돌려받은 엘리먼트 트리를 읽는다**(같은 수법:
 * `tests/v2CommunityGaps.test.ts`). 소스에 문자열이 있는지 훑는 검사는 하지 않는다 —
 * "쓰여 있다" 가 "그려진다" 를 뜻하지 않고, 주석이 계약을 대신 만족시킨다(`codeOnly` 머리말).
 * 치수·색은 토큰에서 읽어 비교하므로 토큰이 바뀌면 같이 따라간다.
 *
 * ## 여기서 지키는 것
 *
 * 1. **표면 선택** — RN Modal 이 아니라 루트 포털 층으로 올라간다. 이것이 이 컴포넌트가
 *    `ModalOverlayHost` 규칙에 걸리지 않는 이유이므로, 모달로 되돌아가면 이 파일이 깨진다.
 * 2. **딤 없음 · 바깥 탭 닫힘** — 막에 색이 없고, 카드는 막의 **형제**다(자식이면 카드
 *    여백을 누른 탭이 막까지 올라가 메뉴가 닫힌다).
 * 3. **클램프** — 앵커가 화면 밖을 가리켜도 카드는 안전영역 안에 남는다.
 * 4. **D3** — 파괴적 쓰임을 부르는 어포던스가 없다(항목에 톤·아이콘·체크가 없다).
 */
/* eslint-disable import/first -- RN 의존을 모듈 로드 **전에** 갈아 끼워야 한다. */

// react-native 는 Flow 원본이라 이 프리셋에서 파싱이 안 된다(tests/helpers/reactNativeStub.js).
// 호스트 컴포넌트는 **문자열 태그**로 둔다 — 흉내 낸 구현을 두면 "렌더러 없이 렌더한" 셈이다.
jest.mock("react-native", () => ({
  Platform: { OS: "ios", select: (spec: Record<string, unknown>) => spec.ios },
  StyleSheet: {
    create: <T>(styles: T): T => styles,
    absoluteFill: {
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
  useWindowDimensions: () => mockWindow,
  BackHandler: {
    addEventListener: (event: string, handler: () => boolean) => {
      mockBackRegistrations.push({ event, handler })
      return {
        remove: () => {
          mockBackRemovals.push(handler)
        },
      }
    },
  },
}))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => mockInsets,
}))
jest.mock("react-i18next", () => ({
  // 키를 그대로 돌려준다 — 여기서 보는 것은 "어느 키를 골랐나" 다.
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/src/hooks/useAppColorScheme", () => ({
  useAppColorScheme: () => mockMode,
}))
// 이 컴포넌트가 쓰는 훅은 `useEffect` 하나(뒤로가기 구독)다. 렌더러가 없으므로 그것만
// 대신한다 — 정리 함수는 모아 뒀다가 테스트가 직접 부른다(언마운트 흉내).
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useEffect: (fn: () => void | (() => void)) => {
    const cleanup = fn()
    if (typeof cleanup === "function") mockEffectCleanups.push(cleanup)
  },
}))

let mockMode: "light" | "dark" = "light"
let mockWindow = { width: 375, height: 812 }
let mockInsets = { top: 59, bottom: 34, left: 0, right: 0 }
let mockBackRegistrations: { event: string; handler: () => boolean }[] = []
let mockBackRemovals: (() => boolean)[] = []
let mockEffectCleanups: (() => void)[] = []

import { resolveTheme } from "@/src/design-system-v2/theme"
import {
  borderWidth,
  elevation,
  radius,
  spacing,
  typography,
} from "@/src/design-system-v2/tokens"
import {
  V2Menu,
  V2_MENU_ITEM_HEIGHT,
  V2_MENU_WIDTH,
  resolveV2MenuPosition,
  v2MenuHeight,
  type V2MenuItem,
  type V2MenuProps,
} from "@/src/design-system-v2/components/V2Menu"
import { Portal } from "@/src/shared/components/Portal"

const light = resolveTheme("light").colors
const dark = resolveTheme("dark").colors

/* ── 엘리먼트 트리 읽기 ──────────────────────────────────────────────────── */

type Element = { type: unknown; props: Record<string, unknown> }
type Style = Record<string, unknown>

const isElement = (node: unknown): node is Element =>
  typeof node === "object" && node !== null && "props" in node && "type" in node

/** style 배열/함수/중첩을 RN 과 같은 순서(뒤가 이김)로 편다. */
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

/** 트리 전체(자기 자신 포함)를 훑는다. */
function walk(element: Element): Element[] {
  return childrenOf(element).reduce<Element[]>(
    (acc, child) => [...acc, ...walk(child)],
    [element],
  )
}

const byRole = (root: Element, role: string): Element[] =>
  walk(root).filter((el) => el.props.accessibilityRole === role)

const oneByRole = (root: Element, role: string): Element => {
  const [first, ...rest] = byRole(root, role)
  if (!first) throw new Error(`트리에 role=${role} 가 없다`)
  if (rest.length > 0) throw new Error(`role=${role} 가 여러 개다`)
  return first
}

/** 컴포넌트를 호출해 트리 뿌리를 받는다. 렌더러가 아니라 함수 호출이다. */
const render = <P>(component: (props: P) => unknown, props: P): Element => {
  const out = component(props)
  if (!isElement(out)) throw new Error("엘리먼트를 돌려주지 않았다")
  return out
}

/* ── 픽스처 ─────────────────────────────────────────────────────────────── */

const noop = () => {}

const sortItems = (log: string[] = []): V2MenuItem[] => [
  { key: "recent", label: "최신순", onSelect: () => log.push("recent") },
  { key: "views", label: "조회순", onSelect: () => log.push("views") },
  { key: "popular", label: "인기순", onSelect: () => log.push("popular") },
]

const menuProps = (overrides: Partial<V2MenuProps> = {}): V2MenuProps => ({
  visible: true,
  anchor: { top: 200, left: 20 },
  items: sortItems(),
  onClose: noop,
  ...overrides,
})

/** 포털 밖 껍데기를 벗겨 오버레이 뿌리를 준다. */
function open(overrides: Partial<V2MenuProps> = {}) {
  const root = render(V2Menu, menuProps(overrides))
  const overlay = childrenOf(root)[0]
  if (!overlay) throw new Error("오버레이가 없다")
  return { root, overlay }
}

afterEach(() => {
  mockMode = "light"
  mockWindow = { width: 375, height: 812 }
  mockInsets = { top: 59, bottom: 34, left: 0, right: 0 }
  mockBackRegistrations = []
  mockBackRemovals = []
  mockEffectCleanups = []
})

/* ── 표면 선택 ──────────────────────────────────────────────────────────── */

describe("V2Menu — 어느 표면에 뜨나", () => {
  it("RN Modal 이 아니라 루트 포털 층으로 올라간다", () => {
    const root = render(V2Menu, menuProps())

    // 이 한 줄이 "ModalOverlayHost 규칙에 걸리지 않는다" 의 근거다. 네이티브 모달
    // 경계를 만들지 않으므로 루트 토스트·확인창이 그대로 위에 선다.
    expect(root.type).toBe(Portal)

    const modalish = walk(root).filter((el) => {
      const name =
        typeof el.type === "function"
          ? ((el.type as { name?: string }).name ?? "")
          : String(el.type)
      return /modal/iu.test(name)
    })
    expect(modalish).toEqual([])
  })

  it("숨기면 아무것도 그리지 않는다 — 빈 항목도 마찬가지", () => {
    expect(V2Menu(menuProps({ visible: false }))).toBeNull()
    expect(V2Menu(menuProps({ items: [] }))).toBeNull()
  })
})

/* ── 카드 기하 (§2.6) ───────────────────────────────────────────────────── */

describe("V2Menu — 카드", () => {
  it("폭 180 · r12 · 1px line.neutral · background.default · elevation[3]", () => {
    const { overlay } = open()
    const card = styleOf(oneByRole(overlay, "menu"))

    expect(card.width).toBe(V2_MENU_WIDTH)
    expect(card.width).toBe(180)
    expect(card.borderRadius).toBe(radius.lg)
    expect(card.borderWidth).toBe(borderWidth.thin)
    expect(card.borderColor).toBe(light.line.neutral)
    expect(card.backgroundColor).toBe(light.background.default)
    expect(card.paddingVertical).toBe(spacing[10])
    // 딤 없이 뜨는 표면이라 배경과의 분리를 그림자만 한다(§4-G6).
    expect(card).toMatchObject(elevation[3])
  })

  it("높이는 10 + n×44 + 10 — 3항목 메뉴는 정렬 스펙의 108(2항목)과 같은 식이다", () => {
    const { overlay } = open()
    const card = styleOf(oneByRole(overlay, "menu"))
    const rows = byRole(overlay, "menuitem")
    const rowHeight = styleOf(rows[0] as Element).height as number

    // 카드에 명시 높이가 없다 — 패딩 + 행이 만든 높이여야 한다.
    expect(card.height).toBeUndefined()
    const measured =
      (card.paddingVertical as number) * 2 + rows.length * rowHeight
    expect(measured).toBe(v2MenuHeight(rows.length))
    expect(v2MenuHeight(2)).toBe(108)
    expect(v2MenuHeight(3)).toBe(152)
  })

  it("면 색은 토큰에서 온다 — 다크에서도 같은 칸을 읽는다", () => {
    mockMode = "dark"
    const card = styleOf(oneByRole(open().overlay, "menu"))
    expect(card.backgroundColor).toBe(dark.background.default)
    expect(card.borderColor).toBe(dark.line.neutral)
  })
})

/* ── 항목 (§2.6) ────────────────────────────────────────────────────────── */

describe("V2Menu — 항목", () => {
  it("높이 44 · 15 Medium label.neutral · 라벨은 카드 바깥에서 20", () => {
    const { overlay } = open()
    const card = styleOf(oneByRole(overlay, "menu"))
    const row = oneRow(overlay, 0)
    const rowStyle = styleOf(row)

    expect(rowStyle.height).toBe(V2_MENU_ITEM_HEIGHT)
    expect(rowStyle.height).toBe(44)

    const label = childrenOf(row)[0] as Element
    expect(flatten(label.props.style)).toMatchObject(typography.label.smallWeak)
    expect(flatten(label.props.style).color).toBe(light.label.neutral)
    expect(label.props.children).toBe("최신순")

    // 라벨 좌측 인셋 20 은 테두리 + 행 인셋 + 행 패딩의 합이다(§2.6).
    const inset =
      (card.borderWidth as number) +
      (rowStyle.marginHorizontal as number) +
      (rowStyle.paddingLeft as number)
    expect(inset).toBe(spacing[20])
  })

  it("눌림은 174×44 r12 fill.normal — 안 눌렸을 땐 면이 없다", () => {
    const { overlay } = open()
    const card = styleOf(oneByRole(overlay, "menu"))
    const row = oneRow(overlay, 0)

    const idle = styleOf(row)
    expect(idle.backgroundColor).toBeUndefined()

    const pressed = styleOf(row, true)
    expect(pressed.backgroundColor).toBe(light.fill.normal)
    expect(pressed.borderRadius).toBe(radius.lg)
    expect(pressed.height).toBe(44)

    // 폭은 카드 안쪽 폭에서 좌우 인셋을 뺀 값 — 스펙의 174 가 나와야 한다.
    const width =
      (card.width as number) -
      (card.borderWidth as number) * 2 -
      (idle.marginHorizontal as number) * 2
    expect(width).toBe(174)
  })

  it("고르면 onSelect 뒤에 onClose — 선택은 메뉴를 닫는다", () => {
    const log: string[] = []
    const { overlay } = open({
      items: sortItems(log),
      onClose: () => log.push("close"),
    })

    const row = oneRow(overlay, 1)
    ;(row.props.onPress as () => void)()
    expect(log).toEqual(["views", "close"])
  })

  it("onSelect가 실패해도 메뉴는 닫힌다 — 투명 포인터 막을 남기지 않는다", () => {
    const close = jest.fn()
    const { overlay } = open({
      items: [
        {
          key: "broken",
          label: "실패하는 선택",
          onSelect: () => {
            throw new Error("selection failed")
          },
        },
      ],
      onClose: close,
    })

    expect(() => {
      ;(oneRow(overlay, 0).props.onPress as () => void)()
    }).toThrow("selection failed")
    expect(close).toHaveBeenCalledTimes(1)
  })

  it("D3 — 파괴적 어포던스가 없다. 항목에 무엇을 더 얹어도 그림이 같다", () => {
    /*
      01-DECISIONS D3: 이 표면은 비파괴 **선택** 전용이고 수정·삭제·신고는 시트에
      남는다. 그래서 항목이 위험을 표시할 방법 자체를 두지 않는다 — 아래처럼 타입에
      없는 필드를 억지로 넘겨도 렌더가 달라지지 않아야 한다. 달라지는 순간(붉은 톤·
      아이콘·체크) 이 표면은 액션 메뉴로 쓰이기 시작한다.
    */
    const plain = oneRow(open().overlay, 0)
    const decorated = oneRow(
      open({
        items: [
          {
            key: "recent",
            label: "최신순",
            onSelect: noop,
            destructive: true,
            icon: "trash",
            selected: true,
          } as unknown as V2MenuItem,
        ],
      }).overlay,
      0,
    )

    expect(styleOf(decorated)).toEqual(styleOf(plain))
    expect(styleOf(decorated, true)).toEqual(styleOf(plain, true))
    expect(flatten((childrenOf(decorated)[0] as Element).props.style)).toEqual(
      flatten((childrenOf(plain)[0] as Element).props.style),
    )
    // 라벨 하나뿐이다 — 체크마크·아이콘 자리가 없다.
    expect(childrenOf(decorated)).toHaveLength(1)
  })
})

function oneRow(overlay: Element, index: number): Element {
  const row = byRole(overlay, "menuitem")[index]
  if (!row) throw new Error(`${index}번째 menuitem 이 없다`)
  return row
}

/* ── 바깥 막 (§2.6 "딤 없음") ───────────────────────────────────────────── */

describe("V2Menu — 바깥 막", () => {
  it("딤이 아니다 — 막에 색이 없다", () => {
    const scrim = oneByRole(open().overlay, "button")
    const style = styleOf(scrim)
    expect(style.backgroundColor).toBeUndefined()
    expect(style.backgroundColor).not.toBe(light.background.dim)
    expect(style.position).toBe("absolute")
  })

  it("바깥을 누르면 닫힌다", () => {
    let closed = 0
    const scrim = oneByRole(
      open({ onClose: () => (closed += 1) }).overlay,
      "button",
    )
    ;(scrim.props.onPress as () => void)()
    expect(closed).toBe(1)
  })

  it("카드는 막의 **형제**다 — 카드 여백을 눌러도 닫히지 않는다", () => {
    const { overlay } = open()
    const scrim = oneByRole(overlay, "button")
    const card = oneByRole(overlay, "menu")

    // 카드가 막의 자손이면 카드 패딩을 누른 탭이 막의 onPress 까지 올라간다.
    expect(walk(scrim)).not.toContain(card)
    expect(childrenOf(overlay)).toEqual([scrim, card])
  })
})

/* ── 접근성 ─────────────────────────────────────────────────────────────── */

describe("V2Menu — 접근성", () => {
  it("메뉴/메뉴항목 역할과 이름을 붙인다", () => {
    const { overlay } = open({ accessibilityLabel: "정렬 기준" })
    const card = oneByRole(overlay, "menu")

    expect(card.props.accessibilityLabel).toBe("정렬 기준")
    // VoiceOver 가 메뉴 밖으로 새지 않게 한다(딤이 없으니 시각적 가둠도 없다).
    expect(card.props.accessibilityViewIsModal).toBe(true)
    expect(byRole(overlay, "menuitem")).toHaveLength(3)

    // 전면 투명 막은 이름이 없으면 "버튼" 으로만 읽힌다.
    expect(oneByRole(overlay, "button").props.accessibilityLabel).toBe(
      "action.close",
    )
  })

  it("포인터 없이 닫을 수 있다 — iOS 이스케이프 제스처", () => {
    let closed = 0
    const card = oneByRole(
      open({ onClose: () => (closed += 1) }).overlay,
      "menu",
    )
    ;(card.props.onAccessibilityEscape as () => void)()
    expect(closed).toBe(1)
  })

  it("포인터 없이 닫을 수 있다 — 안드로이드 뒤로가기(그리고 뒤로 나가지 않는다)", () => {
    let closed = 0
    render(V2Menu, menuProps({ onClose: () => (closed += 1) }))

    expect(mockBackRegistrations.map((r) => r.event)).toEqual([
      "hardwareBackPress",
    ])
    const handled = mockBackRegistrations[0]?.handler()
    expect(closed).toBe(1)
    // true 를 돌려주지 않으면 메뉴가 닫히면서 화면까지 같이 뒤로 간다.
    expect(handled).toBe(true)
  })

  it("닫힌 메뉴는 뒤로가기를 가로채지 않고, 정리에서 구독을 뗀다", () => {
    V2Menu(menuProps({ visible: false }))
    expect(mockBackRegistrations).toEqual([])

    render(V2Menu, menuProps())
    expect(mockBackRegistrations).toHaveLength(1)
    mockEffectCleanups.forEach((cleanup) => cleanup())
    expect(mockBackRemovals).toEqual([mockBackRegistrations[0]?.handler])
  })
})

/* ── 화면 밖으로 나가지 않는다 ──────────────────────────────────────────── */

describe("V2Menu — 클램프", () => {
  const insets = { top: 59, bottom: 34, left: 0, right: 0 }
  const at = (
    anchor: Parameters<typeof resolveV2MenuPosition>[0]["anchor"],
    itemCount = 3,
    window = { width: 375, height: 812 },
    edges = insets,
  ) =>
    resolveV2MenuPosition({
      anchor,
      itemCount,
      windowWidth: window.width,
      windowHeight: window.height,
      insets: edges,
    })

  it("들어맞는 앵커는 손대지 않는다", () => {
    expect(at({ top: 200, left: 20 })).toEqual({ top: 200, left: 20 })
    // 우변 정렬은 폭만큼 빼서 왼쪽을 낸다(§2.6 행 케밥: 우변 = 화면우 − 40).
    expect(at({ top: 300, right: 375 - 40 })).toEqual({
      top: 300,
      left: 375 - 40 - V2_MENU_WIDTH,
    })
  })

  it("오른쪽으로 넘치면 안으로 끌어당긴다", () => {
    // 340 에서 시작하면 카드 오른끝이 520 — 화면 밖이다.
    expect(at({ top: 200, left: 340 }).left).toBe(
      375 - spacing[8] - V2_MENU_WIDTH,
    )
    expect(
      at({ top: 200, left: 340 }).left + V2_MENU_WIDTH,
    ).toBeLessThanOrEqual(375)
  })

  it("왼쪽으로 넘쳐도 안으로 끌어당긴다 — 우변 앵커가 좁은 화면에서 그렇게 된다", () => {
    expect(at({ top: 200, right: 100 }).left).toBe(spacing[8])
  })

  it("아래로 넘치면 위로 올린다 — 홈 인디케이터를 덮지 않는다", () => {
    const { top } = at({ top: 760, left: 20 })
    expect(top).toBe(812 - 34 - spacing[8] - v2MenuHeight(3))
    expect(top + v2MenuHeight(3)).toBeLessThanOrEqual(812 - 34)
  })

  it("노치·좌우 안전영역을 침범하지 않는다", () => {
    expect(at({ top: 0, left: 20 }).top).toBe(59 + spacing[8])
    // 가로 모드: 좌우 인셋이 생기면 최소·최대가 함께 밀린다.
    const landscape = at(
      { top: 100, left: 0 },
      2,
      { width: 812, height: 375 },
      {
        top: 0,
        bottom: 21,
        left: 59,
        right: 59,
      },
    )
    expect(landscape.left).toBe(59 + spacing[8])
    expect(
      at(
        { top: 100, left: 800 },
        2,
        { width: 812, height: 375 },
        {
          top: 0,
          bottom: 21,
          left: 59,
          right: 59,
        },
      ).left,
    ).toBe(812 - 59 - spacing[8] - V2_MENU_WIDTH)
  })

  it("화면이 카드보다 좁아도 뒤집히지 않는다", () => {
    // 최대가 최소보다 작아지면 클램프가 뒤집혀 음수 left 가 나온다(화면 밖).
    const { left } = at({ top: 100, left: 200 }, 2, { width: 160, height: 400 })
    expect(left).toBe(spacing[8])
  })

  it("컴포넌트가 그 계산을 실제로 쓴다", () => {
    // 계산이 컴포넌트 밖에만 있고 카드가 앵커를 날것으로 쓰면 여기서 갈린다.
    const card = styleOf(
      oneByRole(open({ anchor: { top: 780, left: 340 } }).overlay, "menu"),
    )
    expect({ top: card.top, left: card.left }).toEqual(
      at({ top: 780, left: 340 }),
    )
    expect(card.position).toBe("absolute")
  })
})
