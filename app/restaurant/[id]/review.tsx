/**
 * 후기 작성. 목업 -26 / -27.
 *
 * 상호명은 상세 화면이 이미 알고 있으므로 파라미터로 받고, 딥링크처럼 없는 경우에만
 * 컨테이너가 상세를 받아 채운다(`RestaurantReviewWriteScreen` 헤더 참고).
 *
 * 등록에 성공하면 **작성 화면을 닫는다.** 목록 무효화는 `useRestaurantReviews` 의
 * 뮤테이션이 이미 하므로, 돌아간 상세 화면의 후기 탭에 새 후기가 들어와 있다.
 */

import { useCallback } from "react"
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"

import { RestaurantReviewWriteScreen } from "@/src/features/restaurant"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import type { ReviewDto } from "@/src/features/restaurant/types"
import { parseDecimalId } from "@/src/shared/navigation/routeParams"

export default function RestaurantReviewWriteRoute() {
  const router = useAppRouter()
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>()

  const restaurantId = parseDecimalId(id)

  const handleSubmitted = useCallback(
    (review: ReviewDto) => {
      if (restaurantId !== null) {
        trackAnalyticsEvent("restaurant_review_submit", {
          restaurant_id: restaurantId,
          // 별점은 필수 입력(`reviewDraftDefects`)이지만 DTO 상으로는 nullable 이다.
          // 0 을 보내면 "0점을 줬다" 로 읽히므로 없을 때는 -1 로 구분한다.
          rating: review.rating ?? -1,
          photo_count: review.imageUrls.length,
          keyword_count: review.keywords.length,
        })
      }
      router.back()
    },
    [restaurantId, router],
  )

  return (
    <RestaurantReviewWriteScreen
      restaurantId={restaurantId}
      restaurantName={name}
      onClose={() => router.back()}
      onSubmitted={handleSubmitted}
    />
  )
}
