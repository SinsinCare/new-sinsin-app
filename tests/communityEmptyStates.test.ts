/**
 * **커뮤니티의 빈칸은 조르지 않고, 왜 비었는지 말하고, 갈 곳을 준다.** (2026-08-21)
 *
 * 운영 템포는 30일에 3편이라 **비어 있는 것이 정상 상태**다. 새로 진단받은 사람에게
 * 이 화면들이 곧 제품이고, 그 자리가 하던 말은 다섯 곳 모두 "먼저 글을 남기세요" 였다.
 * 이 파일이 고정하는 것은 그 자리들이 지금 무엇을 하는가다:
 *
 *  1. 손으로 그린 빈칸이 **하나도 없다** — 전부 `V2EmptyState tone="quiet"` 다.
 *     손으로 만들면 화면은 멀쩡한데 `empty_state_viewed` 가 아무것도 안 나간다(**D15**).
 *     그래서 여기서는 `V2EmptyState` 를 **진짜로 돌려** 그 계측이 나가는지까지 본다.
 *  2. **왜 비었는지**를 말한다 — 인기글은 기간이 좁아서인지 분류가 걸려서인지 가른다.
 *  3. **그에 맞는 탈출구**를 준다 — 분류가 걸렸으면 분류를 풀고, 기간이 좁으면 넓히고,
 *     좋아요·북마크가 비었으면 **읽을 자리**로 돌려보낸다(읽기가 쓰기보다 먼저다).
 *  4. **데려다줄 곳이 없으면 버튼도 없다** — 인기 검색어가 없는 검색, 월간·전체 인기글,
 *     자기가 누구의 목록인지 모르는 팔로워 화면.
 *
 * ─── 어떻게 보나 ────────────────────────────────────────────────────────────
 * 이 저장소의 jest 에는 RN 렌더러가 없다. 그래서 **화면 컴포넌트를 함수로 그대로 호출해
 * 돌려받은 엘리먼트 트리를 읽는다**(선례: `communityFeedSectionWiring.test.ts`).
 * 소스를 grep 하지 않는다 — "쓰여 있다" 가 "그려진다" 를 뜻하지 않고, 이 작업에서
 * 지켜야 할 것 중 절반은 **없어야 하는 것**(조르는 버튼)이라 문자열 검사로는 증명이 안 된다.
 *
 * 빈 자리는 `ListEmptyComponent` **프롭**에 산다(children 이 아니다) — 트리를 훑는 것으로는
 * 못 닿으므로 그 프롭을 꺼내 거기서부터 펼친다.
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

/*
  렌더러가 없으므로 훅은 초깃값에서 멈춘다. 다만 셋은 손을 본다:
   - `useEffect` 는 **진짜로 돌린다** — `V2EmptyState` 의 `empty_state_viewed` 가 그 안에 산다.
   - `useRef` 는 상자만 준다(진짜 훅은 렌더러 밖에서 부르면 던진다).
   - `useState` 는 **테스트가 초깃값을 갈아 끼울 수 있게** 한다 — 인기글 화면의 기간·분류는
     화면 안의 상태라 프롭으로 넣을 길이 없다. 화면 함수를 부르기 직전에 `primeState()` 로
     순서대로 넣는다(그 호출에서 화면이 부르는 `useState` 순서 = 소스의 선언 순서).
*/
let stateQueue: unknown[] = []
let stateCursor = 0
const primeState = (...values: unknown[]) => {
  stateQueue = values
  stateCursor = 0
}
const stateWrites: unknown[] = []

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
    return [value, (next: unknown) => stateWrites.push(next)]
  },
  useRef: (initial: unknown) => ({ current: initial }),
  useEffect: (run: () => void) => {
    run()
  },
  useMemo: (factory: () => unknown) => factory(),
  useCallback: (fn: unknown) => fn,
}))

/* 번역은 **앱의 진짜 리소스**로 돈다 — 표를 베껴 두면 카피가 바뀌어도 초록이다. */
jest.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: (namespace?: string) => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const template = mockLeaf(namespace, key) ?? key
      const data = (options?.replace ?? options ?? {}) as Record<
        string,
        unknown
      >
      return template.replace(/\{\{(\w+)\}\}/gu, (_m, name: string) =>
        String(data[name] ?? ""),
      )
    },
    i18n: { language: "ko" },
  }),
}))

/* ── 계측은 **진짜 컴포넌트가** 쏜다. 그 자리를 세는 것만 갈아 끼운다. ────────── */
jest.mock("@/src/features/analytics", () => ({
  trackAnalyticsEvent: jest.fn(),
}))

