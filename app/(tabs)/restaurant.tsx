/**
 * `식당` 탭.
 *
 * ## 이 파일이 281줄에서 이만큼 줄어든 이유
 *
 * 이전 버전은 좌표 표 두 개(광역 17개 + 서울 세부 10개), 열거형 매핑 세 개, fetch 오케스트레이션,
 * DTO 매핑, 클라이언트 필터링을 route 파일 안에 들고 있었다. `docs/mobile-frontend-architecture.md`
 * 는 route 파일에서 API 호출·상태 조율·큰 렌더 트리를 금지하고 "100줄을 넘으면 feature 화면으로
 * 빼라" 고 못 박는데, 그 파일이 정확히 반례였다(INTEGRATION_BRIEF §C.1 이 이 점을 지적한다).
 * 좌표는 `data/regionCatalog.ts`, 필터·정렬은 `hooks/useRestaurantFilters`, 질의는
 * `hooks/useMapSearch`/`useRestaurantList` 가 갖고 있다.
 *
 * ## 플래그가 꺼졌을 때 제보 폼을 띄우지 않는다 (§F.1 / D11)
 *
 * 이전에는 `!restaurantTabEnabled` 일 때 `RestaurantReportForm` 을 탭 본체로 렌더했다.
 * 그 자리가 제보 폼의 **유일한 진입점**이었기 때문에 플래그를 켜는 순간 기능 하나가
 * 조용히 사라지는 구조였다. 이제 제보는 `app/restaurant/report.tsx` 라는 자기 route 를
 * 갖고, 플래그가 꺼진 자리에는 `준비 중` 안내 + 그 route 로 가는 CTA 가 선다.
 *
 * 플래그는 여전히 존중한다 — `mobile_app_policy` 4행 전부 `feature_flags = NULL` 이라
 * 서버에서 켜 주지 않으면 지도는 보이지 않는다. 그 사실을 코드에서 우회하지 않는다.
 */

import { useCallback, useEffect, useMemo, useRef } from "react"
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"

import {
  RestaurantComingSoon,
  RestaurantMapScreen,
} from "@/src/features/restaurant"
import { FeatureIntroSheet, useFeatureIntro } from "@/src/features/coach"
import { useMobilePolicy } from "@/src/features/mobilePolicy"
import { isRestaurantTabEnabled } from "@/src/features/mobilePolicy/services/mobilePolicyService"
import { trackAnalyticsEvent } from "@/src/features/analytics"

export default function RestaurantTabRoute() {
  const router = useAppRouter()
  const { policy, source } = useMobilePolicy()
  const restaurantTabEnabled = isRestaurantTabEnabled(policy)
  /* 계측은 화면(`RestaurantComingSoon`)이 아니라 여기서 한다 — 그 화면은 정책이
     **어디서 왔는지**를 모르고, 이 이벤트의 값은 거의 전부 거기 있다(설계 §9-②).
     정책이 아직 없으면 `"none"`: `null` 을 실으면 새니타이저가 키째로 떨군다. */
  const policySource = source ?? "none"
  // 검색 화면이 지역을 고르고 돌아올 때 좌표를 여기로 넘긴다(`app/restaurant/search.tsx`).
  // `ts` 는 값으로 쓰지 않는다 — **같은 지역을 다시 고를 때** 파라미터가 달라지게 하는
  // 용도다(탭은 언마운트되지 않아서 같은 좌표면 아래 useMemo 가 돌지 않는다).
  const { lat, lng, ts } = useLocalSearchParams<{
    lat?: string
    lng?: string
    ts?: string
  }>()

  const focus = useMemo(() => {
    const parsedLat = Number(lat)
    const parsedLng = Number(lng)
    // `Number(undefined)` 는 NaN, `Number("")` 는 0 이다. 0,0 은 기니만 바다 위이므로
    // 빈 문자열이 "좌표가 있다" 로 새어 들어가지 않게 빈 값도 함께 막는다.
    if (!lat || !lng || Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
      return null
    }
    return { lat: parsedLat, lng: parsedLng }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ts 는 재실행 트리거 전용
  }, [lat, lng, ts])

  /* 탭은 언마운트되지 않으므로 마운트 가드로는 부족하다. 정책 출처가 바뀌면
     (폴백 → 서버) 그건 **다른 사건**이라 다시 센다 — 같은 값으로는 다시 안 쏜다. */
  const viewedSourceRef = useRef<string | null>(null)
  useEffect(() => {
    if (restaurantTabEnabled) {
      viewedSourceRef.current = null
      return
    }
    if (viewedSourceRef.current === policySource) return
    viewedSourceRef.current = policySource
    trackAnalyticsEvent("restaurant_coming_soon_viewed", {
      source: policySource,
    })
  }, [policySource, restaurantTabEnabled])

  const goToReport = useCallback(() => {
    trackAnalyticsEvent("restaurant_coming_soon_report_pressed", {
      source: policySource,
    })
    router.push("/restaurant/report")
  }, [policySource, router])

  // 첫 진입 안내. 탭이 꺼진 "준비중" 화면에서는 띄우지 않는다 — 없는 기능을 설명하게 된다.
  const intro = useFeatureIntro("restaurant", restaurantTabEnabled)

  if (!restaurantTabEnabled) {
    return <RestaurantComingSoon onPressReport={goToReport} />
  }

  return (
    <>
      <RestaurantMapScreen focus={focus} />
      <FeatureIntroSheet
        feature="restaurant"
        visible={intro.visible}
        onClose={intro.dismiss}
      />
    </>
  )
}
