import { useRef, useState } from "react"

import { useQueryClient, type QueryClient } from "@tanstack/react-query"
import { foodCameraService } from "@/src/services/data"
import { ApiError } from "@/src/services/core/apiError"
import { presentError, toAnalyticsFailKind } from "@/src/lib/errorMessage"
import { usePendingAnalysisStore } from "@/src/stores/pendingAnalysisStore"
import { useNotificationHistoryStore } from "@/src/stores/notificationHistoryStore"
import {
  claimForegroundFoodAnalysisRequest,
  markFoodAnalysisRequestHandled,
  releaseForegroundFoodAnalysisRequest,
} from "../services/foodAnalysisRequestState"
import { PENDING_ANALYSIS_TTL_MS } from "../services/foodAnalysisRecovery"
import { pendingAnalysisRequests } from "../storage/pendingAnalysisRequests"
import type {
  DiaryAnalysisResult,
  FoodAnalysisUpdateRequest,
  FoodAnalysisUpdateResult,
  FoodCameraAnalyzeResult,
  FoodAnalysisConfirmationRequest,
  FoodAnalysisJob,
  FoodAnalysisStatus,
  FoodTitleUpdateResponse,
} from "@/src/types"
import { MealType } from "../types"
import { toDateStr } from "@/src/features/home/utils/dateUtils"
import { toDurationBucket, trackAnalyticsEvent } from "@/src/features/analytics"
import { appConfig } from "@/src/config/appConfig"
import { useTranslation } from "react-i18next"

import { showErrorToast } from "@/src/lib/toast"

function createFoodAnalysisRequestId(): string {
  const randomPart = Math.random().toString(36).slice(2, 10)
  return `food-${Date.now().toString(36)}-${randomPart}`
}

/**
 * 레거시 교정을 거친 결과에서 v2 리비전 손잡이를 떼어 낸다.
 *
 * 서버는 `PATCH /analysis-results/{id}` 를 받으면 그 분석의 v2 소비 투영을 은퇴시킨다
 * (`repository.retireV2Projection`) — 손으로 고친 자유 텍스트 음식은 카탈로그 리비전으로
 * 만들 수 없기 때문이다. 앱이 들고 있던 `revision` 을 그대로 두면 다음번 "먹은 양만"
 * 수정이 옛 `baseRevisionId` 로 `PATCH /consumption` 을 쳐서 409 로 튕긴다. 화면에는
 * "변경사항을 저장하지 못했어요"만 뜨고 사용자는 이유를 알 수 없다.
 *
 * 교정 응답에는 이 키들이 아예 없으므로, 병합하는 쪽(`{...prev, ...updated}`)에서
 * 옛 값이 살아남는다. 그래서 **명시적으로 undefined 를 실어** 덮어쓴다.
 */
function dropRetiredRevision(
  updated: FoodAnalysisUpdateResult,
): FoodAnalysisUpdateResult {
  return {
    ...updated,
    revision: undefined,
    revisionId: undefined,
    consumptionRevision: undefined,
  }
}

/**
 * 서버가 분석 잡을 `FAILED` 로 닫았을 때의 오류.
 *
 * 잡 실패는 HTTP 오류가 아니라 **폴링 응답의 필드**(`job.error`)로 온다 — 코드가 없어서
 * 그냥 `Error` 로 던지면 `resolveError` 가 8번 폴백("지금은 이 작업을 마치지 못했어요")
 * 까지 떨어지고, 재시도 버튼도 없이 끝난다. 이 실패의 의미는 정확히
 * `FOOD_CAMERA_005`(분석 실패)이므로 그 코드를 실어 카탈로그 문구와 재시도 버튼을 쓴다.
 *
 * `statusCode` 를 주는 것은 형식이 아니라 **분기 때문**이다. 상태코드가 없으면
 * `resolveError` 가 "응답이 아예 오지 않았다"로 보고 와이파이를 확인하라고 말한다 —
 * 응답은 왔고 그 안에 실패가 적혀 있었다.
 */
function createAnalysisJobFailure(
  job: FoodAnalysisJob,
  fallbackMessage = "food analysis job failed",
): ApiError {
  return new ApiError(
    job.error || job.failureMessage || fallbackMessage,
    "FOOD_CAMERA_005",
    500,
  )
}

