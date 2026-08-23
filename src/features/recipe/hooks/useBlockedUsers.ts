import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BlockedUser, blockService } from "@/src/services/blockService"
import { presentCommunityError } from "../utils/communityError"
import { NO_BLOCKS, toBlockedAuthors } from "../utils/blockedAuthors"
import { invalidateFeedCaches } from "./communityFeedCache"
import { STORIES_KEY } from "./useCommunityStories"
import { POST_COMMENTS_KEY } from "./usePostDetail"

export const BLOCKED_KEY = ["blocked-users"] as const

/*
  차단 판정(`BlockedAuthors`·`toBlockedAuthors`·`isAuthorBlocked`)은 `utils/blockedAuthors`
  로 옮겼다. 이 파일은 `blockService` → axios → expo 를 끌고 오는데, 순수 모델 파일
  (`recipeDetailModel.ts`)도 같은 판정을 불러야 해서 그쪽이 이 의존을 통째로 물려받았다.
  판정만 떼어 두면 양쪽이 **같은 한 벌**을 부르면서 순수한 파일은 순수하게 남는다.

  기존 import 경로가 깨지지 않게 여기서 그대로 다시 내보낸다.
*/
export {
  isAuthorBlocked,
  toBlockedAuthors,
  type BlockedAuthors,
} from "../utils/blockedAuthors"

/**
 * 차단 목록과 차단/해제.
 *
 * ─── "모른다" 는 "없다" 가 아니다 ───────────────────────────────────────────
 * 목록을 못 받으면 `blockedAuthors` 는 두 축이 다 빈 집합이다 — 필터가 **아무도 접지 않는다.**
 * 그건 안전한 기본값이 아니라 **모르는 상태의 정직한 표현**이고, 그 사실을 화면이
 * 말할 수 있게 `isError`·`error`·`refetch` 를 같이 내보낸다. 서비스가 실패를 삼키던
 * 시절에는(`blockService.getBlockedUsers` 머리말) 이 훅에 `isError` 가 아예 생기지
 * 않아서, 차단 필터가 열린 채 고장나도 화면은 정상처럼 보였다.
 *
 * ─── 차단은 안전 동작이라 실패를 조용히 넘기지 않는다 ────────────────────────
 * 두 변이 모두 `onError` 에서 말한다. 특히 차단은 누른 뒤 화면을 떠나는 동선이
 * 있어서(작성자 프로필), 떠나기 전에 서버 확인을 기다릴 수 있도록
 * `blockUserAsync` 도 함께 내보낸다 — 오프라인이나 60회/10분 제한에 걸린 사람이
 * "차단했다" 고 믿은 채 돌아가지 않게.
 */
