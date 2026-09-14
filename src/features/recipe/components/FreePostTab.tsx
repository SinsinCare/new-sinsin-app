import { borderWidth } from "@/src/design-system-v2/tokens/size"
import { typography } from "@/src/design-system-v2/tokens"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
// 리사이클링 리스트 — 피드는 ScrollView+map 대신 FlashList(v2, 추정치 불필요)
import { FlashList, type FlashListRef } from "@shopify/flash-list"
import { type Href } from "expo-router"
import {
  isAtScrollTop,
  useAppRouter,
  useRegisterTabReset,
} from "@/src/shared/navigation"
import { useQueryClient } from "@tanstack/react-query"

import { useSurface } from "@/src/hooks/useSurface"
import { hapticSelection } from "@/src/lib/haptics"
import { resolveError } from "@/src/lib/errorMessage"
import { useRefreshable, useRevalidateOnReturn } from "@/src/shared/refresh"
import { V2Chip } from "@/src/design-system-v2/components/V2Chip"
import {
  V2ErrorState,
  V2LoadingState,
  type V2ErrorStateRetry,
} from "@/src/design-system-v2"
import { COMMUNITY_FEED_REFRESH } from "../refresh/scopes"
import { CommunityFeedSkeleton } from "./CommunityFeedSkeleton"
import { EndOfListRow } from "./EndOfListRow"
import { LoadMoreRow } from "./LoadMoreRow"
import { NextPageErrorRow } from "./NextPageErrorRow"
import { PostListItem } from "./PostListItem"
import { StoryRail } from "./StoryRail"
import {
  CategoryChipRail,
  categoryChipRailHeight,
} from "./community/CategoryChipRail"
import { SortDropdown } from "./community/SortDropdown"
import { COMMUNITY_GUTTER } from "./community/communityLayout"
import {
  NEIGHBOR_SUGGESTION_COUNT,
  NeighborSuggestionSection,
  type NeighborSuggestion,
} from "./community/NeighborSuggestionSection"
import {
  TrendingPostsSection,
  type TrendingPost,
} from "./community/TrendingPostsSection"
import { FREE_POST_CATEGORIES } from "../data/freePostCategories"
import { useCommunityPosts } from "../hooks/useCommunityPosts"
import { useCommunityPopularPosts } from "../hooks/useCommunityPopularPosts"
import { useSuggestedAuthors } from "../hooks/useSuggestedAuthors"
import { trimFeedCacheToFirstPage } from "../hooks/communityFeedCache"
import { isAuthorBlocked, useBlockedUsers } from "../hooks/useBlockedUsers"
import { communityFeedSurfaces } from "../utils/communityFeedSurfaces"
import { useMyPageProfile } from "@/src/features/settings/hooks/useMyPageProfile"
import type { CommunitySortMode } from "../types"
import { useTranslation } from "react-i18next"
import { isMyContent, isWithdrawnAuthor } from "../utils/contentOwnership"

interface FreePostTabProps {
  tagFilter?: string | null
  onTagFilterChange?: (tag: string | null) => void
  /** 화면 하단 플로팅 버튼(글쓰기·AI 상담)에 가리지 않을 스크롤 여백. */
  contentBottomPadding?: number
}

/**
 * **이웃 추천이 끼는 자리 — 여덟 번째 글 다음, 딱 한 번**(D25 · 오프셋은 아래 §8).
 *
 * ─── 왜 목록 항목이 아니라 `renderItem` 안인가 ────────────────────────────────
 *
 * 후보는 셋이었다.
 *
 *  1. **타입 있는 목록 항목**(`data` 를 `(글 | {kind:"neighbors"})[]` 로). 가장 흔한
 *     처방이지만 이 화면에서는 **세 군데를 동시에 깬다**: (a) `data.length` 가 더는
 *     글 수가 아니라서, 차단 필터가 첫 페이지를 통째로 접은 순간 목록이 "비어 있지
 *     않게" 되어 `ListEmptyComponent` 도 자동 backfill 도 영영 안 돈다 — 화면이
 *     추천 2행만 띄운 채 굳는다. (b) `keyExtractor` 가 글이 아닌 것을 다뤄야 해서
 *     합성 키가 생기고, 글 id 와 겹치지 않는다는 보장은 사람이 지켜야 한다.
 *     (c) `onEndReached` 의 끝 판정에 글이 아닌 행이 한 칸 섞인다.
 *  2. **헤더 오프셋**(앞 4개를 `ListHeaderComponent` 안에 그리고 목록은 5번째부터).
 *     그 4행이 **가상화 밖으로 나가** 항상 마운트된 채 남고, 목록의 인덱스와 캐시의
 *     인덱스가 4만큼 어긋난 채 페이지네이션·차단 필터와 같이 움직인다.
 *  3. **채택** — 추천은 **목록 항목이 아니다.** 그 자리 글의 셀 안에 그 글 다음으로
 *     같이 그린다. `data` 는 끝까지 글만 담으므로 (a)(b)(c) 가 애초에 생기지 않고,
 *     `keyExtractor` 는 `String(post.id)` 그대로다. 인덱스는 **차단 필터를 통과한
 *     목록**(`visiblePosts`)의 것이라 접힌 글이 있어도 "보이는 N 번째" 뒤에 선다.
 *     한 번만 서는 것은 인덱스가 목록에서 유일하기 때문이다 — 반복 삽입은 참여 유도
 *     패턴이고, 환자들이 의지하는 피드에 소음을 더한다(D25).
 *
 * 값이 8보다 작은 목록에는 **안 선다.** 이 섹션은 긴 스크롤에 주는 쉼표라, 글이 두세
 * 편뿐인 화면에서는 피드가 아니라 팔로우 권유가 화면의 주인공이 된다. 다음 페이지가
 * 오면 저절로 선다.
 *
 * ─── 왜 4 가 아니라 **8** 인가 (2026-08-21) ──────────────────────────────────
 *
 * `요즘 이야기 중` 이 머리에서 **세 번째 글 뒤**로 내려오면서(`TRENDING_INSERT_AFTER`)
 * 4 는 두 삽입 섹션이 **글 한 편을 사이에 두고 붙는** 자리가 됐다. 끼어드는 블록 둘이
 * 잇달아 서면 그 사이의 한 편은 피드가 아니라 두 광고 사이의 구분선처럼 읽힌다.
 *
 * 8 이면 사이에 글이 **다섯 편**(4~8) 남는다 — 피드를 여는 세 편보다 많으므로 두 삽입
 * 사이에서 목록이 다시 화면의 주인이 되고, 행 높이(106~179pt)를 생각하면 두 섹션이 한
 * 뷰포트에 같이 잡히는 일이 없다. 동시에 8 은 첫 페이지(20) 안이라 **페이지네이션을
 * 기다리지 않는다** — 평범한 첫 화면 스크롤에서 둘 다 한 번씩 보인다.
 */
