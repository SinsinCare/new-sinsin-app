import { StyleSheet, Platform, RefreshControl, View } from "react-native"
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
import { CharacterSection } from "./CharacterSection"
import { RecordHomeBar } from "./RecordHomeBar"
import { TodayRecord, type TodayRecordTileData } from "./TodayRecord"
import { MealSheet, type MealSlotStatus } from "./sheets/MealSheet"
import {
  MealPhotoConfirmSheet,
  type MealPhotoDraft,
} from "./sheets/MealPhotoConfirmSheet"
import { MealTimeline } from "./MealTimeline"
import { WaterSheet } from "./sheets/WaterSheet"
import { BloodPressureSheet } from "./sheets/BloodPressureSheet"
import { BloodGlucoseSheet } from "./sheets/BloodGlucoseSheet"
import { WeightSheet } from "./sheets/WeightSheet"
import { EdemaSheet } from "./sheets/EdemaSheet"
import { TileIcon } from "./TileIcon"
import { getHydrationGuidance } from "../../utils/hydrationGuidance"
import { useSurface } from "@/src/hooks/useSurface"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { MealType } from "../../types"
import { normalizeEdemaLevel, type EdemaLevel } from "../../data/EdemaConstants"
import { useFoodAnalysis } from "../../hooks/useFoodAnalysis"
import { useExtraWater } from "../../hooks/useExtraWater"
import { useWeightEdemaRecord } from "../../hooks/useWeightEdemaRecord"
import { useBloodMetricsRecord } from "../../hooks/useBloodMetricsRecord"
import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  pickImageAssetFromGallery,
  takePhoto,
} from "@/src/features/recipe/services/imagePickerService"
import { FoodAnalysisResult } from "../FoodAnalysisResult"
import { LoadingOverlay } from "../LoadingOverlay"
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
import { toDateStr } from "../../utils/dateUtils"
import { getGlucoseNowSuggestion } from "../../utils/recordNowSuggestion"
import { inferGlucoseContext } from "../../utils/glucoseInference"
import { useWeightWeek } from "../../hooks/useWeightWeek"
import { presentError } from "@/src/lib/errorMessage"
import { afterModalTransitions } from "@/src/shared/components/appModalGate"
import { ApiError } from "@/src/services/core/apiError"
import { pendingAnalysisRequests } from "../../storage/pendingAnalysisRequests"
import {
  applyMealTypeChangeToMealImages,
  applyMealTypeChangeToRecordedMeals,
  isSkippedDiet,
  toSkippedMealMap,
  type MealImageMap,
  type RecordedMealMap,
} from "../../utils/mealRecordUtils"
import { appConfig } from "@/src/config/appConfig"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { useFoodAnalysisRecoveryPolling } from "../../hooks/useFoodAnalysisRecoveryPolling"
import { foodAnalysisRecovery } from "../../services/foodAnalysisRecovery"

import { showErrorToast } from "@/src/lib/toast"

const ANALYTICS_MEAL_SLOT: Record<
  MealType,
  "breakfast" | "lunch" | "dinner" | "snack"
> = {
  BREAKFAST: "breakfast",
  LUNCH: "lunch",
  DINNER: "dinner",
  SNACKS: "snack",
}

type RecordSheetKind =
  | "meal"
  | "water"
  | "bloodPressure"
  | "bloodGlucose"
  | "weight"
  | "edema"

interface RecordViewProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onSelectMealType: (mealType: MealType) => void
  onPressDate: () => void
  onOpenStats: () => void
}

