/**
 * 상세 화면 인스턴스 키. 식당이 바뀌면 **컴포넌트를 새로 마운트**하기 위한 것이다.
 *
 * ## 왜 필요한가 — 딥링크가 남의 상태를 입고 열렸다 (2026-07-31 실측)
 *
 * `/restaurant/24` 를 열어 두고 `sinsin://restaurant/51` 로 들어가면, expo-router 는
 * **같은 route(`restaurant/[id]/index`) 의 파라미터만 갈아** 준다. 새 화면을 쌓지 않는다.
 * react-query 키에는 id 가 들어 있으므로 데이터는 51 번 것으로 바뀌는데,
 * 화면이 들고 있는 `useState` 는 24 번 것 그대로 남는다. 실제로 이렇게 보였다:
 *
 * - 탭이 `후기` 에 머문다(새 가게는 `홈` 부터여야 한다)
 * - 히어로 사진 표시가 `3/3` 인데 첫 장이 떠 있다(`photoIndex` 가 남았다)
 * - 스크롤이 맨 위인데 헤더에 상호명이 이미 떠 있다(`showTitle` 이 남았다)
 * - 후기 탭의 메뉴·키워드 필터가 이전 가게의 것으로 남는다
 *
 * 사용자가 "상태 관리가 망가진 것 같다" 고 한 화면이 이것이다.
 *
 * ## 왜 상태를 하나씩 초기화하지 않나
 *
 * 이 화면의 상태는 본체의 `useState` 7개만이 아니다. `ReviewTab`(정렬·키워드·메뉴 필터·
 * 더보기), `PhotoTab`(카테고리 칩), `ScrollView` 의 스크롤 위치까지 자식들이 각자 들고
 * 있다. `useEffect(() => reset(), [id])` 로 맞추려면 **새 상태를 추가할 때마다** 그
 * 목록에 손으로 더해야 하고, 하나라도 빠지면 같은 결함이 조용히 돌아온다. 마운트 키는
 * 그 목록을 유지할 필요가 없다 — 규칙이 "id 가 다르면 다른 화면" 한 줄이다.
 *
 * ## route 가 아니라 화면이 갖는다
 *
 * `app/restaurant/[id]/index.tsx` 에 `key` 를 다는 방법도 있지만, 그러면 이 규칙이
 * route 파일에 숨는다. 딥링크·`router.push`·탭 복귀 어느 경로로 들어오든 같아야 하는
 * 성질이므로 화면 자신이 소유한다(`RestaurantDetailScreen` 헤더 참고).
 */

/**
 * 같은 id 면 항상 같은 문자열, 다른 id 면 반드시 다른 문자열.
 * `null`(파라미터 파싱 실패)도 자기 자리를 갖는다 — 못 찾은 화면과 42번 가게가 같은
 * 인스턴스를 쓰면 "못 찾음" 상태가 다음 가게로 새어 간다.
 */
export function restaurantDetailInstanceKey(
  restaurantId: number | null,
  initialTab: "home" | "menu" = "home",
): string {
  const venue =
    restaurantId === null
      ? "restaurant-detail-none"
      : `restaurant-detail-${restaurantId}`
  return initialTab === "home" ? venue : `${venue}:${initialTab}`
}
