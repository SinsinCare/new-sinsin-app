import { useCallback, useMemo } from "react"
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { communityPostService } from "../services/communityPostService"
import {
  POST_SEARCH_KEY,
  flattenFeedPages,
  type CommunityFeedData,
} from "./communityFeedCache"
import { fetchNextTailPage, useInfiniteTail } from "./useInfiniteTail"

/** 서버 계약(§2)의 기본 페이지 크기. */
const SEARCH_PAGE_SIZE = 20

/**
 * 서버 검색(`GET /community/posts/search`). 확정된 검색어(제출) 단위로 돈다 —
 * 타이핑마다 서버를 두드리지 않는다(첫 페이지 요청이 검색 로그에 남는 부작용이
 * 있어서, 글자마다 부르면 로그가 파편으로 오염된다).
 *
 * 캐시는 피드와 같은 페이지 모양이라 좋아요·삭제 낙관 갱신(`communityFeedCache`)이
 * 검색 결과에도 함께 반영된다.
 */
export function useCommunityPostSearch(query: string) {
  const queryClient = useQueryClient()
  const q = query.trim()
  const queryKey = useMemo(() => [...POST_SEARCH_KEY, q], [q])

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: refetchQuery,
    fetchNextPage: fetchNextPageQuery,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey,
    /*
      `signal` 을 넘겨야 취소가 **진짜 취소**다. 안 넘기면 `cancelQueries`(좋아요·삭제의
      낙관 갱신 직전)와 검색어 교체는 프라미스만 떼어 놓고, HTTP 요청은 끝까지 가서
      받아 온 페이지를 아무도 안 읽는 채로 버린다(`getPosts` 의 `signal` 머리말).
    */
    queryFn: ({ pageParam, signal }) =>
      communityPostService.searchPosts({
        q,
        cursor: pageParam ?? null,
        limit: SEARCH_PAGE_SIZE,
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: q.length > 0,
    staleTime: 60_000,
  })

  const posts = useMemo(() => flattenFeedPages(data), [data])

  /*
    꼬리의 실패와 자동 backfill 예산은 피드와 같은 규칙으로 **훅이 들고 있는다** —
    검색 결과도 좋아요·조회수 패치가 지나가는 계보라, 옵저버의 `isFetchNextPageError`
    는 패치 한 번에 지워진다(`useInfiniteTail` 머리말).
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
        // 검색 결과도 계보라 좋아요·삭제의 취소가 다음 장 요청을 함께 접는다 —
        // 실패가 아니라 "아무 일도 없었음" 을 가려내는 장수다(그 함수 머리말).
        pageCount: () =>
          queryClient.getQueryData<CommunityFeedData>(queryKey)?.pages.length ??
          0,
        // 검색어를 바꾸거나 다시 검색하면 날아가 있던 옛 요청은 무효다 — 돌아와서
        // 세대를 확인한다(피드와 같은 규칙 · `useInfiniteTail` 머리말 4).
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
    resetTail()
    return refetchQuery()
  }, [refetchQuery, resetTail])

  return {
    posts,
    isLoading,
    /** 조회 실패. 결과가 없을 때 "검색 결과가 없어요" 대신 오류를 그려야 한다. */
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    /**
     * 다음 페이지 요청이 실패한 상태. 결과 목록은 살아 있어 `isError` 로는 전면
     * 오류를 그릴 수 없다 — 화면은 꼬리에 실패 행을 세우고 재발화를 멈춘다.
     *
     * 옵저버 플래그가 아니라 **훅이 기억한 사실**이다(위 주석).
     */
    isFetchNextPageError: isTailError,
    /**
     * 그 실패의 **원인**. 꼬리 문구는 이것으로 고른다 — 옵저버의 `error` 는 낙관 패치
     * 한 번에 null 이 되어 문구가 일반 문구로 주저앉는다(`useInfiniteTail` 머리말 1).
     */
    nextPageError: tailError,
    /**
     * 다음 페이지 요청이 **아무 것도 못 받고** 끝났는가(좋아요·북마크·삭제의 취소).
     * 실패가 아니라서 실패 행을 세울 수 없다 — 화면은 꼬리에 "더 보기" 를 세운다.
     */
    isTailStalled,
    /** 빈 결과 자동 backfill 예산이 남았는가. 다 쓰면 화면이 "더 보기" 를 그린다. */
    canAutoBackfill,
    /** 자동 backfill 한 장을 예산에서 뺀다 — 화면의 backfill 이펙트가 부른다. */
    noteAutoBackfill,
  }
}

/** 최근 7일 인기 검색어(서버 집계). 검색 화면의 빈 상태에서만 쓴다. */
export function useCommunityPopularKeywords(limit = 10) {
  return useQuery({
    queryKey: ["community-popular-keywords", limit],
    queryFn: () => communityPostService.getPopularSearchKeywords(limit),
    // 7일 창의 집계라 분 단위로 변하지 않는다 — 화면을 오갈 때마다 다시 받지 않는다.
    staleTime: 5 * 60_000,
  })
}