/*
  `V2EmptyState` 만 **진짜**다(D15 를 증명하는 것이 이 파일의 목적이다). 배럴을 통째로
  requireActual 하면 시트·리애니메이티드까지 끌려오므로 그 파일 하나만 되살린다.
*/
jest.mock("@/src/design-system-v2", () => ({
  ...jest.requireActual("@/src/design-system-v2/tokens"),
  V2EmptyState: jest.requireActual(
    "@/src/design-system-v2/components/V2EmptyState",
  ).V2EmptyState,
  V2ErrorState: "V2ErrorState",
  V2LoadingState: "V2LoadingState",
  V2Skeleton: "V2Skeleton",
  V2SkeletonGroup: "V2SkeletonGroup",
  V2Button: "V2Button",
  V2ScreenHeader: "V2ScreenHeader",
  V2Text: "V2Text",
  V2Avatar: "V2Avatar",
  useV2Theme: jest.requireMock("@/src/design-system-v2/hooks/useV2Theme")
    .useV2Theme,
}))
jest.mock("@/src/design-system-v2/hooks/useV2Theme", () => ({
  useV2Theme: () => ({
    colors: {
      ...jest.requireActual("@/src/design-system-v2/tokens/colors")
        .semanticLight,
      label: { normal: "#111111", neutral: "#555555", assistive: "#999999" },
    },
  }),
}))
jest.mock("@/src/design-system-v2/components/V2Icon", () => ({
  V2Icon: "V2Icon",
}))
jest.mock("@/src/design-system-v2/components/V2Button", () => ({
  V2Button: "V2Button",
}))

/* ── 화면이 들고 있는 바깥 세계 ──────────────────────────────────────────── */
jest.mock("@shopify/flash-list", () => ({ FlashList: "FlashList" }))
jest.mock("@expo/vector-icons/Ionicons", () => "Ionicons")
jest.mock("expo-image", () => ({ Image: "Image" }))
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
}))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock("@/src/shared/components/AppText", () => ({
  Text: "Text",
  TextInput: "TextInput",
}))
jest.mock("@/src/shared/components", () => ({
  ErrorMessage: "ErrorMessage",
  ArticleSkeleton: "ArticleSkeleton",
}))
jest.mock("@/src/shared/components/SurfacePressable", () => ({
  SurfacePressable: "SurfacePressable",
}))
jest.mock("@/src/shared/components/FloatingWriteButton", () => ({
  FloatingWriteButton: "FloatingWriteButton",
}))
jest.mock("@/src/shared/navigation", () => ({ useAppRouter: () => mockRouter }))
jest.mock("@/src/shared/refresh", () => ({
  useRefreshable: () => ({ scrollProps: {} }),
  useRevalidateOnReturn: () => {},
}))
jest.mock("@/src/hooks/useSurface", () => ({ useSurface: () => mockSurface }))
jest.mock("@/src/lib/haptics", () => ({ hapticSelection: jest.fn() }))
/* `resolveError` 는 진짜다(배럴만 우회한다 — `present.ts` 가 토스트를 끌고 온다). */
jest.mock("@/src/lib/errorMessage", () => ({
  resolveError: jest.requireActual("@/src/lib/errorMessage/resolve")
    .resolveError,
}))
jest.mock("@/src/features/recipe/components/PostListItem", () => ({
  PostListItem: "PostListItem",
}))
jest.mock("@/src/features/recipe/components/LoadMoreRow", () => ({
  LoadMoreRow: "LoadMoreRow",
}))
jest.mock("@/src/features/recipe/components/NextPageErrorRow", () => ({
  NextPageErrorRow: "NextPageErrorRow",
}))
jest.mock("@/src/features/recipe/refresh/scopes", () => ({
  COMMUNITY_POPULAR_REFRESH: [],
  COMMUNITY_LIBRARY_REFRESH: [],
}))
jest.mock("@/src/features/settings/hooks/useMyPageProfile", () => ({
  useMyPageProfile: () => ({ data: { nickName: "나" } }),
}))
jest.mock("@/src/features/recipe/hooks/useBlockedUsers", () => ({
  isAuthorBlocked: jest.requireActual(
    "@/src/features/recipe/utils/blockedAuthors",
  ).isAuthorBlocked,
  useBlockedUsers: () => ({
    blockedAuthors: { ids: new Set<number>(), unresolvedNames: new Set() },
    blockUser: jest.fn(),
    blockUserAsync: jest.fn(),
  }),
}))
jest.mock("@/src/features/recipe/hooks/useCommunityPosts", () => ({
  useCommunityPosts: () => mockLibraryFeed,
}))
jest.mock("@/src/features/recipe/hooks/useCommunityPostSearch", () => ({
  useCommunityPostSearch: () => mockSearch,
  useCommunityPopularKeywords: () => ({ data: mockPopularKeywords }),
}))
jest.mock("@/src/features/recipe/hooks/useCommunityPopularPosts", () => ({
  useCommunityPopularPosts: () => mockPopular,
}))
jest.mock("@/src/features/recipe/hooks/useRecentCommunitySearches", () => ({
  useRecentCommunitySearches: () => ({
    recentSearches: mockRecentSearches,
    addRecentSearch: jest.fn(),
    removeRecentSearch: jest.fn(),
    clearRecentSearches: jest.fn(),
  }),
}))
jest.mock("@/src/features/recipe/hooks/useCommunityAuthor", () => ({
  useCommunityFollowList: () => mockFollowList,
}))

