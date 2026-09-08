import { useCallback, useMemo, useState } from "react"
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"
import { communityPostService } from "../services/communityPostService"
import {
  CommunityMealPost,
  CommunitySortMode,
  CreateCommunityPostInput,
} from "../types"
import {
  POSTS_KEY,
  POST_DETAIL_KEY,
  cancelFeedCacheQueries,
  findPostInFeedCaches,
  flattenFeedPages,
  hasCachedFeedPages,
  invalidateFeedCaches,
  patchPostEverywhere,
  patchPostInFeedCaches,
  removePostFromFeedCaches,
  toggledBookmark,
  toggledLike,
  type CommunityFeedData,
} from "./communityFeedCache"
import {
  beginToggle,
  endToggle,
  ownsConfirmation,
  ownsRevert,
} from "./communityToggleOrder"
import { fetchNextTailPage, useInfiniteTail } from "./useInfiniteTail"

// 새로고침 스코프(`refresh/scopes.ts`)가 여기서 가져간다 — 정의는 캐시 유틸로 옮겼다.
export { POSTS_KEY }

/** 서버 계약과 같은 페이지 크기. */
const PAGE_SIZE = 20

/**
 * **지금 캐시가 아는 그 글.** 상세 캐시가 먼저다 — 계보(피드·검색·인기)와 값이 다를 수
 * 있는 유일한 경우가 "상세만 새로 받았다" 이고, 그때 더 최근에 서버와 맞은 쪽이 상세다.
 * (쓰기는 언제나 `patchPostEverywhere` 로 두 곳을 함께 만지므로 보통은 같은 값이다.)
 *
 * 토글이 이걸 읽는 이유는 하나다 — 서버로 보낼 **절대 상태**(`{liked}`/`{bookmarked}`)를
 * 지을 때 "지금" 이 무엇인지 알아야 한다. 상세 훅도 같은 함수를 쓴다: 두 벌로 두면
 * 한쪽만 상세 캐시를 못 보는 사고가 난다.
 */
export function readCachedPost(
  queryClient: QueryClient,
  postId: string,
): CommunityMealPost | undefined {
  return (
    queryClient.getQueryData<CommunityMealPost>([...POST_DETAIL_KEY, postId]) ??
    findPostInFeedCaches(queryClient, postId)?.post
  )
}

/**
 * 토글 한 번의 변이 인자.
 *
 * `next` 는 **서버로 보낼 절대 상태**이고 `onMutate` 가 낙관 델타와 **같은 순간**에
 * 채운다(`beginToggle` 의 `applyDelta` 안). 호출부에서 미리 계산하면 안 된다 —
 * `onMutate` 는 취소(`cancelFeedCacheQueries`)를 먼저 `await` 하므로, 연타의 두 번째
 * 탭이 첫 탭의 델타가 캐시에 찍히기 **전에** 지금 상태를 읽어 같은 절대값을 두 번
 * 보내는 창이 열린다. 그러면 캐시는 두 번 뒤집혀 원위치인데 서버는 한 번만 바뀐다.
 * 번호·델타·절대값을 한 벌로 묶어야 "번호 순서 = 요청 순서 = 절대값 순서" 가 된다
 * (`communityToggleOrder` 머리말).
 */
interface PostToggleVariables {
  readonly postId: string
  next?: boolean
}

/**
 * 절대 상태 없이는 요청을 만들 수 없다. 여기 오면 `onMutate` 와 `mutationFn` 의
 * 배선이 끊어진 것이고, 그때 `false`/`true` 중 아무거나 보내면 **서버에 거짓을 쓴다**.
 */
function absoluteState(next: boolean | undefined): boolean {
  if (next === undefined) {
    throw new Error("community toggle: 절대 상태 없이 요청을 만들 수 없다")
  }
  return next
}