const NEIGHBOR_INSERT_AFTER = 8

/**
 * **`요즘 이야기 중` 이 끼는 자리 — 세 번째 글 다음, 딱 한 번**(2026-08-21).
 *
 * 이 섹션은 머리(`ListHeaderComponent`)에 있었다. 그 자리에서는 **한 화면에 읽을 수 있는
 * 글이 0개**다 — 검색 · 스토리 · 순위 3행 · 카테고리 칩 · 정렬을 지나야 첫 글이 시작한다.
 * 더 나쁜 것은 내용이 겹친다는 것이다: 템포가 낮은 커뮤니티(운영은 30일에 3편)에서는
 * 상위 3편이 곧 피드 맨 위 3편이라, **같은 글을 두 번 보여 주면서** 진짜 피드를 접힘선
 * 아래로 민다. 이 레일이 값을 갖는 것은 이야기되던 글이 이미 위로 스크롤돼 사라진
 * **긴 피드**에서다.
 *
 * 그래서 **글 3편 뒤**로 내려간다. 3인 이유: 한 화면이 열리자마자 읽을 것이 있어야 하고
 * (`PostListItem` 은 106~179pt 라 세 줄이 첫 화면의 몫이다), 그보다 더 내리면 이 섹션이
 * 사실상 안 보인다.
 *
 * 삽입 방법은 이웃 추천과 **글자 그대로 같다** — 목록 항목이 아니라 그 글의 셀 안이다.
 * 이유는 바로 위 `NEIGHBOR_INSERT_AFTER` 머리말 전체가 그대로 적용된다(`data` 는 글만
 * 담고, `keyExtractor`·빈 목록 판정·자동 backfill·`onEndReached` 가 삽입 전과 같다).
 * 인덱스도 같은 축이다 — **차단 필터를 통과한 목록**(`visiblePosts`)의 자리 번호다.
 *
 * 글이 셋보다 적으면 안 선다(`index === 2` 가 없다). 그때 이 레일이 그릴 3행은 화면에
 * 이미 서 있는 그 글들이다.
 */
const TRENDING_INSERT_AFTER = 3

/**
 * **필터 바의 높이** — 52. `results` 밀도를 쓴다.
 *
 * 예전에는 이 자리가 두 줄이었다(가로 칩 레일 + 그 아래 우측 정렬 `• 최신순 조회순 인기순`,
 * 합쳐 ~90pt). 두 번째 줄은 **컨트롤로 읽히지 않았다** — 오른쪽에 붙은 맨 글자 세 개는
 * 본문 카피처럼 보이고, 세 선택지를 항상 펼쳐 두는 것은 웹의 문법이다. 한국 커뮤니티
 * 앱들(네이버 카페 게시판 · 당근 동네생활)은 `최신순 ⌄` 필 하나로 말한다.
 */
const FILTER_BAR_HEIGHT = categoryChipRailHeight("results")

/** 검색 입구의 높이. 최소 터치 타겟이라 더 못 줄인다. */

/**
 * **고정층의 총 두께** — 8 + 44 + 8 + 52 = **112**.
 *
 * 매 화면에서 상시로 잡아먹는 값이라 여기 한 줄로 적어 둔다. 줄일 수 있는 칸은
 * 검색 줄의 위·아래 여백(`SEARCH_TO_RAIL_GAP`)뿐이다 — 44 는 최소 터치 타겟이고
 * 52 는 레일이 이미 조인 밀도(`results`, 시안 실측)다.
 *
 * 새로고침 스피너와는 **무관하다.** 이 층은 목록 밖의 형제 뷰라 스피너는 자연히 그
 * 아래에서 돈다 — `spinnerOffset` 으로 이 값을 넘기면 스피너가 콘텐츠 안으로 밀린다
 * (`useRefreshable` 호출부 주석).
 */
export const PINNED_HEADER_HEIGHT = FILTER_BAR_HEIGHT + 48

/**
 * 목록에 그리는 정렬 옵션. 순서가 곧 메뉴의 순서다(§2.6).
 * 모듈 상수인 이유: 렌더마다 새 배열을 만들면 `SortDropdown` 이 매번 새 프롭을 받는다.
 */
const FEED_SORT_OPTIONS: CommunitySortMode[] = ["recent", "views", "popular"]

/**
 * 태그 필터가 켜진 동안 칩 레일에 넘길 `value`.
 *
 * 레일의 계약은 "`null` = `전체` 칩이 켜짐" 이라(§2.5 — '아무것도 선택 안 됨' 은 없다)
 * 태그 중에 `null` 을 넘기면 **`전체` 가 켜진 것처럼** 보인다. 실제로 켜져 있는 필터는
 * 태그이고, 그 태그는 레일 앞(`leading`)의 칩이 이미 그리고 있다. 카테고리 키는 서버
 * enum(`diet`·`numbers`…)이라 `#` 으로 시작할 수 없으므로 어떤 칩과도 안 겹친다.
 */
const tagAsRailValue = (tag: string) => `#${tag}`

const POST_CATEGORY_LABEL_KEYS = {
  diet: "category.post.diet",
  numbers: "category.post.numbers",
  symptoms: "category.post.symptoms",
  medicine: "category.post.medicine",
  "dining-out": "category.post.dining-out",
  daily: "category.post.daily",
} as const