import { V2EmptyState } from "@/src/design-system-v2"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import koCommon from "@/src/i18n/locales/ko/common.json"
import koRecipe from "@/src/i18n/locales/ko/recipe.json"
import CommunityLibraryScreen from "@/app/community-library"
import { CommunityConnectionsScreen } from "@/src/features/recipe/views/CommunityConnectionsScreen"
import { CommunityPopularScreen } from "@/src/features/recipe/views/CommunityPopularScreen"
import { CommunitySearchScreen } from "@/src/features/recipe/views/CommunitySearchScreen"

/** `"community.popular.empty"` → 그 네임스페이스 리소스의 잎 값. 없으면 undefined. */
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

/* ── 엘리먼트 트리 읽기 (communityFeedSectionWiring.test.ts 와 같은 도구) ────── */

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

/**
 * 빈 자리는 `ListEmptyComponent` **프롭**에 산다 — children 이 아니라서 트리를 훑는
 * 것으로는 못 닿는다. 목록을 찾아 그 프롭을 꺼낸다.
 */
function emptySlotOf(screen: Element): Element {
  const list = findAll(screen, "FlashList")
  expect(list).toHaveLength(1)
  const slot = list[0].props.ListEmptyComponent
  expect(isElement(slot)).toBe(true)
  return slot as Element
}

/** 그 자리에 선 `V2EmptyState` 하나. 둘이면(또는 없으면) 실패한다. */
function emptyStateIn(node: Element): Element {
  const found = findAll(node, V2EmptyState)
  expect(found).toHaveLength(1)
  return found[0]
}

/**
 * "마운트 한 번에 계측 한 번" 을 재는 자.
 *
 * `emptyStateIn` 은 트리를 훑느라 컴포넌트를 **이미 한 번 펼쳤다**(그래서 계측도 한 번
 * 나갔다). 그 상태에서 세면 언제나 2가 나온다. 자를 0으로 놓고 다시 한 번만 펼친다 —
 * 이 값이 2가 되는 순간이 곧 "부모가 다시 그릴 때마다 같은 빈칸이 여러 번 세어지는"
 * 결함이다(`V2EmptyState` 머리말이 막고 있는 그것).
 */
function mountOnce(state: Element): Element[] {
  ;(trackAnalyticsEvent as jest.Mock).mockClear()
  return walkDeep(state)
}

/* ── 화면이 보는 바깥 세계 (테스트마다 갈아 끼운다) ────────────────────────── */

const mockRouter = { push: jest.fn(), back: jest.fn(), dismissTo: jest.fn() }
const mockSurface = {
  isDark: false,
  canvas: "#FFFFFF",
  surface: "#F4F4F6",
  surfacePressed: "#EAEAEE",
  card: "#FFFFFF",
  hairline: "#E5E5EA",
  text: "#666666",
  textStrong: "#111111",
  textMuted: "#999999",
  placeholder: "#AAAAAA",
  brand: "#FE7139",
  surfaceBrand: "#FFEDE5",
  onBrand: "#FFFFFF",
}

let mockParams: Record<string, string | undefined>
let mockRecentSearches: string[]
let mockPopularKeywords: { keyword: string; rank: number }[]
let mockPopular: {
  data: unknown[]
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: jest.Mock
}
let mockSearch: Record<string, unknown>
let mockLibraryFeed: Record<string, unknown>
let mockFollowList: Record<string, unknown>

