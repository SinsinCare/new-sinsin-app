const handledRequestIds = new Set<string>()

export function markFoodAnalysisRequestHandled(requestId: string): void {
  handledRequestIds.add(requestId)
}

export function isFoodAnalysisRequestHandled(requestId: string): boolean {
  return handledRequestIds.has(requestId)
}

/*
  ── 포그라운드가 붙들고 있는 요청 ────────────────────────────────────────────
  `useFoodAnalysis` 는 분석을 **직접 폴링**하면서, 앱이 죽어도 살려 내려고 같은 요청을
  저장소의 대기 목록에도 적어 둔다. 그 목록은 복구 폴러(`useFoodAnalysisRecoveryPolling`)도
  훑으므로, 아무 표시가 없으면 한 잡을 둘이 동시에 폴링한다 — 서버 호출이 두 배가 되고,
  복구 쪽이 READY 를 먼저 보면 같은 결과가 "복구됨" 으로 한 번, 포그라운드에서 "신규" 로
  또 한 번 열린다. 그래서 포그라운드가 붙든 동안은 여기 이름을 올리고, 복구는 그 이름을
  건너뛴다. 놓는 순간(완료·실패·X 로 나감·확인 질문 미룸)이 곧 복구가 이어받는 순간이라
  구독자에게 알린다 — 저장소 쓰기가 없는 놓음(X 로 나감)도 폴러가 알아채야 한다.
  메모리에만 있다: 앱이 다시 뜨면 비어 있고, 그때는 복구가 전부 맡는 것이 맞다.
*/
const foregroundRequestIds = new Set<string>()
const foregroundListeners = new Set<() => void>()

function notifyForegroundChange() {
  foregroundListeners.forEach((listener) => listener())
}

export function claimForegroundFoodAnalysisRequest(requestId: string): void {
  if (foregroundRequestIds.has(requestId)) return
  foregroundRequestIds.add(requestId)
  notifyForegroundChange()
}

export function releaseForegroundFoodAnalysisRequest(requestId: string): void {
  if (!foregroundRequestIds.delete(requestId)) return
  notifyForegroundChange()
}

export function isForegroundFoodAnalysisRequest(requestId: string): boolean {
  return foregroundRequestIds.has(requestId)
}

export function subscribeForegroundFoodAnalysisRequests(
  listener: () => void,
): () => void {
  foregroundListeners.add(listener)
  return () => {
    foregroundListeners.delete(listener)
  }
}
