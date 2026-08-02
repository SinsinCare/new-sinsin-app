/**
 * 후기 작성자 프로필. 목업 -30 ~ -33.
 *
 * ## ⚠️ 계약 블로커 — -30/-31/-32/-33 중 세 화면이 오늘 온전히 구현되지 않는다
 *
 * 두 가지가 서버에 없어서 이 route 가 채울 수 있는 값이 없다. 화면은 "없으면 감춘다" 로
 * 정직하게 처리하지만, **감춰졌다는 사실 자체가 계약 결손**이라 여기 적어 둔다.
 *
 * 1. **후기 → 식당 링크(`신신국밥 ›`).** `ReviewerProfileResponse.reviews` 의 `ReviewDto` 에
 *    `restaurantId`/`restaurantName` 이 없다(`author`·`menuName`·`visitCount` 만 있다).
 *    -30/-31/-32 는 모든 후기 행 머리에 이 링크를 그린다. `restaurantLabelFor` 를 넘기지
 *    않으면 화면이 그 줄을 그리지 않는다 — 아무 곳으로도 못 가는 링크보다 낫다.
 *    필요한 것: `GET /restaurants/reviewers/:id` 의 후기마다 `restaurantId` + 상호명.
 * 2. **전체 폭 팔로우 버튼.** 팔로우 엔드포인트와 테이블이 저장소에 존재하지 않는다.
 *    -30 은 `팔로우`(orange-50), -33 은 `팔로잉`(orange fill)을 전체 폭으로 그린다.
 *    `onToggleFollow` 를 넘기지 않으면 화면이 그 블록을 건너뛴다. 같은 결손이 상세 후기
 *    탭의 같은 자리에도 있다(`components/detail/ReviewCard.tsx` 헤더의 `headerAction`).
 *
 * 이 주석을 지우기 전에 위 두 필드가 응답에 들어왔는지 확인한다. 그때 이 파일에서
 * 바뀌는 것은 prop 두 개뿐이다.
 */

import { useCallback } from "react"
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"

import { ReviewerProfileScreen } from "@/src/features/restaurant"
import { reviewPhotos } from "@/src/features/restaurant/components/detail/reviewPhotos"
import type { ReviewDto } from "@/src/features/restaurant/types"

const DECIMAL_ID = /^\d+$/u

/**
 * 사진 뷰어 route 의 `[id]` 자리에 넣는 **일부러 숫자가 아닌** 값.
 *
 * 뷰어는 `/restaurant/[id]/photos` 에 살지만 이 화면의 후기에는 식당이 없다(위 결손 1).
 * 작성자 id 를 식당 id 자리에 끼워 넣으면 뷰어가 **엉뚱한 식당의 상호명과 후기**를 받아
 * 사진 위에 그린다. 숫자가 아닌 값을 주면 route 의 `DECIMAL_ID` 검사가 걸러 내
 * `restaurantId: null` 이 되고, 뷰어는 넘겨받은 사진 배열만으로 동작한다(제목은 `사진`).
 * 결손 1이 채워지면 진짜 식당 id 를 넣고 이 상수를 지운다.
 */
const NO_RESTAURANT = "reviewer"

export default function ReviewerProfileRoute() {
  const router = useAppRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  // 스크립트 시드 후기는 `user_id` 가 NULL 이라 작성자 id 가 없다. 그런 링크는 상세
  // 화면이 애초에 렌더하지 않지만, 딥링크로는 올 수 있다. 화면이 0 을 받아 자기 오류
  // 상태를 그린다.
  const reviewerId =
    typeof id === "string" && DECIMAL_ID.test(id) ? Number.parseInt(id, 10) : 0

  const openRestaurant = useCallback(
    (restaurantId: number) => {
      router.push({
        pathname: "/restaurant/[id]",
        params: { id: restaurantId, from: "list" },
      })
    },
    [router],
  )

  /**
   * 후기 사진 → 라이트박스. 상세 후기 탭과 **같은 동작**이다. 여기만 죽어 있으면
   * 사용자는 "사진은 못 여는 화면" 이 아니라 "앱이 반응하지 않는다" 로 읽는다.
   * 넘기는 배열은 그 후기의 사진만이다(`reviewPhotos` 헤더 참고 — 후기 안의 순번을
   * 전체 목록 인덱스로 넘기면 다른 사진이 열린다).
   */
  const openPhotos = useCallback(
    (review: ReviewDto, index: number) => {
      router.push({
        pathname: "/restaurant/[id]/photos",
        params: {
          id: NO_RESTAURANT,
          index: String(index),
          photos: JSON.stringify(reviewPhotos(review)),
        },
      })
    },
    [router],
  )

  return (
    <ReviewerProfileScreen
      reviewerId={reviewerId}
      onBack={() => router.back()}
      onPressRestaurant={openRestaurant}
      onPressPhoto={openPhotos}
    />
  )
}
