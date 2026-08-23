import { useCallback, useEffect, useRef } from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"
import { resolveError } from "@/src/lib/errorMessage"
import { communityPostService } from "../services/communityPostService"
import { CommunityComment, CommunityMealPost } from "../types"
import {
  POST_DETAIL_KEY,
  cancelFeedCacheQueries,
  findPostInFeedCaches,
  invalidateFeedCaches,
  patchPostEverywhere,
  removePostFromFeedCaches,
  toggledBookmark,
  toggledLike,
} from "./communityFeedCache"
import {
  beginToggle,
  endToggle,
  ownsConfirmation,
  ownsRevert,
} from "./communityToggleOrder"
import { readCachedPost } from "./useCommunityPosts"

/**
 * 글 상세의 두 뿌리. `["community-post", id]` 는 `["community-posts"]` 와 **다른**
 * 문자열이라 접두어가 서로 섞이지 않는다(react-query 는 칸마다 정확히 비교한다).
 *
 * 상세 키의 **정의**는 캐시 유틸에 있다 — 글 하나를 고치는 쓰기가 계보와 상세를
 * 한 벌로 만져야 해서(`patchPostEverywhere`) 거기서 필요하다. 새로고침 스코프
 * (`refresh/scopes.ts`)는 지금까지처럼 여기서 가져간다(`POSTS_KEY` 와 같은 규칙).
 */
export { POST_DETAIL_KEY }
export const POST_COMMENTS_KEY = ["community-post-comments"] as const

/** 댓글 트리에서 그 댓글 하나만 고친 새 트리를 만든다(답글까지 재귀). */
function patchCommentInTree(
  comments: CommunityComment[],
  commentId: string,
  patch: (comment: CommunityComment) => CommunityComment,
): CommunityComment[] {
  return comments.map((comment) => {
    if (comment.id === commentId) return patch(comment)
    if (comment.replies.length === 0) return comment
    return {
      ...comment,
      replies: patchCommentInTree(comment.replies, commentId, patch),
    }
  })
}

/** 댓글 트리에서 그 댓글을 찾는다 — 절대 상태를 지을 때 "지금" 을 읽는 곳. */
function findCommentInTree(
  comments: CommunityComment[],
  commentId: string,
): CommunityComment | undefined {
  for (const comment of comments) {
    if (comment.id === commentId) return comment
    const inReplies = findCommentInTree(comment.replies, commentId)
    if (inReplies) return inReplies
  }
  return undefined
}

/**
 * 댓글 좋아요의 낙관 델타. 글 좋아요(`toggledLike`)와 **같은 규칙 — 자기 역함수**다.
 * 그래서 낙관 패치와 실패 되돌리기가 같은 함수를 쓰고, 순서에 무관해진다.
 */
function toggledCommentLike(comment: CommunityComment): CommunityComment {
  return {
    ...comment,
    liked: !comment.liked,
    likes: comment.liked ? comment.likes - 1 : comment.likes + 1,
  }
}

/**
 * **서버가 "이 글은 없다" 고 말했는가.** 지워진 글의 `COMMUNITY_ERROR_001` 과 맨
 * 404 만 참이다 — 판정은 `resolveError` 하나에 맡긴다(코드 문자열을 화면마다 다시
 * 적으면 같은 실패가 곳마다 다른 뜻이 된다).
 *
 * 이 판정이 필요한 이유: 상세 쿼리는 피드 캐시에서 `initialData` 를 받으므로 목록에서
 * 들어온 사용자에게 `post` 는 **언제나** 있다. 즉 `isError && post` 가 정상 상태이고,
 * 그대로 두면 지워진 글 위에서 하트가 눌렸다 튕기고, 수정 화면이 열리고, 공유까지 된다.
 * 전송 실패·5xx 는 여기 들어오면 안 된다 — 회선이 끊겼다고 남의 글을 지우면 안 된다.
 */
function isMissingPostError(error: unknown): boolean {
  const resolved = resolveError(error)
  return resolved.code === "COMMUNITY_ERROR_001" || resolved.kind === "notFound"
}

