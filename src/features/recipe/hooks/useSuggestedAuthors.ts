/**
 * **추천 작성자(`비슷한 단계의 이웃`)의 클라이언트 배선** — 리디자인 E1 · D24 · D25.
 * 그리는 곳: `components/community/NeighborSuggestionSection.tsx`, 끼는 곳: `FreePostTab`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 팔로우 토글이 왜 `useCommunityAuthor` 것을 그대로 못 쓰는가
 *
 * 그쪽 배선(`authorFollowMutationOptions`)은 **작성자 프로필 캐시 한 칸**
 * (`communityAuthorKey(id)`)을 패치한다. 피드의 추천 행이 사는 곳은 **목록 캐시**라
 * 그 델타가 닿지 않는다 — 그대로 쓰면 버튼을 눌러도 행이 `팔로우` 인 채로 남고,
 * 서버에는 요청이 나간다. 화면이 사실과 어긋나는 그 상태가 정확히 이 저장소가
 * 반복해서 고쳐 온 결함이다.
 *
 * ■ 그런데 **레인은 같은 것을 쓴다**(`authorFollowLane`)
 *
 * 같은 사람을 피드에서 팔로우하고 프로필에서 언팔로우하는 일이 실제로 겹친다.
 * 등록부가 두 벌이면 서로의 확정값을 못 봐서 last-writer-wins 결함이 되살아난다
 * (`useCommunityAuthor` 머리말의 실측). 레인 하나 · 순번 하나다.
 *
 * ■ 낙관 갱신은 **행을 옮기지 않는다**(D25)
 *
 * 서버는 "내가 아직 팔로우하지 않은 사람" 만 후보로 뽑으므로, 팔로우한 행을 목록에서
 * 빼는 것이 서버 규칙과는 더 닮았다. 그러나 손가락 밑에서 목록이 재배치되면 방금
 * 무엇을 눌렀는지 사용자가 잃는다 — `map` 으로 **자리만 두고 칸만** 바꾼다.
 * (섹션 컴포넌트도 같은 규칙을 자기 쪽에서 한 번 더 지킨다.)
 *
 * ■ 성공 뒤에 **팔로워 수를 든 캐시**는 패치가 아니라 무효화다
 *
 * 팔로워 수 델타를 여기서 다시 계산하면 같은 산술이 두 곳에 생기고, 언젠가 한쪽만
 * 고쳐진다. 프로필·팔로워 목록은 지금 화면에 없으므로(피드에서 눌렀다) 낡음 표시만
 * 남기면 충분하다 — 다음에 열릴 때 서버가 말한다.
 *
 * ■ 반대 방향도 정산된다 (2026-08-21 에 닫힌 간극)
 *
 * **프로필에서 누른 팔로우/언팔로우가 이 목록에 안 닿던 때가 있었다.** 추천 행을
 * 눌러 프로필로 들어가 언팔로우하고 뒤로 나오면, `FreePostTab` 은 언마운트되지 않아서
 * 그 행이 `staleTime`(5분) 동안 `팔로잉` 인 채로 남았다. 지금은 `useCommunityAuthor`
 * 의 `authorFollowMutationOptions` 가 확정 시 `patchSuggestedAuthorFollow` 로 이 목록의
 * 그 행까지 찍는다 — **여기와 같은 함수**라 `map` 규칙(자리·순서·길이 보존)도 한 벌이다.
 * 되돌리기 소유권은 레인을 공유해서 원래부터 한 벌이었다 —
 * `tests/communitySuggestedAuthors.test.ts` 의 "레인이 화면 경계를 넘는다"·
 * "프로필에서 누른 언팔로우가 추천 행까지 정산한다".
 */
import { useCallback } from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query"

import { communityPostService } from "../services/communityPostService"
import type { CommunitySuggestedAuthor } from "../types"
import { presentCommunityError } from "../utils/communityError"
import {
  beginToggle,
  endToggle,
  ownsConfirmation,
  ownsRevert,
  type ToggleTurn,
} from "./communityToggleOrder"
import {
  SUGGESTED_AUTHORS_KEY,
  authorFollowLane,
  communityAuthorKey,
  patchSuggestedAuthorFollow,
} from "./useCommunityAuthor"

/**
 * 추천 목록 캐시의 뿌리. **정의는 `useCommunityAuthor` 에 있고 여기서 재수출한다** —
 * 프로필 화면의 팔로우 정산이 이 캐시에 닿아야 하는데, 이 파일이 그쪽의
 * `authorFollowLane` 을 가져가므로 반대로 가져가면 의존이 돈다
 * (`communityFeedCache` 의 `COMMUNITY_POPULAR_KEY` 와 같은 규칙).
 *
 * **피드 계보(`FEED_CACHE_ROOTS`)에 넣지 않는다** — 그 계보는 글 한 편의 좋아요·북마크·
 * 삭제를 여러 목록에 반영하려고 도는 자리고, 여기 사는 것은 글이 아니라 사람이다.
 */
export { SUGGESTED_AUTHORS_KEY }

/**
 * 받아 오는 후보 수. 서버 기본값과 같은 **10**(상한 20).
 *
 * 그리는 행은 2 뿐인데 10 을 받는 이유: 차단 필터와 "최근 글 제목을 모르는 행" 이
 * 앞에서 몇을 접는다. 상한을 행 수에 맞추면 하나만 접혀도 섹션이 통째로 빈다.
 */
export const SUGGESTED_AUTHORS_LIMIT = 10

