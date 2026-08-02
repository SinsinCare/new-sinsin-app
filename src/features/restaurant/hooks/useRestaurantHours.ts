/**
 * 요일별 영업시간 + 현재 상태.
 *
 * ## 폴링하지 않는다
 *
 * 서버가 `nextTransitionAt`(다음 상태 전환 시각)을 함께 준다. 그 시각에 **한 번만**
 * 깨어나 쿼리를 무효화한다(`scheduleNextTransition`). 1초 인터벌로 시계를 돌리면
 * 상세 화면 전체가 매초 리렌더되고, 30초 폴링은 아무도 안 보는 정보를 위해 요청을 태운다.
 *
 * 상태 판정 자체는 서버가 KST 로 한다 — 기기 시계가 틀린 사용자에게 "영업중" 인 가게가
 * "휴무" 로 보이지 않게 하려면 계산 지점이 하나여야 한다.
 */

import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { normalizeLanguage } from "@/src/i18n"
import { restaurantService } from "@/src/services/data/restaurantService"

import type { BusinessHourDto, HoursSource, TodayHoursDto } from "../types"
import { scheduleNextTransition } from "../utils/businessStatus"
import { DETAIL_STALE_TIME_MS, restaurantKeys } from "./restaurantQueryKeys"

export interface UseRestaurantHoursResult {
  hours: BusinessHourDto[]
  /**
   * 오늘 한 요일 — 상태·시각·다음 전환이 한 덩어리로 들어 있다.
   *
   * 예전에는 `today: Weekday` 와 `status: BusinessStatusCode` 두 필드로 쪼개져 있었는데
   * 서버는 `today` 를 **객체**로 주고 `status` 라는 키는 아예 없다. 그래서
   * 요일 비교(`h.weekday === today`)가 객체와 문자열을 견주며 항상 실패했고
   * (마감 시각이 영원히 비었다) 상태는 `undefined ?? "UNKNOWN"` 으로 떨어져
   * **영업중인 가게가 `정보 없음` 으로 보였다.** 쪼개지 않고 서버 모양 그대로 넘긴다.
   */
  today: TodayHoursDto | null
  hoursSource: HoursSource | null
  nextTransitionAt: string | null
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => void
}

export function useRestaurantHours(
  restaurantId: number | null,
): UseRestaurantHoursResult {
  const { i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: restaurantKeys.hours(language, restaurantId ?? 0),
    enabled: restaurantId !== null,
    staleTime: DETAIL_STALE_TIME_MS,
    queryFn: () => restaurantService.fetchHours(restaurantId as number),
  })

  const nextTransitionAt = query.data?.nextTransitionAt ?? null

  useEffect(() => {
    if (restaurantId === null) return
    return scheduleNextTransition(nextTransitionAt, () => {
      // 상태가 방금 바뀌었다. 시간·상세 두 캐시가 같은 상태를 들고 있어야 하므로 함께 무효화한다.
      void queryClient.invalidateQueries({
        queryKey: restaurantKeys.hours(language, restaurantId),
      })
      void queryClient.invalidateQueries({
        queryKey: restaurantKeys.detail(language, restaurantId),
      })
    })
  }, [nextTransitionAt, queryClient, language, restaurantId])

  return {
    hours: query.data?.hours ?? [],
    today: query.data?.today ?? null,
    hoursSource: query.data?.hoursSource ?? null,
    nextTransitionAt,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
