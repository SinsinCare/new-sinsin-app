/**
 * 작성자 프로필 화면(목업 -30~-33)의 데이터.
 *
 * ## 서버는 `{ profile, stats }` **두 키만** 준다 (계약 E13)
 *
 * 예전 이 훅은 `useInfiniteQuery` 로 `page.reviews` 를 돌며 작성자가 쓴 후기를 모았다.
 * 그 배열은 **응답에 없다** — `for (const review of undefined)` 다. 커서도 없다.
 * 계약 E13 도 목록을 약속하지 않으므로 **앱이 틀렸고**, 서버에 목록을 새로 만들지 않고
 * 앱을 응답에 맞췄다. 목업의 후기 목록은 지금 그릴 근거가 없다는 뜻이고, 화면은 그 자리를
 * 빈 상태로 둔다(없는 목록을 0건으로 위장하지 않는다).
 *
 * 그래서 `useQuery` 다. 페이지가 하나뿐인 것을 무한쿼리로 감싸면 다음 사람이
 * 페이지네이션이 있는 줄로 읽는다.
 *
 * ## 팔로우는 켤 수 없다
 *
 * 팔로우 표가 스키마에 없어서 서버가 `followerCount`/`followingCount` 를 `null` 로 주고
 * `following` 이라는 필드는 **아예 없다**. 예전 코드의 `profile.following !== null` 은
 * 그 필드가 없으니 `undefined !== null` → `true` 로 통과했다. 즉 **눌러도 아무 일 없는
 * 버튼을 켜는 조건**이었다. 지금은 서버가 상태를 실을 때까지 `canFollow` 가 `false` 다.
 */

import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { normalizeLanguage } from "@/src/i18n"
import { restaurantService } from "@/src/services/data/restaurantService"

import type {
  ReviewDto,
  ReviewSortOption,
  ReviewerProfileDto,
  ReviewerStatsDto,
} from "../types"
import { DEFAULT_REVIEW_SORT } from "../data/filterCatalog"
import { restaurantKeys } from "./restaurantQueryKeys"

export interface UseReviewerProfileResult {
  profile: ReviewerProfileDto | null
  stats: ReviewerStatsDto | null
  /**
   * 이 작성자가 쓴 후기. **오늘은 항상 빈 배열이다** — 서버가 주지 않는다(위 헤더).
   * 화면이 목록 자리를 어떻게 다룰지 정하는 자리를 남겨 두기 위해 필드는 유지한다.
   */
  reviews: ReviewDto[]
  /** 서버가 실제로 후기 목록을 실어 주는가. `false` 면 화면은 목록 대신 안내를 그린다. */
  reviewsAvailable: boolean
  avgRating: number | null
  totalCount: number
  /** 팔로우 UI 를 그릴 수 있는가. 서버가 팔로우 상태를 주지 않는 동안 `false`. */
  canFollow: boolean
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => void
}

export function useReviewerProfile(
  reviewerId: number | null,
  sort: ReviewSortOption = DEFAULT_REVIEW_SORT,
): UseReviewerProfileResult {
  const { i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)

  const query = useQuery({
    // `sort` 는 서버가 읽지 않지만(목록이 없다) 키에는 남긴다 — 화면의 정렬 시트가
    // 살아 있고, 목록이 생기는 날 이 키가 이미 옳은 모양이기 때문이다.
    queryKey: restaurantKeys.reviewer(language, reviewerId ?? 0, sort),
    enabled: reviewerId !== null,
    queryFn: () => restaurantService.fetchReviewerProfile(reviewerId as number),
  })

  const stats = query.data?.stats ?? null

  return {
    profile: query.data?.profile ?? null,
    stats,
    reviews: [],
    reviewsAvailable: false,
    avgRating: stats?.avgRating ?? null,
    totalCount: stats?.reviewCount ?? 0,
    canFollow: false,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
