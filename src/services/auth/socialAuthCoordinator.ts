export type SessionRestoreOperations<TSession> = {
  restore: (signal: AbortSignal) => Promise<TSession | null>
  apply: (session: TSession) => void
  clearExpired: () => Promise<void>
  onRetryableFailure: (error: unknown) => void
}

export type InteractiveSocialOperations<TNative, TResult> = {
  native: () => Promise<TNative>
  discardPreviousSession: () => Promise<void>
  exchange: (nativeResult: TNative) => Promise<TResult>
}

/**
 * 앱 프로세스 전체의 세션 복구와 interactive 소셜 인증을 직렬화한다.
 *
 * Kakao 인증 Activity가 앱을 다시 active로 만들 때 기존 refresh 복구가 같이 시작되면,
 * 옛 세션의 HOME 전환과 신규 계정의 약관 push가 서로 다른 라우트를 동시에 소유한다.
 * 이 coordinator는 그 둘을 같은 임계 구역에 넣는다. 네이티브 인증이 취소되기 전에는
 * 기존 토큰을 지우지 않고, provider 토큰을 실제로 받은 뒤에만 이전 세션을 폐기한다.
 */
export function createSocialAuthCoordinator<TSession>() {
  let restoreState: "idle" | "settled" = "idle"
  let restoreAttempt:
    | {
        controller: AbortController
        promise: Promise<void>
      }
    | undefined
  let lastRestoreOperations: SessionRestoreOperations<TSession> | undefined
  let interactiveCount = 0

  const startRestore = (
    operations: SessionRestoreOperations<TSession>,
  ): Promise<void> | null => {
    lastRestoreOperations = operations
    if (interactiveCount > 0 || restoreState === "settled") return null
    if (restoreAttempt) return restoreAttempt.promise

    const controller = new AbortController()
    const attempt = {
      controller,
      promise: Promise.resolve(),
    }
    attempt.promise = (async () => {
      try {
        const result = await operations.restore(controller.signal)
        // run()이 AbortSignal을 무시하더라도 stale 결과는 절대 store/route에 적용하지 않는다.
        if (controller.signal.aborted || interactiveCount > 0) return
        if (result) operations.apply(result)
        else await operations.clearExpired()
        if (!controller.signal.aborted && interactiveCount === 0) {
          restoreState = "settled"
        }
      } catch (error) {
        if (controller.signal.aborted) return
        operations.onRetryableFailure(error)
      } finally {
        if (restoreAttempt === attempt) restoreAttempt = undefined
      }
    })()
    restoreAttempt = attempt
    return attempt.promise
  }

  const runInteractive = async <TNative, TResult>(
    operations: InteractiveSocialOperations<TNative, TResult>,
  ): Promise<TResult> => {
    interactiveCount += 1
    const previousRestore = restoreAttempt
    previousRestore?.controller.abort()
    let providerSucceeded = false

    try {
      const nativeResult = await operations.native()
      providerSucceeded = true
      // 이 시점부터 이전 세션은 다시 복구 대상이 아니다. provider 취소 전에는 오지 않는다.
      restoreState = "settled"
      await previousRestore?.promise.catch(() => undefined)
      await operations.discardPreviousSession()
      return await operations.exchange(nativeResult)
    } finally {
      if (!providerSucceeded) {
        await previousRestore?.promise.catch(() => undefined)
      }
      interactiveCount = Math.max(0, interactiveCount - 1)
      // 네이티브 창을 닫았거나 SDK가 실패했다면 기존 안전 저장 세션을 그대로 복구한다.
      if (!providerSucceeded && lastRestoreOperations) {
        void startRestore(lastRestoreOperations)
      }
    }
  }

  return {
    startRestore,
    runInteractive,
  }
}
