/**
 * **고른 곳이 첫 카드** — 순서 규칙과 상세→카드 매핑의 회귀 테스트.
 *
 * 이 기능이 두 번 잘못 만들어졌고, 두 번 다 타입은 깨끗했다.
 *
 * 1. `scrollToRestaurant` 의 `findIndex` 가 -1 을 받고 **조용히 반환**했다. 지도 마커
 *    (`/map`, 최대 200개)는 대개 로드된 목록 한 쪽(`/search`, 20건) 안에 없기 때문이다.
 *    사용자에게는 "마커를 눌러도 하단이 안 바뀐다" 로 보였다.
 * 2. 그 수리로 시트 헤더에 미리보기 카드를 고정했더니 **첫 번째로 보이는 것이 두 개**가
 *    됐다(헤더의 미리보기 + 목록의 1번 카드).
 *
 * 그래서 여기서는 "첫 항목은 언제나 하나이고 그것이 고른 곳" 을 여러 각도에서 못 박는다.
 * 특히 페이지가 더 로드돼 고른 곳이 목록에 **뒤늦게 들어오는** 순간의 중복을 본다 —
 * 무한 스크롤에서 실제로 일어나고, 눈으로 잡기 가장 어려운 경우다.
 */

import {
  detailToCard,
  orderSelectedFirst,
} from "../src/features/restaurant/utils/selectedFirstCard"
import { cardSafetyBadges } from "../src/features/restaurant/utils/cardSafetyBadge"
import type {
  RestaurantCardDto,
  RestaurantDetailDto,
} from "../src/features/restaurant/types"
import detailFixture from "./fixtures/restaurant/detail.json"
import searchFixture from "./fixtures/restaurant/search.json"

/**
 * 살아 있는 서버(:8100)의 실측 응답이다. JSON import 는 리터럴 타입이라 열거형
 * (`cuisineType`·`avgSafety`)이 `string` 으로 좁혀지지 않는다 — 그 한 가지 때문에
 * 캐스팅한다. 값을 손으로 고치지 말 것.
 */
const DETAIL = detailFixture as unknown as RestaurantDetailDto

/** 서버가 실제로 보낸 `/search` 카드 한 장. 키 목록의 정본이다. */
const MEASURED_CARD_KEYS = Object.keys(searchFixture.items[0]).sort()

function card(restaurantId: number): RestaurantCardDto {
  return { restaurantId, name: `식당 ${restaurantId}` } as RestaurantCardDto
}

const ids = (items: RestaurantCardDto[]) =>
  items.map((item) => item.restaurantId)

describe("orderSelectedFirst — 고른 곳을 0번으로", () => {
  const page = [card(1), card(2), card(3), card(4)]

  it("선택이 없으면 원래 순서 그대로다(같은 배열을 돌려준다)", () => {
    expect(orderSelectedFirst(page, null, null)).toBe(page)
  })

  it("목록 안에 있으면 뽑아 올리고 나머지 상대 순서는 지킨다", () => {
    expect(ids(orderSelectedFirst(page, 3, null))).toEqual([3, 1, 2, 4])
  })

  it("이미 0번이면 배열을 새로 만들지 않는다 — FlatList 를 헛되이 다시 그리지 않는다", () => {
    expect(orderSelectedFirst(page, 1, null)).toBe(page)
  })

  it("원본 배열을 변형하지 않는다", () => {
    orderSelectedFirst(page, 4, null)
    expect(ids(page)).toEqual([1, 2, 3, 4])
  })

  it("목록에 없으면 받아 온 카드를 맨 앞에 끼운다", () => {
    const result = orderSelectedFirst(page, 99, card(99))
    expect(ids(result)).toEqual([99, 1, 2, 3, 4])
  })

  it("목록에도 없고 카드도 아직 없으면 순서를 흔들지 않는다(첫 줄은 스켈레톤이 채운다)", () => {
    expect(orderSelectedFirst(page, 99, null)).toBe(page)
  })

  /**
   * 페이지네이션과 싸우지 않는다. 스크롤을 내려 다음 쪽이 도착하고 그 안에 고른 곳이
   * 들어 있으면, 앞에 끼운 카드와 목록의 카드가 **둘 다** 서는 것이 가장 흔한 결함이다.
   */
  it("다음 쪽에 고른 곳이 들어와도 두 줄이 되지 않는다", () => {
    const nextPage = [...page, card(99), card(100)]
    const result = orderSelectedFirst(nextPage, 99, card(99))
    expect(ids(result)).toEqual([99, 1, 2, 3, 4, 100])
    expect(new Set(ids(result)).size).toBe(result.length)
  })
})

