/**
 * **무한 목록의 끝은 이제 말을 한다** — 다섯 번째 꼬리(`"end"`)가 화면까지 도달하는가.
 * 대상: `src/features/recipe/components/EndOfListRow.tsx` ·
 *      `src/features/recipe/views/CommunitySearchScreen.tsx`
 *
 * ─── 왜 이 파일이 따로 필요한가 ─────────────────────────────────────────────
 * 판정(`communityFeedSurfaces`)이 `"end"` 를 돌려주는 것과, 사용자가 그 줄을 **보는 것**은
 * 다른 사실이다. 화면이 그 갈래를 안 그리면 판정은 초록인데 화면은 예전 그대로다 —
 * 이 저장소가 이미 여러 번 겪은 종류의 초록이다.
 *
 * ─── 어떻게 보나 ────────────────────────────────────────────────────────────
 * 렌더러가 없으므로 **화면 함수를 그대로 호출해 엘리먼트 트리를 읽는다**
 * (선례: `communityEmptyStates.test.ts` · `communityFeedSectionWiring.test.ts`).
 * 꼬리는 `ListFooterComponent` **프롭**에 살아서 children 훑기로는 못 닿으므로 그
 * 프롭을 꺼내 거기서부터 펼친다. `EndOfListRow` 는 **모킹하지 않는다** — 문구·접근성
 * 라벨·버튼이 진짜로 붙는지가 이 파일이 볼 것의 절반이다.
 */
/* eslint-disable import/first -- RN·네이티브 의존을 모듈 로드 **전에** 갈아 끼워야 한다. */

jest.mock("react-native", () => {
  const flatten = (style: unknown): Record<string, unknown> => {
    if (Array.isArray(style)) {
      return style.reduce<Record<string, unknown>>(
        (acc, item) => ({ ...acc, ...flatten(item) }),
        {},
      )
    }
    if (style && typeof style === "object")
      return { ...(style as Record<string, unknown>) }
    return {}
  }
  return {
    Platform: {
      OS: "ios",
      select: (spec: Record<string, unknown>) => spec.ios,
    },
    StyleSheet: {
      create: <T>(styles: T): T => styles,
      flatten,
      hairlineWidth: 0.5,
    },
    View: "View",
    Text: "Text",
    Pressable: "Pressable",
    ScrollView: "ScrollView",
    FlatList: "FlatList",
    ActivityIndicator: "ActivityIndicator",
  }
})

/* 렌더러가 없으므로 훅은 초깃값에서 멈춘다. 화면 안의 상태(검색어 확정)는
   `primeState()` 로 순서대로 넣는다 — 선언 순서가 곧 `useState` 호출 순서다. */
let stateQueue: unknown[] = []
let stateCursor = 0
const primeState = (...values: unknown[]) => {
  stateQueue = values
  stateCursor = 0
}

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: (initial: unknown) => {
    const index = stateCursor
    stateCursor += 1
    const value =
      index < stateQueue.length
        ? stateQueue[index]
        : typeof initial === "function"
          ? (initial as () => unknown)()
          : initial
    return [value, () => {}]
  },
  useRef: (initial: unknown) => ({ current: initial }),
  useEffect: () => {},
  useMemo: (factory: () => unknown) => factory(),
  useCallback: (fn: unknown) => fn,
}))

/* 번역은 **앱의 진짜 리소스**로 돈다 — 표를 베껴 두면 카피가 바뀌어도 초록이다. */
jest.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: (namespace?: string) => ({
    t: (key: string) => mockLeaf(namespace, key) ?? key,
    i18n: { language: "ko" },
  }),
}))

