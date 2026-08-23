/**
 * **커뮤니티 피드 캐시 한 벌.** 피드가 무한 쿼리(커서 페이지)로 바뀌면서 캐시 모양이
 * `CommunityMealPost[]` 에서 `InfiniteData<CommunityPostsPage>` 가 됐다. 좋아요·북마크·
 * 삭제·조회수처럼 **글 하나를 여러 캐시에 동시에 반영하는 일**이 목록 훅과 상세 훅에
 * 흩어져 있었는데, 모양이 복잡해진 지금 두 벌로 두면 한쪽만 고치는 사고가 난다.
 * 그래서 "피드 모양의 캐시를 만지는 코드" 는 전부 이 파일에 있다.
 *
 * ─── 어떤 캐시가 이 계보인가 (`FEED_CACHE_ROOTS`) ─────────────────────────────
 *  - `["community-posts", {tag, category, sort}]` — 피드. 필터 조합마다 한 쿼리.
 *    페이지 모양(`InfiniteData<CommunityPostsPage>`).
 *  - `["community-post-search", q]` — 검색 결과. 같은 PostPayload, 같은 페이지 모양.
 *  - `["community-popular", period, category, limit]` — 인기글. **평면 배열**
 *    (`CommunityMealPost[]`) 이다. 모양은 다르지만 같은 글이 살고 있어서, 여기만
 *    빼면 지운 글이 인기 레일에 남고(탭 → 오류 화면) 좋아요 수가 어긋난다.
 *
 * 전부 접두어로 훑는다(`setQueriesData`) — 정확 키 `setQueryData(POSTS_KEY)` 는
 * **아무 쿼리와도 일치하지 않는다**(키에 필터 객체가 붙었다). 옛 코드처럼 쓰면
 * 존재하지 않는 캐시 항목을 하나 만들어 놓고 조용히 끝난다.
 *
 * ─── 되돌리기는 스냅숏이 아니라 **글 단위 역패치**다 ──────────────────────────
 * 예전에는 낙관 갱신 전에 캐시 전체를 스냅숏 떠서 실패 시 통째로 되돌렸다. 그러면
 * 스냅숏 이후에 끝난 **다른 글의 낙관 갱신·완료된 재조회까지 같이 지워진다** —
 * 좋아요 두 개를 연타하면 먼저 실패한 쪽이 나중에 성공한 쪽을 되돌리는 식이다.
 * 그다음은 만지기 전 값을 떠 뒀다가 그 글에만 되씌우는 방식이었는데, 그것도 **같은
 * 글 연타**에서 틀렸다: 스코프는 요청만 줄 세우고 `onMutate` 는 즉시 돌기 때문에
 * 두 번째 탭이 첫 탭의 **낙관값**을 떠 두고, 마지막에 실행되는 되씌우기가 그 값을
 * 복원해 하트가 눌린 채로 남는다(query-core 5.90.20 실측).
 * 지금은 **내가 건 델타만 역방향으로** 한 번 더 패치한다 — 하트는 한 번 더 토글,
 * 카운트는 ∓1. 순서에 무관해서 둘 다 실패하면 정확히 원상으로 돌아온다.
 *
 * ─── 낙관 패치는 신선도를 주장하지 않는다 ──────────────────────────────────
 * `setQueryData` 는 `updatedAt` 을 안 주면 그 쿼리의 `dataUpdatedAt` 을 **지금**으로
 * 찍는다. 즉 "서버와 방금 맞췄다" 는 선언이다. 낙관 패치는 서버와 맞춘 적이 없으므로
 * 그 선언을 하면 안 된다 — 하면 `useRevalidateOnReturn` 의 `stale: true` 판정이
 * 한 staleTime 창 동안 아무 것도 재조회하지 않는다(조회수 패치 한 번에 인기 목록이
 * 30초 더 묵는다). 그래서 아래 두 함수는 (1) **그 글이 실제로 든 쿼리만** 만지고,
 * (2) 원래 시각을 그대로 되돌려 준다.
 */

import type { InfiniteData, QueryClient } from "@tanstack/react-query"
import type { CommunityMealPost, CommunityPostsPage } from "../types"

/** 태그·카테고리·정렬이 붙어도 이 접두어 아래다 — 새로고침 스코프가 이걸로 잡는다. */
export const POSTS_KEY = ["community-posts"] as const

