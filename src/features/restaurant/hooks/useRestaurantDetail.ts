/**
 * 상세 화면 데이터.
 *
 * ## 목록 캐시에서 초기값을 꺼낸다
 *
 * 카드를 눌러 들어오면 상호명·평점·사진은 이미 목록 캐시에 있다. 그 값으로 화면을
 * 즉시 그리고 나머지를 채운다 — 빈 스켈레톤을 한 번 보여 준 뒤 같은 내용을 다시 그리는
 * 것보다 훨씬 빠르게 느껴진다. `usePostDetail` 이 목록 캐시에서 `initialData` 를
 * 꺼내 쓰는 것과 같은 수법이고, 여기서는 타입이 달라(카드 ≠ 상세) `placeholderData` 로
 * 부분 채움만 한다.
 */

import { useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { normalizeLanguage } from "@/src/i18n"
import { restaurantService } from "@/src/services/data/restaurantService"

import type { RestaurantCardDto, RestaurantDetailDto } from "../types"
import {
  DETAIL_STALE_TIME_MS,
  RESTAURANT_LIST_KEY,
  restaurantKeys,
} from "./restaurantQueryKeys"

export interface UseRestaurantDetailResult {
  detail: RestaurantDetailDto | undefined
  /** 목록 캐시에서 찾은 카드. 상세가 오기 전 헤더를 그리는 데 쓴다. */
  cardHint: RestaurantCardDto | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => void
}

/**
 * 좌표를 받지 않는다. `GET /restaurants/:id` 는 앵커 좌표를 읽지 않고 응답에
 * `distanceKm` 도 없다(`restaurantService.fetchDetail` 머리말) — 받아 두면 다음 사람이
 * 거리가 오는 줄로 읽는다.
 */
export function useRestaurantDetail(
  restaurantId: number | null,
): UseRestaurantDetailResult {
  const { i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
  const queryClient = useQueryClient()

  /**
   * 목록 무한쿼리 캐시를 훑어 같은 id 의 카드를 찾는다. 캐시가 없으면 `undefined` 다 —
   * 딥링크로 바로 들어온 경우이므로 그때는 정상적으로 스켈레톤을 그린다.
   */
  const cardHint = useMemo<RestaurantCardDto | undefined>(() => {
    if (restaurantId === null) return undefined
    const caches = queryClient.getQueriesData<{
      pages?: { items: RestaurantCardDto[] }[]
    }>({ queryKey: RESTAURANT_LIST_KEY })
    for (const [, value] of caches) {
      for (const page of value?.pages ?? []) {
        const found = page.items.find((i) => i.restaurantId === restaurantId)
        if (found) return found
      }
    }
    return undefined
  }, [queryClient, restaurantId])

  const query = useQuery({
    queryKey: restaurantKeys.detail(language, restaurantId ?? 0),
    enabled: restaurantId !== null,
    staleTime: DETAIL_STALE_TIME_MS,
    queryFn: () => restaurantService.fetchDetail(restaurantId as number),
  })

  return {
    detail: query.data,
    cardHint,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
