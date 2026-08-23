// Design System v2 — 로딩 표시 타이밍
//
// 캐시가 살아 있으면 응답이 50ms 만에 온다. 그 사이에 스켈레톤을 그렸다 지우면
// 화면이 한 번 깜빡이고, 사용자는 "뭐가 지나갔지" 만 남는다. 반대로 스켈레톤이
// 뜨자마자 사라져도 같은 깜빡임이다.
//
// 그래서 두 개의 문턱을 둔다:
//  - delay: 이 시간 안에 끝나면 아예 안 보여 준다 (빠른 응답은 그냥 즉시 콘텐츠)
//  - minDuration: 한 번 보여 줬으면 최소 이만큼은 유지한다 (뜨자마자 사라지지 않게)

import { useEffect, useRef, useState } from "react"
import {
  toDurationBucket,
  trackAnalyticsEvent,
  type AnalyticsSurface,
} from "@/src/features/analytics"

export type UseLoadingVisibleOptions = {
  /**
   * 어느 화면의 대기인가 (필수). 옵션 객체 자체가 필수가 된 이유이기도 하다 —
   * `wait_perceived` 는 자리를 모르면 아무 뜻이 없다.
   */
  surface: AnalyticsSurface
  /** 이 시간(ms) 안에 로딩이 끝나면 표시하지 않는다. 기본 180 */
  delay?: number
  /** 한 번 표시했으면 최소 유지 시간(ms). 기본 420 */
  minDuration?: number
}

/**
 * 로딩 UI(스켈레톤/점 로더)를 실제로 그릴지 판단한다.
 * @example
 * const showSkeleton = useLoadingVisible(query.isLoading, { surface: "recipe_archive" })
 * if (showSkeleton) return <RecipeListSkeleton />
 */
export function useLoadingVisible(
  isLoading: boolean,
  { surface, delay = 180, minDuration = 420 }: UseLoadingVisibleOptions,
): boolean {
  const [visible, setVisible] = useState(false)
  // 표시 시각은 렌더에 영향을 주지 않으므로 ref 로 둔다.
  const shownAt = useRef<number | null>(null)
  // 로딩이 **시작된** 시각. 표시 시각(shownAt)은 delay 만큼 늦으므로 대기 길이를 잴 수 없다.
  const startedAt = useRef<number | null>(null)

  useEffect(() => {
    startedAt.current = isLoading ? (startedAt.current ?? Date.now()) : null
  }, [isLoading])

  /*
    대기 계측 — **인지된 대기가 끝난 순간**에 쏜다.

    설계 §5 는 발화 지점을 false→true 전이로 적었지만 그 순간의 경과는 언제나 `delay`
    (기본 180ms)라, 그대로 넣으면 `wait_bucket` 이 전 행에서 `instant` 인 상수 열이 된다.
    그래서 전이는 **셀 대상을 고르는 조건**으로만 쓰고(문턱 아래의 빠른 응답은 애초에
    기다린 적이 없으므로 세지 않는다) 값은 대기가 풀린 시점에 잰다.

    정리 함수라 화면을 떠나며 끝난 대기도 들어온다. 그게 중요하다 — 사용자가 못 견디고
    나간 대기가 가장 긴 대기이므로, 빼면 `very_slow` 가 실제보다 적게 보인다.
  */
  useEffect(() => {
    if (!visible) return
    const began = startedAt.current ?? Date.now()
    return () => {
      trackAnalyticsEvent("wait_perceived", {
        surface,
        wait_bucket: toDurationBucket(Date.now() - began),
      })
    }
  }, [visible, surface])

  useEffect(() => {
    if (isLoading) {
      if (visible) return
      const timer = setTimeout(() => {
        shownAt.current = Date.now()
        setVisible(true)
      }, delay)
      return () => clearTimeout(timer)
    }

    if (!visible) return
    const elapsed = shownAt.current ? Date.now() - shownAt.current : minDuration
    const remaining = Math.max(0, minDuration - elapsed)
    if (remaining === 0) {
      shownAt.current = null
      setVisible(false)
      return
    }
    const timer = setTimeout(() => {
      shownAt.current = null
      setVisible(false)
    }, remaining)
    return () => clearTimeout(timer)
  }, [isLoading, visible, delay, minDuration])

  return visible
}