jest.mock("@/src/features/analytics", () => ({
  trackAnalyticsEvent: jest.fn(),
}))
jest.mock("@/src/design-system-v2", () => ({
  V2EmptyState: "V2EmptyState",
  V2ErrorState: "V2ErrorState",
  V2LoadingState: "V2LoadingState",
  V2Skeleton: "V2Skeleton",
  V2SkeletonGroup: "V2SkeletonGroup",
}))
jest.mock("@shopify/flash-list", () => ({ FlashList: "FlashList" }))
jest.mock("@expo/vector-icons/Ionicons", () => "Ionicons")
jest.mock("expo-router", () => ({}))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock("@/src/shared/components/AppText", () => ({
  Text: "Text",
  TextInput: "TextInput",
}))
jest.mock("@/src/shared/components/SurfacePressable", () => ({
  SurfacePressable: "SurfacePressable",
}))
jest.mock("@/src/shared/navigation", () => ({ useAppRouter: () => ({}) }))
jest.mock("@/src/hooks/useSurface", () => ({
  useSurface: () => ({
    brand: "#FE7139",
    text: "#333333",
    textMuted: "#888888",
    textStrong: "#111111",
    hairline: "#EEEEEE",
    card: "#FFFFFF",
    surface: "#FFFFFF",
    canvas: "#F7F7F7",
    placeholder: "#AAAAAA",
    isDark: false,
  }),
}))
jest.mock("@/src/lib/haptics", () => ({ hapticSelection: jest.fn() }))
jest.mock("@/src/lib/errorMessage", () => ({
  resolveError: () => ({ title: "문제가 생겼어요", body: "", retryable: true }),
}))
jest.mock("@/src/features/recipe/components/PostListItem", () => ({
  PostListItem: "PostListItem",
}))
jest.mock("@/src/features/settings/hooks/useMyPageProfile", () => ({
  useMyPageProfile: () => ({ data: { nickName: "나" } }),
}))
jest.mock("@/src/features/recipe/hooks/useBlockedUsers", () => ({
  isAuthorBlocked: () => false,
  useBlockedUsers: () => ({
    blockedAuthors: { ids: new Set<number>(), unresolvedNames: new Set() },
  }),
}))
jest.mock("@/src/features/recipe/hooks/useCommunityPostSearch", () => ({
  useCommunityPostSearch: () => mockSearch,
  useCommunityPopularKeywords: () => ({ data: [] }),
}))
jest.mock("@/src/features/recipe/hooks/useCommunityPopularPosts", () => ({
  useCommunityPopularPosts: () => ({ data: [], isLoading: false }),
}))
jest.mock("@/src/features/recipe/hooks/useRecentCommunitySearches", () => ({
  useRecentCommunitySearches: () => ({
    recentSearches: [],
    addRecentSearch: jest.fn(),
    removeRecentSearch: jest.fn(),
    clearRecentSearches: jest.fn(),
  }),
}))

import koCommon from "@/src/i18n/locales/ko/common.json"
import enCommon from "@/src/i18n/locales/en/common.json"
import koRecipe from "@/src/i18n/locales/ko/recipe.json"
import enRecipe from "@/src/i18n/locales/en/recipe.json"
import { EndOfListRow } from "@/src/features/recipe/components/EndOfListRow"
import { CommunitySearchScreen } from "@/src/features/recipe/views/CommunitySearchScreen"

function mockLeaf(namespace: string | undefined, key: string) {
  const root: unknown = namespace === "recipe" ? koRecipe : koCommon
  const found = key
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[part]
          : undefined,
      root,
    )
  return typeof found === "string" ? found : undefined
}

/* ── 엘리먼트 트리 읽기 ─────────────────────────────────────────────────── */

type Element = { type: unknown; props: Record<string, unknown> }

const isElement = (node: unknown): node is Element =>
  typeof node === "object" && node !== null && "props" in node && "type" in node

function childrenOf(element: Element): Element[] {
  const raw = element.props.children
  const list = Array.isArray(raw) ? raw.flat(Infinity) : [raw]
  return list.filter(isElement)
}

/** 트리 전체를 훑는다. **함수 컴포넌트는 본문을 호출해 펼친다.** */
function walkDeep(element: Element): Element[] {
  if (typeof element.type === "function") {
    const out = (element.type as (props: unknown) => unknown)(element.props)
    return isElement(out) ? [element, ...walkDeep(out)] : [element]
  }
  return childrenOf(element).reduce<Element[]>(
    (acc, child) => [...acc, ...walkDeep(child)],
    [element],
  )
}

const findAll = (root: Element, type: unknown): Element[] =>
  walkDeep(root).filter((el) => el.type === type)

const textOf = (element: Element): string => {
  const raw = element.props.children
  return (Array.isArray(raw) ? raw : [raw]).map(String).join("")
}

const allText = (root: Element): string[] =>
  walkDeep(root)
    .filter((el) => el.type === "Text")
    .map(textOf)

/* ── 검색 훅 대역 ──────────────────────────────────────────────────────── */

const post = (id: number) => ({
  id,
  title: `글 ${id}`,
  content: "본문",
  author: `이웃${id}`,
  authorId: id,
  createdAt: "2026-08-20T00:00:00",
  likeCount: 0,
  commentCount: 0,
  viewCount: 0,
  liked: false,
  bookmarked: false,
  images: [],
  tags: [],
})

let mockSearch: Record<string, unknown>

/** 결과 두 줄을 들고 커서가 끝난 검색. 꼬리가 말할 것은 "끝" 하나뿐이다. */
function exhaustedSearch(over: Record<string, unknown> = {}) {
  return {
    posts: [post(1), post(2)],
    isLoading: false,
    isError: false,
    error: null,
    nextPageError: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    isTailStalled: false,
    canAutoBackfill: true,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
    noteAutoBackfill: jest.fn(),
    ...over,
  }
}

/** 화면을 그리고 꼬리 슬롯(`ListFooterComponent`)을 꺼낸다. */
function tailSlotOf(): unknown {
  // 검색어가 확정돼 있어야 결과 목록 갈래로 간다(`submitted`).
  primeState("김치", "김치")
  const screen = CommunitySearchScreen() as unknown
  expect(isElement(screen)).toBe(true)
  const lists = findAll(screen as Element, "FlashList")
  expect(lists).toHaveLength(1)
  return lists[0].props.ListFooterComponent
}