export interface CommunityFeedFilters {
  authorId?: number
  library?: "mine" | "liked" | "bookmarked"
  tag?: string | null
  category?: string | null
  sort?: CommunitySortMode
  /**
   * 이 훅이 피드 쿼리를 **관찰(요청)** 하는가. 기본 `true`.
   *
   * `false` 면 캐시에 이미 있는 것만 읽고 요청은 만들지 않는다. 옵저버를 하나 더
   * 붙이는 것만으로 **이미 낡은 무한 쿼리의 페이지 전부**가 다시 날아가기 때문이다
   * (3페이지 스크롤 → 요청 3개).
   *
   * `"cold-only"` 는 그 판단을 **캐시 상태에 맡긴다**: 마운트 순간 이 조합의 페이지가
   * 캐시에 있으면 관찰하지 않고(요청 0개), 없으면 관찰한다. 상세 화면
   * (`app/post/[id].tsx`)이 쓴다 — 거기서 이 훅이 필요한 이유는 작성자의 "다른 글"
   * 후보와 `deletePost` 뿐인데, 그냥 `false` 로 두면 푸시·공유 링크로 앱을 콜드
   * 스타트한 사람에게는 피드 캐시가 아예 없어 그 섹션이 **통째로 사라진다**(빈 배열이라
   * 흔적도 안 남는다). 이때 켜지는 관찰은 **첫 장 하나**뿐이다 — 상세에는
   * `fetchNextPage` 가 없어서 N 페이지 폭풍이 될 수 없다.
   *
   * "콜드" 의 기준은 **기본 조합**(`{tag:null, category:null, sort:"recent"}`)이다 —
   * 상세가 이 훅을 인자 없이 부르기 때문이다. 그래서 `category=diet` 를 3페이지까지
   * 스크롤하다 글을 연 사람은 캐시가 있어도 "콜드" 로 판정돼 **기본 피드 요청이 한 번**
   * 나간다. 의도한 동작이다: 관련글 선정이 읽는 캐시가 바로 그 기본 조합이라,
   * 필터를 걸고 보던 사람에게는 실제로 읽을 데이터가 없다. 대가는 첫 장 하나다.
   *
   * 내 활동 보관함은 **관찰하게 둘 것** — 거기선 이 쿼리가 자기 데이터 원천이다.
   */
  observe?: boolean | "cold-only"
}

/**
 * 필터 조합마다 쿼리가 하나다. 키에 넣는 이유: 정렬·카테고리를 바꾸면 **1페이지부터**
 * 다시 시작해야 하는데, 같은 키 안에서 갈아타면 옛 조합의 페이지가 새 조합에 섞인다.
 * `null` 정규화로 `{tag: undefined}` 와 `{}` 가 다른 키가 되는 사고를 막는다.
 *
 * 그 정규화 때문에 **인자 없는 호출(보관함)과 피드의 기본 상태가 같은 쿼리**가 된다 —
 * 당김 페이지 자르기가 보관함까지 자르는 이유이고, 테스트가 그 사실을 못 박아 둔다
 * (`trimFeedCacheToFirstPage` 머리말). 그래서 export 한다.
 */
export const communityFeedQueryKey = (filters: CommunityFeedFilters) =>
  [
    ...POSTS_KEY,
    {
      tag: filters.tag ?? null,
      category: filters.category ?? null,
      sort: filters.sort ?? "recent",
      ...(filters.library ? { library: filters.library } : {}),
      ...(filters.authorId ? { authorId: filters.authorId } : {}),
    },
  ] as const

