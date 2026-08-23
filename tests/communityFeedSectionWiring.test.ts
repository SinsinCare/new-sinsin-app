/**
 * **피드 화면이 두 섹션을 실제로 그리는가** — WBS 2.1 / 2.2.
 * 대상: `src/features/recipe/components/FreePostTab.tsx`
 * 판정: `docs/design/community-redesign/01-DECISIONS.md` **D23 · D24 · D25**.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 어떻게 보나
 *
 * 이 저장소의 jest 에는 렌더러가 없다. 그래서 **화면 컴포넌트를 함수로 그대로 호출해
 * 돌려받은 엘리먼트 트리를 읽는다**(선례: `communityFeedSections.test.ts`).
 * 소스를 grep 하지 않는다 — "쓰여 있다" 가 "그려진다" 를 뜻하지 않고, 특히 이 작업에서
 * 지켜야 할 것은 대부분 **없어야 하는 것**(가로 레일 · 목록에 끼어든 가짜 항목)이라
 * 문자열 검사로는 증명이 안 된다.
 *
 * 막는 것은 전송·네비게이션·데이터 훅뿐이다. `TrendingPostsSection` ·
 * `NeighborSuggestionSection` · `SectionErrorLine` · `FollowButton` · `resolveError` ·
 * `communityFeedSurfaces` · `isAuthorBlocked` 는 **진짜로 돈다**.
 *
 * ■ 이 파일이 지키는 것 (전부 변이 테스트로 검산했다)
 *
 *  1. **가로 `PopularPostCard` 레일이 피드에서 사라졌다.** 화면에 남은 가로 스크롤러는
 *     카테고리 칩 하나뿐이다(D25 가 뒤집은 축이라, 되돌아오면 여기가 깨진다).
 *  2. **머리는 검색 · 스토리 · 밴드 셋뿐이다.** `요즘 이야기 중` 은 머리에 **없고**
 *     (2026-08-21: 그 자리에서는 한 화면에 읽을 글이 0개였고, 템포가 낮은 커뮤니티에서는
 *     3행이 곧 피드 맨 위 3편이라 같은 글을 두 번 보여 줬다), **필터도 없다** — 칩과
 *     정렬은 목록 **밖** 고정 바 한 줄(52)로 나갔다.
 *  2-B. **그 바는 목록 항목이 아니다.** FlashList v2 의 `stickyHeaderIndices` 는 `data` 의
 *     인덱스를 받아 `renderItem` 으로 다시 그리는 물건이라, 그걸 쓰면 아래 6번이 통째로
 *     무너진다. 그래서 바는 `FlashList` 의 **형제**이고 `stickyHeaderIndices` 는 없다.
 *     그리고 **필터를 바꾸면 목록이 맨 위로 돌아간다**(안 그러면 새 결과의 한복판에서 시작한다).
 *  3. **인기 3행이 인기 API 를 먹는다** — 제목·댓글 수만 넘어가고, 순위는 섹션이 매긴다.
 *  4. **빈 인기 목록이면 밴드째로 접힌다(아무것도 안 그린다).** 실패면 **한 줄**을 말한다.
 *  5. **두 섹션의 자리**: 인기 3행은 세 번째 글 다음, 이웃 추천은 여덟 번째 글 다음.
 *     각각 딱 한 번이고, 사이에 글 다섯 편이 남아 **서로 붙지 않는다.**
 *  6. **목록에는 글만 담긴다.** `data` 도 `keyExtractor` 도 글이 아닌 것을 모른다 →
 *     빈 목록 판정 · 자동 backfill · `onEndReached` 가 삽입 전과 **글자 그대로 같다.**
 *  7. **차단 필터와 제목 게이트**가 두 섹션에 모두 걸린다.
 *  8. **팔로우는 절대 상태로 나가고 행을 안 옮긴다** · 행을 누르면 프로필로 간다.
 */
/* eslint-disable import/first -- RN·네이티브 의존을 모듈 로드 **전에** 갈아 끼워야 한다. */

/*
  react-native 는 Flow 원본이라 이 프리셋에서 파싱이 안 된다(tests/helpers/reactNativeStub.js).
  호스트 컴포넌트는 **문자열 태그**다 — 흉내 낸 구현을 두면 "렌더러 없이 렌더한" 셈이 된다.
  `ScrollView` 를 진짜 태그로 두는 것이 핵심이다: 가로 레일이 되돌아오면 셀 수 있어야 한다.
*/
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
    StyleSheet: { create: <T>(styles: T): T => styles, flatten },
    View: "View",
    Text: "Text",
    Pressable: "Pressable",
    ScrollView: "ScrollView",
    FlatList: "FlatList",
    ActivityIndicator: "ActivityIndicator",
  }
})

/* ── 섹션이 진짜로 돌게 하려고 그 아래 네이티브 잎만 태그로 바꾼다 ─────────── */
jest.mock("@/src/design-system-v2/components/V2Icon", () => ({
  V2Icon: "V2Icon",
}))
jest.mock("expo-image", () => ({ Image: "Image" }))
/*
  필터 바의 `EdgeFade` 가 `expo-linear-gradient` 를 끌고 온다 — 목을 여기 달지 않는다.
  그 의존은 **전이적**이라(화면 → 레일 → 페이드 → 패키지) 스위트마다 잊히고, 실제로
  그래서 이 스위트가 한 번 통째로 로드에 실패했다. `jest.config.ts` 의 `moduleNameMapper`
  가 전역으로 태그 스텁으로 바꾼다.
*/
/*
  정렬 필의 `V2Menu` 가 안전영역을 들여온다(네이티브 스펙 → ESM 이라 이 프리셋에서 죽는다).
  메뉴는 열지 않고 **필이 무엇을 받는지**만 보므로 값은 아무거나면 된다.
*/
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock("@/src/design-system-v2/components/V2Skeleton", () => ({
  V2Skeleton: "V2Skeleton",
  V2SkeletonGroup: "V2SkeletonGroup",
}))
jest.mock("@/src/design-system-v2/components/V2DotLoader", () => ({
  V2DotLoader: "V2DotLoader",
}))
jest.mock("@/src/hooks/useAppColorScheme", () => ({
  useAppColorScheme: () => "light" as const,
}))
/*
  가시성 문턱(delay 180 / minDuration 420)은 DS 의 계약이지 이 화면의 것이 아니다.
  여기서 보는 것은 "화면이 어느 자리로 대기를 세는가" 와 "보이기로 했을 때 무엇이
  그려지는가" 둘뿐이라 `isLoading` 을 그대로 통과시킨다.
*/
jest.mock("@/src/design-system-v2/hooks/useLoadingVisible", () => ({
  useLoadingVisible: (isLoading: boolean): boolean => isLoading,
}))
/* 번역은 **앱의 진짜 리소스**로 돈다 — 표를 베껴 두면 카피가 바뀌어도 초록이다. */
jest.mock("react-i18next", () => ({
  /*
    `@/src/i18n` 이 로드되면서 `i18n.use(initReactI18next)` 를 부른다 — 이 모듈을
    통째로 갈아 끼우면 그 자리가 `undefined` 가 되어 스위트째로 죽는다. 진짜 플러그인
    모양(`{ type: "3rdParty" }`)만 돌려주면 i18next 가 정상 초기화되고, 그래야
    `resolveError` 의 문구가 **앱의 진짜 errors.json** 에서 나온다.
  */
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: (namespace?: string) => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const template = mockLeaf(namespace, key) ?? key
      const data = (options?.replace ?? options ?? {}) as Record<
        string,
        unknown
      >
      return template.replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
        String(data[name] ?? ""),
      )
    },
    i18n: { language: "ko" },
  }),
}))

/*
  렌더러가 없으므로 훅은 초깃값에서 멈춘다. `useEffect` 만은 **실제로 실행한다** —
  피드의 자동 backfill 이 그 안에 살고, 이 작업이 깨뜨리지 않았음을 보여야 하는 것이
  바로 그 이펙트다(머리말 5).
*/
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: (initial: unknown) => [
    typeof initial === "function" ? (initial as () => unknown)() : initial,
    () => {},
  ],
  useEffect: (run: () => void) => {
    run()
  },
  useMemo: (factory: () => unknown) => factory(),
  useCallback: (fn: unknown) => fn,
  /*
    렌더러가 없으므로 진짜 `useRef` 는 훅 규칙 위반으로 던진다. 칸을 대신 두고
    **밖에서 들여다본다** — 화면이 목록을 맨 위로 돌려놓는지(`scrollToOffset`)와
    스크롤 위치를 어떻게 기억하는지가 이 파일이 지키는 것 중 둘이다.

    칸이 **둘**인 이유: 화면은 목록 핸들(`useRef(null)`)과 스크롤 위치(`useRef(0)`)를
    따로 든다. 하나로 합치면 `scrollOffsetRef.current = 0` 이 목록 핸들을 지워 버려,
    "맨 위로 보낸 뒤 위치도 0 으로 둔다" 는 바로 그 성질을 테스트가 못 보게 된다.
    초깃값으로 가른다 — 0 이면 위치 칸, 그 밖(null)이면 핸들 칸이다.
    (정렬 필의 트리거 ref 도 `null` 이라 핸들 칸을 같이 쓴다. 그래서 그 칸이
    `measureInWindow` 도 들고 있다 — 둘 다 실제로 불리는 메서드다.)
  */
  useRef: (initial: unknown) => (initial === 0 ? mockOffsetRef : mockRef),
}))