/**
 * **없는 글을 계보에서 지운다 — 날아가 있는 페이지 요청을 먼저 접고.**
 *
 * ─── 왜 취소가 먼저인가 (2026-08-21) ───────────────────────────────────────
 * query-core 의 무한 쿼리 동작은 **가져오기가 시작될 때** 페이지 배열을 닫는다
 * (`infiniteQueryBehavior`: `const oldPages = context.state.data?.pages || []`).
 * 그래서 다음 페이지가 날아가 있는 동안 `setQueryData` 로 한 줄을 빼도, 그 응답이
 * 도착하는 순간 캐시는 **`oldPages + newPage`** 로 덮어써진다 — 방금 지운 글이
 * 그대로 되살아난다(실측: 1페이지 `["1","2"]` → 지움 `["2"]` → 2페이지 도착
 * `["1","2","3"]`). 느린 회선에서 목록을 스크롤하다 글을 열면 실제로 열리는 창이다.
 *
 * 삭제 경로는 이미 이렇게 한다(`useCommunityPosts` 의 `deletePostMutation.onSuccess`).
 * 404 는 "남이 지운 글" 이라 결과가 같아야 하는데 여기만 취소가 빠져 있었다:
 * 뒤로 가면 지워진 글이 목록에 다시 서 있고, 누르면 또 묘비가 열린다.
 *
 * 함수로 떼어 둔 이유는 **이 순서를 검사할 수 있게** 하기 위해서다 — 화면을 그리지
 * 않고도 실제 `QueryClient` 위에서 돌려 볼 수 있다(`tests/postDetailTombstoneRace`).
 */
export async function forgetMissingPost(
  queryClient: QueryClient,
  postId: string,
): Promise<void> {
  await cancelFeedCacheQueries(queryClient)
  removePostFromFeedCaches(queryClient, postId)
}

/**
 * 댓글 좋아요 토글의 변이 인자. `next` 는 `onMutate` 가 델타와 같은 순간에 채우는
 * **절대 상태**다(글 토글의 `PostToggleVariables` 와 같은 규칙).
 */
interface CommentToggleVariables {
  readonly commentId: string
  next?: boolean
}

/** 글 토글과 같은 규칙 — `onMutate` 가 채우기 전에는 요청을 만들 수 없다. */
function absoluteState(next: boolean | undefined): boolean {
  if (next === undefined) {
    throw new Error("comment like: 절대 상태 없이 요청을 만들 수 없다")
  }
  return next
}

