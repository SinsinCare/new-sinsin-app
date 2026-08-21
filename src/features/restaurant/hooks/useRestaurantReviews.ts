/**
 * 후기 탭. 커서 + 정렬 + 키워드/메뉴 필터, 그리고 평점 분해.
 *
 * ## 평점 분해는 첫 페이지 값만 쓴다
 *
 * `ratingBreakdown`·`keywordCounts`·`menuCounts` 는 전체 집계라 모든 페이지에 같은 값이
 * 실려 온다. 마지막 페이지에서 읽으면 사용자가 스크롤할 때마다 막대 그래프가 다시 그려진다.
 * 첫 페이지 값을 고정해서 쓴다.
 *
 * ## 작성 후에는 무효화한다
 *
 * 후기를 쓰면 목록·평점 분해·상세의 리뷰 수가 전부 달라진다. `submitReview` 는
 * 성공 시 이 세 캐시를 함께 무효화한다 — 하나만 털면 별점은 4.2 인데 리뷰 수는 451 인
 * 어긋난 화면이 남는다.
 */

import { useCallback, useMemo } from "react"
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { normalizeLanguage } from "@/src/i18n"
import { restaurantService } from "@/src/services/data/restaurantService"

import type {
  ReviewBreakdown,
  ReviewDto,
  ReviewSortOption,
  ReviewSubmitPayload,
} from "../types"
import { DEFAULT_REVIEW_SORT } from "../data/filterCatalog"
import {
  buildReviewReportPayload,
  type ReviewReportReasonCode,
} from "../utils/reviewReportReasons"
import { restaurantKeys } from "./restaurantQueryKeys"

export const REVIEW_PAGE_SIZE = 10

export interface UseRestaurantReviewsParams {
  restaurantId: number | null
  sort?: ReviewSortOption
  /** 후기 탭의 `특징` 칩. `null` = 전체. */
  keyword?: string | null
  /** 후기 탭의 `메뉴` 칩. `null` = 전체. */
  menuName?: string | null
}

export interface UseRestaurantReviewsResult {
  reviews: ReviewDto[]
  breakdown: ReviewBreakdown | null
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  /**
   * 다음 쪽만 실패했다(첫 쪽은 이미 있다). `isError` 와 갈라 두는 이유는
   * 훅 안 주석에 있다 — 하나로 두면 다음 쪽 실패가 읽던 내용을 지운다.
   */
  nextPageFailed: boolean
  isError: boolean
  error: unknown
  loadMore: () => void
  refetch: () => void
  /**
   * 응답은 봉투다 — 본문은 저장됐는데 **사진만 어긋난** 경우가 200 으로 온다.
   *
   * **`photosIndexed` 를 여기서 읽어 판정하지 말 것.** 이 자리의 옛 주석은
   * "`-1` 이면 사진만 실패" 만 말했는데, 그 판정은 앱이 필드 이름을 틀리게 보내던 내내
   * **한 번도 켜지지 않았다** — 사진이 전멸해도 서버는 "사진이 없었다"는 뜻의 `0` 을
   * 돌려줬고, 사용자는 사진을 고르고 성공 토스트를 봤다. 이 값 하나로는 아무것도
   * 못 가린다: `0` 은 0장 보냈으면 정상이고 3장 보냈으면 전멸, `-1` 은 사진은 저장됐고
   * 사진 탭 색인만 실패한 **다른 사실**이다.
   *
   * 판정 정본은 `utils/reviewDraft.ts` 로 옮겨갔다. 화면은 보낸 장수와 이 값을 함께
   * **`reviewPhotoNotice({ sent, indexed })` 한 번**만 부르고, 문구 키·톤·보간값을
   * 그대로 쓴다 — 그 함수 머리말대로 판정과 표를 나눠 부르기 시작하면 화면마다
   * 어긋난다.
   */
  submitReview: (
    payload: ReviewSubmitPayload,
  ) => Promise<{ review: ReviewDto; photosIndexed: number }>
  isSubmitting: boolean
  /**
   * `reason` 은 **화면 어휘**(`REVIEW_REPORT_REASONS[].code`)다. 서버 열거형이 아니다 —
   * 서버 어휘로 옮기는 일은 `buildReviewReportPayload` 만 한다.
   *
   * 타입을 `string` 으로 두지 않는 이유: 그 상태의 이 훅은 받은 값을 매핑도 `[CODE]`
   * 앞머리도 없이 그대로 서버에 넘겼다. 지금 호출부가 없다는 것이 안전하다는 뜻은
   * 아니다 — 다음 화면(작성자 프로필 신고 등)이 이 훅을 집는 순간 "다섯 중 넷이 400"
   * 결함이 그대로 되살아나고, 그때도 빨개지는 테스트는 없었다.
   */
  reportReview: (args: {
    reviewId: number
    reason: ReviewReportReasonCode
    /**
     * 자유입력 사유(`ETC`)일 때만 실린다. 다른 사유의 본문은 빌더가 버린다.
     *
     * 반대로 **`ETC` 인데 이 값이 비면 뮤테이션이 거부된다**(빌더가 던진다). 이 훅에는
     * 시트의 `canSubmit` 같은 게이팅이 없어서, 접어 주면 사용자가 쓴 글이 사라진 채
     * `[ETC]` 만 남은 신고가 조용히 접수된다 — 콘솔이 읽어도 아무것도 모르는 행이다.
     */
    detail?: string | null
  }) => Promise<{ reviewId: number; status: string }>
  isReporting: boolean
}