/* ── 화면이 들고 있는 바깥 세계 ──────────────────────────────────────────── */
jest.mock("@shopify/flash-list", () => ({ FlashList: "FlashList" }))
jest.mock("@expo/vector-icons/Ionicons", () => "Ionicons")
jest.mock("@/src/shared/components/AppText", () => ({ Text: "Text" }))
jest.mock("@/src/shared/components/SurfacePressable", () => ({
  SurfacePressable: "SurfacePressable",
}))
jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: { View: "Animated.View" },
  FadeInDown: {
    duration: () => ({ reduceMotion: () => ({ __entering: true }) }),
  },
  ReduceMotion: { System: "system" },
}))
jest.mock("@/src/shared/navigation", () => ({
  useAppRouter: () => mockRouter,
  /*
    화면이 사다리에 **무엇을 등록하는지**를 밖에서 들여다본다. 등록만 잡고 `isAtScrollTop`
    은 **진짜를 쓴다** — 맨 위 판정(iOS 바운스 0.5 · 안드 오버스크롤 음수를 흡수하는
    여유값)은 이 화면의 것이 아니라 `tabReset.ts` 의 것이고, 흉내 낸 술어로는
    "화면이 그 판정을 다시 적지 않았다" 가 증명되지 않는다. 배럴 전체가 아니라 그
    모듈만 실물로 가져오는 이유는 배럴이 라우트 그래프·가드까지 끌고 오기 때문이다.
  */
  isAtScrollTop: jest.requireActual("@/src/shared/navigation/tabReset")
    .isAtScrollTop,
  useRegisterTabReset: (route: string, target: unknown) => {
    mockTabResets.push({ route, target })
  },
}))
jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQueryClient: () => ({}),
}))
jest.mock("@/src/hooks/useSurface", () => ({
  useSurface: () => ({
    isDark: false,
    text: "#000000",
    textStrong: "#000000",
    placeholder: "#999999",
    card: "#FFFFFF",
    surface: "#F4F4F6",
    surfacePressed: "#EAEAEE",
    brand: "#FE7139",
    // 목록 끝 한 줄(`EndOfListRow`)이 쓰는 두 칸.
    hairline: "#E5E5EA",
    textMuted: "#8E8E93",
  }),
}))
jest.mock("@/src/lib/haptics", () => ({ hapticSelection: jest.fn() }))
/*
  화면이 끌고 오는 새로고침 스코프가 스토리 서비스를 거쳐 전송 계층까지 닿는다
  (`refresh/scopes` → `useCommunityStories` → `communityStoryService` → `apiClient`).
  진짜 요청은 이 파일에 없으므로 로드만 되게 세운다 — 데이터 훅은 전부 갈아 끼웠다.
*/
jest.mock("@/src/services/core/apiClient", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  publicApi: { get: jest.fn(), post: jest.fn() },
}))
/*
  `resolveError` 는 **진짜다**(배럴만 우회한다 — `present.ts` 가 토스트·다이얼로그를
  끌고 오기 때문). 실패 문구와 `retryable` 판정이 진짜 파이프라인에서 나와야
  "오류는 말한다" 가 증명된다.
*/
jest.mock("@/src/lib/errorMessage", () => ({
  resolveError: jest.requireActual("@/src/lib/errorMessage/resolve")
    .resolveError,
}))
jest.mock("@/src/shared/refresh", () => ({
  // 스피너를 고정 바 아래에서 돌리는지 보려면 화면이 넘긴 값이 필요하다.
  useRefreshable: (args: { spinnerOffset?: number }) => {
    mockRefreshableArgs.push(args)
    // `refresh` 는 사다리 4번이 그대로 부르는 함수다 — 동일성까지 본다.
    return {
      scrollProps: {},
      refresh: mockRefresh,
      refreshing: false,
      isRunning: mockIsRunning,
    }
  },
  useRevalidateOnReturn: () => {},
}))
jest.mock("@/src/design-system-v2", () => ({
  V2ErrorState: "V2ErrorState",
  V2LoadingState: "V2LoadingState",
}))
jest.mock("@/src/features/settings/hooks/useMyPageProfile", () => ({
  useMyPageProfile: () => ({ data: undefined }),
}))
jest.mock("@/src/features/recipe/components/StoryRail", () => ({
  StoryRail: "StoryRail",
}))
jest.mock("@/src/features/recipe/components/PostListItem", () => ({
  PostListItem: "PostListItem",
}))
jest.mock("@/src/features/recipe/components/CommunityFeedSkeleton", () => ({
  CommunityFeedSkeleton: "CommunityFeedSkeleton",
}))
jest.mock("@/src/features/recipe/components/LoadMoreRow", () => ({
  LoadMoreRow: "LoadMoreRow",
}))
jest.mock("@/src/features/recipe/components/NextPageErrorRow", () => ({
  NextPageErrorRow: "NextPageErrorRow",
}))
jest.mock("@/src/features/recipe/hooks/communityFeedCache", () => ({
  trimFeedCacheToFirstPage: jest.fn(),
}))
/*
  차단 판정(`isAuthorBlocked`)은 **진짜를 쓴다** — 이 파일이 지키는 것 중 하나가
  "추천 행에도 같은 판정이 걸린다" 라, 흉내 낸 술어로는 증명되지 않는다.
*/
jest.mock("@/src/features/recipe/hooks/useBlockedUsers", () => ({
  isAuthorBlocked: jest.requireActual(
    "@/src/features/recipe/utils/blockedAuthors",
  ).isAuthorBlocked,
  useBlockedUsers: () => ({
    blockedAuthors: mockBlockedAuthors,
    blockUser: jest.fn(),
  }),
}))
jest.mock("@/src/features/recipe/hooks/useCommunityPosts", () => ({
  useCommunityPosts: () => mockFeed,
}))
jest.mock("@/src/features/recipe/hooks/useCommunityPopularPosts", () => ({
  useCommunityPopularPosts: (...args: unknown[]) => {
    mockPopularArgs.push(args)
    return mockPopular
  },
}))
jest.mock("@/src/features/recipe/hooks/useSuggestedAuthors", () => ({
  useSuggestedAuthors: () => mockSuggested,
}))

import type { ReactElement } from "react"

import koCommon from "@/src/i18n/locales/ko/common.json"
import koRecipe from "@/src/i18n/locales/ko/recipe.json"
import { ApiError } from "@/src/services/core/apiError"
import { V2Text } from "@/src/design-system-v2/components/V2Text"
import { borderWidth } from "@/src/design-system-v2/tokens/size"
import {
  isAtScrollTop,
  SCROLL_TOP_EPSILON_PT,
} from "@/src/shared/navigation/tabReset"
import { communityFeedSurfaces } from "@/src/features/recipe/utils/communityFeedSurfaces"
import { EndOfListRow } from "@/src/features/recipe/components/EndOfListRow"
import { FREE_POST_CATEGORIES } from "@/src/features/recipe/data/freePostCategories"
import {
  FreePostTab,
  PINNED_HEADER_HEIGHT,
} from "@/src/features/recipe/components/FreePostTab"
import {
  CategoryChipRail,
  categoryChipRailHeight,
} from "@/src/features/recipe/components/community/CategoryChipRail"
import {
  COMMUNITY_GUTTER,
  SEARCH_TO_RAIL_GAP,
} from "@/src/features/recipe/components/community/communityLayout"
import { SortDropdown } from "@/src/features/recipe/components/community/SortDropdown"
import {
  NEIGHBOR_SUGGESTION_COUNT,
  NeighborSuggestionSection,
} from "@/src/features/recipe/components/community/NeighborSuggestionSection"
import {
  TRENDING_POST_COUNT,
  TrendingPostsSection,
} from "@/src/features/recipe/components/community/TrendingPostsSection"
import { SectionBand } from "@/src/features/recipe/components/community/SectionBand"
import { SectionErrorLine } from "@/src/features/recipe/components/community/SectionErrorLine"
import { FollowButton } from "@/src/features/recipe/components/community/FollowButton"
import type {
  CommunityMealPost,
  CommunitySuggestedAuthor,
} from "@/src/features/recipe/types"

/** `"community.trending.title"` → 그 네임스페이스 리소스의 잎 값. 없으면 undefined. */
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

/* ── 엘리먼트 트리 읽기 (communityFeedSections.test.ts 와 같은 도구) ────────── */

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

/**
 * 이 엘리먼트가 **실제로 그리는 글자**. 자식 엘리먼트 안의 글자까지 이어 붙인다.
 *
 * 예전에는 `String(child)` 였다 — 중첩된 `V2Text`(예: `최근 글` 라벨 + ` · 제목`)가
 * `"[object Object]"` 로 찍혀, 그 줄이 무엇을 말하는지 테스트가 못 보고 있었다.
 */
