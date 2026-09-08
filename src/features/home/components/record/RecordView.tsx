import type { EdemaEntry } from "../../utils/edemaEntry"
import { StyleSheet, Platform, RefreshControl, View } from "react-native"
import { floatingAiButtonScrollInset } from "@/src/shared/components/floatingAiButtonLayout"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import type {
  DiaryAnalysisResult,
  FoodAnalysisUpdateRequest,
  FoodAnalysisUpdateResult,
  FoodCameraAnalyzeResult,
  FoodAnalysisConfirmationRequest,
} from "@/src/types"
import { HomeHero } from "./HomeHero"
import { TodayRecord, type TodayRecordTileData } from "./TodayRecord"
import { MealSheet } from "./sheets/MealSheet"
import { RecipeImportSheet } from "./sheets/RecipeImportSheet"
import type { RecipeCard } from "@/src/features/recipe/types/recipeListV2"
import {
  MealRecordList,
  RecordMealCta,
  type MealRecordEntry,
} from "./MealRecordList"
import { TileIcon } from "./TileIcon"
import { useSurface } from "@/src/hooks/useSurface"
import { isAtScrollTop, useRegisterTabReset } from "@/src/shared/navigation"
import { MealType } from "../../types"
import { normalizeEdemaLevel } from "../../data/EdemaConstants"
import { useFoodAnalysis } from "../../hooks/useFoodAnalysis"
import { useExtraWater } from "../../hooks/useExtraWater"
import { displayedWaterIntake } from "../../utils/waterIntake"
import { useWeightEdemaRecord } from "../../hooks/useWeightEdemaRecord"
import { useBloodMetricsRecord } from "../../hooks/useBloodMetricsRecord"
import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { router } from "expo-router"
import { LoadingOverlay } from "../LoadingOverlay"
import { openMealReportPage } from "../../stores/openMealReportPage"
import { useMealReportPageStore } from "../../stores/mealReportPageStore"
import { useFoodCameraStore } from "../../stores/foodCameraStore"
import { FoodAnalysisConfirmation } from "../FoodAnalysisConfirmation"
import { TextRecord } from "./TextRecord"
import { tokens } from "@/src/theme/tokens"
import { dateAnalysisKey, useDateAnalysis } from "../../hooks/useDateAnalysis"
import { useStreak } from "../../hooks/useStreak"
import { useNutrientLimits } from "@/src/features/nutrition/hooks/useNutrientLimits"
import { usePendingAnalysisStore } from "@/src/stores/pendingAnalysisStore"
import { foodCameraService } from "@/src/services/data"
import { fetchMealReport } from "@/src/features/food-report/services/mealReportService"
import { mealReportKey } from "@/src/features/food-report/hooks/useMealReport"
import { diaryResultKey } from "@/src/i18n/localeQueryKeys"
import { formatDateWithWeekday, toDateStr } from "../../utils/dateUtils"
import { inferGlucoseContext } from "../../utils/glucoseInference"
import { openRecordPage } from "../../stores/recordPageStore"
import { presentError, toAnalyticsFailKind } from "@/src/lib/errorMessage"
import { afterModalTransitions } from "@/src/shared/components/appModalGate"
import { ApiError } from "@/src/services/core/apiError"
import { pendingAnalysisRequests } from "../../storage/pendingAnalysisRequests"
import {
  applyMealTypeChangeToMealImages,
  applyMealTypeChangeToRecordedMeals,
  inferMealTypeFromTime,
  isSkippedDiet,
  toSkippedMealMap,
  type MealImageMap,
  type RecordedMealMap,
} from "../../utils/mealRecordUtils"
import { appConfig } from "@/src/config/appConfig"
import {
  trackAnalyticsEvent,
  type AnalyticsHealthMetric,
  type AnalyticsMealSheetEntry,
} from "@/src/features/analytics"
import { useFoodAnalysisRecoveryPolling } from "../../hooks/useFoodAnalysisRecoveryPolling"
import { foodAnalysisRecovery } from "../../services/foodAnalysisRecovery"

import { showErrorToast } from "@/src/lib/toast"
import { findGlucoseCell, orderGlucoseByDay } from "../../utils/glucoseGrid"

const ANALYTICS_MEAL_SLOT: Record<
  MealType,
  "breakfast" | "lunch" | "dinner" | "snack"
> = {
  BREAKFAST: "breakfast",
  LUNCH: "lunch",
  DINNER: "dinner",
  SNACKS: "snack",
}

type RecordSheetKind = "meal" | "water" | "bloodPressure" | "weight"

interface RecordViewProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onSelectMealType: (mealType: MealType) => void
  onPressDate: () => void
  onOpenStats: () => void
  onOpenNotifications: () => void
}

