/**
 * 시트 목록을 "고른 곳이 첫 카드" 순서로 바꾼다. 규칙 자체는 순수 함수
 * (`utils/selectedFirstCard`)에 있고, 이 훅은 **목록에 없는 곳의 카드를 구해 오는**
 * 일만 한다.
 *
 * ## 왜 상세를 쓰나 (다른 두 길을 왜 안 골랐나)
 *
 * 고른 마커는 대개 로드된 `/search` 한 쪽(20건) 안에 없다. 그 카드를 구하는 길은 셋이었다.
 *
 * - **(a) 상세를 카드로 매핑한다** ← 이 길. 새 엔드포인트가 없고, 서버 계약도 안 건드리고,
 *   무엇보다 이 요청이 **버려지지 않는다**: 사용자가 그 카드를 누르면 상세 화면이
 *   `useRestaurantDetail` 로 **같은 쿼리 키**를 읽으므로 이미 받아 둔 응답이 그대로 쓰인다.
 *   즉 지도에서 미리 받는 것이 곧 상세 진입의 프리페치다.
 * - (b) `/search` 에 `ids` 필터를 추가한다 — 카드 모양 그대로 오고 `distanceKm` 까지
 *   서버가 같은 공식으로 계산해 준다는 장점이 분명하다. 다만 백엔드 계약·커서 방언·
 *   테스트를 함께 건드려야 하고, 얻는 것은 거리 한 줄이다. 거리가 정말로 필요해지면
 *   그때 이 주석을 근거로 (b) 로 옮기면 된다 — (a) 는 그 길을 막지 않는다.
 * - (c) 마커 payload 를 살찌운다 — **기각.** 계약 §2.1 규칙 5 가 마커를 일부러 최소로
 *   유지한다. 200개에 사진 3장씩 실으면 지도 응답이 그것만으로 부푼다.
 *
 * ## 목록 캐시가 있으면 요청보다 그쪽이 먼저다
 *
 * `useRestaurantDetail` 이 이미 목록 무한쿼리 캐시를 훑어 같은 id 의 카드(`cardHint`)를
 * 찾는다. 앞선 뷰포트 검색에서 받아 둔 쪽에 그 가게가 있으면 **거리·사진까지 실제 값**인
 * 카드를 한 프레임도 기다리지 않고 쓸 수 있다. 상세 매핑은 그것마저 없을 때의 길이다.
 *
 * ## 선택이 지도에서 왔을 때만 재정렬한다
 *
 * 이 훅에 넘어오는 `selectedId` 는 **마커 탭으로 고른 것만**이다(화면이 그렇게 넘긴다).
 * 카드 탭도 같은 선택 상태를 만들지만, 그때 목록을 뒤섞으면 방금 누른 카드가 손가락
 * 밑에서 위로 튀어 오른 뒤 상세 화면이 밀려 들어온다. 마커 탭은 목록을 맨 위로
 * 스크롤하므로 재정렬이 예상되는 동작이고, 카드 탭은 그렇지 않다.
 */

import { useMemo } from "react"

import type { LatLng, RestaurantCardDto } from "../types"
import { detailToCard, orderSelectedFirst } from "../utils/selectedFirstCard"
import { useRestaurantDetail } from "./useRestaurantDetail"

export interface UseSelectedFirstListParams {
  /** `/search` 가 준 원래 순서. 이 배열은 변형되지 않는다. */
  items: RestaurantCardDto[]
  /** 지도 마커로 고른 식당. `null` 이면 원래 순서 그대로다. */
  selectedId: number | null
  userLocation: LatLng | null
  /** 고른 마커의 좌표. 상세가 좌표를 안 줄 때의 폴백이다. */
  selectedCoords?: LatLng | null
}

export interface UseSelectedFirstListResult {
  items: RestaurantCardDto[]
  /**
   * 첫 줄에 카드 스켈레톤을 그려야 한다 — 고른 곳의 카드를 아직 못 받았다.
   * 이 자리를 비워 두면 마커를 눌렀는데 아무 일도 안 일어난 것처럼 보인다.
   */
  leadingSkeleton: boolean
}

export function useSelectedFirstList({
  items,
  selectedId,
  userLocation,
  selectedCoords = null,
}: UseSelectedFirstListParams): UseSelectedFirstListResult {
  const inList = useMemo(
    () =>
      selectedId !== null &&
      items.some((item) => item.restaurantId === selectedId),
    [items, selectedId],
  )

  /* 목록에 이미 있으면 요청하지 않는다. `null` 을 넘기면 훅이 질의를 끈다 —
     페이지가 더 로드돼 그 가게가 목록에 들어오는 순간 이 요청도 조용히 멎는다. */
  const detail = useRestaurantDetail(inList ? null : selectedId, userLocation)

  const fallbackCard = useMemo<RestaurantCardDto | null>(() => {
    if (selectedId === null || inList) return null
    // 캐시에 실제 카드가 있으면 그것이 먼저다(거리·사진이 실제 값이다).
    if (detail.cardHint?.restaurantId === selectedId) return detail.cardHint
    if (!detail.detail || detail.detail.restaurantId !== selectedId) return null
    return detailToCard(detail.detail, selectedCoords)
  }, [detail.cardHint, detail.detail, inList, selectedCoords, selectedId])

  const ordered = useMemo(
    () => orderSelectedFirst(items, selectedId, fallbackCard),
    [fallbackCard, items, selectedId],
  )

  return {
    items: ordered,
    /* 실패했으면 스켈레톤을 거둔다. 영원히 맥동하는 회색 카드는 "곧 온다" 는 거짓말이다 —
       그때는 지도 말풍선과 하이라이트만으로 무엇을 골랐는지 말한다. */
    leadingSkeleton:
      selectedId !== null &&
      !inList &&
      fallbackCard === null &&
      !detail.isError,
  }
}