const textOf = (element: Element): string => {
  const raw = element.props.children
  return (Array.isArray(raw) ? raw.flat(Infinity) : [raw])
    .map((child) => {
      if (isElement(child)) return textOf(child)
      if (child === null || child === undefined) return ""
      if (typeof child === "boolean") return ""
      return String(child)
    })
    .join("")
}

const allText = (root: Element): string[] =>
  walkDeep(root)
    .filter((el) => el.type === V2Text || el.type === "Text")
    .map(textOf)

/**
 * 어느 한 줄이 그 말을 **담고 있는가**. 정확히 같은 줄을 찾는 `toContain` 과 달리
 * 라벨·중간점이 앞뒤에 붙은 줄(`최근 글 · 제목`)도 잡는다 — 반대로 **없다**를 볼 때는
 * 이쪽이 더 엄격하다(합쳐진 줄 안에 숨어 있어도 찾아낸다).
 */
const says = (text: string[], needle: string): boolean =>
  text.some((line) => line.includes(needle))

/* ── 화면이 보는 바깥 세계 (테스트마다 갈아 끼운다) ────────────────────────── */

const mockRouter = { push: jest.fn() }
/** `useRef(null)` 의 칸 — 목록 핸들이자 정렬 트리거다(위 react 모의 머리말). */
const mockRef = {
  current: {
    scrollToOffset: jest.fn(),
    measureInWindow: (
      callback: (x: number, y: number, width: number, height: number) => void,
    ) => callback(20, 100, 70, 32),
  },
}
/** `useRef(0)` 의 칸 — 화면이 기억하는 스크롤 위치. */
const mockOffsetRef = { current: 0 }
/** 사다리 4번(복구)이 부르는 새로고침. 동일성으로 확인한다. */
const mockRefresh = jest.fn()
/** 훅이 내놓는 "지금 다시 받는 중" — 화면이 스켈레톤으로 옮겨 그리는지 본다. */
let mockIsRunning = false
/** 화면이 사다리에 등록한 것들(`useRegisterTabReset`). */
let mockTabResets: { route: string; target: unknown }[] = []
let mockBlockedAuthors = {
  ids: new Set<number>(),
  unresolvedNames: new Set<string>(),
}
let mockPopularArgs: unknown[][] = []
/** 화면이 `useRefreshable` 에 넘긴 것 — 스피너 오프셋을 여기서 읽는다. */
let mockRefreshableArgs: { spinnerOffset?: number }[] = []

const post = (n: number): CommunityMealPost => ({
  id: String(n),
  authorId: 100 + n,
  isMine: false,
  authorName: `글쓴이${n}`,
  authorRole: "user",
  category: "diet",
  imageUri: null,
  imageUris: [],
  imageObjectPaths: [],
  title: `${n}번째 글`,
  description: "본문",
  likes: n,
  liked: false,
  comments: n * 2,
  views: n * 3,
  rank: null,
  bookmarked: false,
  createdAt: new Date("2026-08-20T00:00:00Z"),
  tags: [],
  vote: null,
})

const posts = (count: number) =>
  Array.from({ length: count }, (_u, i) => post(i + 1))

const suggested = (
  n: number,
  over: Partial<CommunitySuggestedAuthor> = {},
): CommunitySuggestedAuthor => ({
  id: n,
  nickName: `이웃${n}`,
  profileImageUrl: null,
  isFollowing: false,
  badges: ["CKD 3단계"],
  latestPostTitle: `${n}번째 이웃의 최근 글`,
  ...over,
})

type FeedState = {
  posts: CommunityMealPost[]
  isLoading: boolean
  isError: boolean
  error: unknown
  queryKey: unknown
  isPlaceholderData: boolean
  refetch: jest.Mock
  fetchNextPage: jest.Mock
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isFetchNextPageError: boolean
  nextPageError: unknown
  isTailStalled: boolean
  canAutoBackfill: boolean
  noteAutoBackfill: jest.Mock
  resetTail: jest.Mock
}

let mockFeed: FeedState
let mockPopular: {
  data?: CommunityMealPost[]
  isLoading: boolean
  error: unknown
  refetch: jest.Mock
}
let mockSuggested: {
  data?: CommunitySuggestedAuthor[]
  isLoading: boolean
  error: unknown
  refetch: jest.Mock
  setFollowing: jest.Mock
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPopularArgs = []
  mockRefreshableArgs = []
  mockTabResets = []
  mockIsRunning = false
  mockOffsetRef.current = 0
  mockBlockedAuthors = { ids: new Set(), unresolvedNames: new Set() }
  mockFeed = {
    posts: posts(20),
    isLoading: false,
    isError: false,
    error: null,
    queryKey: ["community-posts"],
    isPlaceholderData: false,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: true,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    nextPageError: null,
    isTailStalled: false,
    canAutoBackfill: true,
    noteAutoBackfill: jest.fn(),
    resetTail: jest.fn(),
  }
  mockPopular = {
    data: posts(5),
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }
  mockSuggested = {
    data: [suggested(1), suggested(2), suggested(3)],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    setFollowing: jest.fn(),
  }
})

/** 화면을 함수로 부른다. 렌더러가 아니라 함수 호출이다. */
function screen(): Element {
  const out = (FreePostTab as unknown as (props: unknown) => unknown)({})
  if (!isElement(out)) throw new Error("엘리먼트를 돌려주지 않았다")
  return out
}

const listOf = (root: Element): Element => {
  const [list] = findAll(root, "FlashList")
  if (!list) throw new Error("FlashList 를 못 찾았다")
  return list
}

const headerOf = (root: Element): Element =>
  listOf(root).props.ListHeaderComponent as Element

/** `renderItem` 을 직접 불러 i 번째 셀을 받는다 — 목록이 실제로 그릴 것과 같은 함수다. */
function cellAt(root: Element, index: number): Element {
  const renderItem = listOf(root).props.renderItem as (arg: {
    item: CommunityMealPost
    index: number
  }) => ReactElement
  const data = listOf(root).props.data as CommunityMealPost[]
  return renderItem({ item: data[index], index }) as unknown as Element
}

/* ══ 1 · 머리에는 필터까지만 — WBS 2.1 · D23 · D25 · 2026-08-21 ══════════ */

/** `요즘 이야기 중` 이 사는 셀 — **보이는 세 번째 글**의 셀. */
const trendingCell = (root: Element): Element => cellAt(root, 2)

/** 그 셀 안의 섹션 하나. 없으면 던진다(있다는 것부터 이 함수가 말한다). */
function trendingIn(root: Element): Element {
  const [section] = findAll(trendingCell(root), TrendingPostsSection)
  if (!section) throw new Error("`요즘 이야기 중` 을 못 찾았다")
  return section
}

