/**
 * `식당 알려주기` — 제보 폼의 **자기 route** (INTEGRATION_BRIEF §F.1).
 *
 * 이 파일이 생긴 이유가 곧 이 배치의 전제다. 제보 폼은 `restaurantTab` 플래그가 꺼져
 * 있을 때 `식당` 탭의 본체로만 렌더됐고, 그래서 지도를 켜는 순간 폼으로 가는 유일한 길이
 * 사라졌다. 이제 문이 둘이다: 지도 목록 끝의 `MapUtilityFooter`, 그리고 플래그가 꺼진
 * 탭의 `준비 중` 화면 CTA. 플래그를 어느 쪽으로 돌려도 폼은 남는다.
 */

import { useAppRouter } from "@/src/shared/navigation"

import { RestaurantReportScreen } from "@/src/features/restaurant"

export default function RestaurantReportRoute() {
  const router = useAppRouter()
  return <RestaurantReportScreen onBack={() => router.back()} />
}