describe("`EndOfListRow` 자체", () => {
  const rendered = (onPressAction = jest.fn()) => ({
    root: EndOfListRow({
      label: "마지막 글까지 다 봤어요",
      actionLabel: "맨 위로",
      onPressAction,
    }) as unknown as Element,
    onPressAction,
  })

  it("끝났다는 문장과 길 하나를 함께 그린다", () => {
    const { root } = rendered()
    expect(allText(root)).toEqual(["마지막 글까지 다 봤어요", "맨 위로"])
  })

  it("문장은 읽히고, 누를 것은 **버튼으로** 읽힌다(라벨까지)", () => {
    const { root } = rendered()
    const buttons = walkDeep(root).filter(
      (el) => el.props.accessibilityRole === "button",
    )
    expect(buttons).toHaveLength(1)
    expect(buttons[0].props.accessibilityLabel).toBe("맨 위로")
    const texts = walkDeep(root).filter(
      (el) => el.props.accessibilityRole === "text",
    )
    expect(texts.map(textOf)).toEqual(["마지막 글까지 다 봤어요"])
  })

  it("누르면 호출부가 준 동작 하나가 돈다", () => {
    const { root, onPressAction } = rendered()
    const button = walkDeep(root).find(
      (el) => el.props.accessibilityRole === "button",
    )
    expect(button).toBeDefined()
    ;(button?.props.onPress as () => void)()
    expect(onPressAction).toHaveBeenCalledTimes(1)
  })

  it("카드가 아니라 **선 한 줄**이다 — 끝은 사건이 아니라 사실이다", () => {
    /* 선은 글자가 없어 포커스 대상이 아니고, 텍스트는 위에서 센 두 줄이 전부다. */
    const { root } = rendered()
    const heightOf = (style: unknown): number | undefined => {
      const list = Array.isArray(style) ? style.flat(Infinity) : [style]
      for (const item of list) {
        if (item && typeof item === "object" && "height" in item) {
          return (item as { height?: number }).height
        }
      }
      return undefined
    }
    const rules = walkDeep(root).filter(
      (el) => el.type === "View" && heightOf(el.props.style) === 0.5,
    )
    expect(rules).toHaveLength(2)
  })
})

describe("검색 결과 화면이 그 줄을 실제로 세운다", () => {
  it("커서가 끝났고 결과가 있으면 꼬리에 끝 표시가 선다", () => {
    mockSearch = exhaustedSearch()
    const slot = tailSlotOf()
    expect(isElement(slot)).toBe(true)
    const texts = allText(slot as Element)
    expect(texts).toEqual([
      koCommon.community.search.endOfList,
      koCommon.community.search.backToTop,
    ])
  })

  it("다음 장이 오는 중이면 끝 표시가 아니라 로더다", () => {
    mockSearch = exhaustedSearch({ isFetchingNextPage: true })
    const slot = tailSlotOf()
    expect(isElement(slot)).toBe(true)
    expect((slot as Element).type).toBe("V2LoadingState")
  })

  it("다음 장이 실패했으면 끝 표시가 아니라 실패 행이다", () => {
    mockSearch = exhaustedSearch({ isError: true, isFetchNextPageError: true })
    const slot = tailSlotOf()
    expect(isElement(slot)).toBe(true)
    expect(allText(slot as Element)).not.toContain(
      koCommon.community.search.endOfList,
    )
  })

  it("아직 받을 것이 남았으면 꼬리는 침묵한다 — 끝났다고 말하지 않는다", () => {
    mockSearch = exhaustedSearch({ hasNextPage: true })
    expect(tailSlotOf()).toBeNull()
  })

  it("결과가 하나도 없으면 끝 표시가 아니라 빈 자리다", () => {
    mockSearch = exhaustedSearch({ posts: [] })
    expect(tailSlotOf()).toBeNull()
  })
})

describe("문구는 ko·en 양쪽에 있다", () => {
  it("검색 결과 화면", () => {
    for (const bundle of [koCommon, enCommon]) {
      expect(bundle.community.search.endOfList.length).toBeGreaterThan(0)
      expect(bundle.community.search.backToTop.length).toBeGreaterThan(0)
    }
    // 두 언어가 같은 문자열이면 번역을 빠뜨린 것이다.
    expect(koCommon.community.search.endOfList).not.toBe(
      enCommon.community.search.endOfList,
    )
  })

  it("피드(`feed` 네임스페이스 — `FreePostTab` 이 쓸 자리)", () => {
    for (const bundle of [koRecipe, enRecipe]) {
      expect(bundle.feed.endOfList.length).toBeGreaterThan(0)
      expect(bundle.feed.backToTop.length).toBeGreaterThan(0)
    }
    expect(koRecipe.feed.endOfList).not.toBe(enRecipe.feed.endOfList)
  })
})
