import { StyleSheet, Alert, Platform, RefreshControl } from "react-native"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type {
  DiaryAnalysisResult,
  FoodAnalysisUpdateRequest,
  FoodAnalysisUpdateResult,
  FoodCameraAnalyzeResult,
  FoodAnalysisConfirmationRequest,
} from "@/src/types"
import { RecordOptionsSheet } from "./RecordOptionsSheet"
import { View } from "tamagui"
import { CharacterSection } from "./CharacterSection"
import { MealButtons } from "./MealButtons"
import { MealType } from "../../types"
import { MEAL_OPTIONS } from "../../data/mealConstants"
import { HydrationTracker } from "./HydrationTracker"
import { WeightEdemaTracker } from "./WeightEdemaTracker"
import { BloodMetricsTracker } from "./BloodMetricsTracker"
import { useHomeRecord } from "../../hooks/useHomeRecord"
import { useFoodAnalysis } from "../../hooks/useFoodAnalysis"
import { useState, useEffect, useRef, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  pickImageFromGallery,
  takePhoto,
} from "@/src/features/recipe/services/imagePickerService"
import { FoodAnalysisResult } from "../FoodAnalysisResult"
import { LoadingOverlay } from "../LoadingOverlay"
import { FoodAnalysisConfirmation } from "../FoodAnalysisConfirmation"
import { TextRecord } from "./TextRecord"
import { tokens } from "@/src/theme/tokens"
import { useDateAnalysis } from "../../hooks/useDateAnalysis"
import { useStreak } from "../../hooks/useStreak"
import { CKD_NUTRIENT_LIMITS } from "../../data/nutrientConstants"
import { usePendingAnalysisStore } from "@/src/stores/pendingAnalysisStore"
import { foodCameraService } from "@/src/services/data"
import { toDateStr } from "../../utils/dateUtils"
import { getErrorMessage } from "@/src/lib/errorUtils"
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

const ANALYTICS_MEAL_SLOT: Record<
  MealType,
  "breakfast" | "lunch" | "dinner" | "snack"
> = {
  BREAKFAST: "breakfast",
  LUNCH: "lunch",
  DINNER: "dinner",
  SNACKS: "snack",
}

interface RecordViewProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onSelectMealType: (mealType: MealType) => void
}

