/**
 * "지도에서 고른 곳이 목록의 **첫 카드**" 규칙의 순수한 두 조각.
 *
 * ## 왜 미리보기 카드를 시트 헤더에 고정하지 않았나 (되돌리지 말 것)
 *
 * 한때 선택한 마커를 시트 sticky 헤더에 **얇은 미리보기 카드**로 띄웠다. 화면에는 첫
 * 번째로 보이는 것이 두 개가 됐다 — 헤더의 미리보기(`더뭉티기 강남점`)와 목록의 1번
 * 카드(`맛짱김밥천국`). 게다가 미리보기는 마커 payload 만 들고 있어서 평점·거리·사진이
 * 없는 **열화판 카드**였다. 지도 앱은 그렇게 하지 않는다. 고른 곳을 목록의 맨 위로
 * 올린다. 목록은 하나, 첫 항목도 하나다.
 *
 * ## 어려운 부분: 고른 마커는 대개 로드된 목록 안에 없다
 *
 * `/map` 은 뷰포트 안 최대 200개를 주고 `/search` 는 20개짜리 한 쪽을 준다. 그래서
 * 예전 `scrollToRestaurant` 는 `findIndex` 에서 -1 을 받고 **조용히 아무 일도 하지
 * 않았다** — 사용자에게는 "마커를 눌러도 하단이 안 바뀐다" 로 보였고 실제로 그렇게
 * 보고됐다. 목록에 없으면 상세(`GET /:id`)를 카드로 **매핑해서** 맨 앞에 끼운다.
 *
 * 마커 payload 를 살찌우는 길(계약 §2.1 규칙 5)은 택하지 않았다 — 마커 200개에 사진
 * URL 3장씩 실으면 지도 응답이 그것만으로 수백 KB 다. 상세는 **고른 한 곳에 대해서만**
 * 한 번 받는다.
 */

import type { LatLng, RestaurantCardDto, RestaurantDetailDto } from "../types"

/** 지도 화면의 선택 상태. 출처가 재정렬 여부를 정한다(화면 state 와 같은 모양). */
export interface MapSelection {
  id: number
  origin: "MARKER" | "CARD"
}

/**
 * 카드 탭이 만드는 **다음 선택**. 같은 곳이면 이전 선택을 그대로 돌려준다.
 *
 * 카드 탭이 무조건 `origin: "CARD"` 를 쓰면, 마커로 골라 **맨 위에 고정된 카드**를
 * 눌러 상세로 들어가는 순간 출처가 강등되고 고정 조건(`origin === "MARKER"`)이 죽는다.
 * 상세 화면 뒤에서 목록이 원래 순서로 돌아가므로, 돌아온 사용자는 "마커는 그대로인데
 * 첫 카드가 사라진" 화면을 본다 — 실제로 그렇게 보고됐다(2026-08-05, 재발).
 *
 * 같은 곳을 다시 누르는 탭은 화면을 바꾸지 않는 것이 맞다: 이미 0번인 카드는 origin 이
 * MARKER 로 남아도 아무것도 튀지 않고, CARD 였다면 어차피 재정렬이 없다. 다른 곳을
 * 눌렀을 때만 CARD 출처의 새 선택을 만든다 — 그때 재정렬하면 방금 누른 카드가 손가락
 * 밑에서 위로 튀기 때문이다(화면 `selection` 주석).
 */
export function selectionAfterCardPress(
  prev: MapSelection | null,
  cardId: number,
): MapSelection {
  if (prev !== null && prev.id === cardId) return prev
  return { id: cardId, origin: "CARD" }
}

/**
 * 고른 곳을 맨 앞으로 올린 목록. **원본 배열을 변형하지 않는다.**
 *
 * 세 가지 경우를 한 함수에 모아 둔 이유: 규칙이 흩어지면 "목록에 있을 때는 스크롤,
 * 없을 때는 헤더" 같은 서로 다른 두 동작이 다시 생긴다. 첫 카드는 언제나 고른 곳이다.
 *
 * 1. 목록에 있다 → 그 자리에서 뽑아 0번으로 옮긴다. 나머지 상대 순서는 유지한다.
 * 2. 목록에 없고 `fallback` 이 있다 → 맨 앞에 끼운다.
 * 3. 목록에 없고 `fallback` 도 없다 → 원본 그대로. 아직 카드를 못 받았다는 뜻이고,
 *    그 사이 첫 줄은 호출부가 스켈레톤으로 채운다.
 *
 * **중복은 구조적으로 불가능하다.** 스크롤을 더 내려 다음 쪽이 도착하고 그 쪽에 고른
 * 곳이 들어 있으면 1번 분기가 이긴다 — `fallback` 은 목록에 없을 때만 쓰이므로 같은
 * 가게가 두 줄로 서지 않는다. `fallback` 쪽에서도 같은 id 를 한 번 더 걸러 내는 것은
 * 그 불변식을 코드에도 적어 두기 위한 방어선이다.
 */