export function useBlockedUsers() {
  const queryClient = useQueryClient()

  const {
    data: blockedUsers = [],
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: BLOCKED_KEY,
    queryFn: () => blockService.getBlockedUsers(),
  })

  /*
    **이름 목록(`blockedNickNames`)은 없앴다.** 마지막 사용처가 레시피 리뷰였는데,
    서버 리뷰 응답에 `authorId` 가 실리면서 그쪽도 `isAuthorBlocked` 로 옮겼다.
    남겨 두면 "풀린 차단까지 이름으로 비교하는" 옛 규칙이 다시 새어 나갈 통로가 된다 —
    그게 개명 회피와 제3자 승계를 만들던 자리다.
  */

  /*
    id 축 필터. `blockedUsers` 는 로드 전·오류일 때만 새 빈 배열이라, 정상 경로에서는
    react-query 가 준 같은 참조가 그대로 온다 — 목록이 안 바뀌면 Set 도 안 다시 만든다.
  */
  const blockedAuthors = useMemo(
    () =>
      blockedUsers.length === 0 ? NO_BLOCKS : toBlockedAuthors(blockedUsers),
    [blockedUsers],
  )

  const blockMutation = useMutation({
    mutationFn: (nickName: string) => blockService.blockUser(nickName),
    onMutate: async (nickName) => {
      await queryClient.cancelQueries({ queryKey: BLOCKED_KEY })
      const prev = queryClient.getQueryData<BlockedUser[]>(BLOCKED_KEY)
      queryClient.setQueryData<BlockedUser[]>(BLOCKED_KEY, (old) => [
        ...(old ?? []),
        {
          id: Date.now(),
          blockedNickName: nickName,
          /*
            id 를 모른다 — 앱은 닉네임만 들고 차단을 건다. 그래서 이 한 박자만
            이름으로 접고(`unresolvedNames`), 목록 재조회(`COMMUNITY_FEED_REFRESH`
            에 `BLOCKED_KEY` 가 있다)가 서버가 푼 id 를 들고 오면 신원 축으로 넘어간다.
            방금 건 차단이라 "개명 뒤 그 이름을 가져간 제3자" 는 아직 있을 수 없다.
          */
          blockedUserId: null,
          createdAt: new Date().toISOString(),
        },
      ])
      return { prev }
    },
    onError: (error, _nickName, context) => {
      if (context?.prev) {
        queryClient.setQueryData(BLOCKED_KEY, context.prev)
      }
      /*
        차단 실패를 아무도 받지 않고 있었다. 확인 다이얼로그까지 누른 사람은 일이
        끝났다고 믿고 화면을 떠나는데, 실제로는 그 사람의 글이 그대로 보인다.
        여기 오는 대부분은 오프라인과 신고/차단 제한(60회/10분)이다.
      */
      presentCommunityError(error, { scope: "community-block" })
    },
    onSuccess: () => {
      /*
        화면에 붙어 있는 목록을 서버가 거른 것으로 갈아 끼운다. 클라이언트 필터는
        차단한 사람의 글을 **접기만** 하므로 그 자리가 구멍으로 남는다 — 첫 페이지가
        전부 그 사람 글이면 목록이 빈 채로 "아직 글이 없어요" 가 뜨고(다음 커서는
        살아 있는데도), 인기 목록은 순위가 비어 보인다. 여기서만 `"active"` 를 쓴다.
      */
      invalidateFeedCaches(queryClient, "active")
      /*
        **스토리와 댓글은 그 계보가 아니다.** 서버는 둘 다 차단 작성자를 거르는데
        (`community/service.ts` 의 스토리 목록), 앱이 다시 받지 않아서 차단 직후에도
        그 사람의 스토리가 전체화면으로 앞에 있고, 레일에는 타일이 남고, 열려 있던
        글 상세에는 그 사람 댓글이 그대로였다 — 글만 사라진 화면에서 "차단이 반쯤
        먹었다" 로 읽힌다.

        그렇다고 `FEED_CACHE_ROOTS` 에 넣지는 않는다. 그 목록은 좋아요·북마크·조회수의
        취소·낙관 패치·정산이 **전부** 도는 뿌리라, 넣는 순간 하트 한 번에 스토리와
        댓글까지 딸려 다닌다(스토리는 매번 새로 섞여 오므로 특히 나쁘다 — R1).
        차단은 "지금 보이는 것을 서버 진실로 갈아 끼워야 하는" 드문 자리라 여기서만
        따로 부른다.
      */
      void queryClient.invalidateQueries({ queryKey: STORIES_KEY })
      void queryClient.invalidateQueries({ queryKey: POST_COMMENTS_KEY })
    },
  })

  /**
   * 차단 해제(설정의 차단 관리 UI 가 붙을 자리). 낙관적으로 목록에서 빼고,
   * 실패하면 되돌린다 — 서버 계약상 멱등이라 반복 눌림도 안전하다.
   */
  const unblockMutation = useMutation({
    mutationFn: (nickName: string) => blockService.unblockUser(nickName),
    onMutate: async (nickName) => {
      await queryClient.cancelQueries({ queryKey: BLOCKED_KEY })
      const prev = queryClient.getQueryData<BlockedUser[]>(BLOCKED_KEY)
      queryClient.setQueryData<BlockedUser[]>(BLOCKED_KEY, (old) =>
        (old ?? []).filter((user) => user.blockedNickName !== nickName),
      )
      return { prev }
    },
    onError: (error, _nickName, context) => {
      if (context?.prev) {
        queryClient.setQueryData(BLOCKED_KEY, context.prev)
      }
      // 되돌리기만 하면 목록에 그 사람이 되살아나는 것만 보인다 — 왜인지도 말한다.
      presentCommunityError(error, { scope: "community-unblock" })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: BLOCKED_KEY })
    },
  })

  return {
    /** 신원 축 필터. **유일한 축이다** — 화면은 `isAuthorBlocked(blockedAuthors, …)` 만 쓴다. */
    blockedAuthors,
    /** 목록을 못 받았다 = 지금 아무도 접지 못하는 중. 화면이 말할 수 있게 내보낸다. */
    isBlockedListError: isError,
    blockedListError: error,
    refetchBlockedList: refetch,
    blockUser: blockMutation.mutate,
    /** 확인까지 기다려야 하는 동선(차단 후 화면 이탈)이 쓴다. 던지므로 catch 할 것. */
    blockUserAsync: blockMutation.mutateAsync,
    isBlocking: blockMutation.isPending,
    unblockUser: unblockMutation.mutate,
    isUnblocking: unblockMutation.isPending,
  }
}