/** 폴링 한 바퀴의 결말 — 포그라운드가 이 요청을 **계속 붙들어야 하는가**를 호출부에 알린다. */
type ResolveOutcome = "done" | "awaiting_confirmation"

/**
 * 수정 후 서버 데이터로 재동기화.
 *
 * 목록·존재여부만으로는 **모자란다.** 한 끼 상세(`diaryResult`)는 staleTime 60초,
 * 한 끼 리포트(`mealReport`)는 5분이라, 고친 직후 다시 열면 그 창 안에서는 캐시에
 * 남은 옛 숫자가 그대로 나온다 — 서버는 이미 새 값인데 화면만 안 바뀌는 상태다.
 * 리포트는 서버가 교정 때 지우므로(`mealReport.invalidate`) 여기서 캐시만 버리면
 * 다음 조회가 새 문장을 받는다.
 */
export async function refetchDiaryQueries(queryClient: QueryClient) {
  await queryClient.refetchQueries({ queryKey: ["dateAnalysis"] })
  await queryClient.refetchQueries({ queryKey: ["diaryExistence"] })
  await queryClient.invalidateQueries({ queryKey: ["diaryResult"] })
  await queryClient.invalidateQueries({ queryKey: ["mealReport"] })
}

/**
 * 식사 이름 변경. 훅 상태를 하나도 안 쓰므로 훅 밖에 둔다 — 수정 화면(`FoodResultEdit`)이
 * 이 한 함수 때문에 `useFoodAnalysis` 를 통째로(useState 아홉 개·스토어 구독) 한 벌 더
 * 세웠었다.
 */
export async function updateFoodTitle(
  queryClient: QueryClient,
  foodAnalysisResultId: number,
  title: string,
): Promise<FoodTitleUpdateResponse | undefined> {
  try {
    const response = await foodCameraService.updateFoodTitle(
      foodAnalysisResultId,
      title,
    )
    await refetchDiaryQueries(queryClient)
    return response
  } catch (error) {
    presentError(error, {
      scope: "meal-title-update",
      retry: () =>
        void updateFoodTitle(queryClient, foodAnalysisResultId, title),
    })
  }
}