type FollowResult = { following: boolean; followerCount: number }

/** 어느 작성자를 어느 값으로. **절대 상태**를 보낸다(토글이 아니다). */
export type SuggestedFollowVariables = {
  authorId: number
  following: boolean
}

/**
 * 추천 행의 팔로우 변이 **배선 전부**. 훅 밖에 두는 이유는 `authorFollowMutationOptions`
 * 과 같다 — 지키는 것이 순서에 관한 불변식이라 진짜 `MutationObserver` 로 겹쳐서
 * 돌려 봐야 증명된다. 훅 안에 인라인으로 두면 테스트가 사본을 한 벌 더 갖게 되고,
 * 그 사본은 원본이 바뀌어도 계속 초록이다.
 */
export function suggestedAuthorFollowMutationOptions(
  queryClient: QueryClient,
): UseMutationOptions<
  FollowResult,
  Error,
  SuggestedFollowVariables,
  { turn: ToggleTurn }
> {
  /**
   * 낙관 델타. **자기 역함수**다 — `applyFollowDelta(id, !following)` 이 정확히
   * 되돌린다(스냅숏 복원이 연타에서 남의 낙관값을 되살리던 실측: `communityFeedCache`).
   * 실체는 `patchSuggestedAuthorFollow` **한 벌**이다 — 프로필 화면의 정산도 같은
   * 함수를 부른다. 목록의 **순서와 길이는 건드리지 않는다**(D25).
   */
  const applyFollowDelta = (authorId: number, following: boolean) => {
    patchSuggestedAuthorFollow(queryClient, authorId, following)
  }

  return {
    mutationFn: ({ authorId, following }: SuggestedFollowVariables) =>
      communityPostService.setAuthorFollowing(authorId, following),

    onMutate: async ({ authorId, following }) => {
      // 번호와 델타 사이에는 아무것도 끼지 않는다 — 취소는 **먼저** 기다린다.
      await queryClient.cancelQueries({ queryKey: SUGGESTED_AUTHORS_KEY })
      const turn = beginToggle("like", authorFollowLane(authorId), () => {
        applyFollowDelta(authorId, following)
      })
      return { turn }
    },

    onError: (error, { authorId, following }, context) => {
      // 내 뒤에 절대값이 떨어졌으면 내 델타는 이미 캐시에 없다 — 빼면 안 된다.
      if (ownsRevert(context?.turn)) applyFollowDelta(authorId, !following)
      // 실패는 반드시 화면에 닿는다 — 401 이 설명 없이 로그인으로 튕기던 자리다.
      presentCommunityError(error, { scope: "community-author-follow" })
    },

    onSuccess: (result, { authorId }, context) => {
      /*
        쓸 자리가 없으면 판정을 부르지 않는다 — 부르는 순간 "확정됐다" 로 기록되어,
        겹쳐 있던 토글이 자기 델타를 되돌리지 못한다(`ownsConfirmation` 머리말).
      */
      const current = queryClient.getQueryData<CommunitySuggestedAuthor[]>(
        SUGGESTED_AUTHORS_KEY,
      )
      if (!current) return
      if (!ownsConfirmation(context?.turn)) return
      applyFollowDelta(authorId, result.following)
      // 프로필·팔로워 목록은 낡음 표시만. 팔로워 수 산술을 두 벌 만들지 않는다(머리말).
      queryClient.invalidateQueries({ queryKey: communityAuthorKey(authorId) })
      queryClient.invalidateQueries({ queryKey: ["community-follow-list"] })
    },

    onSettled: (_result, _error, _variables, context) => {
      endToggle(context?.turn)
    },
  }
}

/**
 * 피드에 끼는 추천 작성자 2행의 데이터원.
 *
 * `staleTime` 은 5분이다. 서버의 회전 씨앗은 (보는 사람, **날짜**)라 하루 안에는 결과가
 * 바뀌지 않으므로 더 자주 물을 이유가 없고, 그렇다고 무한히 신선하다고 하면 팔로우한
 * 사람이 다음 진입에도 후보로 남는다.
 */
export function useSuggestedAuthors() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: SUGGESTED_AUTHORS_KEY,
    /*
      `signal` 을 넘긴다 — 안 넘기면 화면을 떠나도 요청이 끝까지 가고, 받아 온 목록은
      아무도 안 읽는 채로 버려진다(`getPosts` 의 `signal` 머리말과 같은 이유).
    */
    queryFn: ({ signal }) =>
      communityPostService.getSuggestedAuthors({
        limit: SUGGESTED_AUTHORS_LIMIT,
        signal,
      }),
    staleTime: 5 * 60_000,
  })

  const follow = useMutation(suggestedAuthorFollowMutationOptions(queryClient))
  const mutate = follow.mutate

  /**
   * **절대 상태**를 보낸다 — 부르는 쪽이 다음 값을 정한다(`!author.following`).
   * 행마다의 `pending` 을 들고 있지 않은 것은 알고 하는 일이다: 낙관 델타가 이미
   * 그 자리에서 라벨을 바꿔 답을 주고, 겹친 탭의 순서는 레인이 중재한다. 버튼을
   * 잠그면 **두 번째 의도적인 탭**(팔로우 → 역시 취소)이 죽는다.
   */
  const setFollowing = useCallback(
    (authorId: number, following: boolean) => {
      mutate({ authorId, following })
    },
    [mutate],
  )

  return { ...query, setFollowing }
}