/** 검색 결과(`useCommunityPostSearch`). 피드와 같은 페이지 모양이라 같이 패치한다. */
export const POST_SEARCH_KEY = ["community-post-search"] as const

/**
 * 인기글(`useCommunityPopularPosts`). 훅이 아니라 여기 사는 이유: 패치 계보의
 * 뿌리 목록(`FEED_CACHE_ROOTS`)이 이 파일이고, 훅 쪽에서 가져오면 의존이 돈다.
 * 훅이 재수출하고 새로고침 스코프는 훅에서 가져간다(`POSTS_KEY` 와 같은 규칙).
 */
export const COMMUNITY_POPULAR_KEY = ["community-popular"] as const

/**
 * 글 상세(`["community-post", id]`). **계보가 아니다** — 모양이 목록이 아니라 글
 * 하나이고, 취소·삭제·무효화가 도는 범위도 다르다(그래서 `FEED_CACHE_ROOTS` 에 넣지
 * 않는다). 그래도 같은 글의 하트·북마크·댓글 수가 여기에도 살아 있어서, 글 하나를
 * 고치는 쓰기는 이 캐시까지 같이 가야 두 화면이 다른 하트를 그리지 않는다
 * (`patchPostEverywhere`). 상세 훅이 이 상수를 재수출한다 — `POSTS_KEY` 와 같은 규칙.
 */
export const POST_DETAIL_KEY = ["community-post"] as const

export type CommunityFeedData = InfiniteData<
  CommunityPostsPage,
  string | undefined
>

/** 인기글 캐시의 평면 모양. */
export type CommunityPopularData = CommunityMealPost[]

/** 이 계보의 캐시가 가질 수 있는 두 모양. 모양 판별은 `Array.isArray` 하나다. */
type FeedShapedData = CommunityFeedData | CommunityPopularData

/**
 * 글 하나를 만지는 모든 동작(취소·패치·삭제·되돌리기·무효화)이 도는 뿌리 목록.
 * 여기 더하면 전부에 반영된다 — 한 동작에서만 빠지는 반쪽 계보를 만들지 말 것.
 */
const FEED_CACHE_ROOTS = [
  POSTS_KEY,
  POST_SEARCH_KEY,
  COMMUNITY_POPULAR_KEY,
] as const

/**
 * 화면이 소비하는 평탄화 — 페이지 경계는 UI 의 관심사가 아니다.
 *
 * **id 로 중복을 걷는다(첫 등장 유지).** 서버의 랭킹 정렬(조회순·인기순)은 점수가
 * 페이지 사이에 변하면 같은 글이 두 페이지에 나올 수 있다(계약상 best-effort).
 * 걷지 않으면 FlashList 가 중복 키를 받는다.
 */
export function flattenFeedPages(
  // useInfiniteQuery 의 data 는 pageParam 타입이 `unknown` 으로 넓혀져 나온다.
  data: InfiniteData<CommunityPostsPage, unknown> | undefined,
): CommunityMealPost[] {
  if (!data?.pages) return []
  const seen = new Set<string>()
  const posts: CommunityMealPost[] = []
  for (const page of data.pages) {
    for (const post of page.posts) {
      if (seen.has(post.id)) continue
      seen.add(post.id)
      posts.push(post)
    }
  }
  return posts
}

function mapPages(
  data: CommunityFeedData,
  mapPosts: (posts: CommunityMealPost[]) => CommunityMealPost[],
): CommunityFeedData {
  return {
    ...data,
    pages: data.pages.map((page) => ({ ...page, posts: mapPosts(page.posts) })),
  }
}

/** 두 모양(페이지·평면 배열)에 같은 목록 변환을 적용한다. 모르는 모양은 그대로 둔다. */
function mapFeedShaped(
  data: FeedShapedData | undefined,
  mapPosts: (posts: CommunityMealPost[]) => CommunityMealPost[],
): FeedShapedData | undefined {
  if (!data) return data
  if (Array.isArray(data)) return mapPosts(data)
  if (!data.pages) return data
  return mapPages(data, mapPosts)
}

/** 두 모양(페이지·평면 배열)을 한 목록으로 편다 — 존재 확인·검색이 함께 쓴다. */
function postsOfFeedShaped(
  data: FeedShapedData | undefined,
): CommunityMealPost[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  return data.pages?.flatMap((page) => page.posts) ?? []
}