export function useCommunityPosts(filters: CommunityFeedFilters = {}) {
  const queryClient = useQueryClient()
  const {
    library,
    authorId,
    tag = null,
    category = null,
    sort = "recent",
    observe = true,
  } = filters
  // 당김 새로고침의 페이지 자르기(`trimFeedCacheToFirstPage`)가 이 키를 받는다 —
  // 접두어로 자르면 화면 밖 조합(보관함 등)까지 잘린다. 값이 같으면 같은 키.
  const queryKey = useMemo(
    () => communityFeedQueryKey({ tag, category, sort, library, authorId }),
    [tag, category, sort, library, authorId],
  )

  /*
    `"cold-only"` 판정은 **마운트 순간 한 번**이다. 매 렌더 다시 물으면 첫 페이지가
    도착하는 순간 캐시가 차서 `enabled` 가 true → false 로 뒤집히고, 옵저버가
    자기 요청 때문에 스스로 꺼지는 모양이 된다.
  */
  const [coldStart] = useState(() =>
    observe === "cold-only"
      ? !hasCachedFeedPages(queryClient, queryKey)
      : false,
  )
  const enabled = observe === "cold-only" ? coldStart : observe

  const {
    data,
    isLoading,
    isError,
    error,
    isPlaceholderData,
    refetch: refetchQuery,
    fetchNextPage: fetchNextPageQuery,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey,
    /*
      `signal` 을 그대로 넘긴다. 이 계보는 좋아요·북마크·삭제의 낙관 갱신 직전마다
      `cancelQueries` 로 접히는데(그리고 당김은 `cancelRefetch`), 신호가 없으면
      **프라미스만 떨어져 나가고 HTTP 요청은 끝까지 간다** — 페이지 하나를 다 받아
      아무도 안 읽는 채로 버린다. 취소가 취소가 되게 하는 한 줄이다.
    */
    queryFn: ({ pageParam, signal }) =>
      communityPostService.getPosts({
        library,
        authorId,
        tag,
        category,
        sort,
        cursor: pageParam ?? null,
        limit: PAGE_SIZE,
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    // 커서는 서버가 `x-next-cursor` 로 준다. 없으면 마지막 페이지.
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    /*
      전역 기본값은 5분인데, 남이 계속 쓰는 피드에 5분은 "돌아왔더니 아까 그 화면" 이다.
      이 값이 `useRevalidateOnReturn` 의 공격성을 정한다 — 그 훅은 시각을 따로 재지 않고
      react-query 의 staleTime 판정(`stale: true`)을 그대로 쓴다. 판정 기준을 두 곳에
      두지 않으려고 여기 한 곳에서만 조절한다. 스토리도 같은 60초다.
    */
    staleTime: 60_000,
    /*
      정렬·카테고리를 바꾸면 키가 바뀐다. 이때 이전 조합의 목록을 자리에 남겨 두지 않으면
      화면 전체가 스켈레톤으로 무너져 방금 누른 칩까지 사라진다 — 칩·정렬 컨트롤은
      목록 헤더 안에 살기 때문이다. 새 페이지가 오면 그대로 갈아탄다.
    */
    placeholderData: library || authorId ? undefined : keepPreviousData,
    // 관찰하지 않는 호출부(상세)는 캐시만 읽는다 — 옵션 머리말(`observe`).
    enabled,
  })

  /*
    꼬리(다음 페이지)의 실패와 자동 backfill 예산은 **훅이 들고 있는다** — 옵저버의
    `isFetchNextPageError` 는 이 계보의 `setQueryData` 한 번에 지워진다
    (`useInfiniteTail` 머리말). 그래서 아래 두 래퍼가 결과를 직접 기록한다.
  */
  const {
    isTailError,
    tailError,
    isTailStalled,
    canAutoBackfill,
    markTailResult,
    markTailStalled,
    noteAutoBackfill,
    resetTail,
    tailEpoch,
  } = useInfiniteTail(queryKey)

  const fetchNextPage = useCallback(
    () =>
      fetchNextTailPage({
        fetchNextPage: fetchNextPageQuery,
        /*
          취소(`cancelFeedCacheQueries`)로 **아무 일도 없이** 끝난 요청을 실패와
          가려내려면 시작 전 장수가 필요하다 — 자세한 사정은 `fetchNextTailPage`
          머리말. 렌더 시점의 `data` 대신 캐시를 그때그때 읽는다(닫힌 값은 늙는다).
        */
        pageCount: () =>
          queryClient.getQueryData<CommunityFeedData>(queryKey)?.pages.length ??
          0,
        /*
          당김 새로고침·조합 전환이 이 요청을 무효로 만들었는지 돌아와서 확인한다 —
          `useRefreshable` 의 `cancelRefetch:true` 가 접은 요청은 실패도 아니고
          장수도 그대로라, 세대를 안 보면 방금 지운 자리에 "더 보기" 가 다시 선다
          (`useInfiniteTail` 머리말 4).
        */
        tailEpoch,
        markTailResult,
        markTailStalled,
      }),
    [
      fetchNextPageQuery,
      markTailResult,
      markTailStalled,
      queryClient,
      queryKey,
      tailEpoch,
    ],
  )

  const refetch = useCallback(() => {
    // 처음부터 다시 받는다 = 꼬리의 실패도 backfill 예산도 뜻이 없다.
    resetTail()
    return refetchQuery()
  }, [refetchQuery, resetTail])

  /** 화면들이 소비하는 평탄화된 목록 — 지금까지 받은 페이지 전부(id 중복 제거). */
  const posts = useMemo(() => flattenFeedPages(data), [data])

  const createPostMutation = useMutation({
    mutationFn: (post: CreateCommunityPostInput) =>
      communityPostService.createPost(post),
    onSuccess: (createdPost) => {
      // 내가 방금 쓴 글은 서버 재조회 전에도 맨 위에 보여야 한다 — 첫 페이지 머리에 꽂는다.
      queryClient.setQueryData<CommunityFeedData>(queryKey, (old) => {
        if (!old?.pages || old.pages.length === 0) return old
        return {
          ...old,
          pages: old.pages.map((page, index) => ({
            ...page,
            posts:
              index === 0
                ? [
                    createdPost,
                    ...page.posts.filter((p) => p.id !== createdPost.id),
                  ]
                : page.posts.filter((p) => p.id !== createdPost.id),
          })),
        }
      })
      // 낡음 표시만 — 기본 무효화(active 재조회)는 무한 쿼리의 페이지 전부를 다시 받는다
      // (글 하나 올리는 데 요청 N 개). 새 글은 위에서 이미 1페이지 머리에 꽂았다.
      invalidateFeedCaches(queryClient)
    },
  })

  const updatePostMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string
      category?: string
      title?: string
      description?: string
      imageUri?: string | null
      imageObjectPaths?: string[]
      tags?: string[]
    }) => communityPostService.updatePost(id, data),
    onSuccess: (updated, variables) => {
      // 수정 직후 돌아가는 상세 화면이 낡은 본문을 보여주지 않도록
      // 상세 캐시를 서버 응답으로 즉시 교체한다.
      queryClient.setQueryData(["community-post", variables.id], updated)
      // 수정본을 계보(피드·검색·인기)에 그대로 반영하고 낡음 표시만 남긴다 —
      // 좋아요·삭제 정산과 같은 규칙이다(아래 "정산 규칙(공통)" 주석).
      patchPostInFeedCaches(queryClient, variables.id, () => updated)
      invalidateFeedCaches(queryClient)
      queryClient.invalidateQueries({
        queryKey: ["community-post", variables.id],
      })
    },
  })

  /*
    좋아요·북마크·삭제의 정산 규칙(공통):
      - onMutate: 계보 전체 취소 → 낙관 패치.
      - onSuccess: 서버 확정 상태를 패치로 반영하고 **낡음 표시만** 한다
        (`invalidateFeedCaches` 기본 = refetchType "none"). 정산마다 재조회하면
        무한 쿼리가 들고 있는 페이지 전부를 다시 받는다 — 깊이 스크롤한 뒤
        좋아요 하나에 요청 N 개가 나가던 폭풍이 그것이다.
      - onError: **내가 건 델타만 역방향으로** 한 번 더 패치한다(글 단위 역패치).
        떠 둔 값을 되씌우면 연타에서 마지막 되씌우기가 첫 탭의 낙관값을 복원해
        하트가 눌린 채로 남는다(`communityFeedCache` 머리말의 실측).
      - 토글(좋아요·북마크)은 그 위에 **순번 판정**을 하나 더 얹는다 — 절대값도
        역패치도 순서를 타기 때문이다(`communityToggleOrder` 머리말).
  */
  /*
    ─── 삭제만은 **낙관적이지 않다** (2026-08-20) ────────────────────────────
    한동안 `onMutate` 가 계보에서 글을 먼저 지웠다. 그런데 지운 글은 **역패치로 못
    살린다** — 어느 페이지 몇 번째였는지가 캐시에 남지 않는다. 그래서 실패 경로는
    `invalidateFeedCaches(…, "active")`, 즉 "서버에서 다시 받아 맞춘다" 였는데,
    삭제가 실패하는 가장 흔한 이유가 **회선이 없어서**다. 그 상황에서 재조회도 못
    나가므로 낙관 삭제가 그대로 굳는다: 피드·검색·인기에서 글이 사라지고, 아무도
    아무 말을 하지 않고, 며칠 뒤 자연 재검증이 글을 되살린다(실측: 실패 뒤 최종
    캐시 id 가 `["2"]`). 사용자는 "지웠는데 부활한 글" 을 본다.

    지금은 **확정된 뒤에만 지운다.** 삭제는 확인 다이얼로그를 거친 의도적 동작이고,
    호출부는 성공을 기다렸다가 화면을 나간다(`app/post/[id].tsx` 의 `handleDelete`) —
    기다리는 동안 사용자가 보고 있는 것은 지우려는 그 글이고, 실패하면 그 자리에
    남아 이유를 듣는다. 되돌릴 것이 없으니 실패 경로에 재조회 폭풍도 없다.
  */
  const deletePostMutation = useMutation({
    mutationFn: (postId: string) => communityPostService.deletePost(postId),
    onSuccess: async (_data, postId) => {
      // 날아가 있던 페이지 응답이 방금 지운 글을 도로 넣지 않게 먼저 접는다.
      await cancelFeedCacheQueries(queryClient)
      // 계보 전부에서 지운다 — 현재 키만 지우면 정렬을 바꾸는 순간 되살아난다.
      // 검색·인기 캐시도 같은 글을 들고 있다.
      removePostFromFeedCaches(queryClient, postId)
      invalidateFeedCaches(queryClient)
    },
  })

  /*
    ─── 피드 토글에는 스코프 대신 **순번**이 있다 (2026-08-20) ─────────────────
    한동안 종류별 정적 스코프(`community-post-like` 등)가 있었다. 피드 훅은 모든 행이
    mutation 하나를 공유하고 `scope` 는 변수가 아니라 옵션이라 **글 id 를 넣을 수 없다** —
    즉 서로 다른 글 A·B 의 토글까지 한 줄로 세운다(A 가 느린 회선에서 3초 걸리면
    B 의 요청은 3초 뒤에 나간다). 그래서 걷어냈고, 그 자리는 스코프가 아니라
    **글 × 종류 레인의 순번**(`communityToggleOrder`)이 맡는다: 요청은 전부 즉시
    나가고, 서버 절대값은 가장 나중에 시작한 토글만 쓰고, 실패 되돌리기는 자기 델타가
    아직 캐시에 있을 때만 한다. 델타 역패치(자기 역함수)만으로는 부족했다 —
    그건 **실패 경로**의 순서 의존만 없앤다. 절대값을 쓰는 성공 경로는 그대로 남아
    나중에 도착한 옛 응답이 새 응답을 덮었다(그 실측이 그 파일 머리말에 있다).

    요청이 토글(POST)에서 **절대 상태**(PUT)로 바뀐 뒤에도 이 레인은 그대로 필요하다.
    바뀐 것과 남은 것을 갈라 적어 둔다:
     - **남는다 — `ownsConfirmation`.** 응답은 여전히 뒤바뀌어 도착한다. 옛 응답의
       `{liked:true, likes:11}` 이 새 응답의 `{liked:false, likes:10}` 을 덮으면
       화면과 서버가 갈라지고, 정산 무효화가 `refetchType:"none"` 이라 안 낫는다.
     - **남는다 — `ownsRevert`.** 실패 되돌리기는 여전히 "내 델타가 아직 캐시에 있을
       때만" 이다. 절대값이 내 뒤에 떨어졌으면 그 델타는 이미 지워졌다.
     - **없어졌다 — 같은 요청을 두 번 보내면 상태가 뒤집히던 성질.** 토글은 "뒤집어"
       라고만 말해서 재시도·타임아웃 후 재전송이 **한 번 더 뒤집었다**. 절대 상태는
       같은 요청을 몇 번 보내도 결과가 같아서, 10초 타임아웃 뒤 12초에 커밋된 요청도
       다음 탭 한 번이면 화면과 서버가 다시 만난다(꺼진 하트에서 누르면 `{liked:true}`
       를 보내고, 서버가 이미 true 여도 결과는 true 다).
     - **그대로 남는 한계.** 절대 상태여도 **서버가 받는 순서**까지 정해 주지는 못한다 —
       두 요청이 뒤바뀌어 도착하면 서버의 최종값은 늦게 도착한 쪽이다. 그건 순번이
       아니라 버전(낙관적 잠금)이 푸는 문제이고, 지금은 다음 자연 재검증이 맞춘다.
  */
  const toggleLikeMutation = useMutation({
    mutationFn: (variables: PostToggleVariables) =>
      communityPostService.setLiked(
        variables.postId,
        absoluteState(variables.next),
      ),
    onMutate: async (variables) => {
      await cancelFeedCacheQueries(queryClient)
      // 순번·델타·**절대값**은 한 벌이다(사이에 await 를 두면 순서가 어긋난다).
      return beginToggle("like", variables.postId, () => {
        const current = readCachedPost(queryClient, variables.postId)
        /*
          캐시에 없는 글은 **지금 상태를 모른다.** 모르는 채로 절대값을 지으면 서버에
          거짓을 쓴다(토글 시절에는 "뒤집어" 라고만 말해서 몰라도 됐다). 여기서
          던지면 `beginToggle` 이 레인을 닫고 낙관 패치도 걸리지 않는다 —
          `onError` 는 순번 없이 불려 되돌릴 것도 없다고 판정한다.
        */
        if (!current) {
          throw new Error("community like: 캐시에 없는 글의 절대 상태를 모른다")
        }
        variables.next = !current.liked
        patchPostEverywhere(queryClient, variables.postId, toggledLike)
      })
    },
    onSuccess: (confirmed, { postId }, turn) => {
      /*
        서버가 확정한 `{ liked, likes }` 로 낙관치를 덮는다 — 단 **내가 최신일 때만**.
        더 새 토글이 이미 시작했다면 이 값은 옛 진실이고, 그 토글의 응답이 곧 온다.
        `confirmed` 가 먼저 서야 한다: 쓸 값이 없으면 순번도 소비하지 않는다
        (겹쳐 있던 토글이 자기 델타를 정상적으로 되돌릴 수 있게).

        쓰는 곳은 계보 + **상세 캐시**다. 상세에서 누른 뒤 목록에서 한 번 더 누르면
        확정값을 쓸 차례가 여기로 오는데, 계보만 만지면 상세만 낙관값으로 굳는다
        (`patchPostEverywhere` 머리말).
      */
      if (confirmed && ownsConfirmation(turn)) {
        patchPostEverywhere(queryClient, postId, (p) => ({
          ...p,
          ...confirmed,
        }))
      }
      invalidateFeedCaches(queryClient)
    },
    onError: (_err, { postId }, turn) => {
      // 내가 건 델타를 되돌린다 — 낙관 패치와 **같은 함수**다(자기 역함수). 단
      // 내 뒤에 확정값이 떨어졌으면 그 델타는 이미 지워졌다 — 그때는 빼지 않는다.
      if (ownsRevert(turn)) {
        patchPostEverywhere(queryClient, postId, toggledLike)
      }
      invalidateFeedCaches(queryClient)
    },
    onSettled: (_data, _err, _variables, turn) => endToggle(turn),
  })

  const toggleBookmarkMutation = useMutation({
    mutationFn: (variables: PostToggleVariables) =>
      communityPostService.setBookmarked(
        variables.postId,
        absoluteState(variables.next),
      ),
    // 좋아요와 같은 규칙 — 순번 판정(위 주석), 되돌리기는 델타 역패치.
    onMutate: async (variables) => {
      await cancelFeedCacheQueries(queryClient)
      return beginToggle("bookmark", variables.postId, () => {
        const current = readCachedPost(queryClient, variables.postId)
        if (!current) {
          throw new Error(
            "community bookmark: 캐시에 없는 글의 절대 상태를 모른다",
          )
        }
        variables.next = !current.bookmarked
        patchPostEverywhere(queryClient, variables.postId, toggledBookmark)
      })
    },
    onSuccess: (confirmed, { postId }, turn) => {
      if (confirmed && ownsConfirmation(turn)) {
        patchPostEverywhere(queryClient, postId, (p) => ({
          ...p,
          ...confirmed,
        }))
      }
      invalidateFeedCaches(queryClient)
    },
    onError: (_err, { postId }, turn) => {
      // 내가 건 델타를 되돌린다 — 낙관 패치와 같은 함수다(자기 역함수).
      if (ownsRevert(turn)) {
        patchPostEverywhere(queryClient, postId, toggledBookmark)
      }
      invalidateFeedCaches(queryClient)
    },
    onSettled: (_data, _err, _variables, turn) => endToggle(turn),
  })

  /*
    화면이 보는 얼굴은 지금까지와 같다(`toggleLike(postId)`) — 절대 상태는 이 훅
    **안**에서만 지어진다(`PostToggleVariables` 머리말). 신원이 렌더 사이에 고정돼야
    목록 행의 memo 가 깨지지 않으므로 `mutate` 를 떼어 `useCallback` 으로 감싼다.
  */
  const { mutate: mutateLike } = toggleLikeMutation
  const { mutate: mutateBookmark } = toggleBookmarkMutation
  const toggleLike = useCallback(
    (postId: string) => mutateLike({ postId }),
    [mutateLike],
  )
  const toggleBookmark = useCallback(
    (postId: string) => mutateBookmark({ postId }),
    [mutateBookmark],
  )

  const reportPostMutation = useMutation({
    mutationFn: ({
      postId,
      reason,
      description,
    }: {
      postId: string
      reason: string
      description?: string
    }) => communityPostService.reportPost(postId, reason, description),
  })

  return {
    posts,
    isLoading,
    /** 조회 실패. 데이터가 없을 때 빈 상태 대신 오류를 그려야 한다(가짜 빈 화면 금지). */
    isError,
    error,
    /** 이 필터 조합의 정확 쿼리 키 — 당김 새로고침의 페이지 자르기에 쓴다. */
    queryKey,
    /** 필터를 갈아타는 동안 이전 조합의 목록이 자리를 지키는 중인지. */
    isPlaceholderData,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    /**
     * 다음 페이지 요청이 실패한 상태. 목록 자체는 살아 있으므로 `isError` 로는
     * 전면 오류를 그릴 수 없다 — 화면은 꼬리에 실패 행을 세우고 재발화를 멈춘다.
     *
     * 옵저버 플래그가 아니라 **훅이 기억한 사실**이다 — 좋아요·조회수 패치의
     * `setQueryData` 가 옵저버 플래그를 지워 실패 행이 사라지던 자리다.
     */
    isFetchNextPageError: isTailError,
    /**
     * 그 실패의 **원인**. 꼬리 문구는 반드시 이것으로 고른다 — 옵저버의 `error` 는
     * 낙관 패치(`setQueryData`) 한 번에 null 이 되어, 500 이라고 말하던 줄이
     * 하트 한 번에 일반 문구로 주저앉는다. 실패 **사실**만 훅으로 옮기고 **문구**는
     * 옵저버에 두고 있던 자리다.
     */
    nextPageError: tailError,
    /**
     * 다음 페이지 요청이 **아무 것도 못 받고** 끝났는가(좋아요·북마크·삭제의 취소).
     * 실패가 아니라서 실패 행을 세울 수 없고, 그대로 두면 목록이 그냥 거기서 끝난
     * 것처럼 보인다 — 화면은 꼬리에 "더 보기" 를 세운다.
     */
    isTailStalled,
    /** 빈 목록 자동 backfill 예산이 남았는가(조합당 상한). 다 쓰면 "더 보기". */
    canAutoBackfill,
    /** 자동 backfill 한 장을 예산에서 뺀다 — 화면의 backfill 이펙트가 부른다. */
    noteAutoBackfill,
    /** 꼬리 상태 초기화 — 당김 새로고침이 페이지 자르기와 함께 부른다. */
    resetTail,
    createPost: createPostMutation.mutate,
    createPostAsync: createPostMutation.mutateAsync,
    isCreating: createPostMutation.isPending,
    updatePost: updatePostMutation.mutate,
    isUpdating: updatePostMutation.isPending,
    /**
     * **성공을 기다릴 수 있는 삭제.** 호출부는 이걸 `await` 한 뒤에만 화면을 나가야
     * 한다 — 기다리지 않고 나가면 실패를 말할 자리가 없다(`app/post/[id].tsx`).
     */
    deletePostAsync: deletePostMutation.mutateAsync,
    isDeleting: deletePostMutation.isPending,
    toggleLike,
    toggleBookmark,
    reportPost: reportPostMutation.mutate,
    reportPostAsync: reportPostMutation.mutateAsync,
    isReporting: reportPostMutation.isPending,
  }
}
