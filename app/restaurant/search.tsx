/**
 * 식당 검색 (최근 검색어 + 자동완성). DESIGN_SPEC §11.10.
 *
 * ## 세 가지 결과가 서로 다른 곳으로 간다
 *
 * - **식당** 제안 → 상세로 직행. 사용자가 이미 그 가게를 고른 것이다.
 * - **지역** 제안 → `list` 로 보내지 않고 **지도로 돌아가 카메라를 옮긴다.**
 *   `강남역` 을 텍스트 검색으로 보내면 서버가 식당 **이름**을 매칭하므로 강남 시드
 *   블록에서도 0건이 나온다(§F.18 이 같은 함정을 기록한다). 좌표가 있으면 좌표를 쓴다.
 * - **직접 입력** → 리스트 전용 모드(-8/-21).
 *
 * 지역 제안의 좌표는 `/restaurant?lat=..&lng=..` 로 지도 탭에 넘긴다 —
 * `router.push` 로 지도를 한 장 더 쌓으면 WebView 와 카카오 SDK 가 두 번 뜬다.
 */

import { useCallback } from "react"
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"

import { RestaurantSearchScreen } from "@/src/features/restaurant"
import type { SearchSuggestionDto } from "@/src/features/restaurant/types"

export default function RestaurantSearchRoute() {
  const router = useAppRouter()
  const { q } = useLocalSearchParams<{ q?: string }>()

  const submitQuery = useCallback(
    (query: string) => {
      router.push({ pathname: "/restaurant/list", params: { q: query } })
    },
    [router],
  )

  const selectRestaurant = useCallback(
    (restaurantId: number) => {
      router.push({
        pathname: "/restaurant/[id]",
        params: { id: restaurantId, from: "search" },
      })
    },
    [router],
  )

  const selectRegion = useCallback(
    (suggestion: SearchSuggestionDto) => {
      /*
       * 좌표가 없으면 라벨을 리스트 검색어로 쓴다. 지도로 보내면 카메라를 어디로 옮길지
       * 알 수 없고, 엉뚱한 곳을 보여 주는 것보다 목록이 정직하다.
       *
       * 검사가 `=== null` 이 아니라 `=== undefined` 인 이유: 서버는 해당 없는 필드의
       * **키를 지운다**(`SearchSuggestionDto` 헤더). 예전 `=== null` 검사는 실제로는
       * 한 번도 참이 되지 않았고, 좌표 없는 제안이 그대로 아래 `navigate` 로 흘러
       * `lat: undefined` 로 카메라를 옮겼다.
       *
       * 오늘 이 분기에 도달하는 제안은 없다 — `regionCatalog` 의 모든 지역이 좌표를
       * 갖는다(`lat: number`, 옵셔널이 아니다). 그래도 남긴다: 카탈로그에 좌표 없는
       * 항목이 하나 생기는 날 이 화면이 `강남` 을 식당 **이름**으로 검색해 0건을
       * 내놓는 대신 목록으로 내려가야 한다.
       */
      if (suggestion.lat === undefined || suggestion.lng === undefined) {
        router.push({
          pathname: "/restaurant/list",
          params: { q: suggestion.label },
        })
        return
      }
      router.navigate({
        pathname: "/(tabs)/restaurant",
        /*
          `ts` 는 **같은 지역을 다시 고를 수 있게** 하는 값이다. 탭은 언마운트되지 않으므로
          좌표만 넘기면 파라미터가 이전과 같아 `useMemo` 도 지도 쪽 이펙트도 돌지 않는다 —
          강남을 보다가 부산을 봤다가 다시 강남을 고르면 아무 일도 일어나지 않았다.
        */
        params: {
          lat: suggestion.lat,
          lng: suggestion.lng,
          ts: String(Date.now()),
        },
      })
    },
    [router],
  )

  return (
    <RestaurantSearchScreen
      initialQuery={q}
      onSubmitQuery={submitQuery}
      onSelectRegion={selectRegion}
      onSelectRestaurant={selectRestaurant}
      onBack={() => router.back()}
    />
  )
}