describe("피드 머리 — 검색 · 스토리 · 밴드, 그리고 끝", () => {
  it("화면 전체에 남은 가로 스크롤러는 **카테고리 칩 하나뿐**이다", () => {
    const horizontals = walkDeep(screen()).filter(
      (el) => el.type === "ScrollView" && el.props.horizontal === true,
    )

    /*
      D25 가 뒤집은 축이다. 인기 카드 레일이 되돌아오면 여기가 2가 된다 —
      "가로가 아예 없다" 로는 못 쓴다(카테고리 칩 레일은 그대로 가로다).
      머리가 아니라 **화면**을 세는 이유는 2026-08-21 에 그 레일이 목록 밖
      스티키 바로 나갔기 때문이다(아래 `필터 바` 표).
    */
    expect(horizontals).toHaveLength(1)
    // 그 하나가 정말 칩 레일인지 — 첫 칩은 `전체` 다.
    expect(allText(horizontals[0])).toContain(koRecipe.feed.all)
  })

  it("**검색도 칩도 정렬도 머리에는 없다** — 셋 다 목록 밖 고정층이다", () => {
    const header = headerOf(screen())
    expect(
      walkDeep(header).filter((el) => el.type === "ScrollView"),
    ).toHaveLength(0)
    expect(findAll(header, CategoryChipRail)).toHaveLength(0)
    expect(findAll(header, SortDropdown)).toHaveLength(0)
    expect(searchEntryIn(header)).toBeUndefined()
  })

  it("고정층 안에서 검색이 **칩 레일보다 위**다", () => {
    /*
      2026-08-21 사용자 판정: "검색도 해당 카테고리바보다 위에 있고 똑같이 스크롤에
      영향을 안 받아야 할 듯". 한동안 검색을 머리 안에 넣어 밀도를 아꼈지만, 그러면
      스크롤한 순간 검색이 **필터 아래**로 사라져 두 도구의 위계가 뒤집힌다.
      (`walkDeep` 은 깊이 우선 선순위라 이 배열의 순서가 곧 그리는 순서다.)
    */
    const pinned = pinnedLayerOf(screen())
    const walked = walkDeep(pinned)
    const search = walked.findIndex(
      (el) => el.props.accessibilityLabel === koRecipe.feed.searchPlaceholder,
    )
    const rail = walked.findIndex((el) => el.type === CategoryChipRail)

    expect(search).toBeGreaterThan(-1)
    expect(rail).toBeGreaterThan(-1)
    expect(search).toBeLessThan(rail)
  })

  it("경계는 고정층 **바닥에 한 줄**뿐이다 — 검색과 칩이 한 덩어리로 읽힌다", () => {
    /*
      검색 줄이나 껍데기가 자기 하단선을 들면 그 둘은 두 덩어리가 된다. 경계는 레일의
      `borderBottom` 하나뿐이고, 그 1px 은 레일의 총 높이 **안쪽**이다.
    */
    const root = screen()
    for (const box of [
      styleOf(pinnedLayerOf(root)),
      styleOf(searchWrapOf(root)),
    ]) {
      expect(box.borderBottomWidth).toBeUndefined()
      expect(box.borderWidth).toBeUndefined()
    }

    // `walkDeep` 은 함수 컴포넌트를 펼치므로 [0]=레일 엘리먼트, [1]=레일이 그린 상자.
    const railBox = walkDeep(filterBarOf(root))[1]
    expect(styleOf(railBox).borderBottomWidth).toBe(borderWidth.thin)
  })

  it("검색 줄과 레일 사이는 **공유 상수** 한 칸이다 — 레시피 탭과 같은 값", () => {
    const box = styleOf(searchWrapOf(screen()))

    expect(box.paddingBottom).toBe(SEARCH_TO_RAIL_GAP)
    expect(box.paddingTop).toBe(SEARCH_TO_RAIL_GAP)
    expect(box.paddingHorizontal).toBe(COMMUNITY_GUTTER)
    // 고정층 총 두께 = 8 + 44 + 8 + 52.
    expect(PINNED_HEADER_HEIGHT).toBe(112)
  })

  it("첫 조회 중에도 검색으로 들어갈 수 있다 — 스켈레톤이 문을 덮지 않는다", () => {
    mockFeed.posts = []
    mockFeed.isLoading = true
    mockFeed.hasNextPage = false
    const root = screen()

    // 스켈레톤은 **머리 안**이고 검색은 그 갈래 밖(고정층)이라 서로를 못 가린다.
    expect(
      walkDeep(headerOf(root)).some(
        (el) => el.type === "CommunityFeedSkeleton",
      ),
    ).toBe(true)
    expect(searchEntryIn(pinnedLayerOf(root))).toBeTruthy()
  })

  it("**`요즘 이야기 중` 은 머리에 없다** — 글보다 위에 서지 않는다", () => {
    /*
      2026-08-21. 이 섹션이 머리에 있으면 한 화면에 읽을 수 있는 글이 **0개**다.
      그리고 템포가 낮은 커뮤니티(운영은 30일에 3편)에서는 상위 3편이 곧 피드 맨 위
      3편이라 같은 글을 두 번 보여 주면서 진짜 피드를 접힘선 아래로 민다.
    */
    expect(findAll(headerOf(screen()), TrendingPostsSection)).toHaveLength(0)
  })

  it("스토리 **뒤**를 밴드가 끊는다 — 첫 글로 흘러들지 않는다", () => {
    // `walkDeep` 은 깊이 우선 **선순위**라 이 배열의 순서가 곧 그리는 순서다.
    const walked = walkDeep(headerOf(screen()))
    const rail = walked.findIndex((el) => el.type === "StoryRail")
    const band = walked.findIndex((el) => el.type === SectionBand)

    expect(rail).toBeGreaterThan(-1)
    expect(band).toBeGreaterThan(-1)
    /*
      예전에는 이 경계를 `요즘 이야기 중` 이 **자기 밴드로 우연히** 만들고 있었다.
      그 섹션이 아래로 내려가자 스토리와 그 뒤가 맞붙었다 — 경계는 어느 섹션의
      사정이 아니라 머리 자신의 것이어야 한다. (칩 레일이 목록 밖으로 나간 뒤에도
      같은 이유로 남는다: 밴드가 없으면 스토리 레일과 첫 글 사이가 그냥 여백이다.)
    */
    expect(band).toBeGreaterThan(rail)
    // 밴드가 머리의 **마지막** 경계다 — 뒤에 다른 밴드가 더 붙지 않는다.
    expect(findAll(headerOf(screen()), SectionBand)).toHaveLength(1)
  })
})

/* ══ 1-B · 필터 바 — 한 줄 · 52 · 목록 밖 고정 (2026-08-21) ═══════════════ */

/** 목록 **밖** 고정층(검색 + 필터). 못 찾으면 던진다. */
function pinnedLayerOf(root: Element): Element {
  const [layer] = childrenOf(root).filter((child) => child.type !== "FlashList")
  if (!layer) throw new Error("고정층을 목록 밖에서 못 찾았다")
  return layer
}

/** 목록 **밖** 형제로 선 필터 바. 못 찾으면 던진다(있다는 것부터 이 함수가 말한다). */
function filterBarOf(root: Element): Element {
  const [bar] = findAll(pinnedLayerOf(root), CategoryChipRail)
  if (!bar) throw new Error("필터 바를 목록 밖에서 못 찾았다")
  return bar
}

/** 검색 입구(누르면 `/community/search` 로 가는 문). 없으면 `undefined`. */
const searchEntryIn = (root: Element): Element | undefined =>
  walkDeep(root).find(
    (el) => el.props.accessibilityLabel === koRecipe.feed.searchPlaceholder,
  )

/** 검색 입구를 **직접** 감싼 상자 — 여백이 사는 자리. */
function searchWrapOf(root: Element): Element {
  const [wrap] = walkDeep(root).filter((el) =>
    childrenOf(el).some(
      (child) =>
        child.props.accessibilityLabel === koRecipe.feed.searchPlaceholder,
    ),
  )
  if (!wrap) throw new Error("검색 입구를 감싼 상자를 못 찾았다")
  return wrap
}