/**
 * 그 글이 든 캐시만 골라 같은 목록 변환을 적용한다.
 *
 * `setQueriesData` 로 전부 훑지 않는 이유가 둘이다(머리말 "신선도" 절):
 *  - updater 인 `mapFeedShaped` 는 **항상 새 객체**를 돌려주므로, 그 글이 없는
 *    쿼리(다른 필터 조합·검색·인기)까지 값이 바뀐 것으로 기록된다.
 *  - `updatedAt` 을 안 넘기면 그 쿼리들이 "방금 서버와 맞춘 것" 이 된다.
 * 그래서 **든 쿼리만**, **원래 시각으로** 쓴다.
 */
function updateQueriesHoldingPost(
  queryClient: QueryClient,
  postId: string,
  mapPosts: (posts: CommunityMealPost[]) => CommunityMealPost[],
): void {
  for (const root of FEED_CACHE_ROOTS) {
    for (const query of queryClient
      .getQueryCache()
      .findAll({ queryKey: root })) {
      const data = query.state.data as FeedShapedData | undefined
      if (!data) continue
      if (!postsOfFeedShaped(data).some((post) => post.id === postId)) continue
      queryClient.setQueryData<FeedShapedData>(
        query.queryKey,
        mapFeedShaped(data, mapPosts),
        // 낙관 패치는 "서버와 맞춘 시각" 이 아니다 — 원래 시각을 그대로 둔다.
        { updatedAt: query.state.dataUpdatedAt },
      )
    }
  }
}

/**
 * 좋아요 토글의 낙관 델타. **자기 역함수다** — 같은 글에 한 번 더 걸면 정확히 원래
 * 값으로 돌아온다. 그래서 토글 변이는 `onMutate` 와 `onError` 가 **같은 함수**를 쓴다:
 * 실패 되돌리기가 "떠 둔 값 되씌우기" 가 아니라 "내가 건 델타 되돌리기" 가 되어
 * 연타(변이 두 개가 겹칠 때)의 실행 순서에 무관해진다(머리말).
 */
export function toggledLike(post: CommunityMealPost): CommunityMealPost {
  return {
    ...post,
    liked: !post.liked,
    likes: post.liked ? post.likes - 1 : post.likes + 1,
  }
}

/** 북마크 토글의 낙관 델타. 좋아요와 같은 규칙(자기 역함수). */
export function toggledBookmark(post: CommunityMealPost): CommunityMealPost {
  return { ...post, bookmarked: !post.bookmarked }
}

/** 글 하나를 이 계보의 모든 캐시에서 고친다(좋아요·북마크·조회수·투표). */
export function patchPostInFeedCaches(
  queryClient: QueryClient,
  postId: string,
  patch: (post: CommunityMealPost) => CommunityMealPost,
): void {
  updateQueriesHoldingPost(queryClient, postId, (posts) =>
    posts.map((post) => (post.id === postId ? patch(post) : post)),
  )
}

/**
 * **글 하나의 변화를 이 앱의 모든 캐시에 한 벌로 쓴다** — 계보(피드·검색·인기)에
 * **상세 캐시까지** 더한다. 상세 캐시가 그 글을 안 들고 있으면 아무 일도 없다.
 *
 * ─── 왜 한 벌이어야 하나 ───────────────────────────────────────────────────
 * 두 화면의 토글은 **같은 레인**(`communityToggleOrder`)으로 순서를 정한다. 그래서
 * 상세에서 하트를 누르고(1번) 뒤로 가서 목록에서 한 번 더 누르면(2번), 서버 절대값을
 * 쓸 자격은 2번 — **목록 훅**에 있다. 그런데 목록 훅이 계보만 만지면 상세 캐시는
 * 1번의 낙관값 `{liked:true, likes:11}` 로 굳는다. 서버도 피드도
 * `{liked:false, likes:10}` 인데 글을 다시 열면 한 번의 왕복 동안 틀린 하트가 서 있다
 * (1번의 응답은 순번 판정이 **정상적으로** 버린다 — 버그는 그쪽이 아니라 여기다).
 * 목록에서 누른 좋아요가 상세 캐시를 60초(staleTime) 동안 낡은 채로 두던 것도 같은
 * 뿌리다 — 계보 무효화(`invalidateFeedCaches`)는 상세 키를 훑지 않는다.
 *
 * ─── 신선도는 **주장하지 않는다**(확정값이라도) ────────────────────────────
 * 서버 확정 절대값이니 `dataUpdatedAt` 을 지금으로 찍어도 된다고 볼 수 있지만, 이
 * 쓰기가 서버와 맞춘 것은 **글 하나의 칸 몇 개**뿐이다. 지금으로 찍으면 하트 한 번이
 * 20개짜리 페이지 전체와 상세 본문·댓글 수의 재검증을 staleTime 창 내내 막는다
 * (머리말 "낙관 패치는 신선도를 주장하지 않는다" 의 그 사고). 그래서 낙관 델타든
 * 서버 확정값이든 **원래 시각을 그대로 둔다**. "방금 서버와 맞췄다" 를 선언해도 되는
 * 것은 응답 하나로 항목 전체를 갈아 끼우는 쓰기다(`updatePost` 의 상세 교체).
 */