export function RecordView({
  selectedDate,
  onSelectDate,
  onSelectMealType,
  onPressDate,
  onOpenStats,
}: RecordViewProps) {
  const { t, i18n } = useTranslation("common")
  const language = (i18n.resolvedLanguage ?? i18n.language).startsWith("en")
    ? "en"
    : "ko"
  const insets = useSafeAreaInsets()
  const surface = useSurface()
  const isDark = useAppColorScheme() === "dark"
  const queryClient = useQueryClient()
  useFoodAnalysisRecoveryPolling()
  const [viewDiaryResult, setViewDiaryResult] =
    useState<DiaryAnalysisResult | null>(null)
  const [viewDiaryId, setViewDiaryId] = useState<number | null>(null)
  // 삭제 확인 미리보기("오늘 08:24")가 쓰는 기록 시각 — 다이어리 결과 API 에는 없다.
  const [viewDiaryCreatedAt, setViewDiaryCreatedAt] = useState<string | null>(
    null,
  )
  const [isViewResultOpen, setIsViewResultOpen] = useState(false)
  const [viewResultMealType, setViewResultMealType] = useState<
    MealType | undefined
  >()

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

  const pending = usePendingAnalysisStore((s) => s.pending)
  const setPending = usePendingAnalysisStore((s) => s.setPending)
  const pendingConfirmation = usePendingAnalysisStore(
    (s) => s.pendingConfirmation,
  )
  const setPendingConfirmation = usePendingAnalysisStore(
    (s) => s.setPendingConfirmation,
  )
  const [isPendingOpen, setIsPendingOpen] = useState(false)
  const [isPendingUpdating, setIsPendingUpdating] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshPromiseRef = useRef<Promise<void> | null>(null)
  const pendingResultViewedRef = useRef<number | null>(null)

  useEffect(() => {
    if (!pending) return
    setIsPendingOpen(true)
    if (
      pendingResultViewedRef.current !== pending.result.foodAnalysisResultId
    ) {
      pendingResultViewedRef.current = pending.result.foodAnalysisResultId
      trackAnalyticsEvent("food_record_result_viewed", {
        source: "recovered",
      })
    }
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

  const refreshSelectedDate = useCallback((): Promise<void> => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current

    setIsRefreshing(true)
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
        setIsRefreshing(false)
      }
    }

    const refreshPromise = runRefresh()
    refreshPromiseRef.current = refreshPromise
    return refreshPromise
  }, [language, queryClient, selectedDate])

  const [mealImages, setMealImages] = useState<MealImageMap>({})
  const [recordedMeals, setRecordedMeals] = useState<RecordedMealMap>({})
  const [isTextRecordOpen, setIsTextRecordOpen] = useState(false)
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
  const openMealSheet = (mealType: MealType | null = null) => {
    setMealSheetPreselect(mealType)
    setOpenSheet("meal")
  }
  // 앨범에서 고른 사진은 분석 전에 이 시트를 한 번 거친다(MealPhotoConfirmSheet 머리말).
  const [mealPhotoDraft, setMealPhotoDraft] = useState<MealPhotoDraft | null>(
    null,
  )
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
  const weightWeek = useWeightWeek(selectedDateStr, openSheet === "weight")

  const apiDiets = data?.result.diets ?? []
  const apiMealImages = Object.fromEntries(
    apiDiets.map((d) => [d.mealType, d.imageUrl]),
  ) as MealImageMap
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

  const mergedMealImages = { ...apiMealImages, ...mealImages }
  const mergedRecordedMeals = { ...apiRecordedMeals, ...recordedMeals }

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

  // 오늘 기록이 있고 영양소 제한조건까지 지켰을 때 풍성한(high) 배경
  const backgroundVariant: "low" | "high" =
    hasSelectedDateRecord && withinLimits ? "high" : "low"

  const serverExtraWater = data?.result.analysis?.extraWater ?? 0
  // 국·과일 수분(analysis.water)까지 합쳐야 "제한까지 남은 양"이 맞다.
  const consumedWater = (data?.result.analysis?.water ?? 0) + serverExtraWater
  const hydration = getHydrationGuidance({
    consumed: consumedWater,
    limit: fluidMl,
    isReferenceLimit: isNutrientLimitFallback,
    language,
  })
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

  const handlePendingAddToRecord = async () => {
    if (!pending) return
    if (pending.result.foodAnalysisResultId <= 0) {
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
      trackAnalyticsEvent("food_record_save_failed", { source: "recovered" })
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

  const handleMealCamera = async (mealType: MealType) => {
    setOpenSheet(null)
    startMealRecord(mealType)
    trackAnalyticsEvent("food_record_method_selected", {
      method: "camera",
      slot: ANALYTICS_MEAL_SLOT[mealType],
    })
    const uri = await takePhoto({
      onPermissionDenied: () =>
        trackAnalyticsEvent("food_photo_permission_denied", {
          source: "camera",
        }),
    })
    // 앨범과 같은 규칙 — 취소하면 왔던 시트로 돌아온다(openMealGallery 머리말).
    // 확인 단계를 따로 두지 않는 것은 iOS 카메라가 '다시 찍기 / 사진 사용'을 이미
    // 묻기 때문이다. 여기서 또 물으면 두 번 확인이 된다.
    if (!uri) {
      openMealSheet(mealType)
      return
    }
    analyzeImage(uri, mealType)
  }

  /**
   * 앨범 열기. 고른 사진은 **분석으로 직행하지 않고** 확인 시트로 간다.
   *
   * 취소도 막다른 길로 두지 않는다. 예전에는 앨범을 여는 순간 식사 시트가 닫혀 있어서,
   * 앨범에서 취소한 사람은 아무것도 안 열린 홈에 남았다 — 기록하러 들어왔다가 손만
   * 씻고 나온 꼴이다. 취소하면 왔던 시트로 되돌려 놓는다.
   *
   * 사진을 이미 하나 들고 있을 때(= 확인 시트의 '다른 사진 고르기')는 시트를 닫지
   * 않는다. 앨범은 네이티브 화면이라 이 시트 위에 그대로 뜨고, 취소하면 고르던 사진이
   * 그 자리에 남는다.
   */
  const openMealGallery = async (mealType: MealType, isReplacing: boolean) => {
    const picked = await pickImageAssetFromGallery({
      onPermissionDenied: () =>
        trackAnalyticsEvent("food_photo_permission_denied", {
          source: "gallery",
        }),
    })
    if (!picked) {
      if (!isReplacing) openMealSheet(mealType)
      return
    }
    setMealPhotoDraft({ ...picked, mealType })
    trackAnalyticsEvent(
      isReplacing ? "food_photo_confirm_replaced" : "food_photo_confirm_viewed",
      { source: "gallery" },
    )
  }

  const handleMealGallery = async (mealType: MealType) => {
    setOpenSheet(null)
    startMealRecord(mealType)
    trackAnalyticsEvent("food_record_method_selected", {
      method: "gallery",
      slot: ANALYTICS_MEAL_SLOT[mealType],
    })
    await openMealGallery(mealType, false)
  }

  const handleMealPhotoConfirm = () => {
    const draft = mealPhotoDraft
    if (!draft) return
    setMealPhotoDraft(null)
    trackAnalyticsEvent("food_photo_confirm_accepted", { source: "gallery" })
    analyzeImage(draft.uri, draft.mealType)
  }

  const handleMealPhotoCancel = () => {
    const draft = mealPhotoDraft
    if (!draft) return
    setMealPhotoDraft(null)
    trackAnalyticsEvent("food_photo_confirm_cancelled", { source: "gallery" })
    openMealSheet(draft.mealType)
  }

  const handleMealText = (mealType: MealType) => {
    setOpenSheet(null)
    startMealRecord(mealType)
    trackAnalyticsEvent("food_record_method_selected", {
      method: "text",
      slot: ANALYTICS_MEAL_SLOT[mealType],
    })
    setIsTextRecordOpen(true)
  }

  /**
   * 글 기록을 닫으면 식사 시트로 돌아온다 — 사진·앨범과 같은 규칙이다.
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

  const handleSkipMeal = async (mealType: MealType) => {
    setOpenSheet(null)
    trackAnalyticsEvent("food_record_method_selected", {
      method: "skip",
      slot: ANALYTICS_MEAL_SLOT[mealType],
    })
    try {
      await foodCameraService.skipMeal(toDateStr(selectedDate), mealType)
      setRecordedMeals((prev) => ({ ...prev, [mealType]: true }))
      await queryClient.refetchQueries({ queryKey: ["dateAnalysis"] })
      await queryClient.refetchQueries({ queryKey: ["diaryExistence"] })
      trackAnalyticsEvent("food_record_skipped", {
        slot: ANALYTICS_MEAL_SLOT[mealType],
      })
    } catch (error) {
      presentError(error, {
        scope: "meal-skip",
        retry: () => void handleSkipMeal(mealType),
      })
    }
  }

  const handleViewMealResult = async (mealType: MealType) => {
    const diet = data?.result.diets.find((d) => d.mealType === mealType)
    if (!diet) return
    if (diet.diaryId === null || isSkippedDiet(diet)) {
      void handleMealCamera(mealType)
      return
    }
    // 프리페치와 같은 키 — 캐시가 따뜻하면 네트워크 없이 즉시 연다.
    const diaryId = diet.diaryId
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
      setViewDiaryResult(result)
      setViewDiaryId(diet.diaryId)
      setViewDiaryCreatedAt(diet.createdAt)
      setViewResultMealType(mealType)
      setIsViewResultOpen(true)
    }
  }

  const handleViewResultChange = (updated: FoodCameraAnalyzeResult) => {
    setViewDiaryResult((prev) =>
      prev
        ? {
            ...prev,
            ...updated,
            imageUrl: updated.imageUrl ?? prev.imageUrl,
          }
        : updated.imageUrl
          ? { ...updated, imageUrl: updated.imageUrl }
          : null,
    )
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
    setViewResultMealType(toMealType)
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
    setIsViewResultOpen(false)
    setViewDiaryResult(null)
    setViewDiaryId(null)
    setViewResultMealType(undefined)
  }

  // ── 기록 시트 제출 ──────────────────────────────────────────────
  /** 한 잔 즉시 기록. 시트가 열려 있는 동안 refetch 는 하지 않는다 —
      시트가 로컬 스택으로 총량을 그리므로 흔들면 이중 계산된다. */
  const handleWaterLog = async (delta: number): Promise<boolean> => {
    if (delta === 0) return false
    return updateExtraWater(selectedDateStr, delta)
  }

  const closeWaterSheet = () => {
    setOpenSheet(null)
    void queryClient.refetchQueries({
      queryKey: dateAnalysisKey(selectedDateStr, language),
    })
  }

  const handleBloodPressureSubmit = async (body: {
    systolic: number
    diastolic: number
    heartRate: number | null
  }) => {
    await updateBloodPressure({ ...body, date: selectedDateStr })
    setOpenSheet(null)
  }

  const handleBloodGlucoseSubmit = async (body: {
    value: number
    timing: (typeof bloodGlucose)[number]["timing"]
    elapsed: "30M" | "1H" | "2H" | null
  }) => {
    await updateBloodGlucose({ ...body, date: selectedDateStr })
    setOpenSheet(null)
  }

  const handleWeightSubmit = async (weightKg: number) => {
    await updateWeight(weightKg, selectedDateStr)
    setOpenSheet(null)
  }

  const handleEdemaSubmit = async (edemaLevel: EdemaLevel) => {
    await updateEdema(edemaLevel, selectedDateStr)
    setOpenSheet(null)
  }

  // ── 오늘 기록 타일 데이터 ───────────────────────────────────────
  const mealTypes: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"]
  const recordedMealCount = mealTypes.filter(
    (type) => mergedRecordedMeals[type] ?? false,
  ).length
  const mainMealLabels: Partial<Record<MealType, string>> = {
    BREAKFAST: t("meal.BREAKFAST"),
    LUNCH: t("meal.LUNCH"),
    DINNER: t("meal.DINNER"),
  }
  const nextMainMeal = (["BREAKFAST", "LUNCH", "DINNER"] as MealType[]).find(
    (type) => !(mergedRecordedMeals[type] ?? false),
  )
  const mealCaption =
    recordedMealCount === 0
      ? t("home.meal.first")
      : nextMainMeal
        ? t("home.meal.remaining", { meal: mainMealLabels[nextMainMeal] })
        : t("home.meal.complete")

  const latestGlucose = bloodGlucose.at(-1) ?? null
  const todayWeightKg = bodyToday?.weightKg ?? null
  // 서버에 남아 있는 구 표기(SOME)를 화면이 아는 단계로 맞춘다 — 그대로 두면
  // 번역 키가 그대로 렌더된다.
  const todayEdema = normalizeEdemaLevel(bodyToday?.edemaLevel)
  const previousWeightKg = bodyPrevious?.weightKg ?? null

  const weightCaption = (() => {
    if (todayWeightKg === null) return t("home.weight.morning")
    if (previousWeightKg === null) return t("home.weight.noYesterday")
    const diff = todayWeightKg - previousWeightKg
    return Math.abs(diff) < 0.05
      ? t("home.weight.same")
      : t("home.weight.change", {
          change: `${diff > 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)}`,
        })
  })()

  const bpTime = (() => {
    const raw = bloodPressure?.recordDate
    if (!raw || !raw.includes("T")) return null
    const parsed = new Date(raw.endsWith("Z") ? raw : raw + "Z")
    if (isNaN(parsed.getTime())) return null
    const h = String(parsed.getHours()).padStart(2, "0")
    const m = String(parsed.getMinutes()).padStart(2, "0")
    return `${h}:${m}`
  })()

  // "지금" 판정은 오늘 화면에서만 — 지난 날짜를 보며 조르지 않는다.
  const isViewingToday = selectedDateStr === toDateStr(new Date())
  const glucoseNow = isViewingToday
    ? getGlucoseNowSuggestion({
        diets: apiDiets,
        bloodGlucose,
        now: new Date(),
        language,
      })
    : { highlight: false, caption: null }

  // 혈당 시트의 시점 추론 — "아침 식후 09:12 자동". 오늘 화면에서만 계산한다.
  const glucoseInference = isViewingToday
    ? inferGlucoseContext({ diets: apiDiets, now: new Date() })
    : null

  const todayTiles: TodayRecordTileData[] = [
    {
      key: "meal",
      icon: <TileIcon name="meal" />,
      label: t("home.tile.meals"),
      /*
        분모를 두지 않는다 — QA(2026-08-02): "0/4끼처럼 끼니 수를 결정하지 말고
        몇 끼 먹었는지만. 4끼가 정석인 것도 아니고." 하루 몇 끼가 맞는지는 앱이
        정할 일이 아니다. 0끼일 때는 다른 타일들처럼 값 대신 캡션이 말한다.
      */
      value: recordedMealCount > 0 ? String(recordedMealCount) : null,
      unit: t("home.meal.unit"),
      caption: mealCaption,
      onPress: () => openMealSheet(),
    },
    {
      key: "water",
      icon: <TileIcon name="water" />,
      label: t("home.tile.water"),
      // 마신 양을 보여준다. 남은 양을 늘 키워 두면 넘치는 것만 막고 모자라는 것은
      // 못 막는다 — 상한은 가까워졌을 때만 캡션이 말한다.
      value: `${consumedWater}`,
      unit: "ml",
      caption: hydration.message,
      onPress: () => setOpenSheet("water"),
    },
    {
      key: "bloodPressure",
      icon: <TileIcon name="bloodPressure" />,
      label: t("home.tile.bloodPressure"),
      value: bloodPressure
        ? `${bloodPressure.systolic}/${bloodPressure.diastolic}`
        : null,
      caption: bloodPressure
        ? bpTime
          ? t("home.recordedAt", { time: bpTime })
          : t("home.recordedToday")
        : t("home.bloodPressure.prompt"),
      onPress: () => setOpenSheet("bloodPressure"),
    },
    {
      key: "bloodGlucose",
      icon: <TileIcon name="bloodGlucose" />,
      label: t("home.tile.bloodGlucose"),
      value: latestGlucose ? String(latestGlucose.value) : null,
      unit: "mg/dL",
      caption:
        glucoseNow.caption ??
        (latestGlucose
          ? t("home.bloodGlucose.latest", {
              timing: t(`home.bloodGlucose.timing.${latestGlucose.timing}`),
              extra:
                bloodGlucose.length > 1
                  ? t("home.bloodGlucose.extra", {
                      count: bloodGlucose.length - 1,
                    })
                  : "",
            })
          : t("home.bloodGlucose.timings")),
      highlight: glucoseNow.highlight,
      onPress: () => setOpenSheet("bloodGlucose"),
    },
    {
      key: "weight",
      icon: <TileIcon name="weight" />,
      label: t("home.tile.weight"),
      value: todayWeightKg !== null ? String(todayWeightKg) : null,
      unit: "kg",
      caption: weightCaption,
      onPress: () => setOpenSheet("weight"),
    },
    {
      key: "edema",
      icon: <TileIcon name="edema" />,
      label: t("home.tile.edema"),
      value: todayEdema !== null ? t(`home.edema.level.${todayEdema}`) : null,
      caption:
        todayEdema !== null ? t("home.edema.today") : t("home.edema.prompt"),
      onPress: () => setOpenSheet("edema"),
    },
  ]

  const mealSlots = Object.fromEntries(
    mealTypes.map((type) => [
      type,
      {
        recorded: mergedRecordedMeals[type] ?? false,
        skipped: apiSkippedMeals[type] ?? false,
        time: apiMealTimes[type],
        imageUri: mergedMealImages[type],
      } satisfies MealSlotStatus,
    ]),
  ) as Partial<Record<MealType, MealSlotStatus>>

  return (
    <KeyboardAwareScrollView
      bounces={false}
      overScrollMode="never"
      // 목업의 층: 회색 바닥 위 흰 카드(라이트) / 짙은 바닥 위 옅은 카드(다크).
      style={{ backgroundColor: isDark ? surface.canvas : surface.surface }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void refreshSelectedDate()}
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
      <CharacterSection
        selectedDate={selectedDate}
        hasRecord={hasSelectedDateRecord}
        streak={streak}
        withinLimits={withinLimits}
        backgroundVariant={backgroundVariant}
      />

      {/* 본문 패널 — 히어로 위로 라운드 탑(r24)으로 겹쳐 올라온다.
          모서리 컷 사이로 히어로가 비쳐 시트가 배경 위에 얹힌 것처럼 읽힌다. */}
      <View
        style={[
          styles.bodyPanel,
          { backgroundColor: isDark ? surface.canvas : surface.surface },
        ]}
      >
        <RecordHomeBar
          selectedDate={selectedDate}
          onPressDate={onPressDate}
          onOpenStats={onOpenStats}
        />

        {/* 식이 기록이 이 앱의 핵심 행동이라 오늘 기록 위에 둔다.
            기록된 카드는 리포트로, 빈 카드는 그 끼니가 선택된 시트로 간다. */}
        <MealTimeline
          slots={mealSlots}
          onPressRecorded={(mealType) => void handleViewMealResult(mealType)}
          onPressEmpty={(mealType) => openMealSheet(mealType)}
          onPressRecord={() => openMealSheet()}
        />

        <TodayRecord tiles={todayTiles} />
      </View>

      {/* ── 기록 시트 6종 ── */}
      <MealSheet
        visible={openSheet === "meal"}
        onClose={() => setOpenSheet(null)}
        initialMealType={mealSheetPreselect}
        slots={mealSlots}
        onCamera={(mealType) => void handleMealCamera(mealType)}
        onGallery={(mealType) => void handleMealGallery(mealType)}
        onText={handleMealText}
        onSkip={(mealType) => void handleSkipMeal(mealType)}
        onViewResult={(mealType) => {
          setOpenSheet(null)
          void handleViewMealResult(mealType)
        }}
      />

      {/* 앨범에서 고른 사진의 마지막 관문 — 분석은 여기를 지나야 시작된다. */}
      <MealPhotoConfirmSheet
        draft={mealPhotoDraft}
        onClose={handleMealPhotoCancel}
        onConfirm={handleMealPhotoConfirm}
        onPickAgain={() => {
          if (mealPhotoDraft)
            void openMealGallery(mealPhotoDraft.mealType, true)
        }}
      />

      <WaterSheet
        visible={openSheet === "water"}
        onClose={closeWaterSheet}
        consumed={consumedWater}
        limit={fluidMl}
        isReferenceLimit={isNutrientLimitFallback}
        onLog={handleWaterLog}
      />

      <BloodPressureSheet
        visible={openSheet === "bloodPressure"}
        onClose={() => setOpenSheet(null)}
        record={bloodPressure}
        previousRecord={previousBloodPressure}
        isSaving={isBloodSaving}
        onSubmit={(body) => void handleBloodPressureSubmit(body)}
      />

      <BloodGlucoseSheet
        visible={openSheet === "bloodGlucose"}
        onClose={() => setOpenSheet(null)}
        records={bloodGlucose}
        isSaving={isBloodSaving}
        inference={glucoseInference}
        onSubmit={(body) => void handleBloodGlucoseSubmit(body)}
      />

      <WeightSheet
        visible={openSheet === "weight"}
        onClose={() => setOpenSheet(null)}
        today={bodyToday}
        previous={bodyPrevious}
        week={weightWeek.data}
        endDate={selectedDateStr}
        isToday={isViewingToday}
        isSaving={isBodySaving}
        onSubmit={(weightKg) => void handleWeightSubmit(weightKg)}
      />

      <EdemaSheet
        visible={openSheet === "edema"}
        onClose={() => setOpenSheet(null)}
        today={bodyToday}
        isSaving={isBodySaving}
        onSubmit={(edemaLevel) => void handleEdemaSubmit(edemaLevel)}
      />

      {/* ── 식사 기록 파이프라인(카메라·텍스트·AI 분석) ── */}
      <TextRecord
        open={isTextRecordOpen}
        onClose={() => void closeTextRecord()}
        onSubmit={(text) => {
          const mealType = recordingMealTypeRef.current
          if (!mealType) return
          setIsTextRecordOpen(false)
          analyzeText(text, mealType)
        }}
      />

      <FoodAnalysisResult
        result={analysisResult}
        open={isResultOpen}
        onClose={closeResult}
        imageUri={analyzedImageUri ?? undefined}
        mealType={analyzedMealType ?? undefined}
        recordDate={toDateStr(selectedDate)}
        onAddToRecord={handleAddToRecord}
        isUpdating={isUpdating}
        updateFoodAnalysis={updateFoodAnalysis}
      />

      <FoodAnalysisResult
        result={viewDiaryResult}
        open={isViewResultOpen}
        onClose={() => setIsViewResultOpen(false)}
        imageUri={viewDiaryResult?.imageUrl}
        mealType={viewResultMealType}
        showAddButton={false}
        isUpdating={isUpdating}
        updateFoodAnalysis={updateFoodAnalysis}
        diaryId={viewDiaryId ?? undefined}
        recordDate={toDateStr(selectedDate)}
        recordedAt={viewDiaryCreatedAt ?? undefined}
        updateDiaryMealType={updateDiaryMealType}
        onDiaryDeleted={handleViewDiaryDeleted}
        onResultChange={handleViewResultChange}
        onMealTypeChange={handleViewMealTypeChange}
      />

      <FoodAnalysisResult
        result={pending?.result ?? null}
        open={isPendingOpen}
        onClose={() => {
          setIsPendingOpen(false)
          setPending(null)
        }}
        imageUri={pending?.imageUri ?? undefined}
        mealType={pending?.mealType}
        recordDate={toDateStr(selectedDate)}
        onAddToRecord={handlePendingAddToRecord}
        isUpdating={isPendingUpdating}
        updateFoodAnalysis={updatePendingFoodAnalysis}
      />

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
    // 우하단 AI 상담 필(16+48)에 마지막 타일이 가리지 않게 그 높이만큼 비운다.
    paddingBottom: 80,
  },
  bodyPanel: {
    flexGrow: 1,
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    // 라운드 탑 바로 아래 프로필 행이 붙지 않게 숨통을 준다.
    paddingTop: 8,
  },
})
