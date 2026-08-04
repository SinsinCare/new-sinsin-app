export const DEFAULT_FETCH_TIMEOUT_MS = 30_000

export class FetchTimeoutError extends Error {
  readonly code = "ECONNABORTED"

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`)
    this.name = "FetchTimeoutError"
  }
}

/**
 * React Native fetch에는 axios와 달리 기본 마감 시간이 없습니다. 호출자가 넘긴
 * AbortSignal을 보존하면서 마감 신호를 합쳐, 화면 이탈 취소와 무한 대기를 모두
 * 같은 네트워크 경계에서 처리합니다.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return fetch(input as RequestInfo, init)
  }

  const controller = new AbortController()
  const callerSignal = init.signal
  let timedOut = false

  const abortFromCaller = () => controller.abort()
  if (callerSignal?.aborted) {
    abortFromCaller()
  } else {
    callerSignal?.addEventListener("abort", abortFromCaller, { once: true })
  }

  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    return await fetch(input as RequestInfo, {
      ...init,
      signal: controller.signal as unknown as RequestInit["signal"],
    })
  } catch (error) {
    if (timedOut) throw new FetchTimeoutError(timeoutMs)
    throw error
  } finally {
    clearTimeout(timeout)
    callerSignal?.removeEventListener("abort", abortFromCaller)
  }
}