export function patchPostEverywhere(
  queryClient: QueryClient,
  postId: string,
  patch: (post: CommunityMealPost) => CommunityMealPost,
): void {
  patchPostInFeedCaches(queryClient, postId, patch)
  const detailKey = [...POST_DETAIL_KEY, postId]
  const state = queryClient.getQueryState<CommunityMealPost>(detailKey)
  if (!state?.data) return
  queryClient.setQueryData<CommunityMealPost>(detailKey, patch(state.data), {
    // 계보와 같은 규칙 — 이 쓰기는 그 쿼리의 나이를 바꾸지 않는다(위 머리말).
    updatedAt: state.dataUpdatedAt,
  })
}

/** 글 하나를 이 계보의 모든 캐시에서 지운다(낙관 삭제 — 인기 레일 포함). */
export function removePostFromFeedCaches(
  queryClient: QueryClient,
  postId: string,
): void {
  updateQueriesHoldingPost(queryClient, postId, (posts) =>
    posts.filter((post) => post.id !== postId),
  )
}

/**
 * 낙관 갱신 직전의 취소 — **패치가 훑는 뿌리 전부**를 취소해야 한다. 일부만 취소하면
 * 날아가 있던 재조회 응답이 낙관 갱신을 덮어써서, 화면이 눌리기 전으로 돌아간다.
 */
export async function cancelFeedCacheQueries(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all(
    FEED_CACHE_ROOTS.map((queryKey) => queryClient.cancelQueries({ queryKey })),
  )
}

/**
 * 이 계보 전부를 무효화한다.
 *
 * 기본은 `refetchType: "none"` — **낡음 표시만 하고 재조회는 하지 않는다.** 변이가
 * 끝날 때마다 기본 무효화(active 재조회)를 하면 무한 쿼리는 **들고 있는 페이지 전부**를
 * 순서대로 다시 받는다: 열 페이지를 읽고 좋아요 하나 누르면 요청 열 개가 나간다.
 * 확정 상태는 패치로 이미 반영했으니, 표시만 해 두면 다음 자연 재검증(복귀·당김)이
 * 마저 맞춘다. `"active"` 는 삭제 실패처럼 **서버 진실로 되돌려야 할 때만** 쓴다.
 */
export function invalidateFeedCaches(
  queryClient: QueryClient,
  refetchType: "none" | "active" = "none",
): void {
  for (const root of FEED_CACHE_ROOTS) {
    void queryClient.invalidateQueries({ queryKey: root, refetchType })
  }
}

/**
 * **그 필터 조합의 피드 페이지가 이미 캐시에 있는가.**
 *
 * 상세 화면(`app/post/[id].tsx`)이 마운트 순간 한 번 묻는다. 있으면 피드를 관찰하지
 * 않고(요청 0개) 캐시만 읽는다 — 열 페이지를 스크롤한 뒤 글을 열었다고 그 열 장을
 * 다시 받게 하지 않는 것이 `observe: false` 의 이유였다.
 *
 * 없으면(푸시 알림·공유 링크로 앱을 콜드 스타트한 경우) 그 판단이 반대로 틀린다:
 * 관찰을 접으면 "작성자의 다른 글" 이 통째로 사라지고 화면에는 그런 섹션이 있었다는
 * 흔적도 안 남는다. 캐시가 비었을 때 켜는 관찰은 **첫 장 하나**뿐이라
 * (`fetchNextPage` 는 상세에 없다) N 페이지 폭풍이 될 수 없다.
 */
