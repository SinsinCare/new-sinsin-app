import { useQuery } from "@tanstack/react-query"

import { communityPostService } from "../services/communityPostService"
import { COMMUNITY_POPULAR_KEY } from "./communityFeedCache"
import type { CommunityPopularPeriod } from "../types"

/**
 * 기간·카테고리가 붙어도 이 접두어 아래다 — 피드 새로고침 스코프가 이걸로 잡는다.
 * 정의는 캐시 유틸(`communityFeedCache`)로 옮겼다: 인기 캐시도 좋아요·삭제 패치
 * 계보(`FEED_CACHE_ROOTS`)에 속해서, 뿌리 목록과 키가 같은 파일에 살아야 한다.
 */
export { COMMUNITY_POPULAR_KEY }

export function useCommunityPopularPosts(
  period: CommunityPopularPeriod,
  category: string | null,
  limit = 50,
) {
  return useQuery({
    queryKey: [...COMMUNITY_POPULAR_KEY, period, category, limit],
    /*
      인기 캐시도 좋아요·북마크·삭제의 `cancelFeedCacheQueries` 가 훑는 계보다.
      `signal` 을 안 넘기면 그 취소가 프라미스만 떼어 놓고 요청은 끝까지 간다
      (`communityPostService.getPosts` 의 `signal` 머리말).
    */
    queryFn: ({ signal }) =>
      communityPostService.getPopularPosts({
        period,
        category,
        limit,
        signal,
      }),
    staleTime: period === "realtime" ? 30_000 : 60_000,
  })
}