/** 아무것도 못 받았고 더 받을 것도 없다 = `communityFeedSurfaces` 의 `empty`. */
const emptyList = () => ({
  posts: [],
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  isFetchNextPageError: false,
  nextPageError: null,
  isTailStalled: false,
  canAutoBackfill: true,
  noteAutoBackfill: jest.fn(),
})

beforeEach(() => {
  jest.clearAllMocks()
  primeState()
  stateWrites.length = 0
  mockParams = {}
  mockRecentSearches = []
  mockPopularKeywords = []
  mockPopular = {
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }
  mockSearch = emptyList()
  mockLibraryFeed = { ...emptyList(), posts: [] }
  mockFollowList = {
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }
})

/* ═══════════════════════════ 검색 ═══════════════════════════════════════ */

describe("검색 — 결과 0", () => {
  const render = () => {
    primeState("투석", "투석")
    return CommunitySearchScreen() as unknown as Element
  }

  it("손으로 그린 두 줄이 아니라 조용한 `V2EmptyState` 다 — 그래서 계측이 나간다", () => {
    const state = emptyStateIn(emptySlotOf(render()))

    expect(state.props.tone).toBe("quiet")
    expect(state.props.surface).toBe("community_search")
    // 조용한 톤에는 제목이 없다(그 자리가 화면의 주인공처럼 읽히면 안 된다).
    expect(state.props.title).toBeUndefined()

    // 진짜 컴포넌트를 펼쳐 `empty_state_viewed` 가 그 자리로 나가는지 본다(D15).
    mountOnce(state)
    expect(trackAnalyticsEvent).toHaveBeenCalledTimes(1)
    expect(trackAnalyticsEvent).toHaveBeenCalledWith("empty_state_viewed", {
      surface: "community_search",
    })
  })

  it("**왜 없는지**와 **무엇을 하면 되는지**를 한 덩어리로 말한다", () => {
    const state = emptyStateIn(emptySlotOf(render()))
    expect(state.props.description).toBe(
      `${koCommon.community.search.noResultsTitle}\n${koCommon.community.search.noResultsBody}`,
    )
    // 그 문장이 실제로 그려진다 — 프롭만 맞고 안 그리는 자리를 막는다.
    expect(allText(state)).toContain(state.props.description)
  })

  it("인기 검색어가 있으면 **읽을 자리로 돌아가는** 탈출구가 붙는다", () => {
    mockPopularKeywords = [{ keyword: "칼륨", rank: 1 }]
    const state = emptyStateIn(emptySlotOf(render()))

    expect(state.props.actionLabel).toBe(koCommon.community.search.emptyAction)
    ;(state.props.onAction as () => void)()
    /*
      검색어를 지우면 진입 패널(최근·인기)로 돌아간다 — 확정된 검색어는 null 로,
      입력칸은 빈 문자열로. 다른 화면으로 밀어내지 않는다.
    */
    expect(stateWrites).toContain(null)
    expect(stateWrites).toContain("")
    expect(mockRouter.push).not.toHaveBeenCalled()
  })

  it("데려다줄 인기 검색어가 없으면 **버튼도 없다**", () => {
    const state = emptyStateIn(emptySlotOf(render()))
    expect(state.props.actionLabel).toBeUndefined()
    expect(state.props.onAction).toBeUndefined()
    // 라벨 없는 버튼이 그려지는 일도 없다.
    expect(findAll(state, "V2Button")).toHaveLength(0)
  })

  it("스켈레톤·오류 자리를 빼앗지 않는다 — 셋은 서로 다른 것이다", () => {
    mockSearch = { ...emptyList(), isLoading: true }
    primeState("투석", "투석")
    const loading = CommunitySearchScreen() as unknown as Element
    // 로딩 중에는 목록 자체가 없다(자리 스켈레톤이 대신 선다).
    expect(findAll(loading, "FlashList")).toHaveLength(0)
    expect(findAll(loading, "V2Skeleton").length).toBeGreaterThan(0)
    expect(findAll(loading, V2EmptyState)).toHaveLength(0)
  })
})

