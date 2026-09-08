/**
 * `저장한 곳`. DESIGN_SPEC §11.20.
 *
 * 목업에는 없지만 지도 기능으로서 빠질 수 없는 화면이다. 지도의 북마크 FAB 은
 * **"저장한 곳만 보기" 필터 토글**이라 목록 화면 역할을 하지 않는다 — 그래서 이 route 가
 * 있고, 문은 지도 목록 끝의 `MapUtilityFooter` 다.
 */

import {
  restaurantCardDestination,
  type RestaurantCardTarget,
} from "@/src/features/restaurant/utils/restaurantCardNavigation"
import { useCallback } from "react"
import { useAppRouter } from "@/src/shared/navigation"

import { RestaurantBookmarksScreen } from "@/src/features/restaurant"

export default function RestaurantBookmarksRoute() {
  const router = useAppRouter()

  const selectRestaurant = useCallback(
    (restaurantId: number, target: RestaurantCardTarget) => {
      router.push(restaurantCardDestination(restaurantId, "bookmark", target))
    },
    [router],
  )

  return (
    <RestaurantBookmarksScreen
      onBack={() => router.back()}
      onSelectRestaurant={selectRestaurant}
    />
  )
}