export function hasCachedFeedPages(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
): boolean {
  const data = queryClient.getQueryData<CommunityFeedData>(queryKey)
  return (data?.pages?.length ?? 0) > 0
}

/** 이 계보에서 찾은 글 + 그 캐시가 마지막으로 서버와 맞았던 시각. */
export interface FoundFeedPost {
  post: CommunityMealPost
  /**
   * 원본 쿼리의 `state.dataUpdatedAt`. 상세 화면이 `initialDataUpdatedAt` 으로
   * 넘겨야 한다 — 안 넘기면 react-query 가 복사 시각을 "지금" 으로 찍어서,
   * 20분 묵은 검색 결과 사본이 staleTime 동안 새 조회를 막는다.
   */
  dataUpdatedAt: number
}

/** 상세 화면의 initialData — 이미 받아 둔 캐시 어딘가에 그 글이 있으면 재활용한다. */
export function findPostInFeedCaches(
  queryClient: QueryClient,
  postId: string,
): FoundFeedPost | undefined {
  for (const root of FEED_CACHE_ROOTS) {
    for (const query of queryClient
      .getQueryCache()
      .findAll({ queryKey: root })) {
      const data = query.state.data as FeedShapedData | undefined
      const found = postsOfFeedShaped(data).find((post) => post.id === postId)
      if (found)
        return { post: found, dataUpdatedAt: query.state.dataUpdatedAt }
    }
  }
  return undefined
}

/**
 * 당겨서 새로고침 직전에 **그 화면의 필터 조합 하나만** 페이지를 1장으로 자른다.
 *
 * 무한 쿼리의 `refetch` 는 **들고 있는 페이지 전부**를 순서대로 다시 받는다 — 열 페이지를
 * 읽은 사용자가 당기면 요청 열 개가 나간다. 당김은 "처음부터 다시" 라는 뜻이므로
 * 첫 장만 남기고 자른 뒤 refetch 를 시작한다(`useRefreshable` 의 `onBeforeRefresh`).
 *
 * 정확 키 하나만 받는 이유: 접두어(`POSTS_KEY`)로 자르면 **화면 밖의 조합까지**
 * 잘린다 — 필터를 바꾼 조합은 이렇게 실제로 분리된다.
 *
 * **다만 기본 조합은 분리되지 않는다.** `FreePostTab` 의 기본 상태
 * (`tag=null, category=null, sort="recent"`)가 만드는 키는 `app/community-library.tsx`
 * 의 `useCommunityPosts()` 기본 키와 **해시까지 같다**(`useCommunityPosts` 의 null
 * 정규화). 즉 필터를 안 건드린 사용자가 피드에서 당기면 보관함의 데이터 원천도 같이
 * 1페이지로 잘린다(보관함에는 `fetchNextPage` 가 없어 스스로 못 되받는다).
 * 근본 해결은 보관함·작성자 화면을 별도 키(`[...POSTS_KEY, {scope:"library"}]`)로
 * 떼거나 전용 서버 목록을 만드는 것이고, 그건 P1 이다.
 * (키가 같다는 사실은 `tests/communityFeedCache.test.ts` 가 못 박아 둔다.)
 *
 * ─── 복귀 경로는 **일부러** 자르지 않는다 ──────────────────────────────────
 * 당김만 자른다. 화면 복귀(`useRevalidateOnReturn`)에서도 자르면 열 페이지를 스크롤한
 * 목록이 20개로 무너지고 읽던 위치가 날아간다 — 지금 비용(요청 N개)보다 나쁜 회귀다.
 * `maxPages` 도 답이 아니다: refetch 는 묶이지만 **정상 스크롤 중에 앞 페이지가
 * 목록에서 사라진다.** 페이지 상한이 필요해지면 그건 서버가 주는 "변경분 재검증"이지
 * `maxPages` 가 아니다.
 */
export function trimFeedCacheToFirstPage(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
): void {
  queryClient.setQueryData<CommunityFeedData>(queryKey, (data) => {
    if (!data?.pages || data.pages.length <= 1) return data
    return {
      pages: data.pages.slice(0, 1),
      pageParams: data.pageParams.slice(0, 1),
    }
  })
}