export function orderSelectedFirst(
  items: RestaurantCardDto[],
  selectedId: number | null,
  fallback: RestaurantCardDto | null | undefined,
): RestaurantCardDto[] {
  if (selectedId === null) return items

  const index = items.findIndex((item) => item.restaurantId === selectedId)
  if (index === 0) return items
  if (index > 0) {
    return [items[index], ...items.slice(0, index), ...items.slice(index + 1)]
  }

  if (!fallback) return items
  return [
    fallback,
    ...items.filter((item) => item.restaurantId !== fallback.restaurantId),
  ]
}

/**
 * 상세 응답 → 목록 카드. 새 엔드포인트도, 마커 payload 확장도 없이 첫 슬롯을 채운다.
 *
 * 좌표는 상세가 `null` 일 수 있어서(`lat`/`lng` 가 nullable 이다) 마커 좌표를 폴백으로
 * 받는다. 둘 다 없으면 **카드를 만들지 않는다** — `lat: 0` 짜리 카드를 누르면 지도
 * 카메라가 기니 만(0,0)으로 날아간다.
 *
 * ## 없는 값을 지어내지 않는다
 *
 * - `distanceKm` 은 상세 응답에 **없다**(서버가 기준 좌표를 받지 않는다). 거리 공식을
 *   앱에 두 번째로 복사해 여기서 계산하지 않는다 — 계약 D5 이고, 그러면 같은 "2.6km"
 *   가 화면마다 달라진다. `null` 이면 카드가 거리 조각을 **빼고** 지역만 그린다.
 * - `safety.driverCounts` 도 상세에는 없다. 빈 객체를 주면 `dominantDriver` 가 `null` 을
 *   내고 두 번째 배지가 사라진다. 판정을 끈 영양소를 모르면 말하지 않는 쪽이 맞다.
 * - `safety.level` 은 서버가 사용자 기준으로 계산한 `avgSafety` 를 **그대로** 옮긴다.
 *   `UNKNOWN` 을 `SAFE` 로 올리지 않고(D4), `profileMissing` 도 그대로 실어
 *   `cardSafetyBadges` 가 배지를 아예 그리지 않게 한다(D3/D4).
 */
export function detailToCard(
  detail: RestaurantDetailDto,
  fallbackCoords?: LatLng | null,
): RestaurantCardDto | null {
  const lat = detail.lat ?? fallbackCoords?.lat ?? null
  const lng = detail.lng ?? fallbackCoords?.lng ?? null
  if (lat === null || lng === null) return null

  return {
    restaurantId: detail.restaurantId,
    name: detail.name,
    lat,
    lng,
    cuisineType: detail.cuisineType,
    legacyNutritionTags: detail.legacyNutritionTags,
    rating: detail.rating,
    reviewCount: detail.reviewCount,
    businessStatus: detail.businessStatus,
    closeTime: detail.closeTime,
    openTime: detail.openTime,
    breakStart: detail.breakStart,
    breakEnd: detail.breakEnd,
    distanceKm: null,
    shortAddress: detail.shortAddress,
    address: detail.address,
    jibunAddress: detail.jibunAddress,
    zipcode: detail.zipcode,
    imageUrls: detail.imageUrls,
    ...(detail.representativeMenuNames !== undefined
      ? { representativeMenuNames: detail.representativeMenuNames }
      : {}),
    safety: {
      level: detail.avgSafety,
      menuCount: detail.menuCount,
      safeMenuCount: detail.safetySummary.safe,
      cautionMenuCount: detail.safetySummary.caution,
      restrictedMenuCount: detail.safetySummary.restricted,
      unknownMenuCount: detail.safetySummary.unknown,
      hasSafeMenu: detail.hasSafeMenu,
      driverCounts: {},
      profileMissing: detail.profileMissing,
    },
    bookmarked: detail.bookmarked,
    avgPrice: detail.avgPrice,
    priceRange: detail.priceRange,
    regionSido: detail.regionSido,
    regionGroup: detail.regionGroup,
    regionSigungu: detail.regionSigungu,
  }
}