export function usePostDetail(postId: string) {
  const queryClient = useQueryClient()
  const viewedPostRef = useRef<string | null>(null)

  const {
    data: post,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["community-post", postId],
    /*
      ─── 지워진 글은 **파괴적으로** 다룬다 (2026-08-20) ──────────────────────
      "이 글은 없다"(`COMMUNITY_ERROR_001`·404)는 재조회로 나아지지 않는 사실이고,
      그 글을 들고 있는 **계보의 행들도 전부 유령**이다. 서버가 그렇게 말한 그 자리에서
      지운다 — 그러지 않으면 피드·검색·인기에 남아 다음 사람이 또 열고, 이 화면은
      계보에서 받은 `initialData` 로 멀쩡한 척한다(아래 `isPostGone` 머리말).

      **여기(queryFn)** 인 이유: 렌더 이펙트로 하면 "사실을 안 시점" 과 "지우는 시점"
      사이에 렌더가 한 번 끼고, 그 사이에 하트·공유가 눌릴 수 있다. 응답을 받은
      그 자리가 가장 이르다. 재시도 정책은 404 를 다시 시도하지 않으므로
      (`shouldRetryQuery`) 이 갈래는 한 번만 돈다.

      **지우기 전에 계보를 취소한다**(`forgetMissingPost`). 날아가 있는 다음-페이지
      응답은 요청이 시작될 때 닫아 둔 페이지 배열 위에 붙으므로, 취소하지 않으면
      방금 지운 글이 그 응답과 함께 되살아난다(그 함수 머리말의 실측).

      **그 밖의 실패는 여기 들어오지 않는다** — 회선이 끊겼다고 남의 글을 지우면 안 된다.
    */
    queryFn: async () => {
      try {
        return await communityPostService.getPost(postId)
      } catch (fetchError) {
        if (isMissingPostError(fetchError)) {
          await forgetMissingPost(queryClient, postId)
        }
        throw fetchError
      }
    },
    // 피드·검색·인기가 이미 받아 둔 글이면 본문이 즉시 선다(무한 쿼리 페이지 안을 뒤진다).
    initialData: () => findPostInFeedCaches(queryClient, postId)?.post,
    /*
      사본의 나이를 **원본 쿼리의 시각**으로 신고한다. 안 넘기면 react-query 가
      initialData 를 "지금 받은 것" 으로 찍어서(dataUpdatedAt = now), 20분 묵은
      검색 결과 사본이 staleTime 내내 새 조회를 막는다 — 화면은 즉시 서지만
      본문·댓글 수가 그 시절 것으로 굳는다.
    */
    initialDataUpdatedAt: () =>
      findPostInFeedCaches(queryClient, postId)?.dataUpdatedAt,
    // 피드와 같은 60초 — 전역 5분은 남이 계속 쓰는 글에 너무 길다(피드 훅 머리말).
    staleTime: 60_000,
  })

  /*
    **화면이 묘비를 이기게 하는 한 줄.**

    상세 화면은 `isError && !post` 로만 오류를 그렸는데, 이 쿼리는 계보에서
    `initialData` 를 받으므로 목록에서 들어오면 `post` 가 **항상** 있다. 그래서 남이
    지운 글 위에서 아무 일도 없던 것처럼 계속 놀 수 있었다 — 좋아요는 눌렸다 튕기고,
    북마크도 같고, 수정은 낡은 사본으로 편집기를 열고, 공유는 성공해서 받는 사람만
    묘비를 본다. **그 밖의 실패에서는 여전히 캐시가 이긴다**(비파괴적).
  */
  const isPostGone = isError && isMissingPostError(error)

  /*
    변이 정산의 공통 마무리 — 상세와 피드 계보 전부를 **낡음 표시만** 한다
    (refetchType "none"). 확정 상태는 패치로 이미 반영했으므로, 정산마다 재조회하면
    좋아요 하나에 열려 있는 무한 쿼리의 전 페이지 재요청이 나간다(피드 훅 머리말).
  */
  const markPostAndFeedsStale = () => {
    void queryClient.invalidateQueries({
      queryKey: ["community-post", postId],
      refetchType: "none",
    })
    invalidateFeedCaches(queryClient)
  }

  /**
   * 댓글 목록에 **낡음 표시만** 한다(`refetchType:"none"`).
   *
   * 하트 정산이 `active` 로 무효화하던 자리다 — 댓글 하나 좋아요를 누를 때마다
   * 댓글 트리 전체가 다시 날아갔고, 그 왕복이 스냅숏 되돌리기의 결함을 덮어 주고
   * 있었다. 확정 상태는 패치로 이미 들어갔으니 표시만 남기면 다음 자연 재검증
   * (복귀·당김)이 마저 맞춘다.
   */
  const markCommentsStale = () => {
    void queryClient.invalidateQueries({
      queryKey: [...POST_COMMENTS_KEY, postId],
      refetchType: "none",
    })
  }

  /**
   * 상세 캐시(`["community-post", id]`)와 계보(피드·검색·인기)를 **한 벌로** 만진다.
   * 목록 훅의 확정값도 같은 함수를 쓴다 — 두 벌로 두면 확정값을 쓸 차례가 목록 쪽일
   * 때 상세만 낙관값으로 굳는다(`patchPostEverywhere` 머리말).
   */
  const applyPostPatch = (
    patch: (old: CommunityMealPost) => CommunityMealPost,
  ) => patchPostEverywhere(queryClient, postId, patch)

  const castVoteMutation = useMutation({
    mutationFn: (optionIds: number[]) =>
      communityPostService.castVote(postId, optionIds),
    onSuccess: (vote) => {
      // 서버가 확정 투표 상태를 돌려준다 — 패치로 반영했으니 재조회는 필요 없다.
      // 낡음 표시만 남긴다(재조회하면 무한 쿼리가 들고 있는 페이지 전부를 다시 받는다).
      applyPostPatch((old) => ({ ...old, vote }))
      markPostAndFeedsStale()
    },
  })

  useEffect(() => {
    if (!postId || viewedPostRef.current === postId) return
    viewedPostRef.current = postId
    void communityPostService
      .recordPostView(postId)
      .then(({ views }) => {
        // 이펙트 안이라 `applyPostPatch`(렌더마다 새 함수) 대신 직접 부른다 —
        // 의존성에 넣으면 조회 기록이 렌더마다 다시 돈다. 만지는 범위는 같다.
        patchPostEverywhere(queryClient, postId, (current) => ({
          ...current,
          views,
        }))
      })
      .catch(() => {
        // 조회 지표 실패는 본문 열람을 막지 않는다. 다음 mount에서 다시 시도한다.
        viewedPostRef.current = null
      })
  }, [postId, queryClient])

  /** 낙관 갱신 전 취소 — `applyPostPatch` 가 훑는 곳(상세 + 계보 전부)과 같은 범위다. */
  const cancelPostAndFeedQueries = async () => {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: ["community-post", postId] }),
      cancelFeedCacheQueries(queryClient),
    ])
  }

  /*
    ─── 하트 연타를 견디는 세 장치 (2026-08-20) ─────────────────────────────
    버튼에 `isPending` 가드도 디바운스도 없다 — 연타는 실제로 두 변이가 된다.

    1. `scope`: **같은 글의** 토글을 직렬화한다. 두 번째 요청은 첫 번째가 정산된
       뒤에야 나가므로 서버가 받는 순서가 누른 순서다. 글 단위라 다른 글의 토글은
       기다리지 않는다(피드 훅은 행이 mutation 하나를 공유해 이걸 쓸 수 없다).
    2. `onError` 는 **내가 건 델타만 되돌린다**(한 번 더 토글). 스코프는 요청만
       늦추지 `onMutate` 는 즉시 돌기 때문에, 떠 둔 값을 되씌우는 방식은 두 번째
       탭이 첫 탭의 낙관값을 복원해 하트가 눌린 채로 남았다(query-core 실측).
       역토글은 순서에 무관해서 둘 다 실패하면 정확히 원상으로 돌아온다.
    3. **순번 판정**(`communityToggleOrder`). 1·2 로도 부족하다: 스코프는 이 훅의
       변이 둘만 줄 세울 뿐, 뒤에 깔린 피드의 같은 글 토글과는 겹칠 수 있고,
       무엇보다 `onSuccess` 가 쓰는 것은 **절대값**이라 옛 응답이 새 값을 덮는다.
       그래서 절대값은 가장 나중에 시작한 토글만 쓰고, 역토글은 그 절대값이
       내 뒤에 떨어지지 않았을 때만 한다. 등록부는 피드 훅과 **같은 것**이다.
  */
  const togglePostLikeMutation = useMutation({
    mutationFn: (variables: { next?: boolean }) =>
      communityPostService.setLiked(postId, absoluteState(variables.next)),
    scope: { id: `post-like-${postId}` },
    onMutate: async (variables) => {
      await cancelPostAndFeedQueries()
      // 순번·델타·**절대값**은 한 벌이다(사이에 await 를 두면 순서가 어긋난다).
      return beginToggle("like", postId, () => {
        const current = readCachedPost(queryClient, postId)
        // 캐시에 없는 글은 지금 상태를 모른다 — 모르는 채로 절대값을 지으면 거짓이다.
        if (!current) {
          throw new Error("community like: 캐시에 없는 글의 절대 상태를 모른다")
        }
        variables.next = !current.liked
        applyPostPatch(toggledLike)
      })
    },
    onSuccess: (confirmed, _variables, turn) => {
      // 서버 확정 `{ liked, likes }` 로 낙관치를 덮는다(모양이 어긋난 서버면 null).
      // 더 새 토글이 이미 시작했다면 이 값은 옛 진실이다 — 그쪽 응답이 곧 온다.
      if (confirmed && ownsConfirmation(turn)) {
        applyPostPatch((old) => ({ ...old, ...confirmed }))
      }
      markPostAndFeedsStale()
    },
    onError: (_error, _variables, turn) => {
      // 낙관 패치와 **같은 함수**로 되돌린다(자기 역함수) — 위 주석 2번. 단 내 뒤에
      // 확정값이 떨어졌으면 그 델타는 이미 지워졌다(3번) — 그때는 빼지 않는다.
      if (ownsRevert(turn)) {
        applyPostPatch(toggledLike)
      }
      markPostAndFeedsStale()
    },
    onSettled: (_data, _error, _variables, turn) => endToggle(turn),
  })

  const togglePostBookmarkMutation = useMutation({
    mutationFn: (variables: { next?: boolean }) =>
      communityPostService.setBookmarked(postId, absoluteState(variables.next)),
    scope: { id: `post-bookmark-${postId}` },
    onMutate: async (variables) => {
      await cancelPostAndFeedQueries()
      return beginToggle("bookmark", postId, () => {
        const current = readCachedPost(queryClient, postId)
        if (!current) {
          throw new Error(
            "community bookmark: 캐시에 없는 글의 절대 상태를 모른다",
          )
        }
        variables.next = !current.bookmarked
        applyPostPatch(toggledBookmark)
      })
    },
    onSuccess: (confirmed, _variables, turn) => {
      if (confirmed && ownsConfirmation(turn)) {
        applyPostPatch((old) => ({ ...old, ...confirmed }))
      }
      markPostAndFeedsStale()
    },
    onError: (_error, _variables, turn) => {
      // 낙관 패치와 같은 함수로 되돌린다(자기 역함수).
      if (ownsRevert(turn)) {
        applyPostPatch(toggledBookmark)
      }
      markPostAndFeedsStale()
    },
    onSettled: (_data, _error, _variables, turn) => endToggle(turn),
  })

  const {
    data: comments = [],
    isLoading: isCommentsLoading,
    isError: isCommentsError,
    refetch: refetchComments,
  } = useQuery({
    queryKey: ["community-post-comments", postId],
    queryFn: () => communityPostService.getComments(postId),
    enabled: !!postId,
    // 댓글은 피드보다 더 빨리 늙는다 — 글을 열어 두고 있는 동안 답글이 붙는다.
    staleTime: 30_000,
  })

  /**
   * 댓글을 쓰고·고치고·지운 뒤의 정산. `commentDelta` 는 글의 댓글 **수** 변화다
   * (작성 +1, 수정 0, 삭제 -1).
   *
   * 댓글 목록과 본문은 **다시 받는다** — 새 댓글의 id·시각·트리 위치도, 확정 댓글
   * 수도 서버가 정한다. 화면에 걸린 쿼리 두 개라 요청도 두 개다.
   *
   * 반면 피드 계보(피드·검색·인기)는 **패치하고 낡음 표시만** 한다. 여기가
   * `invalidateQueries({ queryKey: POSTS_KEY })` 였는데 기본 refetchType 이
   * `"active"` 라, 열 페이지를 스크롤한 뒤 댓글 하나를 달면 페이지 요청 열 개가
   * 순서대로 나갔다 — 계보 전체에서 걷어낸 바로 그 폭풍이다. 목록이 보여 주는 것은
   * 댓글 수 하나뿐이므로 델타로 맞추면 화면은 즉시 맞고, 나머지는 다음 자연
   * 재검증(복귀·당김)이 마저 맞춘다.
   */
  const settleComment = (commentDelta: number) => {
    if (commentDelta !== 0) {
      applyPostPatch((old) => ({
        ...old,
        comments: Math.max(0, old.comments + commentDelta),
      }))
    }
    queryClient.invalidateQueries({
      queryKey: ["community-post-comments", postId],
    })
    queryClient.invalidateQueries({ queryKey: ["community-post", postId] })
    invalidateFeedCaches(queryClient)
  }

  const createCommentMutation = useMutation({
    mutationFn: ({
      content,
      parentCommentId,
      mentions,
    }: {
      content: string
      parentCommentId?: string | null
      mentions?: string[]
    }) =>
      communityPostService.createComment(
        postId,
        content,
        parentCommentId,
        mentions,
      ),
    onSuccess: () => settleComment(1),
  })

  const updateCommentMutation = useMutation({
    mutationFn: ({
      commentId,
      content,
      mentions,
    }: {
      commentId: string
      content: string
      mentions?: string[]
    }) =>
      communityPostService.updateComment(postId, commentId, content, mentions),
    // 수정은 댓글 수를 바꾸지 않는다.
    onSuccess: () => settleComment(0),
  })

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      communityPostService.deleteComment(postId, commentId),
    onSuccess: () => settleComment(-1),
  })

  /**
   * 댓글 트리를 만지는 유일한 통로. **나이는 밀지 않는다** — 낙관 패치든 서버 확정값이든
   * 이 쓰기가 서버와 맞춘 것은 하트 하나뿐인데 `dataUpdatedAt` 을 지금으로 찍으면
   * staleTime(30초) 내내 새 답글이 안 보인다(계보의 `patchPostEverywhere` 와 같은 규칙).
   */
  const patchComment = (
    commentId: string,
    patch: (comment: CommunityComment) => CommunityComment,
  ) => {
    const key = [...POST_COMMENTS_KEY, postId]
    const state = queryClient.getQueryState<CommunityComment[]>(key)
    if (!state?.data) return
    queryClient.setQueryData<CommunityComment[]>(
      key,
      patchCommentInTree(state.data, commentId, patch),
      { updatedAt: state.dataUpdatedAt },
    )
  }

  /*
    ─── 댓글 하트도 글 하트와 **같은 장치**를 쓴다 (2026-08-20) ────────────────
    여기만 옛 방식(스냅숏 되씌우기)이 남아 있었다. 두 가지가 틀렸다.

    1. **되돌리기가 남의 델타까지 되돌렸다.** `context.prev` 는 `onMutate` 시점의 트리
       사본인데, 연타하면 두 번째 탭의 사본에 이미 첫 탭의 델타가 들어 있다. 마지막에
       실행되는 되씌우기가 그것을 복원해 하트가 눌린 채 남는다 — 계보에서 걷어낸 바로
       그 결함이다(`communityFeedCache` 머리말의 실측).
    2. **그게 안 보이던 이유가 더 나빴다.** `onSettled` 가 댓글 목록을 `active` 로
       무효화해서 하트 한 번마다 **댓글 전체를 다시 받았고**, 그 왕복이 틀린 상태를
       덮어 주고 있었다. 오프라인에서는 그 왕복이 못 나가므로 낫지도 않는다.

    지금은 글 토글과 같다: 자기 역함수 델타 + **글×종류 레인의 순번**, 그리고 정산은
    낡음 표시만(`refetchType:"none"`). 레인 id 는 `comment:` 를 앞에 붙인다 — 글 id 와
    댓글 id 는 서로 다른 번호 공간이라, 붙이지 않으면 글 5번과 댓글 5번이 한 레인을
    나눠 쓰고 서로의 확정값을 버린다.
  */
  const toggleCommentLikeMutation = useMutation({
    mutationFn: (variables: CommentToggleVariables) =>
      communityPostService.setCommentLiked(
        postId,
        variables.commentId,
        absoluteState(variables.next),
      ),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: [...POST_COMMENTS_KEY, postId],
      })
      return beginToggle("like", `comment:${variables.commentId}`, () => {
        const tree =
          queryClient.getQueryData<CommunityComment[]>([
            ...POST_COMMENTS_KEY,
            postId,
          ]) ?? []
        const current = findCommentInTree(tree, variables.commentId)
        // 트리에 없는 댓글은 지금 상태를 모른다 — 절대값을 지어내지 않는다.
        if (!current) {
          throw new Error("comment like: 트리에 없는 댓글의 절대 상태를 모른다")
        }
        variables.next = !current.liked
        patchComment(variables.commentId, toggledCommentLike)
      })
    },
    onSuccess: (confirmed, variables, turn) => {
      // 서버 확정 `{ liked, likes }` 는 **가장 나중에 시작한 토글**만 쓴다.
      if (confirmed && ownsConfirmation(turn)) {
        patchComment(variables.commentId, (comment) => ({
          ...comment,
          ...confirmed,
        }))
      }
      markCommentsStale()
    },
    onError: (_err, variables, turn) => {
      // 내가 건 델타를 한 번 더 토글해 되돌린다 — 내 뒤에 확정값이 없을 때만.
      if (ownsRevert(turn)) {
        patchComment(variables.commentId, toggledCommentLike)
      }
      markCommentsStale()
    },
    onSettled: (_data, _err, _variables, turn) => endToggle(turn),
  })

  /*
    호출부의 얼굴은 그대로 두고(`togglePostLike()` · `toggleCommentLike(id)`) 절대
    상태를 실을 자리만 만든다. 신원을 고정해 두면 화면이 memo 로 감싸도 안전하다.
  */
  const { mutate: mutateLike } = togglePostLikeMutation
  const { mutate: mutateBookmark } = togglePostBookmarkMutation
  const { mutateAsync: mutateCommentLike } = toggleCommentLikeMutation
  const togglePostLike = useCallback(() => mutateLike({}), [mutateLike])
  const togglePostBookmark = useCallback(
    () => mutateBookmark({}),
    [mutateBookmark],
  )
  const toggleCommentLike = useCallback(
    (commentId: string) => mutateCommentLike({ commentId }),
    [mutateCommentLike],
  )

  const reportCommentMutation = useMutation({
    mutationFn: ({
      commentId,
      reason,
      description,
    }: {
      commentId: string
      reason: string
      description?: string
    }) =>
      communityPostService.reportComment(
        postId,
        commentId,
        reason,
        description,
      ),
  })

  return {
    post,
    comments,
    isLoading,
    isCommentsLoading,
    /*
      댓글 조회가 실패했다. 화면이 이걸 안 보면 **"아직 댓글이 없어요"** 를 띄우는데,
      글쓴이 입장에서는 달린 댓글이 사라진 것으로 보인다.

      호출부는 반드시 `isCommentsError && comments.length === 0` 으로 볼 것 — 댓글을
      단 직후의 백그라운드 재조회가 실패했을 때 이미 그린 목록을 지우면 안 된다.
    */
    isCommentsError,
    isError,
    error,
    /**
     * **이 글은 서버에 없다**(`COMMUNITY_ERROR_001`·404). 화면은 캐시에 본문이 남아
     * 있어도 묘비를 그려야 한다 — 그 사본으로 할 수 있는 일이 하나도 없다.
     * 다른 실패(전송·5xx)에서는 `false` 다: 캐시가 이긴다(위 머리말).
     */
    isPostGone,
    refetch,
    refetchComments,
    castVote: castVoteMutation.mutate,
    castVoteAsync: castVoteMutation.mutateAsync,
    isVoting: castVoteMutation.isPending,
    /*
      화면이 보는 얼굴은 지금까지와 같다(인자 없음) — 절대 상태는 이 훅 안에서만
      지어진다(`PostToggleVariables`·`CommentToggleVariables` 머리말).
    */
    togglePostLike,
    togglePostBookmark,
    createComment: createCommentMutation.mutateAsync,
    isCreatingComment: createCommentMutation.isPending,
    updateComment: updateCommentMutation.mutateAsync,
    isUpdatingComment: updateCommentMutation.isPending,
    deleteComment: deleteCommentMutation.mutateAsync,
    isDeletingComment: deleteCommentMutation.isPending,
    toggleCommentLike,
    isTogglingCommentLike: toggleCommentLikeMutation.isPending,
    reportComment: reportCommentMutation.mutateAsync,
    isReportingComment: reportCommentMutation.isPending,
  }
}