export function FreePostTab({
  tagFilter = null,
  onTagFilterChange,
  contentBottomPadding = 88,
}: FreePostTabProps) {
  const { t } = useTranslation("recipe")
  const { t: tCommon } = useTranslation("common")
  const surface = useSurface()
  // 고정층의 면은 v2 시맨틱에서 온다 — 칩 레일이 칠하는 색과 **같은 출처**여야 한다.
  const router = useAppRouter()
  const queryClient = useQueryClient()
  const categoryLabel = useCallback(
    (key: string) => {
      const translationKey =
        POST_CATEGORY_LABEL_KEYS[key as keyof typeof POST_CATEGORY_LABEL_KEYS]
      return translationKey ? t(translationKey) : key
    },
    [t],
  )
  const localizedCategories = useMemo(
    () =>
      FREE_POST_CATEGORIES.map((category) => ({
        key: category.key,
        label: categoryLabel(category.key),
      })),
    [categoryLabel],
  )

  /** null = 전체. 서버 `category` 파라미터로 간다(전체 = 생략). */
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  /** 서버 `sort` 파라미터. 클라이언트 핫스코어 정렬은 피드에서 은퇴했다. */
  const [sortMode, setSortMode] = useState<CommunitySortMode>("recent")

  /*
    정렬·카테고리·태그가 전부 쿼리 키에 들어 있다 — 바꾸면 1페이지부터 새로 받는다.
    태그 필터 중에는 카테고리를 보내지 않는다(태그 진입 전 화면의 선택이 남아 있을 뿐,
    화면의 칩도 태그 필터 중에는 선택 표시를 지운다 — 종전 클라이언트 필터와 같은 규칙).
  */
  const {
    posts,
    isLoading,
    isError,
    error,
    queryKey,
    isPlaceholderData,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    nextPageError,
    isTailStalled,
    canAutoBackfill,
    noteAutoBackfill,
    resetTail,
  } = useCommunityPosts({
    tag: tagFilter,
    category: tagFilter ? null : selectedCategory,
    sort: sortMode,
  })
  const { blockedAuthors, blockUser } = useBlockedUsers()
  // 내 글 케밥(신고·차단) 게이트용. 미로딩(undefined)이면 "내 것 아님" 으로 접는다.
  const { data: myProfile } = useMyPageProfile()
  const myNickName = myProfile?.nickName ?? null

  /*
    서버도 차단 작성자를 거르지만(P0 계약 §4), 차단 직후 재조회가 오기 전까지의
    한 박자를 클라이언트 필터가 메운다 — 차단했는데 그 사람 글이 남아 있으면
    버튼이 안 먹은 것으로 읽힌다.
  */
  const visiblePosts = useMemo(
    () =>
      posts.filter(
        (p) => isWithdrawnAuthor(p) || !isAuthorBlocked(blockedAuthors, p),
      ),
    [posts, blockedAuthors],
  )

  /*
    인기글 레일은 서버 인기 API(실시간 상위 5)를 먹는다. 예전에는 전량 로드된 피드에
    시간 감쇠 핫스코어를 돌렸는데, 커서 페이지로 바뀌면서 "로드된 것 중 인기" 는
    첫 페이지의 인기일 뿐이다. 인기글 더보기 화면과 같은 API 라 순위도 어긋나지 않는다.
  */
  const {
    data: popularData,
    isLoading: isPopularLoading,
    error: popularError,
    refetch: refetchPopular,
  } = useCommunityPopularPosts("month", null, 5)
  const popularPosts = useMemo(
    () =>
      (popularData ?? [])
        .filter(
          (p) => isWithdrawnAuthor(p) || !isAuthorBlocked(blockedAuthors, p),
        )
        .slice(0, 5),
    [popularData, blockedAuthors],
  )
  /*
    섹션이 그리는 것은 **제목과 댓글 수뿐**이다(D25: 조회는 이 밴드 자신이 부풀리고
    좋아요는 지연 지표다). 5개를 그대로 넘기고 3행으로 자르는 일은 섹션이 한다
    (`TRENDING_POST_COUNT`) — 차단 필터가 앞에서 하나를 접어도 세 줄이 남는다.
  */
  const trendingPosts = useMemo<TrendingPost[]>(
    () =>
      popularPosts.map((post) => ({
        id: post.id,
        title: post.title,
        commentCount: post.comments,
      })),
    [popularPosts],
  )
  /*
    빈 것은 접고 오류는 말한다(D23·D25). 피드 오류와 같은 규칙으로, `popularError` 가
    없을 때는 아예 계산하지 않는다 — 없는 실패에 문구를 만들어 두지 않는다.
  */
  const trendingFailure = useMemo(
    () => (popularError ? resolveError(popularError) : null),
    [popularError],
  )

  /*
    ■ 이웃 추천 — 피드 **여덟 번째 글 다음 한 번**(D25 · `NEIGHBOR_INSERT_AFTER`)

    차단 필터가 여기에도 걸린다. 서버도 차단·역차단을 후보에서 빼지만(라우트 머리말),
    차단 직후 재조회가 오기 전까지의 한 박자를 클라이언트가 메운다 — 피드 글에 쓰는
    필터와 같은 이유다. 탈퇴 면제는 **부르지 않는다**: 후보는 `account_state='ACTIVE'`
    이고 id 가 반드시 있어서, 여기서 탈퇴를 물으면 절대 참이 안 되는 조건이 된다.
  */
  const {
    data: suggestedAuthors,
    isLoading: isSuggestedLoading,
    error: suggestedError,
    refetch: refetchSuggested,
    setFollowing,
  } = useSuggestedAuthors()
  const neighbors = useMemo<NeighborSuggestion[]>(
    () =>
      (suggestedAuthors ?? [])
        .filter(
          (author) =>
            !isAuthorBlocked(blockedAuthors, {
              authorId: author.id,
              authorName: author.nickName,
            }),
        )
        /*
          **최근 글 제목을 모르는 행은 그리지 않는다.** 그 한 줄이 이 섹션이 가로
          카드를 버리고 세로 행이 된 이유이고(D25), 없는 제목을 피드 캐시에서 주워
          채우면 같은 블록의 두 행 중 하나만 근거를 갖는 화면이 된다 — 조용한 폴백은
          고장을 정상처럼 보이게 한다. 서버가 그 칸을 실으면 이 줄이 저절로 열린다
          (`CommunitySuggestedAuthor.latestPostTitle` 머리말).
        */
        .filter((author) => author.latestPostTitle !== null)
        .slice(0, NEIGHBOR_SUGGESTION_COUNT)
        .map((author) => ({
          id: String(author.id),
          name: author.nickName,
          avatarUri: author.profileImageUrl,
          badges: author.badges,
          latestPostTitle: author.latestPostTitle ?? "",
          following: author.isFollowing,
        })),
    [suggestedAuthors, blockedAuthors],
  )
  const neighborFailure = useMemo(
    () => (suggestedError ? resolveError(suggestedError) : null),
    [suggestedError],
  )

  const handlePressNeighbor = useCallback(
    (author: NeighborSuggestion) => {
      router.push(`/community/author/${author.id}` as Href)
    },
    [router],
  )

  /**
   * 낙관 토글. **다음 값은 부르는 쪽이 정한다** — 서버 PUT 은 절대 상태를 받는다.
   * 행은 그 자리에 남고 버튼 카피만 바뀐다(D25 · `useSuggestedAuthors` 머리말).
   */
  const handleToggleFollowNeighbor = useCallback(
    (author: NeighborSuggestion) => {
      setFollowing(Number(author.id), !author.following)
    },
    [setFollowing],
  )

  const listRef = useRef<FlashListRef<(typeof posts)[number]>>(null)

  /**
   * 마지막으로 본 스크롤 위치. 탭 재탭 사다리의 "맨 위인가" 판정이 이 값을 읽는다
   * (`isAtScrollTop` — 판정 자체는 `tabReset.ts` 한 곳에만 있다).
   *
   * 상태가 아니라 ref 인 이유: 스크롤할 때마다 화면을 다시 그릴 이유가 없다.
   */
  const scrollOffsetRef = useRef(0)

  /**
   * 목록을 맨 위로. **여기가 그 일을 하는 유일한 자리다.**
   *
   * ■ 옮긴 뒤에는 기억한 위치도 **같이** 0 으로 둔다
   *
   * `scrollToOffset` 은 비동기다. 프로그램적으로 위로 보낸 직후에도 그 전에 출발한
   * `onScroll` 이 늦게 도착해 `scrollOffsetRef` 에 **옛 위치**를 덮어쓴다. 그러면
   * 사다리가 "아직 맨 위가 아니다" 라고 잘못 보고하고, 두 번째 탭 재탭이 3번(맨 위로)에
   * 다시 머물러 **아무것도 움직이지 않는 스크롤에 햅틱만** 붙는다. 같은 함정이 필터
   * 전환에도 걸린다 — 카테고리를 바꿔 목록을 위로 되돌린 직후 탭을 재탭하면 같은
   * 증상이 난다. 그래서 두 경로가 이 한 함수를 지난다.
   *
   * ■ 이 쓰기가 **너무 이르다**는 것은 알고 있다 (2026-08-21)
   *
   * 애니메이션이 도착하기 전에 이미 "맨 위" 가 되므로, 빠른 두 번째 탭은 3번이 아직
   * 끝나지 않았는데도 다음 칸을 본다. 4번이 새로고침이던 시절에는 그것이 곧 "재탭
   * 두 번이면 스피너" 였다 — 사용자가 실기기에서 신고한 그 증상이다. 지금은 4번이
   * 고장난 화면에서만 살아서(`useRegisterTabReset` 위), 멀쩡한 화면에서 조기 참이
   * 되어도 사다리는 `"none"` 으로 끝난다 — 아무 일도, 햅틱도 없다. **그래서 이 쓰기는
   * 지운 것이 아니라 그대로 둔다.** 지우면 위 문단의 결함이 곧바로 돌아온다.
   *
   * ■ `animated` 는 **부르는 쪽**이 정한다
   *
   *  - 필터·정렬 전환 → `false`. 어차피 그 사이 목록의 내용 자체가 갈리고, 애니메이션
   *    스크롤은 지나가는 모든 행을 마운트한다(식당 목록 시트와 같은 판정).
   *  - 탭 재탭 · 목록 끝의 `맨 위로` → `true`. 목록은 그대로인데 자리만 옮기는 것이라
   *    순간이동하면 어디로 갔는지 알 수 없고, 스크린리더 커서도 화면을 따라가지 못한다.
   */
  const scrollToTop = useCallback((animated: boolean) => {
    listRef.current?.scrollToOffset({ offset: 0, animated })
    scrollOffsetRef.current = 0
  }, [])

  /**
   * **필터를 바꾸면 목록은 맨 위로 돌아간다.**
   *
   * 필터 바가 스티키가 되면서 목록을 한참 내려 둔 채로도 카테고리·정렬을 고를 수 있게
   * 됐다. 그런데 쿼리 키가 바뀌어 **완전히 다른 목록**이 들어오는 동안 스크롤 위치는
   * 그대로 남는다 — 사용자는 고른 적 없는 자리(새 결과의 12번째 글쯤)에서 시작하고,
   * 그 자리가 무엇인지 알 길이 없다. 위로 돌려 놓는 것이 "내가 방금 고른 것의 결과" 다.
   */
  const resetScroll = useCallback(() => scrollToTop(false), [scrollToTop])

  const handleCategoryPress = useCallback(
    (key: string | null) => {
      hapticSelection()
      onTagFilterChange?.(null)
      setSelectedCategory(key)
      resetScroll()
    },
    [onTagFilterChange, resetScroll],
  )

  const handleSortChange = useCallback(
    (mode: CommunitySortMode) => {
      if (mode === sortMode) return
      hapticSelection()
      setSortMode(mode)
      resetScroll()
    },
    [sortMode, resetScroll],
  )

  const handleClearTagFilter = useCallback(() => {
    onTagFilterChange?.(null)
    resetScroll()
  }, [onTagFilterChange, resetScroll])

  const handleTagPress = useCallback(
    (tag: string) => {
      onTagFilterChange?.(tag)
    },
    [onTagFilterChange],
  )

  /*
    피드·스토리·차단 목록·인기 레일을 한 번에 다시 받는다(`COMMUNITY_FEED_REFRESH`).
    예전에는 `refetch()` 하나뿐이라 당겨도 스토리 레일은 어제 것이 남아 있었다.
  */
  /*
    당김 = 처음부터 다시. 들고 있던 페이지를 1장으로 잘라 전량 재요청을 막는다.
    **이 화면의 필터 조합 키만** 자른다 — 접두어로 자르면 화면 밖의 조합까지 잘린다.

    다만 기본 조합(필터 없음)에서는 내 활동 보관함이 **이 쿼리를 그대로 공유**하므로
    여전히 같이 잘린다(키 해시가 같다). 필터를 바꾼 조합에서만 실제로 분리된다 —
    자세한 사정과 P1 해결안은 `trimFeedCacheToFirstPage` 머리말.
  */
  const trimPagesBeforeRefresh = useCallback(() => {
    trimFeedCacheToFirstPage(queryClient, queryKey)
    // 처음부터 다시 받는다 = 꼬리의 실패도, 다 쓴 backfill 예산도 뜻이 없다.
    resetTail()
  }, [queryClient, queryKey, resetTail])

  const refreshable = useRefreshable({
    queryKeys: COMMUNITY_FEED_REFRESH,
    scope: "community-feed",
    /*
      `spinnerOffset` 을 **주지 않는다.** 고정층(`pinnedHeader`)은 목록 **밖의 형제 뷰**라
      목록의 0pt 가 이미 그 층 바로 아래다. 예전에는 검색 줄이 목록 **위에 겹쳐** 있어
      그 높이만큼 내렸는데, 층이 목록 밖으로 나간 뒤에도 값이 남아 스피너가 콘텐츠
      안쪽 112pt 에서 돌았다(첫 글 위에 겹쳐 그려짐 — 2026-09-01 실측). iOS 도
      `RCTRefreshControl` 이 이 값을 프레임에 그대로 더하므로 양쪽 다 밀린다.
    */
    onBeforeRefresh: trimPagesBeforeRefresh,
  })
  // 탭을 다녀오거나 앱을 다시 열면 낡은 것만 조용히 새로 받는다.
  useRevalidateOnReturn({ queryKeys: COMMUNITY_FEED_REFRESH })

  /*
    스켈레톤은 **첫 조회**의 자리다. 여기에 `refreshable.isRunning` 을 같이 태우는
    이유는 4번(복구)에 스피너가 없기 때문이다 — 프로그램 새로고침은 `RefreshControl`
    을 켜지 않는다(`useRefreshable` 머리말 4번: 켜면 iOS 가 스크롤을 밀어 두고
    되돌리지 않아 부를 때마다 여백이 쌓인다). 그래서 "다시 받는 중" 을 말할 자리가
    화면에 하나도 없었다.

    보일 글이 하나도 없을 때만이라(`visiblePosts.length === 0`) 멀쩡한 목록을 당길 때는
    아무 변화가 없다. 즉 이 한 줄이 켜지는 조합은 사실상 **전면 오류를 복구하는 중** —
    오류면이 스켈레톤으로 바뀌는 것이 곧 피드백이고, 새 컴포넌트도 새 문구도 없다.
  */
  const showSkeleton =
    (isLoading || refreshable.isRunning) && visiblePosts.length === 0

  /*
    빈 자리와 꼬리가 **무엇을 말할지는 한 함수가 정한다**(`communityFeedSurfaces`).
    FlashList 는 빈 컴포넌트와 꼬리를 형제로 내므로 두 자리의 조건을 따로 쓰면
    전면 오류와 실패 행이 같이 선다 — 서로 다른 일을 하는 두 버튼이 같은 실패를
    말하던 자리다. 판정에 **원본 목록**(`posts`)을 넘기는 것도 그 함수의 규칙이다:
    차단 필터로 접힌 목록으로 재면 받아 둔 글이 있는데도 전면 오류가 선다.
  */
  const {
    failed: feedFailed,
    empty: emptySurface,
    tail: tailSurface,
  } = communityFeedSurfaces({
    showSkeleton,
    isError,
    postCount: posts.length,
    visibleCount: visiblePosts.length,
    isPlaceholderData,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    isTailStalled,
    canAutoBackfill,
  })

  /*
    ■ 탭 재탭 사다리의 3번(맨 위로)과 4번(복구)을 여기서 채운다 (2026-08-21)

    `커뮤니티` 탭을 다시 누르면 사다리(`shared/navigation/tabReset.ts`)가 네 단을 순서대로
    시도한다 — 오버레이 닫기 → 스택 pop → **맨 위로** → **복구**. 앞의 둘은 탭 레이아웃이
    스스로 하지만 뒤의 둘은 재료가 이 화면 안에 있다. 등록하지 않으면 사다리가 2번에서
    멈춘 채로 남는다 — 실제로 그랬다.

    `isAtRoot` 는 판정을 **다시 적지 않는다.** iOS 바운스는 0 이 아니라 0.5 에서 멈추고
    안드로이드 오버스크롤은 음수를 남기므로 `offset === 0` 은 틀린 비교이고, 그 여유값은
    `tabReset.ts` 한 곳에만 산다(`SCROLL_TOP_EPSILON_PT`).

    ■ 4번은 **전면 오류가 서 있을 때만** 산다 (2026-08-21)

    처음에는 `refresh: refreshable.refresh` 였다. 실기기에서 바로 걸렸다 — "다시 누르면
    스크롤 맨 위가 아니라 새로고침 스피너까지 간다". 맨 위로 보내는 순간 기억한 오프셋도
    같이 0 이 되므로(아래 `scrollToTop`) 두 번째 탭은 **정상적으로** 4번에 떨어졌고,
    읽으려던 글이 발밑에서 갈렸다. 새로고침은 당김 제스처가 한다(`refreshable`).

    그래서 남는 조건은 하나다: **`feedFailed`** — 목록 자리에 글이 아니라 전면 오류가
    서 있는 상태. 그때는 화면에 당길 목록이 없어서 재탭 말고 사용자가 고를 것이 없다.
    (등록은 getter 대리라 이 조건식이 렌더마다 다시 읽힌다 — `TabResetProvider` 머리말.)
  */
  useRegisterTabReset("community", {
    content: {
      isAtRoot: () => isAtScrollTop(scrollOffsetRef.current),
      // 탭 재탭은 **애니메이션**이다 — 머리말 §animated 는 부르는 쪽이 정한다.
      reset: () => scrollToTop(true),
    },
    recover: feedFailed ? refreshable.refresh : undefined,
  })

  // `isError` 가 아닐 때도 계산되지만 그 값은 쓰이지 않는다(레시피 홈과 같은 규칙).
  const feedFailure = useMemo(() => resolveError(error), [error])
  /*
    꼬리의 문구는 **훅이 기억한 오류**로 고른다. 옵저버의 `error` 는 낙관 패치
    (`patchPostInFeedCaches`) 한 번에 null 이 되어, 500 이라고 말하던 줄이 아무
    글에나 하트를 누른 순간 일반 문구로 주저앉는다 — 실패 사실만 훅으로 옮기고
    메시지는 못 믿는 출처에서 계속 읽던 자리다(`useInfiniteTail` 머리말 1).
  */
  const tailFailure = useMemo(
    () => resolveError(nextPageError ?? error),
    [nextPageError, error],
  )

  /**
   * 끝에 닿으면 다음 커서 페이지. 필터 전환 중(placeholder)에는 옛 커서라 보내지 않고,
   * **직전 페이지가 실패한 상태면 다시 쏘지 않는다** — 끝에 닿을 때마다 같은 실패를
   * 조용히 반복하던 자리다. 재시도는 꼬리의 실패 행에서 사용자가 고른다.
   */
  const handleEndReached = useCallback(() => {
    if (
      hasNextPage &&
      !isFetchingNextPage &&
      !isPlaceholderData &&
      !isFetchNextPageError
    ) {
      void fetchNextPage()
    }
  }, [
    hasNextPage,
    isFetchingNextPage,
    isPlaceholderData,
    isFetchNextPageError,
    fetchNextPage,
  ])

  /*
    첫 페이지가 통째로 접힌 경우(차단 직후 그 사람 글 20개 등) 목록은 비었는데
    다음 커서는 살아 있다. `onEndReached` 는 그릴 줄이 없어 발화하지 않으므로
    화면이 "아직 글이 없어요" 로 굳는다 — 빈 문구 대신 다음 페이지를 스스로 당긴다.

    **다만 예산이 있다**(`canAutoBackfill`, 조합당 `MAX_AUTO_BACKFILL_PAGES` 장).
    상한이 없으면 사람이 끼어들 자리 없이 커서가 끝날 때까지 페이지가 넘어간다 —
    차단 목록이 큰 계정에서는 그게 수십 요청이 되고, 사용자는 아무것도 고른 적이 없다.
    예산을 다 쓰면 자동 페이징을 멈추고 꼬리에 "더 보기" 를 세운다(아래 `listEmpty`).
    예산은 필터·태그·정렬이 바뀌거나 당겨서 새로고침하면 처음으로 돌아가고, 그 초기화는
    **저장된다** — 조합을 다녀와도 옛 예산·옛 실패가 되살아나지 않는다
    (`useInfiniteTail` 머리말 마지막 절: 읽기만 갈아치우던 시절의 결함).
  */
  useEffect(() => {
    if (
      !isLoading &&
      !isError &&
      visiblePosts.length === 0 &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isFetchNextPageError &&
      !isPlaceholderData &&
      canAutoBackfill
    ) {
      noteAutoBackfill()
      void fetchNextPage()
    }
  }, [
    isLoading,
    isError,
    visiblePosts.length,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    isPlaceholderData,
    canAutoBackfill,
    noteAutoBackfill,
    fetchNextPage,
  ])

  /*
    섹션이 실제로 그려지는가 — 각 섹션의 "빈 목록이면 null" 규칙(`TrendingPostsSection`·
    `NeighborSuggestionSection` 의 return null)과 같은 판정이다. 바로 위 글 행이 이 값으로
    자기 헤어라인을 지운다(F4). 스켈레톤·오류 상태도 밴드를 그리므로 그때도 지운다.
  */
  const trendingRenders = trendingPosts.length > 0 || isPopularLoading || trendingFailure !== null
  const neighborRenders = neighbors.length > 0 || isSuggestedLoading || neighborFailure !== null

  const renderPost = useCallback(
    ({
      item: post,
      index,
    }: {
      item: (typeof posts)[number]
      index: number
    }) => (
      <>
        {/*
          행의 프롭은 전부 원시값·안정 참조다 — `onPress`/`onPressAuthor` 클로저를 행마다
          새로 만들어 넘기던 자리인데, 그 하나로 `PostListItem` 의 `memo` 가 매 렌더
          무효였다. 이 함수는 아래 섹션 상태(인기·이웃)가 바뀔 때마다 새로 만들어지고
          FlashList 는 그때 보이는 셀을 전부 다시 부르므로, 행이 "같은 프롭" 으로
          비교를 통과해야 그 재호출이 그리기 비용이 아니라 비교 비용에서 끝난다.
          글·작성자로 가는 길은 카드가 id 로 스스로 안다(`PostListItem` 머리말).
        */}
        <PostListItem
          postId={post.id}
          category={categoryLabel(post.category)}
          createdAt={post.createdAt}
          title={post.title}
          summary={post.description}
          imageUri={post.imageUri}
          authorName={post.authorName}
          likeCount={post.likes}
          commentCount={post.comments}
          viewCount={post.views ?? 0}
          tags={post.tags}
          authorId={post.authorId}
          onPressTag={handleTagPress}
          onBlock={blockUser}
          isWithdrawnAuthor={isWithdrawnAuthor(post)}
          isMine={isMyContent(post, myNickName)}
          hideDivider={
            (index === TRENDING_INSERT_AFTER - 1 && trendingRenders) ||
            (index === NEIGHBOR_INSERT_AFTER - 1 && neighborRenders)
          }
        />
        {/*
          요즘 이야기 중 — **세로 랭킹 3행**(D23 의 상태 규칙 + D25 의 형태), 세 번째 글
          다음. 여기 있던 가로 `PopularPostCard` 레일은 은퇴했다: 순위는 서수라 세로로
          훑는 정보고, 세로 피드 안의 가로 스크롤러는 제스처 충돌이다(그 컴포넌트 머리말).
          빈 목록이면 섹션이 **스스로 null 을 돌려** 밴드까지 접는다 — 화면이 그 판정을
          다시 하지 않는다(두 곳에서 정하면 언젠가 한쪽만 고쳐진다).
        */}
        {index === TRENDING_INSERT_AFTER - 1 ? (
          <TrendingPostsSection
            posts={trendingPosts}
            isLoading={isPopularLoading}
            failure={trendingFailure}
            onRetry={() => void refetchPopular()}
            onPressPost={(post) => router.push(`/post/${post.id}`)}
            onPressAll={() => router.push("/(tabs)/community-popular" as Href)}
          />
        ) : null}
        {index === NEIGHBOR_INSERT_AFTER - 1 ? (
          <NeighborSuggestionSection
            authors={neighbors}
            isLoading={isSuggestedLoading}
            failure={neighborFailure}
            onRetry={() => void refetchSuggested()}
            onPressAuthor={handlePressNeighbor}
            onToggleFollow={handleToggleFollowNeighbor}
          />
        ) : null}
      </>
    ),
    [
      categoryLabel,
      router,
      handleTagPress,
      blockUser,
      myNickName,
      trendingPosts,
      isPopularLoading,
      trendingFailure,
      trendingRenders,
      neighborRenders,
      refetchPopular,
      neighbors,
      isSuggestedLoading,
      neighborFailure,
      refetchSuggested,
      handlePressNeighbor,
      handleToggleFollowNeighbor,
    ],
  )

  // Tabs and category controls stay outside the virtualized post list.
  const filterBar = (
    <CategoryChipRail
      density="results"
      items={localizedCategories}
      /*
        태그 필터 중에는 어떤 카테고리도 안 켜진다 — 켜져 있는 필터는 태그다.
        (종전 화면의 `!tagFilter && selectedCategory === cat.key` 와 같은 규칙.)
      */
      value={tagFilter ? tagAsRailValue(tagFilter) : selectedCategory}
      onChange={handleCategoryPress}
      allLabel={t("feed.all")}
      leading={
        tagFilter ? (
          /*
            태그 칩은 **잉크 면**이다(`tone="neutral"`). 카테고리 칩이 브랜드 계열이라
            같은 톤을 쓰면 "카테고리 하나가 더 있는" 것으로 읽힌다 — 태그는 다른 축이다.
          */
          <V2Chip
            size="s"
            tone="neutral"
            selected
            fixedLabelWeight
            label={`#${tagFilter}`}
            accessibilityLabel={t("feed.clearTagFilter", { tag: tagFilter })}
            onPress={handleClearTagFilter}
            onRemove={handleClearTagFilter}
          />
        ) : null
      }
      trailing={
        /*
          정렬 — 서버가 정렬한다. 최신순 · 조회순 · 인기순(좋아요·댓글·조회 가중합).
          세 선택지를 항상 펼쳐 두던 줄은 은퇴했다: 필 + 앵커드 메뉴가 "누르면 고를 게
          있다" 를 형태로 말한다.
        */
        <SortDropdown
          options={FEED_SORT_OPTIONS}
          value={sortMode}
          onChange={handleSortChange}
        />
      }
    />
  )

  const pinnedHeader = (
    <View style={{ backgroundColor: surface.canvas }}>
      <View style={[styles.browse, { borderBottomColor: surface.border }]}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: true }}
          onPress={() => scrollToTop(true)}
          style={[styles.browseTab, { borderBottomColor: surface.textStrong }]}
        >
          <Text style={[styles.browseLabel, { color: surface.textStrong }]}>
            {tCommon("community.refresh.feed")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: false }}
          onPress={() => router.push("/(tabs)/community-popular" as Href)}
          style={styles.browseTab}
        >
          <Text style={[styles.browseLabel, { color: surface.text }]}>
            {tCommon("community.refresh.popular")}
          </Text>
        </Pressable>
      </View>
      {filterBar}
    </View>
  )
  const listHeader = (
    <>
      <StoryRail compact />
      {showSkeleton ? <CommunityFeedSkeleton /> : null}
    </>
  )

  const feedRetry: V2ErrorStateRetry = feedFailure.retryable
    ? { onRetry: () => void refetch(), retryLabel: t("feed.errorRetry") }
    : {}

  /*
    빈 문구는 **더 받을 것이 없을 때만** 그린다. 목록이 비었는데 다음 커서가 살아
    있으면(차단 필터가 첫 페이지를 통째로 접은 경우) "아직 글이 없어요" 는 데이터에
    대한 거짓말이다 — 그때는 꼬리(로더 · 실패 행)가 상태를 말한다. 그 판정은
    `communityFeedSurfaces` 가 이미 했다. 여기서는 고른 면을 그리기만 한다.
  */
  const listEmpty =
    emptySurface === "error" ? (
      <V2ErrorState
        surface="community_feed"
        tone="quiet"
        title={feedFailure.title}
        description={feedFailure.body}
        style={styles.errorWrap}
        {...feedRetry}
      />
    ) : /*
      자동 backfill 예산을 다 썼는데도 보일 글이 없다. 여기서 자동으로 더 받으면
      사람이 고르지 않은 요청이 계속 나가고, "아직 글이 없어요" 는 다음 커서가 살아
      있으니 거짓말이다 — 다음 장을 받을지 사용자가 고른다.
    */
    emptySurface === "loadMore" ? (
      <LoadMoreRow
        label={t("feed.loadMore")}
        onPress={() => void fetchNextPage()}
      />
    ) : emptySurface === "empty" ? (
      <View style={styles.emptyWrap}>
        <Text
          style={[styles.emptyTitle, { color: surface.textStrong }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("feed.emptyTitle")}
        </Text>
        <Text
          style={[styles.emptySub, { color: surface.text }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("feed.emptyBody")}
        </Text>
      </View>
    ) : null

  /*
    꼬리는 세 가지를 말한다 — 다음 페이지가 오는 중(점 로더, 링 스피너 금지)이거나,
    실패했거나, **취소로 아무 것도 못 받고 끝났거나.** 셋 다 안 그리면 사용자에게는
    목록이 그냥 거기서 끝난 것으로 보인다. 반대로 전면 오류가 서 있는 동안에는
    꼬리가 침묵한다(둘이 같이 서던 자리 — `communityFeedSurfaces` 머리말).
  */
  const listFooter =
    tailSurface === "loading" ? (
      <V2LoadingState size="small" style={styles.footerLoading} />
    ) : tailSurface === "error" ? (
      /*
        꼬리의 재시도는 **다음 페이지**를 다시 받는다 — 전면 오류의 "다시 불러오기"
        (첫 페이지부터)와 같은 말을 쓰면 무엇이 다시 일어나는지 어긋난다.
      */
      <NextPageErrorRow
        title={tailFailure.title}
        retryLabel={t("feed.loadMoreRetry")}
        onRetry={() => void fetchNextPage()}
      />
    ) : tailSurface === "loadMore" ? (
      /*
        좋아요·북마크·삭제의 취소(`cancelFeedCacheQueries`)가 진행 중이던 다음 장을
        함께 접었다. **실패가 아니므로** 실패 행은 거짓말이고, 로더도 없고,
        `onEndReached` 는 새 스크롤 델타 없이는 다시 안 쏜다 — 그대로 두면 목록이
        조용히 잘린 채 끝난다. 다음 장을 받을지 사용자가 다시 고른다.
        (목록이 비어 있는 경우는 `listEmpty` 의 backfill 예산 쪽이 맡는다.)
      */
      <LoadMoreRow
        label={t("feed.loadMore")}
        onPress={() => void fetchNextPage()}
      />
    ) : tailSurface === "end" ? (
      /*
        **정말 끝났다.** 여기까지 이 자리는 침묵했고, 그래서 "다 봤다" 와 "더 못 불러왔다"
        가 화면에서 **같은 그림**이었다 — 로더도 실패 행도 없이 마지막 카드에서 그냥 끝난다.
        다음에 할 일이 정반대인 두 상태를 같은 모양으로 두면 사용자는 끝난 목록을 몇 번씩
        더 당겨 본다. 판정은 `communityFeedSurfaces` 가 이미 했다(꼬리의 다섯 번째 상태).

        `맨 위로` 는 **애니메이션**이다 — 목록은 그대로인데 자리만 옮기는 것이라
        순간이동하면 어디로 갔는지 알 수 없다(`scrollToTop` 머리말).
      */
      <EndOfListRow
        label={t("feed.endOfList")}
        actionLabel={t("feed.backToTop")}
        onPressAction={() => scrollToTop(true)}
      />
    ) : null

  return (
    <View style={[styles.flex, { backgroundColor: surface.canvas }]}>
      {/*
        검색 + 필터가 **한 덩어리로** 고정이다(2026-08-21 사용자 판정). 두 줄이 같이
        머무르는 총 두께는 112 — 자세한 산술과 근거는 `pinnedHeader` 머리말.
      */}
      {pinnedHeader}
      <FlashList
        ref={listRef}
        data={showSkeleton || feedFailed ? [] : visiblePosts}
        renderItem={renderPost}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={ListGap}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        /*
          탭 재탭 사다리가 "지금 맨 위인가" 를 물을 때 읽을 값 한 칸. 상태가 아니라
          ref 라 스크롤이 화면을 다시 그리지 않는다 — 16ms 스로틀은 그 판정에 충분하고
          (한 프레임), 그보다 촘촘하면 브리지만 바쁘다.
        */
        onScroll={(event) => {
          scrollOffsetRef.current = event.nativeEvent.contentOffset.y
        }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: contentBottomPadding }}
        /*
          `bounces={false}` 가 여기 있었다. 컨트롤은 렌더됐지만 iOS 는 맨 위에서 더
          당겨지지 않으니 `onRefresh` 가 한 번도 불리지 않았다 — 커뮤니티에서 당겨서
          새로고침이 안 되던 원인. `scrollProps` 가 컨트롤과 bounces 를 한 몸으로 준다.
        */
        {...refreshable.scrollProps}
      />
    </View>
  )
}

/** 목록 줄 사이 간격 — 예전 listWrap 의 gap(10)을 분리자로 옮겼다. */
function ListGap() {
  return <View style={styles.listGap} />
}

/** `data` 는 끝까지 글만 담는다(`NEIGHBOR_INSERT_AFTER` 머리말) — 키는 글 id 그대로다. */
const keyExtractor = (post: { id: string }) => String(post.id)

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  browse: {
    minHeight: 48,
    flexDirection: "row",
    paddingHorizontal: COMMUNITY_GUTTER,
    borderBottomWidth: borderWidth.thin,
  },
  browseTab: {
    flex: 1,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  browseLabel: typography.title.xSmallWeak,
  listGap: {
    height: 0,
  },
  footerLoading: {
    paddingVertical: 20,
  },

  emptyWrap: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 6,
  },
  errorWrap: {
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontFamily: "Pretendard-Regular",
  },
})
