import { useEffect } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { foodAnalysisRecovery } from "../services/foodAnalysisRecovery"

/**
 * 훑기 한 번 = 이벤트 한 행. **훑을 것이 없으면 쏘지 않는다** — 이 경로는 포그라운드
 * 복귀마다 도는지라 빈 훑기까지 세면 이 이벤트 하나가 세션당 이벤트 수를 지배한다
 * (설계 §8 의 고빈도 상한 규약과 같은 이유).
 *
 * 계측은 서비스가 아니라 여기에 있다. 서비스는 수를 세는 순수 계산이고(그래서
 * `tests/foodCameraRecovery.test.ts` 가 렌더러 없이 검사한다), 발화는 그 결과를
 * 소비하는 쪽의 몫이다.
 *
 * **폴러(`useFoodAnalysisRecoveryPolling`)가 먼저 살려낸 건은 여기 안 잡힌다.**
 * 그쪽은 대기가 남아 있는 동안 몇 초마다 같은 훑기를 도는 경로라 이벤트를 붙이면
 * 대기 하나가 수십 행을 만든다. 회수 그 자체는
 * `food_record_result_viewed{source:'recovered'}` 가 세므로, 이 이벤트는 **회수율이
 * 아니라 밀린 양(remaining)과 시효 손실(expired)** 을 보는 축으로 읽는다.
 */
async function sweep(entry: "launch" | "foreground"): Promise<void> {
  try {
    const result = await foodAnalysisRecovery.recoverPendingAnalyses()
    const touched =
      result.recoveredCount + result.expiredCount + result.remainingCount
    if (touched === 0) return
    trackAnalyticsEvent("food_recovery_swept", {
      entry,
      recovered_count: result.recoveredCount,
      remaining_count: result.remainingCount,
      expired_count: result.expiredCount,
    })
  } catch {
    // 복구는 다음 진입에서 다시 시도한다. 계측이 화면을 깨뜨리지 않는다.
  }
}

export function useFoodAnalysisRecovery(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return

    void sweep("launch")

    const handleAppState = (state: AppStateStatus) => {
      if (state === "active") void sweep("foreground")
    }
    const sub = AppState.addEventListener("change", handleAppState)
    return () => sub.remove()
  }, [enabled])
}
