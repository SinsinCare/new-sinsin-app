import AsyncStorage from "@react-native-async-storage/async-storage"
import { useCallback, useEffect, useMemo, useState } from "react"

import { getMobilePolicyRuntimeInfo } from "@/src/config/runtimeInfo"
import { fetchMobilePolicy } from "../services/mobilePolicyClient"
import {
  createMobilePolicyService,
  isBlockingMobilePolicyDecision,
} from "../services/mobilePolicyService"
import type { MobilePolicyEvaluation } from "../types"

type AppPolicyGateStatus = "checking" | "ready"

export function useAppPolicyGate() {
  const [status, setStatus] = useState<AppPolicyGateStatus>("checking")
  const [evaluation, setEvaluation] = useState<MobilePolicyEvaluation | null>(
    null,
  )

  const service = useMemo(
    () =>
      createMobilePolicyService({
        fetchPolicy: fetchMobilePolicy,
        storage: AsyncStorage,
      }),
    [],
  )

  const refresh = useCallback(async () => {
    setStatus("checking")
    const nextEvaluation = await service.evaluate(getMobilePolicyRuntimeInfo())
    setEvaluation(nextEvaluation)
    setStatus("ready")
  }, [service])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const policy = evaluation?.policy ?? null
  const isBlocking =
    policy !== null && isBlockingMobilePolicyDecision(policy.decision)
  const shouldRecommendUpdate = policy?.decision === "recommend_update"

  return {
    status,
    policy,
    source: evaluation?.source ?? null,
    isBlocking,
    shouldRecommendUpdate,
    refresh,
  }
}
