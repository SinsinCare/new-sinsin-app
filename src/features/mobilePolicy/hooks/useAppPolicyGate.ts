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

  /**
   * @param silent 로딩 화면을 다시 띄우지 않고 조용히 다시 물어본다.
   *   캐시로 이미 화면을 연 뒤의 재검증이 이 경로다. 이걸 빼면 `setStatus("checking")`
   *   이 방금 연 화면을 도로 로딩 화면으로 되돌려서 캐시 우선이 아무 소용이 없다.
   */
  const run = useCallback(
    async (silent: boolean) => {
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      if (!silent) setStatus("checking")
      const nextEvaluation = await service.evaluate(
        getMobilePolicyRuntimeInfo(),
        language,
      )
      if (requestId !== requestIdRef.current) return
      setEvaluation(nextEvaluation)
      setStatus("ready")
    },
    [language, service],
  )

  /** 밖에서 부르는 재확인(차단 화면의 "다시 시도")은 진행 중임을 보여 준다. */
  const refresh = useCallback(() => run(false), [run])

  /**
   * 부팅 경로는 **캐시 우선**이다.
   *
   * `refresh` 는 네트워크를 먼저 기다리고 실패해야 캐시로 내려간다. 이 게이트는 앱 전체를
   * 막고 있어서, 서버가 느린 날에는 `10초 × 2회 재시도` 동안 "신신당부를 여는 중이에요"
   * 만 떠 있었다. 정책은 거의 매번 같은 답이므로 **지난 답을 먼저 쓰고 뒤에서 다시 묻는다.**
   *
   * 강제 업데이트·점검 차단이 한 박자 늦어지는 것은 감수한다. 뒤따르는 재검증이 돌아오면
   * `evaluation` 이 갱신되고 게이트가 그때 차단 화면으로 바뀐다 — 막지 못하는 게 아니라
   * 몇백 ms 늦을 뿐이고, 그 대가로 모든 정상 실행이 즉시 열린다.
   *
   * 캐시가 없는 최초 실행만 예전처럼 네트워크를 기다린다.
   */
  useEffect(() => {
    let cancelled = false

    void (async () => {
      const cached = await service.readCache(language)
      if (cancelled) return

      if (cached) {
        setEvaluation({ policy: cached, source: "cache" })
        setStatus("ready")
        // 화면은 이미 열렸다. 이 재검증은 사용자를 기다리게 하지 않는다.
        void run(true)
        return
      }

      void run(false)
    })()

    return () => {
      cancelled = true
    }
  }, [language, run, service])

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
