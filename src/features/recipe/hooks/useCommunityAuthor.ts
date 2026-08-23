import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { QueryClient, UseMutationOptions } from "@tanstack/react-query"

import { presentCommunityError } from "../utils/communityError"
import { communityPostService } from "../services/communityPostService"
import type {
  CommunityAuthorProfile,
  CommunityAuthorSummary,
  CommunitySuggestedAuthor,
} from "../types"
import {
  beginToggle,
  endToggle,
  ownsConfirmation,
  ownsRevert,
  type ToggleTurn,
} from "./communityToggleOrder"

export const communityAuthorKey = (authorId: number) => [
  "community-author",
  authorId,
]

/**
 * 팔로우 토글이 쓰는 순번 레인.
 *
 * `communityToggleOrder` 의 레인 이름은 `${kind}:${id}` 로 조립되고 `kind` 는
 * 좋아요·북마크 둘뿐이다(그 파일은 지금 다른 작업이 잡고 있어 건드리지 않는다).
 * 그래서 **두 번째 칸에 축을 통째로** 넣어 `like:author-follow:12` 라는 레인을 만든다 —
 * 글 id 와 절대 겹치지 않고, 등록부를 고치지 않고도 같은 순서 판정을 그대로 쓴다.
 */
export const authorFollowLane = (authorId: number) =>
  `author-follow:${authorId}`

/**
 * **추천 작성자 목록 캐시의 뿌리** — `useSuggestedAuthors` 가 그리는 `비슷한 단계의 이웃`.
 *
 * 훅이 아니라 여기 사는 이유는 `communityFeedCache` 의 `COMMUNITY_POPULAR_KEY` 와 같다:
 * 그쪽 훅이 이미 이 파일의 `authorFollowLane` 을 가져가므로, 이 파일이 그쪽에서
 * 가져오면 **의존이 돈다**. 상수와 패처를 뿌리에 두고 **훅이 재수출한다**.
 */
export const SUGGESTED_AUTHORS_KEY = ["community-suggested-authors"] as const

/**
 * 추천 목록의 한 행에 **팔로우 여부만** 찍는다. 두 화면이 같이 쓰는 **한 벌**이다 —
 * 피드 행이 스스로 거는 낙관 델타도, 프로필에서 누른 것의 정산도 이 함수 하나다
 * (`map` 규칙이 두 벌이면 언젠가 한쪽만 고쳐진다 — `communityFeedCache` 머리말).
 *
 * ─ 지키는 것 둘 ────────────────────────────────────────────────────────────
 *  1. **행을 옮기지 않는다**(D25). 서버 규칙대로면 팔로우한 사람은 후보에서 빠지지만,
 *     손가락 밑에서 목록이 재배치되면 방금 무엇을 눌렀는지 사용자가 잃는다.
 *     자리·순서·길이는 그대로 두고 칸 하나만 바꾼다.
 *  2. **바뀔 칸이 없으면 아예 쓰지 않는다.** `setQueryData` 는 `updatedAt` 을 안 주면
 *     그 쿼리의 `dataUpdatedAt` 을 **지금**으로 찍는다 = "서버와 방금 맞췄다" 는 선언
 *     이다(`communityFeedCache` 머리말). 프로필 화면은 **추천 목록에 없는 사람**도
 *     팔로우하므로, 그때마다 찍으면 목록이 staleTime(5분) 동안 더 안 물어본다.
 *     갱신 함수가 `undefined` 를 주면 query-core 는 쓰기 자체를 건너뛴다.
 */
export function patchSuggestedAuthorFollow(
  queryClient: QueryClient,
  authorId: number,
  following: boolean,
): void {
  queryClient.setQueryData<CommunitySuggestedAuthor[]>(
    SUGGESTED_AUTHORS_KEY,
    (current) => {
      if (!current) return undefined
      const row = current.find((author) => author.id === authorId)
      if (!row || row.isFollowing === following) return undefined
      return current.map((author) =>
        author.id === authorId ? { ...author, isFollowing: following } : author,
      )
    },
  )
}

type FollowResult = { following: boolean; followerCount: number }

/**
 * 팔로우 변이의 **배선 전부**. 훅 밖에 두는 이유는 하나다 — 이 배선이 지키는 것이
 * 순서에 관한 불변식이라, 진짜 `MutationObserver` 로 **겹쳐서 돌려 봐야** 증명된다.
 * 훅 안에 인라인으로 두면 테스트가 같은 배선을 손으로 한 벌 더 적게 되고, 그 사본은
 * 원본이 바뀌어도 계속 초록이다(`tests/communityAuthorFollow.test.ts`).
 *
 * ─── 무엇이 틀렸었나 ───────────────────────────────────────────────────────
 * 팔로우 → 언팔로우를 빠르게 누르면 응답이 B → A 순으로 도착한다. 서버 PUT 은
 * 멱등이고 클라이언트가 **절대 상태**를 보내므로 서버의 최종 진실은 마지막에 보낸
 * 값이 맞는데, 옛 코드는 도착한 순서대로 절대값을 캐시에 썼다 — 실측: 서버는
 * `{false, 10}` 인데 캐시는 `{true, 11}` 로 끝나고 staleTime(60초) 동안 그대로
 * 남았다. 순수하게 클라이언트의 last-writer-wins 결함이다. 그래서 절대값은
 * **가장 나중에 시작한 토글만** 쓴다(`ownsConfirmation`).
 */
