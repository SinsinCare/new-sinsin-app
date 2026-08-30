import { QueryClient } from "@tanstack/react-query"
import { isApiErrorLike } from "./apiError"
import { backoffMs } from "@/src/lib/backoff"

export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (failureCount >= 2) return false
  if (!isApiErrorLike(error)) return failureCount < 1
  if (error.isNetworkError) return true

  const status = error.statusCode
  if (status === undefined) return failureCount < 1
  // 인증·검증·권한·rate-limit 응답은 같은 요청을 즉시 반복해도 해결되지 않으며,
  // 특히 429 자동 재시도는 과부하를 더 키운다.
  return status === 408 || status >= 500
}

/**
 * 재시도 간격. **지터가 들어 있다.**
 *
 * 고정 간격이면 서버가 살아나는 순간 **설치 기반 전체가 같은 시점에** 다시 온다 —
 * 1초 뒤에 한 번, 2초 뒤에 또 한 번, 정확히 정렬된 채로. 서버는 회복하자마자 평소의
 * N배를 맞고 다시 넘어지고, 그 다음 재시도도 여전히 정렬돼 있다.
 *
 * equal jitter 라 실제 대기는 `[d/2, d]` 다. 상한이 그대로여서 "최대 8초" 라는 계약이
 * 유지되고, 하한이 있어서 아직 아픈 서버를 즉시 다시 때리지 않는다(`lib/backoff.ts`).
 */
export function queryRetryDelay(attemptIndex: number): number {
  return backoffMs(attemptIndex, { baseMs: 1_000, maxMs: 8_000 })
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: shouldRetryQuery,
      retryDelay: queryRetryDelay,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // POST/PATCH/DELETE는 멱등키가 없는 호출이 많다. 네트워크가 끊긴 순간 서버에는
      // 반영됐을 수 있으므로 전역 자동 재시도 대신 각 기능이 명시적으로 결정한다.
      retry: false,
    },
  },
})