/** style 배열/함수/중첩을 RN 과 같은 순서(뒤가 이김)로 편다. */
function styleOf(element: Element): Record<string, unknown> {
  const flatten = (style: unknown): Record<string, unknown> => {
    if (typeof style === "function") {
      return flatten(
        (style as (s: { pressed: boolean }) => unknown)({ pressed: false }),
      )
    }
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
  return flatten(element.props.style)
}

describe("필터 바 — 목록 밖 형제이지 목록 항목이 아니다", () => {
  it("`FlashList` **앞**에 형제로 선다 — 그래서 스크롤과 함께 안 사라진다", () => {
    const root = screen()
    const kinds = childrenOf(root).map((child) => child.type)

    expect(kinds).toContain("FlashList")
    // 바가 목록보다 앞이다(뒤면 목록 위에 겹쳐 뜨거나 화면 밑으로 내려간다).
    const bar = childrenOf(root).findIndex(
      (child) => findAll(child, CategoryChipRail).length > 0,
    )
    expect(bar).toBeGreaterThan(-1)
    expect(bar).toBeLessThan(kinds.indexOf("FlashList"))
  })

  it("**`stickyHeaderIndices` 를 쓰지 않는다** — 그건 `data` 를 바꾸라는 뜻이다", () => {
    /*
      FlashList v2 의 스티키 헤더는 `data` 의 **인덱스**를 받아 그 항목을 `renderItem`
      으로 다시 그린다(`dist/recyclerview/components/StickyHeaders.js`). 즉 바를 스티키로
      만들려면 바가 목록 항목이 되어야 하고, 그러면 `data` 도 `keyExtractor` 도 빈 목록
      판정도 두 삽입 섹션의 자리도 전부 어긋난다(아래 §3 이 지키는 것들). 이 줄은 그
      되돌림을 막는다.
    */
    expect(listOf(screen()).props.stickyHeaderIndices).toBeUndefined()
  })

  it("한 줄이다 — 왼쪽 칩 + 오른쪽 정렬 필, 그리고 52", () => {
    const bar = filterBarOf(screen())
    expect(bar.props.density).toBe("results")
    expect(categoryChipRailHeight("results")).toBe(52)

    // 정렬은 **고정 슬롯**이다(스크롤 안 `leading` 이 아니다 — 매번 끝까지 밀게 된다).
    const trailing = bar.props.trailing as Element
    expect(trailing.type).toBe(SortDropdown)
    expect(trailing.props.options).toEqual(["recent", "views", "popular"])
    expect(trailing.props.value).toBe("recent")
  })

  it("새로고침 스피너는 그 바 **아래**에서 돈다", () => {
    screen()
    // 고정층이 스피너를 덮으면 당겨도 아무 일이 안 일어난 것처럼 보인다.
    expect(mockRefreshableArgs).toHaveLength(1)
    // 필터 **한 줄**이 아니라 검색까지 포함한 두 줄 전체다.
    expect(mockRefreshableArgs[0]?.spinnerOffset).toBe(PINNED_HEADER_HEIGHT)
    expect(mockRefreshableArgs[0]?.spinnerOffset).toBeGreaterThan(
      categoryChipRailHeight("results"),
    )
  })

  it("카테고리는 서버 키 그대로 올라가고 `전체` 는 `null` 이다", () => {
    const bar = filterBarOf(screen())
    expect(bar.props.allLabel).toBe(koRecipe.feed.all)
    expect(bar.props.value).toBeNull()
    expect(
      (bar.props.items as { key: string; label: string }[]).map((i) => i.key),
    ).toEqual(FREE_POST_CATEGORIES.map((c) => c.key))
  })

  it("**태그 필터 중에는 `전체` 도 안 켜진다** — 켜져 있는 필터는 태그다", () => {
    const root = (FreePostTab as unknown as (p: unknown) => unknown)({
      tagFilter: "저염",
    }) as Element
    const bar = filterBarOf(root)

    // `null` 을 넘기면 `전체` 칩이 켜진다(레일의 계약) — 그건 거짓말이다.
    expect(bar.props.value).not.toBeNull()
    expect(bar.props.value).toBe("#저염")
    // 어떤 카테고리 키와도 안 겹친다.
    expect(FREE_POST_CATEGORIES.map((c) => c.key)).not.toContain(
      bar.props.value,
    )
    // 태그 자신은 레일 **앞**의 잉크 칩으로 선다.
    const leading = bar.props.leading as Element
    expect(leading.props.label).toBe("#저염")
    expect(leading.props.tone).toBe("neutral")
    expect(leading.props.selected).toBe(true)
    // 카테고리 칩과 달리 지울 수 있다.
    expect(typeof leading.props.onRemove).toBe("function")
  })

  it("태그가 없으면 앞 슬롯은 비어 있다", () => {
    expect(filterBarOf(screen()).props.leading).toBeNull()
  })
})

describe("필터를 바꾸면 목록은 **맨 위**로 돌아간다", () => {
  it("카테고리를 고르면 스크롤이 0 으로 간다", () => {
    const bar = filterBarOf(screen())
    ;(bar.props.onChange as (key: string | null) => void)("diet")

    expect(mockRef.current.scrollToOffset).toHaveBeenCalledWith({
      offset: 0,
      // 애니메이션 스크롤은 지나가는 모든 행을 마운트한다 — 어차피 내용이 갈린다.
      animated: false,
    })
  })

  it("정렬을 바꾸면 스크롤이 0 으로 간다", () => {
    const trailing = filterBarOf(screen()).props.trailing as Element
    ;(trailing.props.onChange as (mode: string) => void)("views")

    expect(mockRef.current.scrollToOffset).toHaveBeenCalledWith({
      offset: 0,
      animated: false,
    })
  })

  it("**같은 정렬을 다시 고르면 아무 일도 안 일어난다**", () => {
    // 이미 `recent` 다. 같은 값으로 쿼리를 다시 세우고 스크롤을 튕기면 그냥 손해다.
    const trailing = filterBarOf(screen()).props.trailing as Element
    ;(trailing.props.onChange as (mode: string) => void)("recent")

    expect(mockRef.current.scrollToOffset).not.toHaveBeenCalled()
  })

  it("태그 칩을 지워도 맨 위로 돌아간다 — 결과가 통째로 갈리는 것은 같다", () => {
    const cleared: (string | null)[] = []
    const root = (FreePostTab as unknown as (p: unknown) => unknown)({
      tagFilter: "저염",
      onTagFilterChange: (tag: string | null) => cleared.push(tag),
    }) as Element
    const leading = filterBarOf(root).props.leading as Element
    ;(leading.props.onRemove as () => void)()

    expect(cleared).toEqual([null])
    expect(mockRef.current.scrollToOffset).toHaveBeenCalledWith({
      offset: 0,
      animated: false,
    })
  })

  it("**기억한 위치도 같이 0 이 된다** — 안 그러면 다음 탭 재탭이 새로고침에 못 간다", () => {
    /*
      `scrollToOffset` 은 비동기다. 필터를 바꿔 위로 보낸 직후에도 그 전에 출발한
      `onScroll` 이 늦게 도착해 옛 위치를 덮어쓰면, 사다리가 "아직 맨 위가 아니다" 로
      보고해 3번(맨 위로)에 계속 머문다. 두 경로가 같은 처방을 지나야 한다.
    */
    const root = screen()
    scrollTo(root, 640)
    expect(isAtScrollTop(mockOffsetRef.current)).toBe(false)
    ;(filterBarOf(root).props.onChange as (key: string | null) => void)("diet")

    expect(isAtScrollTop(mockOffsetRef.current)).toBe(true)
  })
})

/* ══ 4 · 탭 재탭 사다리 3·4번 — 2026-08-21 ═══════════════════════════════ */

/**
 * 화면이 `커뮤니티` 이름으로 등록한 것. 없으면 던진다.
 *
 * 등록은 **화면을 부른 부작용**이라 트리에서 찾을 것이 없다. 그래도 `root` 를 받는
 * 이유는 호출부가 `screen()` 을 먼저 부르도록 강제하기 위해서다 — 안 그러면 직전
 * 테스트가 남긴 등록을 읽고도 초록이 된다.
 */
function tabResetOf(root: Element): {
  content?: { isAtRoot: () => boolean; reset: () => void }
  recover?: () => void
} {
  void root
  const [entry] = mockTabResets.filter((item) => item.route === "community")
  if (!entry) throw new Error("`커뮤니티` 로 등록된 리셋이 없다")
  return entry.target as ReturnType<typeof tabResetOf>
}

/** 목록을 y 만큼 내린 것처럼 `onScroll` 을 직접 발화시킨다. */
function scrollTo(root: Element, y: number): void {
  const onScroll = listOf(root).props.onScroll as (event: {
    nativeEvent: { contentOffset: { y: number } }
  }) => void
  onScroll({ nativeEvent: { contentOffset: { y } } })
}

describe("탭 재탭 — 맨 위로(3번)와 복구(4번)를 화면이 등록한다", () => {
  it("`커뮤니티` 라는 **탭 라우트 이름**으로 등록한다", () => {
    screen()
    // 이름이 어긋나면 사다리는 이 화면을 영영 못 찾고 2번에서 멈춘 채로 남는다.
    expect(mockTabResets.map((item) => item.route)).toEqual(["community"])
  })

  it("스크롤 위치를 **ref 로** 기억한다 — 16ms 스로틀", () => {
    const root = screen()
    expect(listOf(root).props.scrollEventThrottle).toBe(16)

    scrollTo(root, 320)
    expect(mockOffsetRef.current).toBe(320)
  })

  it("맨 위인지 판정은 **`isAtScrollTop`** 이 한다 — 화면이 다시 적지 않는다", () => {
    const root = screen()
    const { content } = tabResetOf(root)

    expect(content?.isAtRoot()).toBe(true)
    scrollTo(root, 320)
    expect(content?.isAtRoot()).toBe(false)

    /*
      `offset === 0` 으로 적었다면 여기서 깨진다. iOS 바운스는 0 이 아니라 0.5 에서
      멈추고 안드로이드 오버스크롤은 음수를 남긴다 — 그 여유값은 `tabReset.ts` 것이다.
    */
    scrollTo(root, SCROLL_TOP_EPSILON_PT)
    expect(content?.isAtRoot()).toBe(true)
    scrollTo(root, -12)
    expect(content?.isAtRoot()).toBe(true)
  })

  it("리셋은 **애니메이션**이다 — 필터 전환의 순간이동을 재사용하지 않는다", () => {
    /*
      순간이동하면 목록이 그대로인 채 자리만 바뀌어 어디로 갔는지 알 수 없고,
      스크린리더 커서도 화면을 따라가지 못한다(`EndOfListRow` 머리말 §접근성).
    */
    tabResetOf(screen()).content?.reset()
    expect(mockRef.current.scrollToOffset).toHaveBeenCalledWith({
      offset: 0,
      animated: true,
    })
  })

  it("**리셋 뒤에는 기억한 위치도 0 이다** — 두 번째 재탭이 헛돌지 않는다", () => {
    const root = screen()
    const { content } = tabResetOf(root)

    scrollTo(root, 640)
    expect(content?.isAtRoot()).toBe(false)

    // 3번(맨 위로)이 돈다.
    content?.reset()
    /*
      여기가 함정이다. `scrollToOffset` 이 비동기라 늦게 도착한 `onScroll` 이 옛 위치를
      되살리면, 다음 재탭이 다시 3번에 머물러 **아무것도 움직이지 않는 스크롤에 햅틱만**
      붙는다. 이 동기 쓰기는 그것을 막는다(`scrollToTop` 머리말).
    */
    expect(content?.isAtRoot()).toBe(true)
  })

  it("**멀쩡한 피드는 4번을 등록하지 않는다** — 재탭이 다시 받지 않는다", () => {
    /*
      2026-08-21 에 뒤집힌 결정. 예전 단언은 `expect(refresh).toBe(mockRefresh)` 였고,
      멀쩡한 화면에서도 그 칸이 채워져 있었다 — 그래서 두 번째 재탭이 곧바로
      새로고침 스피너로 떨어졌다(실기기 신고). 탭 탭은 이동 제스처다.
    */
    expect(tabResetOf(screen()).recover).toBeUndefined()
  })

  it("전면 오류가 서 있을 때만 4번이 살고, 그것은 화면의 새로고침 **그 함수**다", () => {
    // `communityFeedSurfaces` 가 `failed` 를 켜는 조합: 실패 + 받아 둔 글 0.
    mockFeed.isError = true
    mockFeed.posts = []
    const { recover } = tabResetOf(screen())
    expect(recover).toBe(mockRefresh)

    recover?.()
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it("복구 중에는 오류면 자리에 **스켈레톤**이 선다 — 그것이 유일한 피드백이다", () => {
    /*
      프로그램 새로고침은 `RefreshControl` 을 켜지 않는다(켜면 iOS 가 스크롤을 밀어
      두고 되돌리지 않아 여백이 쌓인다 — `useRefreshable` 머리말 4번). 그래서 "다시
      받는 중" 을 말할 자리가 화면에 하나도 없었다. 훅의 `isRunning` 이 그 자리를
      화면이 이미 들고 있는 첫 조회 스켈레톤으로 옮긴다.
    */
    mockFeed.isError = true
    mockFeed.posts = []
    const failed = screen()
    // 복구 전: 오류면이 빈 자리를 차지하고 스켈레톤은 없다.
    expect(listOf(failed).props.ListEmptyComponent).not.toBeNull()
    expect(
      walkDeep(headerOf(failed)).some(
        (el) => el.type === "CommunityFeedSkeleton",
      ),
    ).toBe(false)

    mockIsRunning = true
    const recovering = screen()
    expect(
      walkDeep(headerOf(recovering)).some(
        (el) => el.type === "CommunityFeedSkeleton",
      ),
    ).toBe(true)
    // 스켈레톤이 서면 빈 자리도 꼬리도 침묵한다(`communityFeedSurfaces`).
    expect(listOf(recovering).props.ListEmptyComponent).toBeNull()
    expect(listOf(recovering).props.ListFooterComponent).toBeNull()
  })
})

/* ══ 5 · 목록의 끝 — 2026-08-21 ══════════════════════════════════════════ */

describe("목록 끝 — 침묵하던 자리가 말한다", () => {
  /** 꼬리가 `"end"` 가 되는 조합: 그릴 줄이 있고, 다음 커서가 없고, 전환 중이 아니다. */
  const atEnd = () => {
    mockFeed.hasNextPage = false
    return listOf(screen()).props.ListFooterComponent as Element
  }

  it("끝에 닿으면 한 줄로 말하고 `맨 위로` 를 같이 준다", () => {
    const footer = atEnd()

    expect(footer.type).toBe(EndOfListRow)
    expect(footer.props.label).toBe(koRecipe.feed.endOfList)
    expect(footer.props.actionLabel).toBe(koRecipe.feed.backToTop)
  })

  it('**갈래가 이어져 있다** — `"end"` 에서 조용히 아무것도 안 그리지 않는다', () => {
    /*
      삼항 사슬이 `"end"` 를 모르면 크래시 없이 `null` 로 떨어진다. 그러면 "다 봤다" 와
      "더 못 불러왔다" 가 다시 같은 그림이 된다 — 그 침묵이 이 작업이 지운 결함이다.
    */
    expect(atEnd()).not.toBeNull()
    expect(
      communityFeedSurfaces({
        showSkeleton: false,
        isError: false,
        postCount: 20,
        visibleCount: 20,
        isPlaceholderData: false,
        hasNextPage: false,
        isFetchingNextPage: false,
        isFetchNextPageError: false,
        isTailStalled: false,
        canAutoBackfill: true,
      }).tail,
    ).toBe("end")
  })

  it("`맨 위로` 도 애니메이션이고, 기억한 위치를 같이 0 으로 둔다", () => {
    mockFeed.hasNextPage = false
    const root = screen()
    scrollTo(root, 2400)
    const footer = listOf(root).props.ListFooterComponent as Element
    ;(footer.props.onPressAction as () => void)()

    expect(mockRef.current.scrollToOffset).toHaveBeenCalledWith({
      offset: 0,
      animated: true,
    })
    expect(isAtScrollTop(mockOffsetRef.current)).toBe(true)
  })

  it("다음 장이 남아 있으면 끝 표시는 없다 — 거짓말이 된다", () => {
    // 기본 조합(`hasNextPage: true`)에서는 꼬리가 침묵한다.
    expect(listOf(screen()).props.ListFooterComponent).toBeNull()
  })
})

describe("`요즘 이야기 중` — 세 번째 글 다음, 딱 한 번", () => {
  it("스무 줄을 다 그려도 섹션은 **하나**이고 그 자리는 3번째 뒤다", () => {
    const root = screen()
    const data = listOf(root).props.data as CommunityMealPost[]

    const indexes = data
      .map((_item, index) => index)
      .filter(
        (index) =>
          findAll(cellAt(root, index), TrendingPostsSection).length > 0,
      )
    expect(indexes).toEqual([2])
  })

  it("셀 안에서 **글 다음**에 온다 — 글을 밀어내지 않는다", () => {
    const kinds = childrenOf(trendingCell(screen())).map((child) => child.type)
    expect(kinds[0]).toBe("View") // 글 한 줄을 감싼 자리
    expect(kinds[1]).toBe(TrendingPostsSection)
  })

  it("글이 셋보다 적으면 서지 않는다", () => {
    mockFeed.posts = posts(2)
    const root = screen()
    const found = [0, 1].flatMap((index) =>
      findAll(cellAt(root, index), TrendingPostsSection),
    )
    expect(found).toHaveLength(0)
  })

  it("**보이는** 세 번째 뒤다 — 차단으로 접힌 글은 세지 않는다", () => {
    // 앞의 두 글이 차단으로 접히면, 원본 5번째 글이 보이는 3번째가 된다.
    mockBlockedAuthors = {
      ids: new Set([101, 102]),
      unresolvedNames: new Set(),
    }
    const root = screen()
    const data = listOf(root).props.data as CommunityMealPost[]
    expect(data[2].title).toBe("5번째 글")
    expect(findAll(cellAt(root, 2), TrendingPostsSection)).toHaveLength(1)
  })

  it("인기 5건이 **세로 3행**으로 서고 순위는 섹션이 매긴다", () => {
    const section = trendingIn(screen())

    // 화면은 자르지 않고 넘긴다 — 자르는 쪽은 섹션이다(`TRENDING_POST_COUNT`).
    expect(section.props.posts).toHaveLength(5)
    expect(section.props.posts).toEqual([
      { id: "1", title: "1번째 글", commentCount: 2 },
      { id: "2", title: "2번째 글", commentCount: 4 },
      { id: "3", title: "3번째 글", commentCount: 6 },
      { id: "4", title: "4번째 글", commentCount: 8 },
      { id: "5", title: "5번째 글", commentCount: 10 },
    ])

    const text = allText(section)
    expect(text).toContain(koCommon.community.trending.title)
    for (let rank = 1; rank <= TRENDING_POST_COUNT; rank += 1) {
      expect(text).toContain(String(rank))
      expect(text).toContain(`${rank}번째 글`)
    }
    // 4·5위는 그리지 않는다 — 세 줄이 상한이다. (합쳐진 줄 안에 숨어도 잡는다.)
    expect(says(text, "4번째 글")).toBe(false)
  })

  it("인기 API 를 먹는다 — 로드된 페이지의 인기가 아니다", () => {
    screen()
    /*
      `"realtime"` 을 기대하던 줄이었다. 화면은 `"month"` 를 부르는데 아무도 이 줄을
      같이 옮기지 않아 **이 작업 전부터 빨간 상태로 남아 있었다** — 카피가
      `실시간 인기글` → `요즘 이야기 중` 으로 바뀐 것과 같은 변경의 반쪽이다.
      기간이 뜻하는 것을 여기서 다시 정하지 않고, **화면이 실제로 부르는 것**을 못 박는다.
    */
    expect(mockPopularArgs[0]).toEqual(["month", null, 5])
  })

  it("행을 누르면 그 글로, 헤더를 누르면 인기글 화면으로 간다", () => {
    const section = trendingIn(screen())

    ;(section.props.onPressPost as (p: { id: string }, r: number) => void)(
      { id: "3" },
      3,
    )
    expect(mockRouter.push).toHaveBeenCalledWith("/post/3")
    ;(section.props.onPressAll as () => void)()
    expect(mockRouter.push).toHaveBeenCalledWith("/(tabs)/community-popular")
  })

  it("차단한 사람의 인기글은 3행에 안 온다", () => {
    mockBlockedAuthors = {
      ids: new Set([101, 102]),
      unresolvedNames: new Set(),
    }
    const section = trendingIn(screen())
    expect(
      (section.props.posts as { title: string }[]).map((p) => p.title),
    ).toEqual(["3번째 글", "4번째 글", "5번째 글"])
  })

  it("**빈 인기 목록은 밴드째로 접힌다** — 구분선 한 줄도 안 남는다", () => {
    mockPopular.data = []
    const section = trendingIn(screen())

    // 섹션이 스스로 null 을 돌려준다 — 화면이 그 판정을 다시 하지 않는다.
    const drawn = (TrendingPostsSection as unknown as (p: unknown) => unknown)(
      section.props,
    )
    expect(drawn).toBeNull()
  })

  it("**실패는 한 줄로 말한다** — 전면 오류 판이 아니다", () => {
    mockPopular = {
      data: undefined,
      isLoading: false,
      error: new Error("network down"),
      refetch: jest.fn(),
    }
    const section = trendingIn(screen())

    expect(section.props.failure).toBeTruthy()
    const lines = findAll(section, SectionErrorLine)
    expect(lines).toHaveLength(1)
    // 재시도가 있고, 누르면 인기 쿼리를 다시 받는다.
    expect(allText(section)).toContain(koCommon.action.retry)
    ;(section.props.onRetry as () => void)()
    expect(mockPopular.refetch).toHaveBeenCalledTimes(1)
    // 순위 행은 하나도 없다.
    expect(allText(section)).not.toContain("1번째 글")
  })

  it("문구와 재시도 여부는 **진짜 오류 판정**에서 온다 — 상수가 아니다", () => {
    const retryable = new Error("network down")
    const gone = new ApiError("삭제됨", "COMMUNITY_ERROR_001", 404)

    mockPopular = {
      data: undefined,
      isLoading: false,
      error: retryable,
      refetch: jest.fn(),
    }
    const a = trendingIn(screen())

    mockPopular = {
      data: undefined,
      isLoading: false,
      error: gone,
      refetch: jest.fn(),
    }
    const b = trendingIn(screen())

    // 두 실패는 서로 다른 문구를 갖는다 — 한 문구를 박아 두면 이 줄이 깨진다.
    expect(a.props.failure).not.toEqual(b.props.failure)
    // 지워진 글에는 다시 눌러도 될 일이 없다 → 재시도 버튼이 없다.
    expect(allText(a)).toContain(koCommon.action.retry)
    expect(allText(b)).not.toContain(koCommon.action.retry)
  })

  it("첫 로드 중에는 **행 리듬 스켈레톤**이다 — 링 스피너는 없다", () => {
    mockPopular = {
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    }
    const section = trendingIn(screen())

    expect(findAll(section, "V2SkeletonGroup")).toHaveLength(1)
    // 링 스피너 금지(전역 §0.2) — 스켈레톤이 도착할 자리를 미리 잡는다.
    expect(findAll(section, "ActivityIndicator")).toHaveLength(0)
    expect(findAll(section, SectionErrorLine)).toHaveLength(0)
  })

  it("데이터를 이미 들고 있으면 실패해도 3행을 계속 그린다", () => {
    mockPopular = {
      data: posts(5),
      isLoading: false,
      error: new Error("refetch failed"),
      refetch: jest.fn(),
    }
    const section = trendingIn(screen())
    expect(allText(section)).toContain("1번째 글")
    expect(findAll(section, SectionErrorLine)).toHaveLength(0)
  })

  it("**밴드가 위아래로 선다** — 다음 글로 흘러들지 않는다", () => {
    /*
      이 섹션은 이제 피드 한가운데다. 위만 끊으면 마지막 순위 행과 네 번째 글 사이에
      남는 것은 목록 분리자 10px 뿐이다 — 그건 경계가 아니라 여백이다.
    */
    expect(findAll(trendingIn(screen()), SectionBand)).toHaveLength(2)
  })
})

/* ══ 2 · 이웃 추천의 삽입 — WBS 2.2 · D25 ════════════════════════════════ */

describe("`비슷한 단계의 이웃` — 여덟 번째 글 다음, 딱 한 번", () => {
  it("스무 줄을 다 그려도 추천 섹션은 **하나**다 — 그리고 그 자리는 8번째 뒤다", () => {
    const root = screen()
    const data = listOf(root).props.data as CommunityMealPost[]

    const indexesWithSection = data
      .map((_item, index) => index)
      .filter(
        (index) =>
          findAll(cellAt(root, index), NeighborSuggestionSection).length > 0,
      )

    // 반복 삽입은 참여 유도 패턴이다 — 환자들이 의지하는 피드에 소음을 더한다(D25).
    expect(indexesWithSection).toEqual([7])
  })

  it("머리(`ListHeaderComponent`)에는 없다 — 글 8행 **뒤**여야 한다", () => {
    expect(findAll(headerOf(screen()), NeighborSuggestionSection)).toHaveLength(
      0,
    )
  })

  it("셀 안에서 **글 다음**에 온다 — 글을 밀어내지 않는다", () => {
    const cell = cellAt(screen(), 7)
    const kinds = childrenOf(cell).map((child) => child.type)
    expect(kinds[0]).toBe("View") // 글 한 줄을 감싼 자리
    expect(kinds[1]).toBe(NeighborSuggestionSection)
  })

  it("글이 여덟보다 적으면 서지 않는다 — 피드가 팔로우 권유에 밀리지 않게", () => {
    mockFeed.posts = posts(7)
    const root = screen()
    const found = [0, 1, 2, 3, 4, 5, 6].flatMap((index) =>
      findAll(cellAt(root, index), NeighborSuggestionSection),
    )
    expect(found).toHaveLength(0)
  })

  it("**보이는** 여덟 번째 뒤다 — 차단으로 접힌 글은 세지 않는다", () => {
    // 앞의 두 글이 차단으로 접히면, 원본 10번째 글이 보이는 8번째가 된다.
    mockBlockedAuthors = {
      ids: new Set([101, 102]),
      unresolvedNames: new Set(),
    }
    const root = screen()
    const data = listOf(root).props.data as CommunityMealPost[]
    expect(data[7].title).toBe("10번째 글")
    expect(findAll(cellAt(root, 7), NeighborSuggestionSection)).toHaveLength(1)
  })

  it("**두 삽입은 붙지 않는다** — 사이에 글 다섯 편이 남는다", () => {
    /*
      2026-08-21. `요즘 이야기 중` 이 세 번째 글 뒤로 내려오면서 예전 오프셋 4 는 두
      끼어드는 블록이 **글 한 편을 사이에 두고** 서는 자리가 됐다. 그 한 편은 피드가
      아니라 두 블록 사이의 구분선처럼 읽힌다.
    */
    const root = screen()
    const data = listOf(root).props.data as CommunityMealPost[]
    const at = (type: unknown) =>
      data
        .map((_item, index) => index)
        .filter((index) => findAll(cellAt(root, index), type).length > 0)

    const [trending] = at(TrendingPostsSection)
    const [neighbors] = at(NeighborSuggestionSection)
    /*
      인기 3행은 `trending` 번째 글 **다음**에, 이웃은 `neighbors` 번째 글 **다음**에
      선다. 그 사이에 온전히 남는 글은 `neighbors − trending` 편이다 —
      `neighbors` 번째 글 자신이 이웃 블록보다 **앞에** 그려지므로 그것도 사이에 든다.
    */
    expect(neighbors - trending).toBe(5)
  })

  it("**밴드가 위아래로 선다** — 다음 글로 흘러들지 않는다", () => {
    const [section] = findAll(cellAt(screen(), 7), NeighborSuggestionSection)
    expect(findAll(section, SectionBand)).toHaveLength(2)
  })

  it("두 행을 그리고 각 행이 **최근 글 제목**을 말한다", () => {
    const [section] = findAll(cellAt(screen(), 7), NeighborSuggestionSection)
    expect(section.props.authors).toHaveLength(NEIGHBOR_SUGGESTION_COUNT)

    const text = allText(section)
    expect(text).toContain(koCommon.community.neighbors.title)
    expect(text).toContain("이웃1")
    /*
      `toContain`(줄 전체 일치)이 아니라 `says`(줄이 담고 있는가)다 — 제목 줄은 앞에
      `최근 글 ·` 라벨을 달고 그려지므로(그 라벨은 이 작업 밖에서 붙었다) 줄 전체와는
      같지 않다. 여기서 지키는 것은 **행이 최근 글 제목을 말한다**이지 그 줄의 정확한
      조판이 아니다.
    */
    expect(says(text, "1번째 이웃의 최근 글")).toBe(true)
    expect(says(text, "2번째 이웃의 최근 글")).toBe(true)
    // 셋째는 잘린다.
    expect(says(text, "이웃3")).toBe(false)
  })

  it("**최근 글 제목을 모르는 행은 안 그린다** — 서버가 그 칸을 안 보내면 접힌다", () => {
    mockSuggested.data = [
      suggested(1, { latestPostTitle: null }),
      suggested(2, { latestPostTitle: null }),
    ]
    const [section] = findAll(cellAt(screen(), 7), NeighborSuggestionSection)

    expect(section.props.authors).toEqual([])
    /*
      제목이 없는 행을 그리면 그 섹션은 D25 가 버린 형태(근거 없는 팔로우 권유)로
      되돌아간다. 접는 쪽이 정직하다 — 섹션이 스스로 null 을 돌려준다.
    */
    expect(
      (NeighborSuggestionSection as unknown as (p: unknown) => unknown)(
        section.props,
      ),
    ).toBeNull()
  })

  it("제목이 있는 행만 골라 채운다 — 앞이 접혀도 두 행이 선다", () => {
    mockSuggested.data = [
      suggested(1, { latestPostTitle: null }),
      suggested(2),
      suggested(3),
      suggested(4),
    ]
    const [section] = findAll(cellAt(screen(), 7), NeighborSuggestionSection)
    expect(
      (section.props.authors as { name: string }[]).map((a) => a.name),
    ).toEqual(["이웃2", "이웃3"])
  })

  it("차단한 사람은 추천에도 안 뜬다 — 서버 재조회 전 한 박자를 메운다", () => {
    mockBlockedAuthors = { ids: new Set([1]), unresolvedNames: new Set() }
    const [section] = findAll(cellAt(screen(), 7), NeighborSuggestionSection)
    expect(
      (section.props.authors as { name: string }[]).map((a) => a.name),
    ).toEqual(["이웃2", "이웃3"])
  })

  it("id 를 못 푼 차단(이름 축)도 같은 판정에 걸린다", () => {
    mockBlockedAuthors = {
      ids: new Set<number>(),
      unresolvedNames: new Set(["이웃2"]),
    }
    const [section] = findAll(cellAt(screen(), 7), NeighborSuggestionSection)
    expect(
      (section.props.authors as { name: string }[]).map((a) => a.name),
    ).toEqual(["이웃1", "이웃3"])
  })

  it("행을 누르면 그 작성자의 프로필로 간다", () => {
    const [section] = findAll(cellAt(screen(), 7), NeighborSuggestionSection)
    ;(section.props.onPressAuthor as (a: { id: string }) => void)({ id: "2" })
    expect(mockRouter.push).toHaveBeenCalledWith("/community/author/2")
  })

  it("팔로우는 **절대 상태**로 나간다 — 뒤집으라고 하지 않는다", () => {
    const [section] = findAll(cellAt(screen(), 7), NeighborSuggestionSection)
    const toggle = section.props.onToggleFollow as (a: unknown) => void

    toggle({ id: "2", following: false })
    expect(mockSuggested.setFollowing).toHaveBeenCalledWith(2, true)

    toggle({ id: "2", following: true })
    expect(mockSuggested.setFollowing).toHaveBeenCalledWith(2, false)
  })

  it("이미 팔로우한 행도 **그 자리에** 남는다(버튼만 `팔로잉`)", () => {
    mockSuggested.data = [suggested(1, { isFollowing: true }), suggested(2)]
    const [section] = findAll(cellAt(screen(), 7), NeighborSuggestionSection)

    // 걸러지지도 뒤로 밀리지도 않는다.
    expect(
      (section.props.authors as { name: string }[]).map((a) => a.name),
    ).toEqual(["이웃1", "이웃2"])
    const [first, second] = findAll(section, FollowButton)
    expect(first.props.following).toBe(true)
    expect(second.props.following).toBe(false)
    expect(allText(section)).toContain(koCommon.community.author.unfollow)
  })

  it("추천도 첫 로드 중에는 스켈레톤이다 — 링 스피너는 없다", () => {
    mockSuggested = {
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
      setFollowing: jest.fn(),
    }
    const [section] = findAll(cellAt(screen(), 7), NeighborSuggestionSection)

    expect(findAll(section, "V2SkeletonGroup")).toHaveLength(1)
    expect(findAll(section, "ActivityIndicator")).toHaveLength(0)
  })

  it("추천이 실패하면 그 자리에서 한 줄로 말하고 재시도가 붙는다", () => {
    mockSuggested = {
      data: undefined,
      isLoading: false,
      error: new Error("boom"),
      refetch: jest.fn(),
      setFollowing: jest.fn(),
    }
    const [section] = findAll(cellAt(screen(), 7), NeighborSuggestionSection)

    expect(findAll(section, SectionErrorLine)).toHaveLength(1)
    ;(section.props.onRetry as () => void)()
    expect(mockSuggested.refetch).toHaveBeenCalledTimes(1)
  })
})

/* ══ 3 · 목록 계약이 삽입 전과 같다 — 이 선택의 값어치 ═════════════════════ */

describe("추천 행은 **목록 항목이 아니다** — 페이지네이션 계약이 그대로다", () => {
  it("`data` 에는 글만 담긴다 — 길이도 내용도 보이는 글 그대로", () => {
    const list = listOf(screen())
    const data = list.props.data as CommunityMealPost[]

    expect(data).toHaveLength(20)
    // 합성 항목이 하나라도 섞이면 `title` 없는 원소가 생긴다.
    expect(data.every((item) => typeof item.title === "string")).toBe(true)
    expect(data.map((item) => item.id)).toEqual(
      posts(20).map((item) => item.id),
    )
  })

  it("`keyExtractor` 는 글 id 그대로다 — 합성 키가 없다", () => {
    const list = listOf(screen())
    const keyExtractor = list.props.keyExtractor as (
      item: CommunityMealPost,
      index: number,
    ) => string
    const data = list.props.data as CommunityMealPost[]
    const keys = data.map(keyExtractor)

    expect(keys).toEqual(data.map((item) => String(item.id)))
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys.some((key) => /neighbor|suggest/iu.test(key))).toBe(false)
  })

  it("**빈 목록은 여전히 빈 목록이다** — 추천 행이 빈 상태를 가리지 않는다", () => {
    // 차단 필터가 첫 페이지를 통째로 접은 상황.
    mockFeed.posts = posts(3)
    mockBlockedAuthors = {
      ids: new Set([101, 102, 103]),
      unresolvedNames: new Set(),
    }
    mockFeed.hasNextPage = false
    const list = listOf(screen())

    expect(list.props.data).toEqual([])
    /*
      항목 목록에 추천을 끼웠다면 여기서 길이가 1이 되어 `ListEmptyComponent` 도
      자동 backfill 도 영영 안 돈다 — 화면이 추천 2행만 띄운 채 굳는다.
    */
    expect(list.props.ListEmptyComponent).toBeTruthy()
  })

  it("빈 목록 + 다음 커서면 **자동 backfill 이 그대로 돈다**", () => {
    mockFeed.posts = []
    const root = screen()

    expect(mockFeed.noteAutoBackfill).toHaveBeenCalledTimes(1)
    expect(mockFeed.fetchNextPage).toHaveBeenCalledTimes(1)
    /*
      그동안 빈 자리는 **침묵한다** — "아직 글이 없어요" 는 다음 커서가 살아 있는 한
      데이터에 대한 거짓말이고, 스스로 메우는 중이라 그 침묵은 정직하다
      (`communityFeedSurfaces` · `communityFeedSilentStates.test.ts` 의 판정).
    */
    expect(listOf(root).props.ListEmptyComponent).toBeNull()
  })

  it("backfill 예산을 다 쓰면 자동으로 더 받지 않고 사용자에게 고르게 한다", () => {
    mockFeed.posts = []
    mockFeed.canAutoBackfill = false
    const root = screen()

    expect(mockFeed.fetchNextPage).not.toHaveBeenCalled()
    expect((listOf(root).props.ListEmptyComponent as Element).type).toBe(
      "LoadMoreRow",
    )
  })

  it("`onEndReached` 의 판정이 그대로다 — 열려 있으면 받고, 실패한 뒤엔 안 받는다", () => {
    const open = listOf(screen()).props.onEndReached as () => void
    open()
    expect(mockFeed.fetchNextPage).toHaveBeenCalledTimes(1)

    jest.clearAllMocks()
    mockFeed.isFetchNextPageError = true
    ;(listOf(screen()).props.onEndReached as () => void)()
    expect(mockFeed.fetchNextPage).not.toHaveBeenCalled()

    jest.clearAllMocks()
    mockFeed.isFetchNextPageError = false
    mockFeed.isPlaceholderData = true
    ;(listOf(screen()).props.onEndReached as () => void)()
    expect(mockFeed.fetchNextPage).not.toHaveBeenCalled()
  })

  it("첫 로드 중에는 머리가 통째로 스켈레톤이다 — 두 섹션 다 안 선다", () => {
    /*
      세 자리(스토리·인기·목록)가 한꺼번에 도착하면 화면이 크게 튄다. 그래서 머리는
      섹션들을 그리는 대신 `CommunityFeedSkeleton` 한 장으로 자리를 잡는다 —
      이 작업이 섹션을 끼우면서 그 규칙을 비껴가지 않았음을 본다.
    */
    mockFeed.posts = []
    mockFeed.isLoading = true
    mockFeed.hasNextPage = false
    const header = headerOf(screen())

    expect(
      walkDeep(header).some((el) => el.type === "CommunityFeedSkeleton"),
    ).toBe(true)
    expect(findAll(header, TrendingPostsSection)).toHaveLength(0)
    expect(findAll(header, NeighborSuggestionSection)).toHaveLength(0)
    expect(walkDeep(header).some((el) => el.type === "StoryRail")).toBe(false)
  })
})