export function RecordView({
  selectedDate,
  onSelectDate,
  onSelectMealType,
}: RecordViewProps) {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const record = useHomeRecord(selectedDate)
  useFoodAnalysisRecoveryPolling()
  const [viewDiaryResult, setViewDiaryResult] =
    useState<DiaryAnalysisResult | null>(null)
  const [viewDiaryId, setViewDiaryId] = useState<number | null>(null)
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
    fetchDiaryResult,
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
        throw new Error(
          job.error || job.failureMessage || "식단 분석에 실패했어요.",
        )
      }
      setPending({
        result: job.result,
        mealType: pendingConfirmation.mealType,
        imageUri: job.result.imageUrl ?? pendingConfirmation.imageUri,
      })
      setPendingConfirmation(null)
      await pendingAnalysisRequests.remove(job.requestId)
    } catch (error) {
      Alert.alert("확인 실패", getErrorMessage(error))
    }
  }
  const { data } = useDateAnalysis(selectedDate)
  const { data: streak = 0 } = useStreak()

  const refreshSelectedDate = useCallback((): Promise<void> => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current

    setIsRefreshing(true)
    const runRefresh = async () => {
      try {
        await Promise.all([
          foodAnalysisRecovery.recoverPendingAnalyses(),
          queryClient.refetchQueries({
            queryKey: ["dateAnalysis", toDateStr(selectedDate)],
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
  }, [queryClient, selectedDate])

  const [mealImages, setMealImages] = useState<MealImageMap>({})
  const [recordedMeals, setRecordedMeals] = useState<RecordedMealMap>({})
  const [isTextRecordOpen, setIsTextRecordOpen] = useState(false)
  const [isOptionsSheetOpen, setIsOptionsSheetOpen] = useState(false)
  const recordingMealTypeRef = useRef<MealType | null>(null)
  const [recordingMealLabel, setRecordingMealLabel] = useState<string>("")
  useEffect(() => {
    setMealImages({})
    setRecordedMeals({})
  }, [selectedDate])

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
  const withinLimits =
    analysis !== null &&
    CKD_NUTRIENT_LIMITS.every((limit) => {
      const intake =
        limit.nutrient === "단백질"
          ? (analysis.protein ?? 0)
          : limit.nutrient === "나트륨"
            ? (analysis.sodium ?? 0)
            : limit.nutrient === "칼륨"
              ? (analysis.potassium ?? 0)
              : limit.nutrient === "인"
                ? (analysis.phosphorus ?? 0)
                : 0
      return intake <= limit.max
    })

  const recordedCount =
    Object.values(mergedRecordedMeals).filter(Boolean).length
  const recordRate = (recordedCount / 4) * 100
  const characterType =
    recordRate >= 85
      ? "character-excellent"
      : recordRate >= 70
        ? "character-good"
        : "character-caution"

  // 오늘 기록이 있고 영양소 제한조건까지 지켰을 때 풍성한(high) 배경
  const backgroundVariant: "low" | "high" =
    hasSelectedDateRecord && withinLimits ? "high" : "low"

  const serverExtraWater = data?.result.analysis?.extraWater ?? 0
  const { syncFromServer } = record
  const syncFromServerRef = useRef(syncFromServer)
  syncFromServerRef.current = syncFromServer
  useEffect(() => {
    syncFromServerRef.current(serverExtraWater)
  }, [serverExtraWater])

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
      Alert.alert(
        "기록 준비 중",
        "분석 결과를 식단 기록과 연결하고 있어요. 잠시 후 다시 시도해 주세요.",
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
      console.error("handlePendingAddToRecord error:", error)
      Alert.alert("등록 실패", "기록 추가에 실패했어요.")
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
      console.error("updatePendingFoodAnalysis error:", error)
      Alert.alert("업데이트 실패", "수정에 실패했어요.")
    } finally {
      setIsPendingUpdating(false)
    }
  }

  const handleRecord = (mealType: MealType) => {
    trackAnalyticsEvent("food_record_started", {
      slot: ANALYTICS_MEAL_SLOT[mealType],
    })
    recordingMealTypeRef.current = mealType
    const label = MEAL_OPTIONS.find((o) => o.type === mealType)?.label ?? ""
    setRecordingMealLabel(label)
    setIsOptionsSheetOpen(true)
  }

  const handleSkipMeal = async () => {
    const mealType = recordingMealTypeRef.current
    if (!mealType) return
    setIsOptionsSheetOpen(false)
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
      Alert.alert("오류", getErrorMessage(error))
    }
  }

  const handleCameraPhoto = () => {
    setIsOptionsSheetOpen(false)
    const mealType = recordingMealTypeRef.current
    if (!mealType) return
    Alert.alert("사진 첨부", "방법을 선택하세요", [
      {
        text: "카메라",
        onPress: async () => {
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
          if (uri) analyzeImage(uri, mealType)
        },
      },
      {
        text: "갤러리",
        onPress: async () => {
          trackAnalyticsEvent("food_record_method_selected", {
            method: "gallery",
            slot: ANALYTICS_MEAL_SLOT[mealType],
          })
          const uri = await pickImageFromGallery({
            onPermissionDenied: () =>
              trackAnalyticsEvent("food_photo_permission_denied", {
                source: "gallery",
              }),
          })
          if (uri) analyzeImage(uri, mealType)
        },
      },
      { text: "취소", style: "cancel" },
    ])
  }

  const handleTextRecord = () => {
    const mealType = recordingMealTypeRef.current
    if (mealType) {
      trackAnalyticsEvent("food_record_method_selected", {
        method: "text",
        slot: ANALYTICS_MEAL_SLOT[mealType],
      })
    }
    setIsOptionsSheetOpen(false)
    setIsTextRecordOpen(true)
  }

  const handleRecipeLoad = () => {
    const mealType = recordingMealTypeRef.current
    if (mealType) {
      trackAnalyticsEvent("food_record_method_selected", {
        method: "recipe",
        slot: ANALYTICS_MEAL_SLOT[mealType],
      })
    }
    setIsOptionsSheetOpen(false)
  }

  const handleViewMealResult = async (mealType: MealType) => {
    const diet = data?.result.diets.find((d) => d.mealType === mealType)
    if (!diet) return
    if (diet.diaryId === null || isSkippedDiet(diet)) {
      handleRecord(mealType)
      return
    }
    const result = await fetchDiaryResult(diet.diaryId)
    if (result) {
      trackAnalyticsEvent("food_record_result_viewed", { source: "saved" })
      setViewDiaryResult(result)
      setViewDiaryId(diet.diaryId)
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

  return (
    <KeyboardAwareScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void refreshSelectedDate()}
          tintColor={tokens.color.sub6.val}
          colors={[tokens.color.sub6.val]}
        />
      }
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + 32 },
      ]}
      bottomOffset={insets.bottom + 48}
      disableScrollOnKeyboardHide
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
    >
      <View height={10} />

      <CharacterSection
        selectedDate={selectedDate}
        hasRecord={hasSelectedDateRecord}
        characterType={characterType}
        streak={streak}
        withinLimits={withinLimits}
        backgroundVariant={backgroundVariant}
      />

      <View height={5} />

      <MealButtons
        onSelectMealType={onSelectMealType}
        mealImages={mergedMealImages}
        recordedMeals={mergedRecordedMeals}
        skippedMeals={apiSkippedMeals}
        mealTimes={apiMealTimes}
        onRecord={handleRecord}
        onViewResult={handleViewMealResult}
      />

      <RecordOptionsSheet
        open={isOptionsSheetOpen}
        mealLabel={recordingMealLabel}
        onClose={() => setIsOptionsSheetOpen(false)}
        onCameraPhoto={handleCameraPhoto}
        onTextRecord={handleTextRecord}
        onRecipeLoad={handleRecipeLoad}
        onSkipMeal={handleSkipMeal}
      />

      <TextRecord
        open={isTextRecordOpen}
        onClose={() => setIsTextRecordOpen(false)}
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
        updateDiaryMealType={updateDiaryMealType}
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
        onAddToRecord={handlePendingAddToRecord}
        isUpdating={isPendingUpdating}
        updateFoodAnalysis={updatePendingFoodAnalysis}
      />

      <LoadingOverlay
        visible={isAnalyzing}
        message="식단을 분석하고 있어요"
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

      <View height={10} />

      <HydrationTracker
        intake={record.intake}
        addWater={record.addWater}
        onReset={() => {
          record.resetHydration(serverExtraWater)
        }}
      />

      <View height={10} />

      <WeightEdemaTracker
        bodyRecords={data?.result.bodyRecords}
        selectedDate={selectedDate}
      />

      <BloodMetricsTracker
        selectedDate={selectedDate}
        dateAnalysis={data?.result}
      />
    </KeyboardAwareScrollView>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 10,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: tokens.color.appBg.val,
    alignItems: "center",
    justifyContent: "center",
  },
})