export function useFoodAnalysis(
  onUpdateSuccess?: (updated: FoodAnalysisUpdateResult) => void,
) {
  const { t } = useTranslation()
  const [analysisResult, setAnalysisResult] =
    useState<FoodCameraAnalyzeResult | null>(null)
  const [isResultOpen, setIsResultOpen] = useState(false)
  const [analyzedMealType, setAnalyzedMealType] = useState<MealType | null>(
    null,
  )
  const [analyzedImageUri, setAnalyzedImageUri] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  /*
    분석 오버레이가 떠 있는 동안 결과를 바로 알리면 안 된다. 예전엔 Alert 이었고,
    catch 의 Alert 와 finally 의 setIsAnalyzing(false) 가 같은 틱에 돌아서
    **알럿이 Modal 의 뷰컨트롤러에 붙은 채 그 Modal 이 dismiss** 됐다. iOS 에서
    이 경합의 결말은 확인을 누른 순간 터치가 죽는 앱 멈춤이다(2026-08-02 실사용
    보고, 통화 중 상태에서 재현).

    오버레이가 RN Modal 을 벗고 루트 포털이 된 지금도 지연은 그대로 필요하다 —
    포털 호스트는 PortalProvider 자식들(토스트 호스트 포함) **뒤에** 그려지므로
    오버레이가 살아 있는 동안 띄운 토스트는 그 아래 깔려 눈에 닿지 않는다.
    오버레이를 먼저 내리고 퇴장 페이드가 끝난 뒤에 알린다. 오버레이가 안 떠
    있어도 지연은 무해하다.
  */
  const closeOverlayThenNotify = (notify: () => void) => {
    setIsAnalyzing(false)
    setTimeout(notify, 500)
  }
  const [isUpdating, setIsUpdating] = useState(false)
  const [analysisStatus, setAnalysisStatus] =
    useState<FoodAnalysisStatus | null>(null)
  const [confirmationJob, setConfirmationJob] =
    useState<FoodAnalysisJob | null>(null)
  const queryClient = useQueryClient()

  // 분석 도중 X 버튼으로 나갔는지 추적 (ref: async closure에서 최신값 보장)
  const dismissedRef = useRef(false)
  const analysisMethodRef = useRef<"photo" | "text">("photo")
  /**
   * 이번 분석이 시작된 시각. `wait_bucket`(포기·실패까지 몇 초)의 기준이고, 원값(ms)은
   * 이벤트에 싣지 않는다 — 서버 질의에 백분위가 없어 ms 로는 아무 그림도 안 나온다.
   */
  const analysisStartedAtRef = useRef<number>(0)
  /** 나갈 때의 마지막 잡 상태. state 는 async 클로저에서 옛 값을 보므로 ref 로 둔다. */
  const lastStatusRef = useRef<FoodAnalysisStatus | null>(null)
  /**
   * 이미 쏜 진행 전이. 폴링은 0.5~1.5초마다 도는데 상태는 두 번밖에 안 바뀌므로,
   * `analysisId`+상태를 키로 잠가 **분석 1건당 최대 2행**으로 묶는다. "직전 상태와
   * 다른가" 로는 모자란다 — 확인 질문에 답하고 다시 폴링에 들어가면 같은 분석이
   * `PERCEIVING` 을 두 번 지날 수 있다.
   */
  const progressedRef = useRef<Set<string>>(new Set())

  const beginAnalysis = (method: "photo" | "text") => {
    dismissedRef.current = false
    analysisMethodRef.current = method
    analysisStartedAtRef.current = Date.now()
    lastStatusRef.current = null
    progressedRef.current = new Set()
  }

  /** 분석 시작부터 지금까지의 대기 — 실패·포기 이벤트가 같은 눈금을 쓴다. */
  const waitBucketSinceStart = () =>
    toDurationBucket(Date.now() - analysisStartedAtRef.current)

  const setPending = usePendingAnalysisStore((s) => s.setPending)
  const addNotification = useNotificationHistoryStore((s) => s.addNotification)

  const completeAnalysis = async (
    result: FoodCameraAnalyzeResult,
    requestId: string,
    mealType: MealType,
    imageUri: string | null,
  ) => {
    const method = imageUri ? "photo" : "text"
    markFoodAnalysisRequestHandled(requestId)
    await pendingAnalysisRequests.remove(requestId)
    releaseForegroundFoodAnalysisRequest(requestId)
    setAnalysisStatus("READY")
    trackAnalyticsEvent("food_analysis_succeeded", { method })

    if (dismissedRef.current) {
      setPending({ result, mealType, imageUri: result.imageUrl ?? imageUri })
      addNotification({
        type: "food_analysis",
        foodName: result.title || undefined,
        mealType,
      })
      return
    }

    setAnalysisResult(result)
    setIsResultOpen(true)
    trackAnalyticsEvent("food_record_result_viewed", { source: "fresh" })
  }

  /**
   * 잡이 끝날 때까지 폴링한다. `awaiting_confirmation` 을 돌려주면 확인 질문에 답할 때까지
   * 포그라운드가 요청을 계속 붙들어야 한다(복구가 같은 질문을 또 띄우지 않게) — 그 밖에는
   * 호출부가 놓는다.
   */
  const resolveJob = async (
    initialJob: FoodAnalysisJob,
    requestId: string,
    mealType: MealType,
    imageUri: string | null,
  ): Promise<ResolveOutcome> => {
    let job = initialJob
    const startedAt = Date.now()
    /*
      대기 목록은 **상태가 바뀔 때만** 다시 쓴다. 예전에는 폴링 틱마다 썼는데, 한 번이
      AsyncStorage 읽기+파싱+직렬화+쓰기+구독자 알림이라 0.5~1.5초마다 그 비용을 내고도
      내용은 같았다. READY·FAILED 는 바로 아래서 지우므로 적지 않는다.
    */
    let persisted: { analysisId?: string; status?: FoodAnalysisStatus } = {}
    while (!dismissedRef.current) {
      setAnalysisStatus(job.status)
      lastStatusRef.current = job.status
      /*
        진행 전이. `QUEUED` 는 `food_analysis_started` 와 같은 틱이라 쏘지 않는다 —
        한 사건이 두 행이 되고, 퍼널에서 둘을 인접 스텝으로 쓰면 초 정밀도 엄격
        부등호에 걸려 그 사용자가 통째로 빠진다(설계 §J2-4 2).
      */
      if (job.status === "PERCEIVING" || job.status === "RESOLVING") {
        const key = `${job.analysisId}:${job.status}`
        if (!progressedRef.current.has(key)) {
          progressedRef.current.add(key)
          trackAnalyticsEvent("food_analysis_progressed", {
            method: analysisMethodRef.current,
            status: job.status,
          })
        }
      }
      const isTerminal = job.status === "READY" || job.status === "FAILED"
      if (
        !isTerminal &&
        (persisted.analysisId !== job.analysisId ||
          persisted.status !== job.status)
      ) {
        await pendingAnalysisRequests.add({
          requestId,
          analysisId: job.analysisId,
          status: job.status,
          mealType,
          imageUri,
          startedAt,
        })
        persisted = { analysisId: job.analysisId, status: job.status }
      }

      if (job.status === "READY" && job.result) {
        await completeAnalysis(job.result, requestId, mealType, imageUri)
        return "done"
      }
      if (job.status === "NEEDS_CONFIRMATION") {
        if (appConfig.foodAnalysisConfirmationEnabled) {
          setConfirmationJob(job)
          return "awaiting_confirmation"
        }

        // 확인 질문을 받을 UI가 없는 빌드에서는 자동 완료를 약속하지 않는다.
        // 미완료 요청을 pending으로 남겨 두면 앱을 다시 열어도 진행할 방법이 없다.
        await pendingAnalysisRequests.remove(requestId)
        markFoodAnalysisRequestHandled(requestId)
        setConfirmationJob(null)
        setAnalysisStatus("FAILED")
        trackAnalyticsEvent("food_analysis_failed", {
          method: analysisMethodRef.current,
          fail_kind: "confirmation_unavailable",
          wait_bucket: waitBucketSinceStart(),
          // 옛 키. 기존 대시보드 질의가 이 값을 보고 있어 전환 기간 동안 같이 싣는다.
          reason: "confirmation_unavailable",
        })
        // 오류가 아니라 이 빌드의 한계다 — 던질 것이 없으니 문구를 직접 쥐고 알린다.
        closeOverlayThenNotify(() =>
          showErrorToast(
            t("home.analysis.photoUnclearTitle"),
            t("home.analysis.photoUnclearBody"),
          ),
        )
        return "done"
      }
      if (job.status === "FAILED") {
        await pendingAnalysisRequests.remove(requestId)
        throw createAnalysisJobFailure(job)
      }
      /*
        시한. 복구의 대기 시효(`PENDING_ANALYSIS_TTL_MS`)와 같은 10분이다 — 서버가 끝내
        답하지 않는 잡을 포그라운드만 영원히 기다리면 오버레이가 내려가지 않는다. 실패는
        서버가 FAILED 로 닫은 것과 같은 길(같은 코드·같은 재시도 버튼)을 탄다.
      */
      if (Date.now() - startedAt > PENDING_ANALYSIS_TTL_MS) {
        await pendingAnalysisRequests.remove(requestId)
        throw createAnalysisJobFailure(job, "food analysis job timed out")
      }

      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(500, job.pollAfterMs ?? 1500)),
      )
      // 기다리는 동안 X 로 나갔으면 한 번 더 묻지 않는다 — 그 요청은 이제 복구의 몫이다.
      if (dismissedRef.current) return "done"
      job = await foodCameraService.fetchAnalysis(job.analysisId)
    }
    return "done"
  }

  const analyzeImage = async (uri: string, mealType: MealType) => {
    beginAnalysis("photo")
    const requestId = createFoodAnalysisRequestId()
    /*
      이 요청은 여기서 직접 폴링한다 — 복구 폴러가 대기 목록에서 같은 잡을 같이 폴링하지
      않도록 붙든다(`foodAnalysisRequestState` 머리말). 끝(완료·실패·X 로 나감)에 놓는다.
    */
    claimForegroundFoodAnalysisRequest(requestId)
    trackAnalyticsEvent("food_analysis_started", { method: "photo" })
    let outcome: ResolveOutcome = "done"
    try {
      setAnalyzedImageUri(uri)
      setAnalyzedMealType(mealType)
      setIsAnalyzing(true)
      await pendingAnalysisRequests.add({
        requestId,
        mealType,
        imageUri: uri,
        startedAt: Date.now(),
      })
      setAnalysisStatus("QUEUED")
      const job = await foodCameraService.createAnalysis(uri, requestId)
      outcome = await resolveJob(job, requestId, mealType, uri)
    } catch (error) {
      // X 로 나간 뒤 도착한 실패는 알리지 않는다 — 사용자가 이미 이 흐름을 떠났다.
      if (!dismissedRef.current) {
        trackAnalyticsEvent("food_analysis_failed", {
          method: "photo",
          // 갈래 판정은 `resolveError` 하나가 정본이다 — 여기서 다시 짓지 않는다.
          fail_kind: toAnalyticsFailKind(error),
          wait_bucket: waitBucketSinceStart(),
        })
        closeOverlayThenNotify(() =>
          presentError(error, {
            scope: "food-analysis-photo",
            retry: () => void analyzeImage(uri, mealType),
          }),
        )
      }
    } finally {
      setIsAnalyzing(false)
      // 확인 질문을 기다리는 동안은 계속 붙든다 — 복구가 같은 질문을 또 띄우지 않게.
      if (outcome !== "awaiting_confirmation") {
        releaseForegroundFoodAnalysisRequest(requestId)
      }
    }
  }

  const analyzeText = async (text: string, mealType: MealType) => {
    beginAnalysis("text")
    const requestId = createFoodAnalysisRequestId()
    // 요청 한 번으로 끝나지만, X 로 나간 뒤 도착한 결과를 여기서 직접 pending 에 넣으므로
    // 복구가 같은 결과를 한 번 더 넣지 않도록 끝날 때까지 붙든다.
    claimForegroundFoodAnalysisRequest(requestId)
    trackAnalyticsEvent("food_analysis_started", { method: "text" })
    try {
      setAnalyzedMealType(mealType)
      setIsAnalyzing(true)
      await pendingAnalysisRequests.add({
        requestId,
        mealType,
        imageUri: null,
        startedAt: Date.now(),
      })
      const result = await foodCameraService.analyzeText(text, requestId)
      markFoodAnalysisRequestHandled(requestId)
      await pendingAnalysisRequests.remove(requestId)
      trackAnalyticsEvent("food_analysis_succeeded", { method: "text" })

      if (dismissedRef.current) {
        setPending({ result, mealType, imageUri: result.imageUrl ?? null })
        addNotification({
          type: "food_analysis",
          foodName: result.title || undefined,
          mealType,
        })
        return
      }

      setAnalyzedImageUri(result.imageUrl)
      setAnalysisResult(result)
      setIsResultOpen(true)
      trackAnalyticsEvent("food_record_result_viewed", { source: "fresh" })
    } catch (error) {
      if (!dismissedRef.current) {
        trackAnalyticsEvent("food_analysis_failed", {
          method: "text",
          fail_kind: toAnalyticsFailKind(error),
          wait_bucket: waitBucketSinceStart(),
        })
        /*
          타임아웃을 손으로 갈라 보던 분기를 걷었다. `resolveError` 가 타임아웃·오프라인·
          `FOOD_CAMERA_009`(내용이 너무 짧음)·`FOOD_CAMERA_010`(요청 몰림)을 각각 다른
          문구로 나눈다 — 예전에는 셋 다 "연결을 확인한 뒤 다시 해 주세요" 였다.
        */
        closeOverlayThenNotify(() =>
          presentError(error, {
            scope: "food-analysis-text",
            retry: () => void analyzeText(text, mealType),
          }),
        )
      }
    } finally {
      setIsAnalyzing(false)
      releaseForegroundFoodAnalysisRequest(requestId)
    }
  }

  // 로딩 중 X 버튼 탭 시 호출
  const dismissAnalysis = () => {
    /*
      "몇 초 기다리다 포기하는가" 가 로딩 문구·타임아웃 정책의 유일한 근거다.
      `NONE` 은 첫 응답조차 오기 전 — 느린 분석이 아니라 **느린 업로드**이므로
      고칠 곳이 다르다.
    */
    const last = lastStatusRef.current
    trackAnalyticsEvent("food_analysis_dismissed", {
      method: analysisMethodRef.current,
      status:
        last === "QUEUED" || last === "PERCEIVING" || last === "RESOLVING"
          ? last
          : "NONE",
      wait_bucket: waitBucketSinceStart(),
    })
    dismissedRef.current = true
    setIsAnalyzing(false)
  }

  const confirmAnalysis = async (
    body: FoodAnalysisConfirmationRequest,
  ): Promise<void> => {
    if (!confirmationJob || !analyzedMealType) return
    // 답을 보내는 동안도 포그라운드 소유다 — 실패해서 질문을 되돌려 놓으면 계속 붙든다.
    let outcome: ResolveOutcome = "awaiting_confirmation"
    try {
      setIsAnalyzing(true)
      setConfirmationJob(null)
      const job = await foodCameraService.confirmAnalysis(
        confirmationJob.analysisId,
        {
          ...body,
          baseRevisionId: confirmationJob.result?.revisionId,
        },
      )
      outcome = await resolveJob(
        job,
        confirmationJob.requestId,
        analyzedMealType,
        analyzedImageUri,
      )
    } catch (error) {
      // 고른 답은 돌려놓는다 — 되묻지 않아야 재시도가 "같은 것을 다시 누르기"로 끝난다.
      setConfirmationJob(confirmationJob)
      // 오버레이(루트 포털)가 살아 있는 동안 띄운 토스트는 그 아래 깔려 보이지 않는다.
      closeOverlayThenNotify(() =>
        presentError(error, {
          scope: "food-analysis-confirm",
          retry: () => void confirmAnalysis(body),
        }),
      )
    } finally {
      setIsAnalyzing(false)
      if (outcome !== "awaiting_confirmation") {
        releaseForegroundFoodAnalysisRequest(confirmationJob.requestId)
      }
    }
  }

  const deferConfirmation = () => {
    dismissedRef.current = true
    // 질문을 미루면 이 요청은 복구의 몫이다(다시 열 때 같은 질문을 띄운다) — 붙든 것을 놓는다.
    if (confirmationJob) {
      releaseForegroundFoodAnalysisRequest(confirmationJob.requestId)
    }
    setConfirmationJob(null)
  }

  /**
   * 방금 분석한 결과를 그날 기록에 넣는다. **성공 여부**를 돌려준다 — 실패는 여기서 이미
   * 알렸으므로(토스트 + 재시도) 호출부는 리포트 페이지를 닫지 않는 것만 하면 된다.
   */
  const registerDiary = async (
    selectedDate: Date,
    onSuccess: (mealType: MealType, imageUri: string | null) => void,
  ): Promise<boolean> => {
    if (!analysisResult || !analyzedMealType) return false
    if (analysisResult.foodAnalysisResultId <= 0) {
      // 요청이 나가지도 않은 실패. `presentError` 를 안 지나가므로 공용 통로에도
      // 한 행도 안 남는다 — 서버 실패와 갈라 두어야 고칠 곳이 정해진다.
      trackAnalyticsEvent("food_record_save_failed", {
        source: "fresh",
        fail_kind: "not_ready",
      })
      showErrorToast(
        t("home.errors.notReadyTitle"),
        t("home.errors.notReadyBody"),
      )
      return false
    }
    const date = toDateStr(selectedDate)
    try {
      await foodCameraService.registerDiary(
        analysisResult.foodAnalysisResultId,
        date,
        analyzedMealType,
      )
      trackAnalyticsEvent("food_record_saved", { source: "fresh" })
      onSuccess(analyzedMealType, analyzedImageUri)
      return true
    } catch (error) {
      trackAnalyticsEvent("food_record_save_failed", {
        source: "fresh",
        fail_kind: toAnalyticsFailKind(error),
      })
      presentError(error, {
        scope: "meal-diary-register",
        retry: () => void registerDiary(selectedDate, onSuccess),
      })
      return false
    }
  }

  const fetchDiaryResult = async (
    diaryId: number,
  ): Promise<DiaryAnalysisResult | undefined> => {
    try {
      const response = await foodCameraService.fetchDiaryResult(diaryId)
      return response
    } catch (error) {
      /*
        재시도 핸들러는 주지 않는다 — 이 함수의 결과는 **호출부가 받아 화면을 여는 데**
        쓰인다. 토스트 버튼에서 다시 불러 봐야 받은 값이 갈 곳이 없다. 대신 새로고침을
        준다: 이 실패의 대부분인 `FOOD_CAMERA_013`(지워진 기록)은 목록을 새로 받는 것이
        곧 해결이다.
      */
      presentError(error, {
        scope: "meal-diary-open",
        refresh: () => void refetchDiaryQueries(queryClient),
      })
    }
  }

  const updateFoodAnalysis = async (
    foodAnalysisResultId: number,
    body: FoodAnalysisUpdateRequest,
    sourceResult?: FoodCameraAnalyzeResult,
  ): Promise<FoodAnalysisUpdateResult | undefined> => {
    const targetResult = sourceResult ?? analysisResult
    const isConsumptionOnly =
      targetResult?.analysisId != null &&
      targetResult.revision != null &&
      body.consumedRatio != null &&
      body.foods.length === targetResult.foods.length &&
      body.foods.every((food, index) => {
        const current = targetResult.foods[index]
        return (
          food.foodId === current.id &&
          food.name === current.name &&
          food.servingSizeValue === current.servingSizeValue &&
          food.servingSizeUnit === current.servingSizeUnit
        )
      })
    try {
      if (!isConsumptionOnly) setIsUpdating(true)
      const updated = isConsumptionOnly
        ? (
            await foodCameraService.updateConsumption(
              targetResult.analysisId as string,
              {
                baseRevisionId:
                  targetResult.revisionId ??
                  (
                    targetResult.revision as NonNullable<
                      FoodCameraAnalyzeResult["revision"]
                    >
                  ).revisionId,
                baseConsumptionRevisionId:
                  targetResult.consumptionRevision?.consumptionRevisionId,
                items: (
                  targetResult.revision as NonNullable<
                    FoodCameraAnalyzeResult["revision"]
                  >
                ).items.map((revisionItem) => {
                  const food = targetResult.foods.find(
                    (candidate) =>
                      candidate.analysisItemId === revisionItem.analysisItemId,
                  )
                  const supportsBrothRatio =
                    food?.isBroth ||
                    /국|탕|찌개|전골|라면|우동|육수/.test(
                      food?.name ?? revisionItem.name,
                    )
                  return {
                    analysisItemId: revisionItem.analysisItemId,
                    consumedRatio: body.consumedRatio,
                    ...(supportsBrothRatio && body.brothConsumedRatio != null
                      ? { brothConsumedRatio: body.brothConsumedRatio }
                      : {}),
                  }
                }),
              },
            )
          ).result
        : dropRetiredRevision(
            await foodCameraService.updateFoodAnalysis(
              foodAnalysisResultId,
              body,
            ),
          )
      if (!updated) throw new Error("수정된 식단 결과를 불러오지 못했어요.")
      setAnalysisResult(updated)
      onUpdateSuccess?.(updated)
      await refetchDiaryQueries(queryClient)
      return updated
    } catch (error) {
      presentError(error, {
        scope: "meal-analysis-update",
        retry: () =>
          void updateFoodAnalysis(foodAnalysisResultId, body, sourceResult),
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const updateDiaryMealType = async (
    diaryId: number,
    mealType: string,
  ): Promise<{ diaryId: number; mealType: string } | undefined> => {
    try {
      const result = await foodCameraService.updateDiaryMealType(
        diaryId,
        mealType,
      )
      await refetchDiaryQueries(queryClient)
      return result
    } catch (error) {
      presentError(error, {
        scope: "meal-type-update",
        retry: () => void updateDiaryMealType(diaryId, mealType),
      })
    }
  }

  return {
    isAnalyzing,
    isUpdating,
    isResultOpen,
    analysisStatus,
    confirmationJob,
    analysisResult,
    analyzedMealType,
    analyzedImageUri,
    analyzeImage,
    analyzeText,
    dismissAnalysis,
    confirmAnalysis,
    deferConfirmation,
    registerDiary,
    fetchDiaryResult,
    updateFoodAnalysis,
    updateDiaryMealType,
    closeResult: () => setIsResultOpen(false),
  }
}