export function authorFollowMutationOptions(
  queryClient: QueryClient,
  authorId: number,
): UseMutationOptions<FollowResult, Error, boolean, { turn: ToggleTurn }> {
  const queryKey = communityAuthorKey(authorId)

  /**
   * 낙관 델타. **자기 역함수**다 — `applyFollowDelta(!following)` 이 정확히 되돌린다.
   * 옛 스냅숏 되돌리기(캐시를 통째로 떠 뒀다가 되씌우기)는 같은 대상을 연타할 때
   * **두 번째 탭이 첫 탭의 낙관값을 스냅숏으로 잡아** 실패 시 그 값을 복원했다
   * (`communityFeedCache` 머리말의 실측). 델타 역패치는 순서에 무관하다.
   */
  const applyFollowDelta = (following: boolean) => {
    queryClient.setQueryData<CommunityAuthorProfile>(queryKey, (current) =>
      current
        ? {
            ...current,
            isFollowing: following,
            followerCount: Math.max(
              0,
              current.followerCount + (following ? 1 : -1),
            ),
          }
        : current,
    )
  }

  return {
    mutationFn: (following: boolean) =>
      communityPostService.setAuthorFollowing(authorId, following),
    onMutate: async (following) => {
      // 번호와 델타 사이에는 아무것도 끼지 않는다 — 취소는 **먼저** 기다린다.
      await queryClient.cancelQueries({ queryKey })
      const turn = beginToggle("like", authorFollowLane(authorId), () => {
        applyFollowDelta(following)
      })
      return { turn }
    },
    onError: (error, following, context) => {
      // 내 뒤에 절대값이 떨어졌으면 내 델타는 이미 캐시에 없다 — 빼면 안 된다.
      if (ownsRevert(context?.turn)) applyFollowDelta(!following)
      /*
        `onError` 자체가 없어서 실패가 화면에 한 번도 닿지 않았다. 401 이면 사용자는
        설명 없이 로그인 화면으로 튕겼고, 오프라인이면 버튼이 조용히 제자리로
        돌아왔다 — 눌리지 않은 것처럼 보인다.
      */
      presentCommunityError(error, { scope: "community-author-follow" })
    },
    onSuccess: (result, _following, context) => {
      const current = queryClient.getQueryData<CommunityAuthorProfile>(queryKey)
      // 쓸 값이 없으면 판정을 부르지 않는다 — 부르는 순간 "확정됐다" 로 기록된다.
      if (!current) return
      if (!ownsConfirmation(context?.turn)) return
      queryClient.setQueryData<CommunityAuthorProfile>(queryKey, {
        ...current,
        isFollowing: result.following,
        followerCount: result.followerCount,
      })
      /*
        피드에 떠 있는 **추천 행까지 같이 정산한다.** 여기서 누른 언팔로우가 프로필
        캐시 한 칸에만 닿던 동안, 뒤로 나간 사용자는 `비슷한 단계의 이웃` 행이
        staleTime(5분) 내내 `팔로잉` 이라고 우기는 것을 봤다 — `FreePostTab` 은
        언마운트되지 않아서 저절로 낫지도 않는다. 반대 방향은 이미 정산돼 있었다
        (`suggestedAuthorFollowMutationOptions` 가 `communityAuthorKey` 를 무효화한다).

        **무효화가 아니라 패치**인 이유 둘. (1) 그 목록은 지금 활성 쿼리라 무효화하면
        즉시 재조회가 돌고, 서버는 "아직 팔로우하지 않은 사람" 만 후보로 뽑으므로
        돌아온 목록은 행 구성이 다르다 — 방금 만진 행이 자리를 옮기거나 사라진다(D25).
        (2) 여기서 쓸 값은 서버가 방금 준 절대값이라 다시 물어볼 것이 없다. 추천 행에는
        팔로워 수가 없으니 "산술을 두 벌 만들지 않는다" 는 걱정도 여기서는 안 생긴다.
      */
      patchSuggestedAuthorFollow(queryClient, authorId, result.following)
      queryClient.invalidateQueries({ queryKey: ["community-follow-list"] })
    },
    onSettled: (_result, _error, _following, context) => {
      endToggle(context?.turn)
    },
  }
}

export function useCommunityAuthor(authorId: number) {
  const queryClient = useQueryClient()
  const profile = useQuery({
    queryKey: communityAuthorKey(authorId),
    queryFn: () => communityPostService.getAuthorProfile(authorId),
    enabled: Number.isInteger(authorId) && authorId > 0,
    staleTime: 60_000,
  })

  const follow = useMutation(authorFollowMutationOptions(queryClient, authorId))

  return {
    ...profile,
    setFollowing: follow.mutate,
    isFollowingPending: follow.isPending,
  }
}

export function useCommunityFollowList(
  authorId: number,
  mode: "followers" | "following",
) {
  return useQuery<CommunityAuthorSummary[]>({
    queryKey: ["community-follow-list", authorId, mode],
    queryFn: () =>
      mode === "followers"
        ? communityPostService.getAuthorFollowers(authorId)
        : communityPostService.getAuthorFollowing(authorId),
    enabled: Number.isInteger(authorId) && authorId > 0,
    staleTime: 30_000,
  })
}
