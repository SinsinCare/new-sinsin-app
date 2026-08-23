import AsyncStorage from "@react-native-async-storage/async-storage"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { getMobilePolicyRuntimeInfo } from "@/src/config/runtimeInfo"
import { normalizeLanguage } from "@/src/i18n"
import {
  initAnalyticsLifecycle,
  toDurationBucket,
  trackAnalyticsEvent,
} from "@/src/features/analytics"
import { fetchMobilePolicy } from "../services/mobilePolicyClient"
import {
  createMobilePolicyService,
  isBlockingMobilePolicyDecision,
} from "../services/mobilePolicyService"
import type { MobilePolicyEvaluation } from "../types"

type AppPolicyGateStatus = "checking" | "ready"

/**
 * 같은 판정을 두 번 세지 않기 위한 열쇠. 부팅 경로는 캐시로 한 번, 뒤따르는 재검증으로
 * 또 한 번 `evaluation` 을 갈아끼우는데, 답이 같으면 그건 **한 번의 판정**이다.
 * 셋 중 하나라도 달라지면(캐시 allow → 서버 force_update) 그건 새 사건이라 다시 센다.
 */
export function policyEvaluationKey(properties: {
  decision: string
  source: string
  blocked: boolean
}): string {
  return `${properties.decision}:${properties.source}:${properties.blocked}`
}

/**
 * 정책 게이트.
 *
 * ■ 계측이 **여기** 있는 이유 (설계 §9-①)
 *
 * 이 훅은 `RootLayoutNav` 밖에 산다. 앱의 계측 수명주기(`useAnalyticsLifecycle`·
 * `app_launch_started`)는 전부 그 **안**이라, 게이트가 차단 화면을 그리면 그 실행은
 * 이벤트를 한 개도 남기지 않는다. 강제 업데이트 화면은 안드로이드 뒤로가기까지 막는
 * 100% 이탈 지점인데 관측이 구조적으로 불가능했고, 동시에 DAU 분모가 조용히 줄어
 * **차단된 사람과 앱을 켜지 않은 사람이 같아 보였다.**
 *
 * 그래서 계측 초기화를 여기서 직접 한다. `RootLayoutNav` 가 열리면 같은 함수를 한 번
 * 더 부르지만 `initAnalyticsLifecycle` 은 멱등이다(`analyticsClient.ts` 의
 * `lifecycleInitialized`) — 설치·업데이트 신호가 두 벌 나가지 않는다.
 *
 * ■ 개발 중에는 이 코호트가 재현되지 않는다
 *
 * `__DEV__` 에서는 아래 `isBlocking`·`shouldRecommendUpdate` 가 통째로 꺼진다. 즉
 * 차단 화면·권장 안내의 이벤트는 **스토어 빌드에서만** 나가고, `app_policy_evaluated`
 * 만 `blocked:false` 로 개발 기기에서도 나간다. 로컬에서 안 보인다고 안 붙은 것이
 * 아니다 — 확인하려면 `!__DEV__` 빌드가 필요하다.
 */
export function useAppPolicyGate() {
  const { i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
  const [status, setStatus] = useState<AppPolicyGateStatus>("checking")
  const [evaluation, setEvaluation] = useState<MobilePolicyEvaluation | null>(
    null,
  )
  const requestIdRef = useRef(0)
  const reportedKeyRef = useRef<string | null>(null)

  /* **이 훅의 첫 effect 여야 한다.** 아래 판정 effect 보다 먼저 돌아야 설치·업데이트
     신호가 정책 이벤트보다 앞선 순번(seq)을 받는다. */
  useEffect(() => {
    initAnalyticsLifecycle()
  }, [])

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
      const startedAtMs = Date.now()
      const nextEvaluation = await service.evaluate(
        getMobilePolicyRuntimeInfo(),
        language,
      )
      /* 앞질린 검사는 화면에도 안 쓰이므로 계측에도 안 쓴다 — 스테일 가드 **뒤**에서 쏜다.
         언어 변경이나 차단 화면의 "다시 시도"가 진행 중인 검사를 앞지르면, 버려진 검사가
         남긴 행만큼 게이트 대기 수가 부풀어 있었다. */
      if (requestId !== requestIdRef.current) return

      /* 사람이 **실제로 기다린** 대기만 센다. `silent` 는 캐시로 화면을 이미 연 뒤의
         재검증이라 아무도 기다리지 않고 있다. 빠른 판정까지 남기면 이 이벤트가 앱 실행
         수만큼 나가므로 느린 쪽만 남긴다 — 이 이벤트의 존재 자체가 곧 신호다. */
      if (!silent) {
        const waitBucket = toDurationBucket(Date.now() - startedAtMs)
        if (waitBucket === "slow" || waitBucket === "very_slow") {
          trackAnalyticsEvent("app_policy_check_slow", {
            wait_bucket: waitBucket,
            source: nextEvaluation.source,
          })
        }
      }
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
  /*
    **개발 빌드는 업데이트 관문을 그리지 않는다** (기능 플래그는 그대로 받는다).

    관문이 보내는 버전은 `nativeApplicationVersion` — 스토어 빌드에서는 그게 진실
    이지만, dev client 는 바이너리가 옛것이고 JS 만 최신이다. 스토어에서 업데이트할
    수 없는 물건에 "새 버전으로 업데이트해 주세요" 를 강제하면 개발이 통째로 막힌다
    (2026-08-04 실제 발생: 테스트 정책에 임계값을 넣자 공유 dev client 가 즉시
    차단됐다). 유지보수 모드 차단도 같은 이유로 dev 에서는 열어 둔다 — 점검 중에
    고치는 사람이 개발자다.
  */
  const isBlocking =
    !__DEV__ &&
    policy !== null &&
    isBlockingMobilePolicyDecision(policy.decision)
  const shouldRecommendUpdate =
    !__DEV__ && policy?.decision === "recommend_update"

  useEffect(() => {
    if (!evaluation) return
    const properties = {
      decision: evaluation.policy.decision,
      source: evaluation.source,
      blocked: isBlocking,
    }
    const key = policyEvaluationKey(properties)
    if (reportedKeyRef.current === key) return
    reportedKeyRef.current = key
    trackAnalyticsEvent("app_policy_evaluated", properties)
  }, [evaluation, isBlocking])

  return {
    status,
    policy,
    source: evaluation?.source ?? null,
    isBlocking,
    shouldRecommendUpdate,
    refresh,
  }
}
