/**
 * 식당 상세. 화면 본체는 `src/features/restaurant/views/RestaurantDetailScreen`.
 *
 * ## 왜 `[id].tsx` 가 아니라 `[id]/index.tsx` 인가
 *
 * 사진 뷰어(`[id]/photos`)와 후기 작성(`[id]/review`)이 이 id 아래에 붙는다. 파일과
 * 같은 이름의 폴더를 나란히 두는 것보다 폴더 하나로 모으는 쪽이 `app/recipe/[id]/index.tsx`
 * 와도 같은 모양이다. **옛 `[id].tsx` 는 지웠다** — 남겨 두면 두 파일이 같은 URL
 * (`/restaurant/{id}`)로 등록되고, 어느 쪽이 열리는지는 라우터의 해석 순서에 달린다.
 * `tests/recipeRouteCollision.test.ts` 가 정확히 그 결함을 잡기 위해 존재한다.
 *
 * ## 이 라우트가 고치는 것 (§F.2)
 *
 * 이전 버전은 목 카탈로그(`getMockPlaceRestaurants`)에서 id 를 찾았다. 목 데이터의 id 는
 * `"p1".."p6"` 인데 API 카드가 넘기는 id 는 `"42"` 같은 숫자 문자열이라 **목록 카드를
 * 누르면 예외 없이 `식당 정보를 찾지 못했어요`** 가 떴다. 라우트가 하는 일은 파라미터를
 * 숫자로 바꿔 넘기는 것뿐이고, 없는 식당 안내도 화면이 한 곳에서 그린다.
 *
 * ## 콜백 네 개가 이제 다 연결됐다
 *
 * 화면은 진입점을 **콜백이 있을 때만** 렌더한다(누를 수 있어 보이는데 아무 일도 없는
 * 버튼을 남기지 않기 위한 계약). 그래서 후기 작성 카드·사진 뷰어·작성자 이름·신고는
 * 라우트가 생기기 전까지 아예 보이지 않았다. 네 route 가 모두 존재하므로 넷 다 넘긴다.
 *
 * 사진 집합은 직렬화해서 넘긴다 — 호출 지점마다 배열이 다르고(히어로 / 사진 탭 /
 * **그 후기의 사진만**), `id + index` 로는 복원할 수 없다. 자세한 이유는
 * `RestaurantPhotosScreen` 헤더에 적었다.
 */

import { useCallback } from "react"
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"

import {
  RestaurantDetailScreen,
  serializePhotoHandoff,
} from "@/src/features/restaurant"
import type { AnalyticsRestaurantEntrySource } from "@/src/features/analytics"

/** 10진수만 받는다. `Number("0x2a")` 는 42 를 돌려주고 `Number("")` 는 0 이다. */
const DECIMAL_ID = /^\d+$/u

/** 파라미터로 올 수 있는 진입 경로. 모르는 값이면 분석에서 딥링크로 본다. */
const ENTRY_SOURCES: readonly AnalyticsRestaurantEntrySource[] = [
  "map",
  "list",
  "bookmark",
  "search",
  "deep_link",
]

export default function RestaurantDetailRoute() {
  const router = useAppRouter()
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>()
  const restaurantId =
    typeof id === "string" && DECIMAL_ID.test(id)
      ? Number.parseInt(id, 10)
      : null

  const entrySource = ENTRY_SOURCES.find((value) => value === from)

  const openPhotos = useCallback(
    (photos: Parameters<typeof serializePhotoHandoff>[0], index: number) => {
      if (restaurantId === null) return
      router.push({
        pathname: "/restaurant/[id]/photos",
        params: {
          id: restaurantId,
          index,
          photos: serializePhotoHandoff(photos),
        },
      })
    },
    [restaurantId, router],
  )

  const writeReview = useCallback(() => {
    if (restaurantId === null) return
    router.push({
      pathname: "/restaurant/[id]/review",
      params: { id: restaurantId },
    })
  }, [restaurantId, router])

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
    <RestaurantDetailScreen
      restaurantId={restaurantId}
      entrySource={entrySource}
      onWriteReview={writeReview}
      onOpenPhotos={openPhotos}
      onPressReviewAuthor={openReviewer}
    />
  )
}