describe("검색 — 진입 패널이 통째로 빌 때", () => {
  const render = () => CommunitySearchScreen() as unknown as Element

  it("흰 판 대신 조용한 한 덩어리가 선다", () => {
    const state = emptyStateIn(render())
    expect(state.props.tone).toBe("quiet")
    expect(state.props.surface).toBe("community_search")
    expect(state.props.description).toBe(
      koCommon.community.search.entryEmptyBody,
    )
    // 컨트롤은 위의 입력칸 하나다 — 같은 일을 하는 두 번째 버튼을 세우지 않는다.
    expect(state.props.actionLabel).toBeUndefined()
  })

  it("보여 줄 재료가 **하나라도** 있으면 서지 않는다", () => {
    mockPopularKeywords = [{ keyword: "칼륨", rank: 1 }]
    expect(findAll(render(), V2EmptyState)).toHaveLength(0)

    mockPopularKeywords = []
    mockRecentSearches = ["저염"]
    expect(findAll(render(), V2EmptyState)).toHaveLength(0)
  })
})

/* ═══════════════════════════ 인기글 ═════════════════════════════════════ */

describe("인기글 — 빈 목록이 **왜** 비었는지 가른다", () => {
  /** 인기글 화면의 `useState` 순서: period → category. */
  const render = (period: string, category: string | null) => {
    primeState(period, category)
    return CommunityPopularScreen() as unknown as Element
  }

  it("분류가 걸려 있으면 그 사실을 말하고 **분류를 푼다**", () => {
    const state = emptyStateIn(emptySlotOf(render("realtime", "diet")))

    expect(state.props.tone).toBe("quiet")
    expect(state.props.surface).toBe("community_popular")
    expect(state.props.description).toBe(
      koCommon.community.popular.emptyFiltered,
    )
    expect(state.props.actionLabel).toBe(
      koCommon.community.popular.emptyClearCategory,
    )
    ;(state.props.onAction as () => void)()
    // 분류만 푼다 — 기간은 사용자가 고른 그대로 둔다.
    expect(stateWrites).toEqual([null])
  })

  it("분류가 없으면 **기간**을 말하고 한 칸 넓히는 길을 준다", () => {
    const live = emptyStateIn(emptySlotOf(render("realtime", null)))
    expect(live.props.description).toBe(koCommon.community.popular.emptyPeriod)
    expect(live.props.actionLabel).toBe(
      koCommon.community.popular.emptyWiden.replace(
        "{{period}}",
        koCommon.community.popular.week,
      ),
    )
    ;(live.props.onAction as () => void)()
    expect(stateWrites).toEqual(["week"])

    stateWrites.length = 0
    const week = emptyStateIn(emptySlotOf(render("week", null)))
    expect(week.props.actionLabel).toBe(
      koCommon.community.popular.emptyWiden.replace(
        "{{period}}",
        koCommon.community.popular.month,
      ),
    )
    ;(week.props.onAction as () => void)()
    expect(stateWrites).toEqual(["month"])
  })

  it("더 넓힐 창도 풀 필터도 없으면 **버튼이 없다** — 글쓰기를 조르지도 않는다", () => {
    const state = emptyStateIn(emptySlotOf(render("month", null)))

    expect(state.props.description).toBe(
      `${koCommon.community.popular.empty}\n${koCommon.community.popular.emptyAllBody}`,
    )
    expect(state.props.actionLabel).toBeUndefined()
    expect(state.props.onAction).toBeUndefined()
    expect(findAll(state, "V2Button")).toHaveLength(0)
    // 글쓰기는 화면의 떠 있는 버튼이 이미 맡는다 — 빈칸이 한 번 더 조르지 않는다.
    expect(allText(state).join("\n")).not.toContain(
      koCommon.community.popular.write,
    )
  })

  it("분류가 걸려 있으면 기간 갈래보다 **먼저** 잡는다", () => {
    // 분류를 안 풀고 기간만 넓히면 여전히 빈 목록이다.
    const state = emptyStateIn(emptySlotOf(render("realtime", "diet")))
    expect(state.props.description).not.toBe(
      koCommon.community.popular.emptyPeriod,
    )
  })

  it("계측은 `community_popular` 로 한 번 나간다", () => {
    mountOnce(emptyStateIn(emptySlotOf(render("month", null))))
    expect(trackAnalyticsEvent).toHaveBeenCalledTimes(1)
    expect(trackAnalyticsEvent).toHaveBeenCalledWith("empty_state_viewed", {
      surface: "community_popular",
    })
  })
})

/* ═══════════════════════════ 팔로워·팔로잉 ══════════════════════════════ */

