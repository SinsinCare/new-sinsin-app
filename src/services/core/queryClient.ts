import { QueryClient } from "@tanstack/react-query"
import { isApiErrorLike } from "./apiError"

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

export function queryRetryDelay(attemptIndex: number): number {
  return Math.min(1_000 * 2 ** attemptIndex, 8_000)
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
