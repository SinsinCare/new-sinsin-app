/**
 * **돌아오면 최신.** 화면으로 돌아왔을 때·앱을 다시 열었을 때 낡은 것만 조용히 다시 받는다.
 *
 * ─── 왜 필요했는가 ───────────────────────────────────────────────────────────
 * 당김만 고치면 "새로고침하는 법"이 생길 뿐, **새로고침해야 한다는 걸 사용자가 알아야 하는**
 * 상태는 그대로다. 커뮤니티를 보다 홈에 다녀오면 30분 전 피드가 그대로 서 있고, 그게
 * 낡았다는 신호는 어디에도 없다.
 *
 * react-query 에는 이미 그 장치가 있다(`refetchOnWindowFocus`). 그런데 이 앱에서는
 * 두 겹으로 꺼져 있었다:
 *   - `queryClient.ts` 에서 `refetchOnWindowFocus: false`
 *   - 그리고 켰더라도 **RN 에는 `window` 의 focus 이벤트가 없다.** react-query 의
 *     `focusManager` 를 `AppState` 에 이어 주지 않으면 웹이 아닌 곳에서는 영영 안 뜬다.
 *
 * 전역 기본값을 켜는 쪽은 택하지 않았다 — 지도·리포트처럼 한 번 부르는 값이 비싼 쿼리까지
 * 앱을 열 때마다 전부 다시 도는 blast radius 가 된다. 대신 **화면이 자기 스코프에 대해서만
 * 신청**한다. 어떤 화면이 무엇을 다시 받는지가 코드에서 한눈에 보이는 쪽이 예측 가능하다.
 *
 * ─── 무엇을 "낡았다" 로 보는가 ─────────────────────────────────────────────
 * 우리가 시각을 따로 재지 않는다. `stale: true` 로 **react-query 의 staleTime 판정**을
 * 그대로 쓴다. 즉 이 훅의 공격성은 쿼리마다 `staleTime` 으로 조절한다 —
 * 커뮤니티 피드처럼 남이 계속 쓰는 목록은 짧게(60초), 잘 안 변하는 것은 전역 기본(5분).
 * 판정 기준을 두 곳에 두지 않는다.
 *
 * 스피너는 없다. 화면에는 이전 데이터가 그대로 있고 응답이 오면 바뀐다 — 사용자가
 * 요청하지 않은 로딩으로 읽던 화면을 가리지 않는다.
 *
 * @example
 * useRevalidateOnReturn({ queryKeys: COMMUNITY_REFRESH_KEYS })
 */

import { useCallback, useEffect, useRef } from "react"
import { AppState, type AppStateStatus } from "react-native"
// `@react-navigation/native` 가 아니라 expo-router 에서 가져온다 — 전자는 package.json 에
// 없는 전이 의존이라, 라우터가 버전을 올리며 그 패키지를 바꾸면 조용히 사라질 수 있다.
import { useFocusEffect } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"

import type { RefreshScopeKeys } from "./useRefreshable"

export interface UseRevalidateOnReturnOptions {
  queryKeys: RefreshScopeKeys
  /** 화면이 준비되기 전(로그인 전 등)에는 끈다. */
  enabled?: boolean
}

export function useRevalidateOnReturn({
  queryKeys,
  enabled = true,
}: UseRevalidateOnReturnOptions): void {
  const queryClient = useQueryClient()
  const keysRef = useRef(queryKeys)
  keysRef.current = queryKeys
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  const revalidate = useCallback(() => {
    if (!enabledRef.current) return
    for (const queryKey of keysRef.current) {
      void queryClient.refetchQueries(
        // `stale: true` — 방금 받은 것은 건드리지 않는다. 탭을 오갈 때마다
        // 같은 요청이 도는 것이 이 기능의 가장 흔한 실패 모드다.
        { queryKey, type: "active", stale: true },
        // 마운트가 이미 띄운 요청을 취소하고 다시 보내지 않는다. 당김과 달리
        // 여기서는 "사용자가 당긴 시점 이후" 를 보장할 이유가 없다.
        { cancelRefetch: false },
      )
    }
  }, [queryClient])

  // 다른 탭·상세에서 돌아온 순간.
  useFocusEffect(revalidate)

  // 앱을 백그라운드에 두었다 다시 연 순간. 화면은 그대로였으므로 focus 는 안 뜬다.
  useEffect(() => {
    let previous = AppState.currentState
    const subscription = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        const returned =
          previous.match(/inactive|background/) && next === "active"
        previous = next
        if (returned) revalidate()
      },
    )
    return () => subscription.remove()
  }, [revalidate])
}