describe("팔로워·팔로잉", () => {
  const render = (mode: string) => {
    mockParams = { id: "7", mode }
    return CommunityConnectionsScreen() as unknown as Element
  }

  it("두 축이 서로 다른 문장을 말하고, 둘 다 조용한 빈 상태다", () => {
    const followers = emptyStateIn(emptySlotOf(render("followers")))
    expect(followers.props.tone).toBe("quiet")
    expect(followers.props.surface).toBe("community_connections")
    expect(followers.props.description).toBe(
      koCommon.community.author.emptyFollowers,
    )

    const following = emptyStateIn(emptySlotOf(render("following")))
    expect(following.props.description).toBe(
      koCommon.community.author.emptyFollowing,
    )
  })

  it("**버튼이 없다** — 이 화면은 자기가 누구의 목록인지 모른다", () => {
    const state = emptyStateIn(emptySlotOf(render("following")))
    expect(state.props.actionLabel).toBeUndefined()
    expect(findAll(state, "V2Button")).toHaveLength(0)
  })

  it("계측은 `community_connections` 로 한 번 나간다", () => {
    mountOnce(emptyStateIn(emptySlotOf(render("followers"))))
    expect(trackAnalyticsEvent).toHaveBeenCalledTimes(1)
    expect(trackAnalyticsEvent).toHaveBeenCalledWith("empty_state_viewed", {
      surface: "community_connections",
    })
  })
})

/* ═══════════════════════════ 내 활동 보관함 ═════════════════════════════ */

describe("내 활동 — 세 탭", () => {
  const render = (tab: string) => {
    mockParams = { tab }
    return CommunityLibraryScreen() as unknown as Element
  }
  const copy = koCommon.community.library.empty

  it("세 탭 모두 조용한 빈 상태이고, 이유 + 이 탭이 모으는 것을 말한다", () => {
    for (const [tab, text] of [
      ["mine", copy.mine],
      ["liked", copy.liked],
      ["bookmarked", copy.bookmarked],
    ] as const) {
      const state = emptyStateIn(emptySlotOf(render(tab)))
      expect(state.props.tone).toBe("quiet")
      expect(state.props.surface).toBe("community_library")
      expect(state.props.description).toBe(`${text.title}\n${text.body}`)
    }
  })

  it("좋아요·북마크의 탈출구는 **읽을 자리**다 — 순환을 끊는다", () => {
    for (const tab of ["liked", "bookmarked"] as const) {
      mockRouter.dismissTo.mockClear()
      const state = emptyStateIn(emptySlotOf(render(tab)))
      expect(state.props.actionLabel).toBe(copy.browse)
      ;(state.props.onAction as () => void)()
      expect(mockRouter.dismissTo).toHaveBeenCalledWith({
        pathname: "/community",
      })
    }
  })

  it("`쓴 글` 탭에는 버튼이 없다 — 여기서 줄 수 있는 링크는 글쓰기뿐이다", () => {
    const state = emptyStateIn(emptySlotOf(render("mine")))
    expect(state.props.actionLabel).toBeUndefined()
    expect(findAll(state, "V2Button")).toHaveLength(0)
  })

  it("계측은 `community_library` 로 한 번 나간다", () => {
    mountOnce(emptyStateIn(emptySlotOf(render("liked"))))
    expect(trackAnalyticsEvent).toHaveBeenCalledTimes(1)
    expect(trackAnalyticsEvent).toHaveBeenCalledWith("empty_state_viewed", {
      surface: "community_library",
    })
  })
})

/* ═══════════════════════════ 카피 규칙 ══════════════════════════════════ */

describe("카피 — 빈칸이 **먼저 쓰라고** 하지 않는다", () => {
  /*
    되돌아오는 길은 문구다. 다섯 자리 중 넷이 "첫 ~를 남겨 보세요" 였고, 그중 둘은
    순환이었다("글을 못 찾은 사람에게 좋아요를 누르라"). 댓글 빈 상태(`firstComment`)는
    **예외**다 — 읽어 줄 사람이 정해져 있고 비용이 낮은 유일한 자리라 그대로 둔다.
  */
  const library = koCommon.community.library.empty
  const bodies = [
    library.mine.body,
    library.liked.body,
    library.bookmarked.body,
  ]

  it("보관함 세 탭 어디에도 '첫 ~' 프레이밍이 없다", () => {
    for (const body of bodies) expect(body).not.toContain("첫 ")
  })

  it("순환하는 지시(`좋아요를 눌러 보세요`)가 사라졌다", () => {
    expect(library.liked.body).not.toContain("좋아요를 눌러")
    expect(library.bookmarked.body).not.toContain("북마크해 보세요")
  })

  it("댓글의 '첫 댓글' 은 **일부러** 남는다 — 여기만 읽을 사람이 정해져 있다", () => {
    expect(koCommon.community.postDetail.firstComment).toContain("첫 댓글")
  })
})