export function RecordView({
  selectedDate,
  onSelectDate,
  onSelectMealType,
  onPressDate,
  onOpenStats,
  onOpenNotifications,
}: RecordViewProps) {
  const { t, i18n } = useTranslation("common")
  const language = (i18n.resolvedLanguage ?? i18n.language).startsWith("en")
    ? "en"
    : "ko"
  const insets = useSafeAreaInsets()
  const surface = useSurface()
  const queryClient = useQueryClient()
  useFoodAnalysisRecoveryPolling()

  const {
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
    closeResult,
    updateFoodAnalysis,
    updateDiaryMealType,
  } = useFoodAnalysis()

  /*
    방금 분석한 결과는 리포트 **페이지**로 연다. `isResultOpen` 이 켜지는 순간 한 번만
    민다 — 결과 객체는 수정 때마다 바뀌므로 그것을 의존성으로 두면 페이지가 겹쳐 쌓인다.
  */
  const analysisResultRef = useRef(analysisResult)
  analysisResultRef.current = analysisResult
  const analyzedImageUriRef = useRef(analyzedImageUri)
  analyzedImageUriRef.current = analyzedImageUri
  const analyzedMealTypeRef = useRef(analyzedMealType)
  analyzedMealTypeRef.current = analyzedMealType
  const handleAddToRecordRef = useRef<() => Promise<void>>(async () => {})
  useEffect(() => {
    if (!isResultOpen) return
    const result = analysisResultRef.current
    if (!result) return
    openMealReportPage({
      source: "fresh",
      result,
      imageUri: analyzedImageUriRef.current ?? undefined,
      mealType: analyzedMealTypeRef.current ?? undefined,
      recordDate: toDateStr(selectedDate),
      onAddToRecord: () => handleAddToRecordRef.current(),
      isUpdating,
      updateFoodAnalysis,
      onClose: closeResult,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResultOpen])

  const pending = usePendingAnalysisStore((s) => s.pending)
  const setPending = usePendingAnalysisStore((s) => s.setPending)
  const pendingConfirmation = usePendingAnalysisStore(
    (s) => s.pendingConfirmation,
  )
  const setPendingConfirmation = usePendingAnalysisStore(
    (s) => s.setPendingConfirmation,
  )
  const [isPendingUpdating, setIsPendingUpdating] = useState(false)
  // 페이지 재료는 열 때 한 번 넘어가므로, 콜백은 ref 를 거쳐 늘 최신 본을 부른다.
  const handlePendingAddToRecordRef = useRef<() => Promise<void>>(
    async () => {},
  )
  const updatePendingFoodAnalysisRef = useRef<
    (
      id: number,
      body: FoodAnalysisUpdateRequest,
    ) => Promise<FoodAnalysisUpdateResult | undefined>
  >(async () => undefined)
  /**
   * 누가 이 새로고침을 시작했는가. `boolean` 이 아닌 이유가 결함 하나다 —
   * `RefreshControl` 의 `refreshing` 은 **제스처일 때만** 켜야 한다. 제스처 없이 켜면
   * iOS 가 스피너를 보여 주려고 스크롤을 `contentOffset.y -= 컨트롤 높이` 로 내려 두고
   * 끝날 때의 복원은 조건부라, 부를 때마다 위 여백이 **누적**된다(RN 의
   * `RCTRefreshControl.m`. 자세한 사정과 실측은 `shared/refresh/useRefreshable` 머리말 4번).
   *
   * 이 화면은 아직 그 훅을 지나지 않으므로(아래 `RefreshControl` 주석) 같은 규칙을
   * 여기서 손으로 지킨다. 한 칸에 출처를 담아 **파생**시키는 것이 요점이다 — 두 개의
   * boolean 으로 두면 "제스처가 아닌데 스피너가 켜진" 조합이 다시 표현 가능해진다.
   */
  const [refreshSource, setRefreshSource] = useState<"gesture" | "code" | null>(
    null,
  )
  const refreshPromiseRef = useRef<Promise<void> | null>(null)
  const pendingResultViewedRef = useRef<number | null>(null)

  /*
    복구된 결과는 리포트 **페이지**로 연다(2026-09-04 시안). 페이지 재료는 여기서
    정하고, 닫힘 정리(`onClose`)는 페이지가 불러 준다. 같은 결과에 두 번 열지 않도록
    `pendingResultViewedRef` 가 문지기다 — 이 값이 곧 "결과를 봤다" 계측의 분모이기도 하다.
  */
  useEffect(() => {
    if (!pending) return
    if (
      pendingResultViewedRef.current !== pending.result.foodAnalysisResultId
    ) {
      pendingResultViewedRef.current = pending.result.foodAnalysisResultId
      trackAnalyticsEvent("food_record_result_viewed", {
        source: "recovered",
      })
      openMealReportPage({
        source: "recovered",
        result: pending.result,
        imageUri: pending.imageUri ?? undefined,
        mealType: pending.mealType,
        recordDate: toDateStr(selectedDate),
        onAddToRecord: () => handlePendingAddToRecordRef.current(),
        isUpdating: false,
        updateFoodAnalysis: (id, body) =>
          updatePendingFoodAnalysisRef.current(id, body),
        onClose: () => {
          setPending(null)
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending])

  const handleRecoveredConfirmation = async (
    body: FoodAnalysisConfirmationRequest,
  ) => {
    if (!pendingConfirmation) return
    try {
      let job = await foodCameraService.confirmAnalysis(
        pendingConfirmation.job.analysisId,
        body,
      )
      while (
        job.status === "QUEUED" ||
        job.status === "PERCEIVING" ||
        job.status === "RESOLVING"
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.max(500, job.pollAfterMs ?? 1500)),
        )
        job = await foodCameraService.fetchAnalysis(job.analysisId)
      }
      if (job.status === "NEEDS_CONFIRMATION") {
        setPendingConfirmation({ ...pendingConfirmation, job })
        return
      }
      if (job.status !== "READY" || !job.result) {
        // 잡 실패는 HTTP 오류가 아니라 응답 필드로 온다 — 코드를 실어야 카탈로그 문구와
        // 재시도 버튼이 붙는다(`useFoodAnalysis.createAnalysisJobFailure` 머리말 참고).
        throw new ApiError(
          job.error || job.failureMessage || "food analysis job failed",
          "FOOD_CAMERA_005",
          500,
        )
      }
      /*
        확인 pageSheet 를 먼저 내리고, 전환이 끝난 뒤에 결과를 연다. setPending 은
        아래 effect 를 통해 결과 pageSheet 를 present 하므로, 같은 틱에 두면
        네이티브 dismiss+present 가 겹친다 — iOS 에서 이 겹침은 앱 전체 터치가
        죽는 계열이다(LoadingOverlay 머리말). 500ms 는 closeOverlayThenNotify 와
        같은 근거의 여유값. 타이머가 언마운트 뒤에 울려도 pending 은 전역 스토어라
        다음 마운트에서 열린다.
      */
      setPendingConfirmation(null)
      const recovered = {
        result: job.result,
        mealType: pendingConfirmation.mealType,
        imageUri: job.result.imageUrl ?? pendingConfirmation.imageUri,
      }
      setTimeout(() => setPending(recovered), 500)
      await pendingAnalysisRequests.remove(job.requestId)
    } catch (error) {
      presentError(error, {
        scope: "food-analysis-confirm-recovered",
        retry: () => void handleRecoveredConfirmation(body),
      })
    }
  }
  const { data } = useDateAnalysis(selectedDate)
  // 페이지가 이미 열려 있으면 "저장 중" 상태만 갈아 끼운다.
  const patchReportPage = useMealReportPageStore((s) => s.patch)
  useEffect(() => {
    patchReportPage({ isUpdating: isPendingUpdating || isUpdating })
  }, [isPendingUpdating, isUpdating, patchReportPage])

  // 식사 카드 탭이 기다림 없이 열리도록, 기록된 끼니의 분석과 리포트를
  // 미리 받아 둔다. 탭 핸들러는 같은 키로 fetchQuery 하므로 캐시가 따뜻하면
  // 네트워크 없이 바로 연다(서버 리포트는 캐시라 재조회 비용도 없다).
  useEffect(() => {
    const diets = data?.result.diets ?? []
    for (const diet of diets) {
      const diaryId = diet.diaryId
      if (diaryId === null || isSkippedDiet(diet)) continue
      void queryClient
        .prefetchQuery({
          queryKey: diaryResultKey(diaryId, language),
          queryFn: () => foodCameraService.fetchDiaryResult(diaryId),
          staleTime: 60_000,
        })
        .then(() => {
          const cached = queryClient.getQueryData<DiaryAnalysisResult>(
            diaryResultKey(diaryId, language),
          )
          const analysisId = cached?.foodAnalysisResultId
          if (analysisId) {
            void queryClient.prefetchQuery({
              queryKey: mealReportKey(
                analysisId,
                undefined,
                undefined,
                language,
              ),
              queryFn: () => fetchMealReport(analysisId),
              staleTime: 5 * 60 * 1000,
            })
          }
        })
    }
  }, [data, language, queryClient])

  // 지난번(어제) 기록 — 혈압 시트의 앵커. 같은 캐시 키 체계라 부담이 작다.
  const previousDate = useMemo(() => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    return d
  }, [selectedDate])
  const { data: previousData } = useDateAnalysis(previousDate)
  const previousBloodPressure = previousData?.result.bloodPressure ?? null
  const { data: streak = 0 } = useStreak()

  /**
   * 그날 기록을 다시 받는다.
   *
   * `source` 의 기본값이 `"code"` 인 것은 실수 방지다 — 새 호출자가 아무것도 안 적으면
   * **스피너 없는 쪽**으로 떨어진다. 위 `refreshSource` 머리말의 여백 누적은 그 반대로
   * 기본값을 잡았을 때만 다시 열린다.
   */
  const refreshSelectedDate = useCallback(
    (source: "gesture" | "code" = "code"): Promise<void> => {
      if (refreshPromiseRef.current) return refreshPromiseRef.current

      setRefreshSource(source)
      const runRefresh = async () => {
        try {
          await Promise.all([
            foodAnalysisRecovery.recoverPendingAnalyses(),
            queryClient.refetchQueries({
              queryKey: dateAnalysisKey(toDateStr(selectedDate), language),
              exact: true,
            }),
            queryClient.refetchQueries({ queryKey: ["diaryExistence"] }),
          ])
        } finally {
          refreshPromiseRef.current = null
          setRefreshSource(null)
        }
      }

      const refreshPromise = runRefresh()
      refreshPromiseRef.current = refreshPromise
      return refreshPromise
    },
    [language, queryClient, selectedDate],
  )

  const [mealImages, setMealImages] = useState<MealImageMap>({})
  const [recordedMeals, setRecordedMeals] = useState<RecordedMealMap>({})
  const [isTextRecordOpen, setIsTextRecordOpen] = useState(false)
  const [textRecordMealType, setTextRecordMealType] =
    useState<MealType>("BREAKFAST")
  const recordingMealTypeRef = useRef<MealType | null>(null)
  useEffect(() => {
    setMealImages({})
    setRecordedMeals({})
  }, [selectedDate])

  // ── 기록 시트 상태 ──────────────────────────────────────────────
  const [openSheet, setOpenSheet] = useState<RecordSheetKind | null>(null)
  // 타임라인 카드로 진입하면 그 끼니가 선택된 채 시트가 열린다.
  const [mealSheetPreselect, setMealSheetPreselect] = useState<MealType | null>(
    null,
  )
  /** 시트를 그냥 연다. 취소 뒤 되돌려 놓는 **재개** 경로가 이걸 쓴다(계측 없음). */
  const openMealSheet = (mealType: MealType | null = null) => {
    setMealSheetPreselect(mealType)
    setOpenSheet("meal")
  }

  /**
   * 사람이 **문을 열어** 기록을 시작했다 — 이 여정 퍼널의 두 번째 스텝이다.
   *
   * 재개(`openMealSheet`)와 나눠 둔 이유는 분모 때문이다. 앨범에서 취소하면 코드가 시트를
   * 다시 열어 주는데, 거기서도 쏘면 한 사람의 한 번의 시도가 진입 두 행이 되어
   * 1→2 가 이탈처럼 부풀고 2→3(방법 고르기)이 함께 꺼진다.
   *
   * `recorded` 는 그 끼니가 이미 기록돼 시트가 '결과 보기' 모드로 열리는 경우다 —
   * 기록 시도가 **일어날 수 없는** 열림이라 분모에서 빼야 2→3 하락이 사실이 된다.
   */
  const openMealSheetFrom = (
    entry: AnalyticsMealSheetEntry,
    mealType: MealType | null = null,
  ) => {
    // 시트가 고를 끼니와 같은 규칙으로 판정한다(MealSheet 의 initialMealType 분기).
    const initialMeal = mealType ?? inferMealTypeFromTime(new Date())
    const skipped = apiSkippedMeals[initialMeal] ?? false
    trackAnalyticsEvent("food_record_sheet_viewed", {
      slot: ANALYTICS_MEAL_SLOT[initialMeal],
      entry,
      recorded: (mergedRecordedMeals[initialMeal] ?? false) && !skipped,
    })
    openMealSheet(mealType)
  }
  const { updateExtraWater } = useExtraWater()
  const {
    updateWeight,
    updateEdema,
    isLoading: isBodySaving,
  } = useWeightEdemaRecord()
  const {
    updateBloodPressure,
    updateBloodGlucose,
    isLoading: isBloodSaving,
  } = useBloodMetricsRecord()

  const selectedDateStr = toDateStr(selectedDate)

  // 체중 시트의 7일 추세 — 시트가 열려 있는 동안만 부른다.
  const apiDiets = data?.result.diets ?? []
  const apiRecordedMeals = Object.fromEntries(
    apiDiets.map((d) => [d.mealType, true]),
  ) as RecordedMealMap
  const apiSkippedMeals = toSkippedMealMap(apiDiets)
  const apiMealTimes = Object.fromEntries(
    apiDiets.map((d) => {
      const date = new Date(d.createdAt + "Z")
      const h = String(date.getHours()).padStart(2, "0")
      const m = String(date.getMinutes()).padStart(2, "0")
      return [d.mealType, `${h}:${m}`]
    }),
  ) as Partial<Record<MealType, string>>

  const mergedRecordedMeals = { ...apiRecordedMeals, ...recordedMeals }

  /*
    식단 목록의 재료 — 그날 **기록된** 끼니(건너뛴 것 제외)를 시간순으로. 제목과 열량은
    하루 목록 API 가 실어 보낸다(서버 2026-09-04) — 다이어리마다 분석을 다시 받지 않는다.
    같은 끼니에 여러 건이 있을 수 있으므로(시간 기준 기록) 키는 끼니가 아니라 diaryId 다.
  */
  const recordedDiets = apiDiets
    .flatMap((diet) =>
      diet.diaryId === null || isSkippedDiet(diet)
        ? []
        : [{ ...diet, diaryId: diet.diaryId }],
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const timeOf = (createdAt: string) => {
    const date = new Date(createdAt + "Z")
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
  }
  const mealEntries: MealRecordEntry[] = recordedDiets.map((diet) => ({
    diaryId: diet.diaryId,
    mealType: diet.mealType,
    time: timeOf(diet.createdAt),
    /*
      사진은 **그 기록의 것**(`diet.imageUrl`)이다. 낙관 갱신 맵(`mealImages`)은 끼니로
      키를 잡는데, 한 끼니에 여러 건이 있으면 그 맵의 한 장이 그 끼니의 모든 줄을 덮는다 —
      점심을 두 번 적으면 두 줄이 같은 사진이 된다(2026-09-05 검수). 줄은 등록 직후의
      refetch 로 생기므로 그 맵 없이도 첫 렌더부터 제 사진이 온다.
    */
    imageUri: diet.imageUrl ?? null,
    title: diet.title?.trim() ? diet.title : null,
    calories: diet.calories ?? null,
  }))

  const hasSelectedDateRecord =
    apiDiets.length > 0 || Object.values(recordedMeals).some(Boolean)

  const analysis = data?.result.analysis ?? null
  // 하드코딩 표 대신 서버가 준 이 사용자의 목표를 쓴다.
  const {
    bars: nutrientBars,
    fluidMl,
    isFallback: isNutrientLimitFallback,
  } = useNutrientLimits()
  const withinLimits =
    !isNutrientLimitFallback &&
    analysis !== null &&
    nutrientBars.every((limit) => {
      const intakeByNutrient = {
        protein: analysis.protein ?? 0,
        sodium: analysis.sodium ?? 0,
        potassium: analysis.potassium ?? 0,
        phosphorus: analysis.phosphorus ?? 0,
      }
      return intakeByNutrient[limit.nutrient] <= limit.max
    })

  // 표기는 전부 사용자가 입력한 수분 기준이다(2026-08-21 결정 — 근거는 헬퍼 머리말).
  const consumedWater = displayedWaterIntake(data?.result.analysis)
  const bodyToday = data?.result.bodyRecords?.today ?? null
  const bodyPrevious = data?.result.bodyRecords?.previous ?? null
  const bloodPressure = data?.result.bloodPressure ?? null
  const bloodGlucose = data?.result.bloodGlucose ?? []

  const handleAddToRecord = async () => {
    await registerDiary(selectedDate, (mealType, imageUri) => {
      setRecordedMeals((prev) => ({ ...prev, [mealType]: true }))
      if (imageUri) {
        setMealImages((prev) => ({ ...prev, [mealType]: imageUri }))
      }
    })
    await queryClient.refetchQueries({ queryKey: ["dateAnalysis"] })
    await queryClient.refetchQueries({ queryKey: ["diaryExistence"] })
  }
  handleAddToRecordRef.current = handleAddToRecord

  const handlePendingAddToRecord = async () => {
    if (!pending) return
    if (pending.result.foodAnalysisResultId <= 0) {
      /*
        요청이 **나가지도 않은** 실패다. 토스트를 직접 띄우므로 `presentError` 를 안
        지나가고, 따라서 `app_error_presented` 에도 한 행도 안 남는다 — 이 이름이
        없으면 "담기를 눌렀는데 아무 일도 안 일어났다" 가 통계에서 사라진다.
      */
      trackAnalyticsEvent("food_record_save_failed", {
        source: "recovered",
        fail_kind: "not_ready",
      })
      showErrorToast(
        t("home.errors.notReadyTitle"),
        t("home.errors.notReadyBody"),
      )
      return
    }
    try {
      await foodCameraService.registerDiary(
        pending.result.foodAnalysisResultId,
        toDateStr(selectedDate),
        pending.mealType,
      )
      setRecordedMeals((prev) => ({ ...prev, [pending.mealType]: true }))
      if (pending.imageUri) {
        setMealImages((prev) => ({
          ...prev,
          [pending.mealType]: pending.imageUri!,
        }))
      }
      await queryClient.refetchQueries({ queryKey: ["dateAnalysis"] })
      await queryClient.refetchQueries({ queryKey: ["diaryExistence"] })
      trackAnalyticsEvent("food_record_saved", { source: "recovered" })
    } catch (error) {
      trackAnalyticsEvent("food_record_save_failed", {
        source: "recovered",
        fail_kind: toAnalyticsFailKind(error),
      })
      presentError(error, {
        scope: "meal-diary-register-recovered",
        retry: () => void handlePendingAddToRecord(),
      })
    }
  }

  const updatePendingFoodAnalysis = async (
    foodAnalysisResultId: number,
    body: FoodAnalysisUpdateRequest,
  ): Promise<FoodAnalysisUpdateResult | undefined> => {
    try {
      setIsPendingUpdating(true)
      const updated = await foodCameraService.updateFoodAnalysis(
        foodAnalysisResultId,
        body,
      )
      if (pending) setPending({ ...pending, result: updated })
      return updated
    } catch (error) {
      presentError(error, {
        scope: "meal-analysis-update-pending",
        retry: () => void updatePendingFoodAnalysis(foodAnalysisResultId, body),
      })
    } finally {
      setIsPendingUpdating(false)
    }
  }
  handlePendingAddToRecordRef.current = handlePendingAddToRecord
  updatePendingFoodAnalysisRef.current = updatePendingFoodAnalysis

  /**
   * 식사 기록의 진입은 시트 안의 세 버튼(사진·앨범·글)과 건너뛰기뿐이다.
   * 예전에는 시트를 열고 또 옵션 시트를 열어 두 번 물었다.
   */
  const startMealRecord = (mealType: MealType) => {
    recordingMealTypeRef.current = mealType
    onSelectMealType(mealType)
    trackAnalyticsEvent("food_record_started", {
      slot: ANALYTICS_MEAL_SLOT[mealType],
    })
  }

  /**
   * 사진 촬영하기 → **앱 안의 푸드 카메라 페이지**(등록 절차 시안 2026-09-04).
   *
   * 끼니는 사람이 고르지 않는다 — 기록 시각으로 정한다("이제 시간만 기록한다").
   * 시트의 닫힘 전이가 **끝난 뒤에** 페이지를 민다 — 같은 틱에 겹치면 iOS 가 전이를
   * 겹쳐 놓고 멈춘다(예전 앨범 얼음 결함과 같은 이유, `tests/mealPickerAfterModal.test.ts`).
   * 네이티브 피커 시절의 `afterSiblingModalsGone()` 은 안 쓴다 — 그건 **네이티브
   * present** 가 topmost VC 를 잘못 잡는 문제를 막는 것이고, 라우트 push 는 그 문제가
   * 없는데 레지스트리 보호 시간(최대 2초)만 고스란히 기다렸다(2026-09-04 실측 ~2초 지연).
   * 취소하면 시트로 되돌아온다.
   */
  const handleMealCamera = async () => {
    const mealType = inferMealTypeFromTime(new Date())
    setOpenSheet(null)
    startMealRecord(mealType)
    trackAnalyticsEvent("food_record_method_selected", {
      method: "camera",
      slot: ANALYTICS_MEAL_SLOT[mealType],
    })
    await afterModalTransitions()
    useFoodCameraStore.getState().set({
      onCapture: (uri) => analyzeImage(uri, mealType),
      /*
        카메라는 네이티브 전체화면 모달이다. 그것이 내려가는 **같은 틱**에 RN Modal 시트를
        올리면 iOS 에서 전환 뷰가 겹쳐 화면이 먹통이 된다(글 기록 경로가 같은 이유로
        `afterModalTransitions` 를 기다린다 — 2026-09-05 검수). 여기도 같은 문을 쓴다.
      */
      onCancel: () => {
        void afterModalTransitions().then(() => openMealSheet(mealType))
      },
    })
    router.push("/food-camera")
  }

  const handleMealText = async () => {
    const mealType = inferMealTypeFromTime(new Date())
    setOpenSheet(null)
    startMealRecord(mealType)
    trackAnalyticsEvent("food_record_method_selected", {
      method: "text",
      slot: ANALYTICS_MEAL_SLOT[mealType],
    })
    // 계측용으로 상태를 따로 둔다 — `recordingMealTypeRef` 는 렌더를 안 깨우므로
    // 그것을 렌더에서 읽으면 열림 이벤트가 직전 끼니를 실을 수 있다.
    setTextRecordMealType(mealType)
    await afterModalTransitions()
    setIsTextRecordOpen(true)
  }

  /**
   * 레시피 불러오기(시안의 세 번째 줄). 식사 시트를 내리고 저장한 레시피 시트를 연다 —
   * 두 시트가 같은 틱에 겹치지 않도록 전이가 끝난 뒤에 연다. 고르면 서버가 재료 영양을
   * 계산해 분석을 만들고(`from-recipe`), 그 결과를 신규 결과와 같은 리포트 페이지로 연다.
   */
  const [isRecipeImportOpen, setIsRecipeImportOpen] = useState(false)
  const [importingRecipeId, setImportingRecipeId] = useState<number | null>(
    null,
  )
  const recipeImportRequestRef = useRef(0)
  const importingRecipeRef = useRef<number | null>(null)
  useEffect(
    () => () => {
      recipeImportRequestRef.current += 1
    },
    [],
  )

  const cancelRecipeImport = () => {
    recipeImportRequestRef.current += 1
    importingRecipeRef.current = null
    setImportingRecipeId(null)
    setIsRecipeImportOpen(false)
  }
  const handleMealRecipe = async () => {
    const mealType = inferMealTypeFromTime(new Date())
    setOpenSheet(null)
    startMealRecord(mealType)
    trackAnalyticsEvent("food_record_method_selected", {
      method: "recipe",
      slot: ANALYTICS_MEAL_SLOT[mealType],
    })
    await afterModalTransitions()
    setIsRecipeImportOpen(true)
  }

  const handleRecipePicked = async (recipe: RecipeCard) => {
    if (importingRecipeRef.current !== null) return
    importingRecipeRef.current = recipe.id
    const request = ++recipeImportRequestRef.current
    setImportingRecipeId(recipe.id)
    const mealType =
      recordingMealTypeRef.current ?? inferMealTypeFromTime(new Date())
    try {
      const result = await foodCameraService.analyzeFromRecipe(recipe.id)
      if (request !== recipeImportRequestRef.current) return
      setIsRecipeImportOpen(false)
      setImportingRecipeId(null)
      importingRecipeRef.current = null
      await afterModalTransitions()
      if (request !== recipeImportRequestRef.current) return
      trackAnalyticsEvent("food_record_result_viewed", { source: "fresh" })
      openMealReportPage({
        source: "fresh",
        result,
        imageUri: result.imageUrl ?? undefined,
        mealType,
        recordDate: toDateStr(selectedDate),
        isUpdating,
        updateFoodAnalysis,
        onAddToRecord: async () => {
          await foodCameraService.registerDiary(
            result.foodAnalysisResultId,
            toDateStr(selectedDate),
            mealType,
          )
          await queryClient.refetchQueries({ queryKey: ["dateAnalysis"] })
          await queryClient.refetchQueries({ queryKey: ["diaryExistence"] })
          trackAnalyticsEvent("food_record_saved", { source: "fresh" })
        },
      })
    } catch (error) {
      if (request !== recipeImportRequestRef.current) return
      importingRecipeRef.current = null
      setImportingRecipeId(null)
      presentError(error, {
        scope: "meal-recipe-import",
        retry: () => void handleRecipePicked(recipe),
      })
    }
  }

  /**
   * 글 기록을 닫으면 식사 시트로 돌아온다 — 사진과 같은 규칙이다.
   *
   * 시트를 여는 것은 네이티브 모달(TextRecord)이 **다 내려간 뒤**여야 한다. 이 화면의
   * pageSheet 닫힘과 다른 표면의 등장이 같은 틱에 겹쳤던 것이 2026-08-03 터치 먹통의
   * 원인이었다(LoadingOverlay 머리말).
   */
  const closeTextRecord = async () => {
    setIsTextRecordOpen(false)
    const mealType = recordingMealTypeRef.current
    if (!mealType) return
    await afterModalTransitions()
    openMealSheet(mealType)
  }

  const handleViewMealResult = async (diaryId: number) => {
    const diet = data?.result.diets.find((d) => d.diaryId === diaryId)
    if (!diet || diet.diaryId === null || isSkippedDiet(diet)) return
    // 프리페치와 같은 키 — 캐시가 따뜻하면 네트워크 없이 즉시 연다.
    const result = await queryClient
      .fetchQuery({
        queryKey: diaryResultKey(diaryId, language),
        queryFn: () => foodCameraService.fetchDiaryResult(diaryId),
        staleTime: 60_000,
      })
      .catch((error) => {
        // 이 실패의 대부분인 `FOOD_CAMERA_013`(지워진 기록)은 그날 목록을 다시 받는 것이
        // 곧 해결이다 — 당겨서 새로고침과 같은 경로를 버튼 하나로 준다.
        presentError(error, {
          scope: "meal-diary-open",
          refresh: () => void refreshSelectedDate(),
        })
        return undefined
      })
    if (result) {
      trackAnalyticsEvent("food_record_result_viewed", { source: "saved" })
      openSavedMealReport(result, diaryId, diet.createdAt, diet.mealType)
    }
  }

  /**
   * 저장된 기록의 리포트 페이지. 통계 화면도 같은 페이지를 연다(StatisticsView).
   * 수정·끼니 변경·삭제의 결과는 콜백으로 되돌아와 이 화면의 사진·기록 상태를 맞춘다.
   */
  const openSavedMealReport = (
    result: DiaryAnalysisResult,
    diaryId: number,
    createdAt: string,
    mealType: MealType,
  ) => {
    openMealReportPage({
      source: "saved",
      result,
      imageUri: result.imageUrl,
      mealType,
      showAddButton: false,
      isUpdating,
      updateFoodAnalysis,
      diaryId,
      recordDate: toDateStr(selectedDate),
      recordedAt: createdAt,
      updateDiaryMealType,
      onDiaryDeleted: handleViewDiaryDeleted,
      onMealTypeChange: handleViewMealTypeChange,
    })
  }

  const handleViewMealTypeChange = ({
    fromMealType,
    toMealType,
    imageUri,
  }: {
    fromMealType: MealType
    toMealType: MealType
    imageUri: string | null
  }) => {
    setMealImages((prev) =>
      applyMealTypeChangeToMealImages({
        current: prev,
        fromMealType,
        toMealType,
        imageUri,
      }),
    )
    setRecordedMeals((prev) =>
      applyMealTypeChangeToRecordedMeals({
        current: prev,
        fromMealType,
        toMealType,
      }),
    )
  }

  const handleViewDiaryDeleted = () => {
    // 목록·타일은 `useMealPersistenceActions.refreshHome` 이 다시 받아 맞춘다.
  }

  // ── 기록 시트 제출 ──────────────────────────────────────────────
  /** 한 잔 즉시 기록. 시트가 열려 있는 동안 refetch 는 하지 않는다 —
      시트가 로컬 스택으로 총량을 그리므로 흔들면 이중 계산된다. */
  const handleWaterLog = async (delta: number): Promise<boolean> => {
    if (delta === 0) return false
    return updateExtraWater(selectedDateStr, delta, consumedWater > 0)
  }

  /**
   * CTA 를 누른 순간을 지표별로 못 박는다. 이것만 있고 성공·실패가 없는 구간이
   * 네트워크 유실·앱 종료다.
   *
   * 물은 여기 없다 — 그 시트만 잔을 로컬에 쌓았다가 CTA 가 합계로 한 번 보내므로
   * `item_count`(담은 잔 수)를 페이지 자신만 안다(`WaterRecordPage.commit`).
   */
  const trackHealthSaveStarted = (metric: AnalyticsHealthMetric) => {
    trackAnalyticsEvent("health_entry_save_started", { metric, item_count: 1 })
  }

  const handleBloodPressureSubmit = async (body: {
    systolic: number
    diastolic: number
    heartRate: number | null
    slot: "BREAKFAST" | "LUNCH" | "DINNER" | "BEDTIME"
    timing: "FASTING" | "BEFORE_MEAL" | "AFTER_MEAL_1H" | "AFTER_MEAL_2H" | null
  }) => {
    trackHealthSaveStarted("blood_pressure")
    return updateBloodPressure(
      { ...body, date: selectedDateStr },
      bloodPressure !== null,
    )
  }

  const handleBloodGlucoseSubmit = async (body: {
    value: number
    timing: (typeof bloodGlucose)[number]["timing"]
    elapsed: "30M" | "1H" | "2H" | null
    // 끼니. 시트가 `slotForSubmit` 으로 이미 정했다 — 공복이면 null 이다.
    slot: "BREAKFAST" | "LUNCH" | "DINNER" | null
  }) => {
    trackHealthSaveStarted("blood_glucose")
    /*
      `existing` 은 그 **칸**(끼니×시점)에 이미 기록이 있었는가다. 하루 안에 여러 번
      재는 지표라 "그날 혈당 기록이 있다" 로 보면 두 번째 측정이 전부 수정으로 세어진다.
    */
    return updateBloodGlucose(
      { ...body, date: selectedDateStr },
      findGlucoseCell(bloodGlucose, {
        slot: body.slot ?? "",
        timing: body.timing,
      }) !== null,
    )
  }

  const handleWeightSubmit = async (weightKg: number) => {
    trackHealthSaveStarted("weight")
    return updateWeight(weightKg, selectedDateStr, todayWeightKg !== null)
  }

  /*
    ── 기록 페이지 열기 ───────────────────────────────────────────
    물·혈압·체중은 2026-09-05 시안부터 바텀시트가 아니라 페이지다. 재료(그날 데이터 +
    저장 핸들러)를 스토어에 두고 라우트를 민다 — 라우트 파라미터에는 콜백을 못 싣는다.
    닫힐 때 그날 데이터를 다시 읽는 것이 `onClose` 다.
  */
  const refetchDay = () => {
    void queryClient.refetchQueries({
      queryKey: dateAnalysisKey(selectedDateStr, language),
    })
  }

  const openWaterPage = () => {
    openRecordPage({
      kind: "water",
      date: selectedDateStr,
      consumed: consumedWater,
      limit: fluidMl,
      isReferenceLimit: isNutrientLimitFallback,
      onLog: handleWaterLog,
      onClose: refetchDay,
    })
  }

  const openBloodPressurePage = () => {
    openRecordPage({
      kind: "bloodPressure",
      record: bloodPressure,
      previousRecord: previousBloodPressure,
      date: selectedDateStr,
      isSaving: isBloodSaving,
      onSubmit: handleBloodPressureSubmit,
      onClose: refetchDay,
    })
  }

  const openWeightPage = () => {
    openRecordPage({
      kind: "weight",
      today: bodyToday,
      previous: bodyPrevious,
      endDate: selectedDateStr,
      isToday: isViewingToday,
      isSaving: isBodySaving,
      onSubmit: handleWeightSubmit,
      onClose: refetchDay,
    })
  }

  const handleEdemaSubmit = async (entry: EdemaEntry) => {
    trackHealthSaveStarted("edema")
    return updateEdema(
      entry.edemaLevel,
      selectedDateStr,
      todayEdema !== null,
      entry.observations,
    )
  }

  // ── 건강기록 타일 데이터 ───────────────────────────────────────
  /*
    타일이 말하는 "최근"은 **하루의 차례에서 가장 뒤** 다(공복 → 아침 전/후 → … → 저녁 후).
    입력 순(`at(-1)`)으로 고르면, 저녁 식후를 적은 뒤 빠뜨린 공복을 채워 넣는 순간
    타일이 아침의 숫자로 되돌아간다 — 하루가 거꾸로 가는 것처럼 보인다.
  */
  const latestGlucose = orderGlucoseByDay(bloodGlucose).at(-1) ?? null
  const todayWeightKg = bodyToday?.weightKg ?? null
  // 서버에 남아 있는 구 표기(SOME)를 화면이 아는 단계로 맞춘다 — 그대로 두면
  // 번역 키가 그대로 렌더된다.
  const todayEdema = normalizeEdemaLevel(bodyToday?.edemaLevel)

  // "오늘" 판정 — 지난 날짜를 보고 있으면 섹션 제목이 그 날짜를 말한다.
  const isViewingToday = selectedDateStr === toDateStr(new Date())
  const sectionDate = isViewingToday
    ? null
    : formatDateWithWeekday(selectedDate, language)

  // 혈당 시트의 시점 추론 — "아침 식후 09:12 자동". 오늘 화면에서만 계산한다.
  const glucoseInference = isViewingToday
    ? inferGlucoseContext({ diets: apiDiets, now: new Date() })
    : null

  // Medication uses the same page flow as the other five health entries.
  const medication = data?.result.medication ?? null
  const medicationValue =
    medication && (medication.taken > 0 || medication.planned > 0)
      ? medication.planned > 0
        ? t("home.medication.progress", {
            taken: medication.taken,
            planned: medication.planned,
          })
        : t("home.medication.takenOnly", { taken: medication.taken })
      : null
  const openMedicationPage = () => {
    router.push({
      pathname: "/record/medication",
      params: { date: selectedDateStr },
    })
  }
  const todayTiles: TodayRecordTileData[] = [
    {
      key: "medication",
      icon: <TileIcon name="medication" />,
      label: t("home.tile.medication"),
      value: medicationValue,
      // 값 문구가 이미 "…회 복용" 이라 단위를 또 붙이면 "1회 복용 복용 완료" 가 된다.
      unit: undefined,
      onPress: openMedicationPage,
    },
    {
      key: "water",
      icon: <TileIcon name="water" />,
      label: t("home.tile.water"),
      // 마신 양. 0 은 "안 마셨다" 가 아니라 "안 적었다" 라 기록 없음으로 둔다.
      value: consumedWater > 0 ? String(consumedWater) : null,
      unit: "ml",
      onPress: openWaterPage,
    },
    {
      key: "bloodPressure",
      icon: <TileIcon name="bloodPressure" />,
      label: t("home.tile.bloodPressure"),
      value: bloodPressure
        ? `${bloodPressure.systolic} / ${bloodPressure.diastolic}`
        : null,
      onPress: openBloodPressurePage,
    },
    {
      key: "bloodGlucose",
      icon: <TileIcon name="bloodGlucose" />,
      label: t("home.tile.bloodGlucose"),
      value: latestGlucose ? String(latestGlucose.value) : null,
      unit: "mg/dl",
      onPress: () =>
        openRecordPage({
          kind: "bloodGlucose",
          date: selectedDateStr,
          records: bloodGlucose,
          inference: glucoseInference,
          onSubmit: handleBloodGlucoseSubmit,
          onClose: refetchDay,
        }),
    },
    {
      key: "weight",
      icon: <TileIcon name="weight" />,
      label: t("home.tile.weight"),
      value: todayWeightKg !== null ? String(todayWeightKg) : null,
      unit: "kg",
      onPress: openWeightPage,
    },
    {
      key: "edema",
      icon: <TileIcon name="edema" />,
      label: t("home.tile.edema"),
      value: todayEdema !== null ? t(`home.edema.level.${todayEdema}`) : null,
      onPress: () =>
        openRecordPage({
          kind: "edema",
          date: selectedDateStr,
          today: bodyToday,
          previous: bodyPrevious,
          onSubmit: handleEdemaSubmit,
          onClose: refetchDay,
        }),
    },
  ]

  /*
    ── 탭을 다시 눌렀을 때 이 화면이 되돌릴 수 있는 것 ────────────────────────
    홈의 리셋 재료는 두 곳에 나뉘어 있다: **달력 시트**는 라우트 파일이 열고 닫고
    (`app/(tabs)/home.tsx`), **스크롤**은 여기 있다. 등록소는 능력별로 합치므로
    두 곳이 각자 자기 것만 등록한다(`tabReset.ts` 머리말 마지막 절).

    **4번(복구)은 등록하지 않는다.** 예전에는 `refresh: refreshSelectedDate` 였다 —
    맨 위에서 한 번 더 누르면 그날 기록을 다시 받았다. 탭 탭은 이동 제스처지 조회
    제스처가 아니고(`tabReset.ts` 머리말 §4번), 다시 받는 길은 이 화면에 이미 둘 있다:
    아래 `RefreshControl`(당겨서 새로고침)과 날짜를 다시 고르는 것. 게다가 이 화면에는
    되살릴 **고장난 상태 자체가 없다** — 조회가 실패해도 화면은 서고 실패는 토스트로
    말한다(`presentError`). 복구할 것이 없으면 그 칸은 비워 두는 것이 맞다.

    스크롤은 **애니메이션**으로 올린다. `animated:false` 로 순간이동시키면 VoiceOver 의
    읽기 위치가 화면과 어긋난 채 남는다 — 여기서는 포커스를 옮기지 않고(프로그램적
    포커스 이동 없음) 화면만 움직여, 스크린리더가 자기 커서를 따라오게 둔다.
  */
  const scrollRef = useRef<React.ComponentRef<
    typeof KeyboardAwareScrollView
  > | null>(null)
  const scrollOffsetRef = useRef(0)
  useRegisterTabReset("home", {
    content: {
      isAtRoot: () => isAtScrollTop(scrollOffsetRef.current),
      reset: () => scrollRef.current?.scrollTo({ y: 0, animated: true }),
    },
  })

  return (
    <KeyboardAwareScrollView
      ref={scrollRef}
      onScroll={(event) => {
        scrollOffsetRef.current = event.nativeEvent.contentOffset.y
      }}
      scrollEventThrottle={16}
      /*
        `bounces={false}` 가 여기 있었다 — iOS 의 UIRefreshControl 은 맨 위에서 더
        당겨질 때만 발동하므로 아래 RefreshControl 이 한 번도 불리지 않았다.
        (커뮤니티·레시피에서 같은 조합을 걷어내며 lint 가 잡아냈다.)
        새 화면은 `src/shared/refresh` 의 `useRefreshable` 을 쓴다. **이 화면은 아직
        아니다** — 그 훅은 `type: "active"` 로만 다시 받는데 여기 `["diaryExistence"]`
        는 달력 점을 그리는 쿼리라 관찰자가 없는 순간에도 다시 받아야 한다(옮기면
        새로고침 뒤 달력이 어제 상태로 남는 조합이 생긴다). 그래서 컨트롤은 여기 남고,
        **제스처/프로그램 분리만 같은 규칙으로** 지킨다(위 `refreshSource` 머리말).
        `tests/pullToRefreshGuard.test.ts` 가 이 예외를 이름으로 못 박아 둔다.
      */
      // 시안(2026-09-04)의 바닥은 흰색 — 층은 타일 보더가 만든다(TodayRecord 머리말).
      style={{ backgroundColor: surface.canvas }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          /* **제스처일 때만** 켠다. 파생값이라 어긋날 수 없다(`refreshSource` 머리말). */
          refreshing={refreshSource === "gesture"}
          onRefresh={() => void refreshSelectedDate("gesture")}
          tintColor={tokens.color.sub6.val}
          colors={[tokens.color.sub6.val]}
        />
      }
      // 탭바가 이미 하단을 받친다 — 큰 패딩을 더하면 빈 스크롤 영역만 생긴다.
      contentContainerStyle={styles.scrollContent}
      bottomOffset={insets.bottom + 48}
      disableScrollOnKeyboardHide
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
    >
      <HomeHero
        hasRecord={hasSelectedDateRecord}
        streak={streak}
        withinLimits={withinLimits}
        onOpenStats={onOpenStats}
        onPressDate={onPressDate}
        onOpenNotifications={onOpenNotifications}
      />

      {/* 본문 — 흰 바닥(시안). 히어로가 스스로 아래 모서리를 접으므로 여기서 겹치지 않는다. */}
      <View
        style={[
          styles.bodyPanel,
          { backgroundColor: surface.canvas },
          /*
            우하단 AI 상담 필에 마지막 타일(붓기·체중 행)이 가리지 않게 비운다.

            ⚠️ 두 가지를 함께 지켜야 한다.
            1) 여백은 **이 패널 안쪽**에 둔다. `contentContainerStyle` 에 주면 이
               패널이 `flexGrow: 1` 로 남는 공간을 다 먹으면서 여백이 패널 바깥으로
               밀려 타일이 그대로 바닥에 붙는다.
            2) 크기는 `COVERAGE`(64) 가 아니라 **`insets + 탭바 + COVERAGE`** 다.
               탭바가 `position:"absolute"` 라 이 화면은 화면 바닥까지 내려오므로,
               필이 실제로 덮는 높이는 바닥에서 150pt 다(iPhone 17 Pro).
          */
          { paddingBottom: floatingAiButtonScrollInset(insets.bottom) },
        ]}
      >
        {/* 식이 기록이 이 앱의 핵심 행동이라 히어로 바로 아래가 CTA 다.
            끼니는 시트가 시간으로 추론한다. */}
        <RecordMealCta onPress={() => openMealSheetFrom("timeline_cta")} />

        {/* 그날 기록한 끼니 — 줄을 누르면 리포트. 없으면 섹션째 사라진다. */}
        <MealRecordList
          title={
            sectionDate
              ? t("home.mealList.titleOnDate", { date: sectionDate })
              : t("home.mealList.title")
          }
          entries={mealEntries}
          onPressEntry={(diaryId) => void handleViewMealResult(diaryId)}
        />

        <TodayRecord
          title={
            sectionDate
              ? t("home.todayRecord.titleOnDate", { date: sectionDate })
              : t("home.todayRecord.title")
          }
          tiles={todayTiles}
        />
      </View>

      {/* ── 기록 시트 6종 ── */}
      <MealSheet
        visible={openSheet === "meal"}
        onClose={() => setOpenSheet(null)}
        onCamera={() => void handleMealCamera()}
        onText={() => void handleMealText()}
        onRecipe={() => void handleMealRecipe()}
      />

      {/* 레시피 불러오기 — 저장한 레시피에서 고르면 서버가 재료 합으로 분석을 만든다. */}
      <RecipeImportSheet
        visible={isRecipeImportOpen}
        onText={() => {
          cancelRecipeImport()
          void handleMealText()
        }}
        onClose={() => {
          cancelRecipeImport()
          // 취소하면 왔던 시트로 — 사진·글과 같은 규칙.
          void afterModalTransitions().then(() => openMealSheet(null))
        }}
        onPick={(recipe) => void handleRecipePicked(recipe)}
        importingId={importingRecipeId}
      />

      {/* 물·혈압·체중은 시트가 아니라 페이지다(2026-09-05 시안) — `openRecordPage`. */}

      {/* ── 식사 기록 파이프라인(카메라·텍스트·AI 분석) ── */}
      <TextRecord
        open={isTextRecordOpen}
        slot={ANALYTICS_MEAL_SLOT[textRecordMealType]}
        onClose={() => void closeTextRecord()}
        onSubmit={async (text) => {
          const mealType = recordingMealTypeRef.current
          if (!mealType) return
          setIsTextRecordOpen(false)
          await afterModalTransitions()
          await analyzeText(text, mealType)
        }}
      />

      {/*
        리포트는 **페이지**(`/meal-report`)다 — 세 여정(fresh · saved · recovered)이 같은
        페이지를 `openMealReportPage` 로 열고, `source` 를 거기서 못 박는다.
      */}
      <LoadingOverlay
        visible={isAnalyzing}
        message={t("home.analyzingMeal")}
        status={analysisStatus}
        onDismiss={dismissAnalysis}
      />

      {appConfig.foodAnalysisConfirmationEnabled && (
        <>
          <FoodAnalysisConfirmation
            job={confirmationJob}
            onSubmit={confirmAnalysis}
            onClose={deferConfirmation}
          />

          <FoodAnalysisConfirmation
            job={pendingConfirmation?.job ?? null}
            onSubmit={handleRecoveredConfirmation}
            onClose={() => setPendingConfirmation(null)}
          />
        </>
      )}
    </KeyboardAwareScrollView>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    // 패널이 화면 바닥까지 회색을 채우도록 세로로 자란다.
    flexGrow: 1,
  },
  bodyPanel: {
    flexGrow: 1,
  },
})
