/**
 * 카드·상세의 영업 상태 표시. 전환 시각에 **한 번만** 깨어난다.
 *
 * 서버가 판정한 상태를 그대로 쓰고, `nextTransitionAt` 이 지나면 `isStale` 을 켠다.
 * 인터벌을 돌리지 않는 이유: 시트에 카드가 20장 있으면 타이머 20개가 매초 돌고 리스트
 * 전체가 리렌더된다. 전환은 하루에 두세 번뿐이라 그 시각에만 깨는 것이 맞다.
 *
 * `isStale` 이 켜지면 화면은 (a) 상태 라벨을 흐리게 하거나 (b) 조용히 재조회한다.
 * 이 훅은 **판정을 다시 하지 않는다** — 기기 시계로 상태를 계산하면 서버(KST 고정)와
 * 어긋나 시계가 틀린 사용자에게 영업중인 가게가 휴무로 보인다.
 */

import { useEffect, useMemo, useState } from "react"

import { useV2Theme } from "@/src/design-system-v2"

import type { BusinessStatusCode } from "../types"
import {
  describeBusinessStatus,
  scheduleNextTransition,
  type BusinessStatusInput,
  type BusinessStatusView,
} from "../utils/businessStatus"

export interface UseBusinessStatusResult {
  view: BusinessStatusView
  /** 전환 시각이 지났다. 표시값이 더 이상 정확하지 않다는 신호. */
  isStale: boolean
}

export function useBusinessStatus(
  input: BusinessStatusInput & {
    status: BusinessStatusCode
    nextTransitionAt?: string | null
  },
): UseBusinessStatusResult {
  const { colors } = useV2Theme()
  const [isStale, setStale] = useState(false)
  const nextTransitionAt = input.nextTransitionAt ?? null

  useEffect(() => {
    setStale(false)
    return scheduleNextTransition(nextTransitionAt, () => setStale(true))
  }, [nextTransitionAt])

  const view = useMemo(
    () => describeBusinessStatus(input, colors),
    // 입력 객체가 매 렌더 새로 만들어지는 것이 보통이라 필드 단위로 의존한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      input.status,
      input.closingTime,
      input.openingTime,
      input.breakStartTime,
      input.breakEndTime,
      input.nextOpenWeekday,
      input.nextOpenTime,
      // 전환 시각은 `isStale` 뿐 아니라 `OPEN` 의 보조 문구(브레이크타임 예고)에도
      // 들어간다. 빼면 21:30 이 지나 다시 계산해도 문구가 옛 사건을 가리킨 채 남는다.
      nextTransitionAt,
      colors,
    ],
  )

  return { view, isStale }
}