describe("detailToCard — 상세를 카드로", () => {
  it("`/search` 카드와 **키가 정확히 같다** (빈 필드가 조용히 undefined 로 남지 않는다)", () => {
    const mapped = detailToCard(DETAIL)
    expect(mapped).not.toBeNull()
    expect(Object.keys(mapped as RestaurantCardDto).sort()).toEqual(
      MEASURED_CARD_KEYS,
    )
  })

  it("상호명·평점·사진을 실제 값으로 옮긴다 — 열화판 카드가 아니다", () => {
    const mapped = detailToCard(DETAIL) as RestaurantCardDto
    expect(mapped.restaurantId).toBe(DETAIL.restaurantId)
    expect(mapped.name).toBe(DETAIL.name)
    expect(mapped.rating).toBe(DETAIL.rating)
    expect(mapped.reviewCount).toBe(DETAIL.reviewCount)
    expect(mapped.imageUrls).toEqual(DETAIL.imageUrls)
    expect(mapped.imageUrls.length).toBeGreaterThan(0)
  })

  it("거리는 `null` 이다 — 상세 응답에 없고 공식을 앱에 복사하지 않는다(D5)", () => {
    expect(detailToCard(DETAIL)?.distanceKm).toBeNull()
  })

  it("안전도 등급을 그대로 옮긴다 (집계는 safetySummary 에서 편다)", () => {
    const safety = (detailToCard(DETAIL) as RestaurantCardDto).safety
    expect(safety.level).toBe(DETAIL.avgSafety)
    expect(safety.restrictedMenuCount).toBe(DETAIL.safetySummary.restricted)
    expect(safety.safeMenuCount).toBe(DETAIL.safetySummary.safe)
    expect(safety.menuCount).toBe(DETAIL.menuCount)
  })

  it("UNKNOWN 을 SAFE 로 승격하지 않고, 배지도 그리지 않는다 (D4)", () => {
    const unknown = detailToCard({
      ...DETAIL,
      avgSafety: "UNKNOWN",
    }) as RestaurantCardDto
    expect(unknown.safety.level).toBe("UNKNOWN")
    expect(cardSafetyBadges(unknown.safety)).toEqual({
      level: null,
      note: null,
    })
  })

  it("프로필이 없으면 배지가 하나도 서지 않는다 (D3/D4)", () => {
    const missing = detailToCard({
      ...DETAIL,
      profileMissing: true,
    }) as RestaurantCardDto
    expect(missing.safety.profileMissing).toBe(true)
    expect(cardSafetyBadges(missing.safety)).toEqual({
      level: null,
      note: null,
    })
  })

  it("driverCounts 가 비어 보조 배지를 지어내지 않는다", () => {
    const mapped = detailToCard(DETAIL) as RestaurantCardDto
    // 픽스처는 `RESTRICTED` + 안전 메뉴 0개 — 목록 카드였다면 `나트륨 기준` 이 섰을 자리다.
    expect(mapped.safety.driverCounts).toEqual({})
    expect(cardSafetyBadges(mapped.safety).note).toBeNull()
  })

  it("상세에 좌표가 없으면 마커 좌표로 메운다", () => {
    const mapped = detailToCard(
      { ...DETAIL, lat: null, lng: null },
      { lat: 37.5, lng: 127.02 },
    )
    expect(mapped?.lat).toBe(37.5)
    expect(mapped?.lng).toBe(127.02)
  })

  it("좌표를 어디서도 못 구하면 카드를 만들지 않는다 — (0,0) 카드를 세우지 않는다", () => {
    expect(detailToCard({ ...DETAIL, lat: null, lng: null })).toBeNull()
  })
})
