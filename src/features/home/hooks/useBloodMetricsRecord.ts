import { useState } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { bloodMetricsService } from "@/src/services/data/bloodMetricsService"
import { presentError, toAnalyticsFailKind } from "@/src/lib/errorMessage"
import type {
  BloodGlucoseUpsertRequest,
  BloodPressureUpsertRequest,
} from "@/src/types/bloodMetrics"
import { trackAnalyticsEvent } from "@/src/features/analytics"

export function useBloodMetricsRecord() {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

  /**
   * `existing` 은 그날 그 지표에 **이미 기록이 있었는가**(수정 진입인가). 훅은 그날의
   * 상태를 안 보므로 화면이 넘겨준다 — 여기서 다시 조회하면 시트가 열려 있는 동안의
   * refetch 와 어긋나 같은 저장이 어떤 때는 새 기록, 어떤 때는 수정으로 세어진다.
   */
  const updateBloodPressure = async (
    body: BloodPressureUpsertRequest,
    existing: boolean,
  ) => {
    setIsLoading(true)
    try {
      await bloodMetricsService.updateBloodPressure(body)
      queryClient.invalidateQueries({ queryKey: ["dateAnalysis", body.date] })
      trackAnalyticsEvent("health_entry_save_succeeded", {
        metric: "blood_pressure",
        existing,
      })
      return true
    } catch (error) {
      trackAnalyticsEvent("health_entry_save_failed", {
        metric: "blood_pressure",
        // 400 계열(KST 날짜 경계·유니크 충돌)과 5xx 는 대응이 갈린다.
        fail_kind: toAnalyticsFailKind(error),
      })
      // upsert 라 같은 값을 다시 보내도 한 건이다 — 재시도가 안전하다.
      presentError(error, {
        scope: "blood-pressure-save",
        retry: () => void updateBloodPressure(body, existing),
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const updateBloodGlucose = async (
    body: BloodGlucoseUpsertRequest,
    existing: boolean,
  ) => {
    setIsLoading(true)
    try {
      await bloodMetricsService.updateBloodGlucose(body)
      queryClient.invalidateQueries({ queryKey: ["dateAnalysis", body.date] })
      // 통계의 7일 추이도 같은 사실을 본다. 여기서 안 털면 방금 적은 수치가
      // 홈에는 뜨는데 통계에는 없는 상태로 최대 1분(staleTime) 갈린다.
      queryClient.invalidateQueries({ queryKey: ["bloodGlucoseRecords"] })
      trackAnalyticsEvent("health_entry_save_succeeded", {
        metric: "blood_glucose",
        existing,
      })
      return true
    } catch (error) {
      trackAnalyticsEvent("health_entry_save_failed", {
        metric: "blood_glucose",
        fail_kind: toAnalyticsFailKind(error),
      })
      presentError(error, {
        scope: "blood-glucose-save",
        retry: () => void updateBloodGlucose(body, existing),
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return { updateBloodPressure, updateBloodGlucose, isLoading }
}
