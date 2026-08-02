/**
 * 리스트 전용 모드. 목업 -8 / -21.
 *
 * 검색어나 음식 종류로 들어오는 결과 화면이다. 지도가 없으므로 bbox 도 없고,
 * 서버는 전체 데이터에서 커서로 잘라 준다.
 *
 * 파라미터는 화면의 **초기 필터**로만 쓴다 — 그 뒤의 필터 변경은 화면이 자기 상태로
 * 들고 있고 URL 로 되돌리지 않는다. 되돌리면 칩을 한 번 누를 때마다 히스토리가 쌓여
 * 뒤로 가기가 필터 되돌리기가 된다.
 */

import { useCallback, useMemo } from "react"
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"

import { RestaurantListScreen } from "@/src/features/restaurant"
import { CUISINE_TYPES } from "@/src/features/restaurant/data/filterCatalog"
import type { CuisineType, FilterState } from "@/src/features/restaurant/types"

export default function RestaurantListRoute() {
  const router = useAppRouter()
  const { q, cuisine } = useLocalSearchParams<{
    q?: string
    cuisine?: string
  }>()

  const initialFilters = useMemo<Partial<FilterState>>(() => {
    // 카탈로그에 없는 값은 버린다. 서버가 400 을 주거나 조용히 0건이 되고, 둘 다
    // 사용자에게는 "고장" 으로 보인다.
    const known = CUISINE_TYPES.find((spec) => spec.value === cuisine)
    const cuisineTypes: CuisineType[] = known ? [known.value] : []
    return {
      query: q ?? "",
      ...(cuisineTypes.length > 0 ? { cuisineTypes } : {}),
    }
  }, [cuisine, q])

  const selectRestaurant = useCallback(
    (restaurantId: number) => {
      router.push({
        pathname: "/restaurant/[id]",
        params: { id: restaurantId, from: "list" },
      })
    },
    [router],
  )

  const openSearch = useCallback(() => {
    router.push({ pathname: "/restaurant/search", params: { q: q ?? "" } })
  }, [q, router])

  return (
    <RestaurantListScreen
      initialFilters={initialFilters}
      onBack={() => router.back()}
      onPressSearchField={openSearch}
      onSelectRestaurant={selectRestaurant}
    />
  )
}
