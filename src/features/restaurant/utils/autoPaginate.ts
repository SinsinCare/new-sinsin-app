/**
 * 상세 화면의 **자동 다음 쪽** 판정 — 화면 없이 테스트되는 순수 함수 둘.
 *
 * ## 왜 `onEndReached` 가 아닌가
 *
 * 상세는 히어로와 탭 바가 같은 스크롤에 있어야 해서(`stickyHeaderIndices={[1]}`)
 * 세로 스크롤러가 하나뿐이고, 그래서 탭 본문에 `FlatList` 를 넣을 수 없다.
 * 세 파일의 머리말이 거기서 **"그러므로 더보기 버튼"** 이라고 결론지었는데, 전제는
 * 참이지만 추론이 거짓이다 — `onEndReached` 는 FlatList 의 어포던스일 뿐 바닥 감지의
 * 유일한 수단이 아니다. 같은 저장소의 `app/consult.tsx` 가 이미 평범한 `onScroll` 로
 * 바닥 근접을 계산하고 있다.
 *
 * 그래서 판정만 여기로 꺼내고, 화면은 이미 흐르고 있는 `onScroll` 을 쓴다
 * (`RestaurantDetailScreen` 은 타이틀 전환 때문에 `scrollEventThrottle={16}` 으로
 * 이벤트를 이미 받고 있고 `layoutMeasurement`·`contentSize` 만 버리고 있었다).
 */

/**
 * 바닥 근접 판정.
 *
 * `content`/`viewport` 가 0 이면 **거짓**이다 — 첫 레이아웃 전에 0 이 들어오는데,
 * 그때 참을 주면 화면이 뜨자마자 다음 쪽을 당긴다.
 */
export function isNearBottom(
  metrics: { y: number; viewport: number; content: number },
  lead: number,
): boolean {
  if (metrics.content <= 0 || metrics.viewport <= 0) return false
  return metrics.y + metrics.viewport >= metrics.content - lead
}

/**
 * 바닥으로부터 몇 pt 앞에서 당길 것인가. **뷰포트에서 파생시킨다.**
 *
 * 상수 600 같은 값을 쓰면 안 되는 이유가 이 화면에 있다: 탭 본문이
 * `minHeight = viewport - tabBar` 라서 콘텐츠 최소 높이가 대략
 * `hero + viewport + actionBar` 다. lead 가 `hero + actionBar`(390pt 기기에서 630~660)를
 * 넘으면 y=0 에서 이미 "근접" 이라 판정이 무의미해진다. 뷰포트 절반이면 어떤 기기에서도
 * 그 아래에 남는다.
 */
export function loadMoreLead(viewport: number): number {
  return Math.min(360, Math.round(viewport * 0.5))
}

/**
 * 자동으로 이어 붙일 쪽 수 상한.
 *
 * 이 화면에는 **가상화가 없다** — 사진 격자는 불러온 타일을 전부 마운트한 채로 둔다.
 * 오늘 데이터로는 한 가게 최대 50장이라 두 쪽이면 소진되므로 이 상한은 발동하지 않는다
 * (그래서 QA 로 재현할 수 없다). 사진이 늘어난 뒤를 위한 가드다.
 *
 * `0` 으로 두면 자동이 완전히 꺼지고 예전 `더보기` 동작만 남는다 — 킬 스위치다.
 */
export const AUTO_PAGE_LIMIT = 3
