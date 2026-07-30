import AsyncStorage from "@react-native-async-storage/async-storage"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { getMobilePolicyRuntimeInfo } from "@/src/config/runtimeInfo"
import { normalizeLanguage } from "@/src/i18n"
import { fetchMobilePolicy } from "../services/mobilePolicyClient"
import {
  createMobilePolicyService,
  isBlockingMobilePolicyDecision,
} from "../services/mobilePolicyService"
import type { MobilePolicyEvaluation } from "../types"

type AppPolicyGateStatus = "checking" | "ready"

export function useAppPolicyGate() {
  const { i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
  const [status, setStatus] = useState<AppPolicyGateStatus>("checking")
  const [evaluation, setEvaluation] = useState<MobilePolicyEvaluation | null>(
    null,
  )
  const requestIdRef = useRef(0)

  const service = useMemo(
    () =>
      createMobilePolicyService({
        fetchPolicy: fetchMobilePolicy,
        storage: AsyncStorage,
      }),
    [],
  )

  const refresh = useCallback(async () => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setStatus("checking")
    const nextEvaluation = await service.evaluate(
      getMobilePolicyRuntimeInfo(),
      language,
    )
    if (requestId !== requestIdRef.current) return
    setEvaluation(nextEvaluation)
    setStatus("ready")
  }, [language, service])

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