export function useRestaurantReviews({
  restaurantId,
  sort = DEFAULT_REVIEW_SORT,
  keyword = null,
  menuName = null,
}: UseRestaurantReviewsParams): UseRestaurantReviewsResult {
  const { i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
  const queryClient = useQueryClient()

  const infinite = useInfiniteQuery({
    queryKey: restaurantKeys.reviews(
      language,
      restaurantId ?? 0,
      sort,
      keyword,
      menuName,
    ),
    enabled: restaurantId !== null,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      restaurantService.fetchReviews(
        restaurantId as number,
        {
          cursor: pageParam,
          sort,
          keyword: keyword ?? undefined,
          menuName: menuName ?? undefined,
          limit: REVIEW_PAGE_SIZE,
        },
        signal,
      ),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  })

  const pages = infinite.data?.pages

  const reviews = useMemo<ReviewDto[]>(() => {
    if (!pages) return []
    const seen = new Set<number>()
    const merged: ReviewDto[] = []
    for (const page of pages) {
      for (const review of page.items) {
        if (seen.has(review.reviewId)) continue
        seen.add(review.reviewId)
        merged.push(review)
      }
    }
    return merged
  }, [pages])

  /**
   * 화면용 집계.
   *
   * `menuCounts` 는 서버에서 **객체**(`{ "비빔밥": 2 }`)로 온다. 예전 코드는 이걸
   * `{menuName,count}[]` 로 선언해 놓고 `menuCounts.length` 를 읽었고, 객체의 `.length` 는
   * `undefined` 라 후기 탭의 `메뉴` 필터 칩 줄이 **조용히 사라져** 있었다(터지지 않아서
   * 아무도 못 봤다). 여기서 배열로 옮기면서 **개수 내림차순**으로 정렬한다 —
   * 객체 키 순서에 칩 순서를 맡기면 서버 구현이 바뀔 때 칩이 이유 없이 뒤섞인다.
   */
  const breakdown = useMemo<ReviewBreakdown | null>(() => {
    const first = pages?.[0]
    if (!first) return null
    const menuCounts = Object.entries(first.menuCounts)
      .filter((entry): entry is [string, number] => entry[1] !== undefined)
      .map(([menuName, count]) => ({ menuName, count }))
      .sort((a, b) => b.count - a.count || a.menuName.localeCompare(b.menuName))
    return {
      avgRating: first.avgRating,
      totalCount: first.totalCount,
      keywordCounts: first.keywordCounts,
      menuCounts,
    }
  }, [pages])

  /** 후기 수·평점이 바뀌었으니 상세와 후기 목록을 함께 무효화한다. */
  const invalidateAfterWrite = useCallback(() => {
    if (restaurantId === null) return
    void queryClient.invalidateQueries({
      queryKey: ["restaurant", "reviews", language, restaurantId],
    })
    void queryClient.invalidateQueries({
      queryKey: restaurantKeys.detail(language, restaurantId),
    })
  }, [queryClient, language, restaurantId])

  const submitMutation = useMutation({
    mutationFn: (payload: ReviewSubmitPayload) =>
      restaurantService.createReview(restaurantId as number, payload),
    onSuccess: invalidateAfterWrite,
  })

  const reportMutation = useMutation({
    mutationFn: (args: {
      reviewId: number
      reason: ReviewReportReasonCode
      detail?: string | null
    }) =>
      restaurantService.reportReview(
        args.reviewId,
        // 시트(`ReviewReportSheet`)와 **같은 변환**을 탄다. 신고가 나가는 경로가 둘인데
        // 한쪽만 옮기면 남은 쪽이 그대로 400 이다 — 그게 이번에 고친 결함의 모양이다.
        buildReviewReportPayload(args.reason, args.detail ?? ""),
      ),
  })

  const loadMore = useCallback(() => {
    if (infinite.hasNextPage && !infinite.isFetchingNextPage) {
      void infinite.fetchNextPage()
    }
  }, [infinite])

  return {
    reviews,
    breakdown,
    isLoading: infinite.isLoading,
    isFetchingNextPage: infinite.isFetchingNextPage,
    hasNextPage: infinite.hasNextPage === true,
    /*
      **의미를 좁힌다.** query-core 는 이미 받아 둔 데이터가 있어도 실패한 fetch 마다
      `status:"error"` 로 가는데, 호출부는 이 값을 보고 화면을 통째로 지운다. 그러면
      다음 쪽 하나가 실패했을 때 읽고 있던 것까지 사라진다 — 자동 로딩을 켜면 요청이
      잦아져 상시화되는 결함이다.

      이름을 안 바꾸는 것은 호출부를 안 건드리기 위해서고, 저장소 관례와도 맞는다
      (`RestaurantDetailScreen` 은 이미 `isError && !detail` 로 쓴다).
    */
    isError: infinite.isError && infinite.data === undefined,
    /** 다음 쪽만 실패했다. 읽던 내용은 그대로 두고 재시도 손잡이만 붙인다. */
    nextPageFailed: infinite.isFetchNextPageError,
    error: infinite.error,
    loadMore,
    refetch: infinite.refetch,
    submitReview: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    reportReview: reportMutation.mutateAsync,
    isReporting: reportMutation.isPending,
  }
}
