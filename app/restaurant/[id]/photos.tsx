/**
 * 사진 뷰어(라이트박스). 목업 -16 / -17.
 *
 * 파라미터에서 사진 집합·시작 인덱스를 꺼내는 일은 `RestaurantPhotosScreen`(컨테이너)이
 * 한다 — 파싱이 실패했을 때 그 식당의 전체 사진으로 폴백하려면 질의가 필요하고,
 * route 파일에서 API 를 부르지 않는 것이 이 저장소의 규칙이다.
 */

import { useCallback } from "react"
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"

import { RestaurantPhotosScreen } from "@/src/features/restaurant"
import { parseDecimalId } from "@/src/shared/navigation/routeParams"

export default function RestaurantPhotosRoute() {
  const router = useAppRouter()
  const { id, index, photos } = useLocalSearchParams<{
    id: string
    index?: string
    photos?: string
  }>()

  const restaurantId = parseDecimalId(id)

  // `Number("")` 는 0, `Number("abc")` 는 NaN 이다. 둘 다 0번째 사진으로 여는 것이 맞다.
  const initialIndex = Number.parseInt(index ?? "", 10)

  const openReviewer = useCallback(
    (reviewerId: number) => {
      router.push({
        pathname: "/restaurant/reviewer/[id]",
        params: { id: reviewerId },
      })
    },
    [router],
  )

  return (
    <RestaurantPhotosScreen
      restaurantId={restaurantId}
      serializedPhotos={photos}
      initialIndex={Number.isNaN(initialIndex) ? 0 : initialIndex}
      onClose={() => router.back()}
      onPressAuthor={openReviewer}
    />
  )
}
