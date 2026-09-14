import { useCallback, useEffect, useRef, useState } from "react"
import { foodCameraService } from "@/src/services/data/foodCameraService"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { Image } from "expo-image"
import { LinearGradient } from "expo-linear-gradient"
import Svg, { Circle } from "react-native-svg"
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  ReduceMotion,
  SlideInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import { Text } from "@/src/shared/components/AppText"
import { EmphasizedText } from "@/src/shared/components/EmphasizedText"
import { hapticSelection } from "@/src/lib/haptics"
import { showConfirm } from "@/src/lib/dialog"
import { presentError } from "@/src/lib/errorMessage"
import { useSurface } from "@/src/hooks/useSurface"
import { remoteImageSource } from "@/src/shared/images/remoteImageSource"
import type {
  FoodAnalysisUpdateRequest,
  FoodAnalysisUpdateResult,
  FoodCameraAnalyzeResult,
} from "@/src/types"
import { normalizeFoodAnalysisResult } from "@/src/shared/utils/foodAnalysisResult"
import type { MealType } from "../types"
import { FoodResultEdit } from "./FoodResultEdit"
import { MealDeleteConfirmSheet } from "./MealDeleteConfirmSheet"
import { MealReportSaveFailedError } from "../stores/mealReportPageStore"
import { useMealReport } from "@/src/features/food-report/hooks/useMealReport"
import type {
  MealReport,
  ReportBudget,
  ReportFoodFact,
  VerdictLevel,
} from "@/src/features/food-report/types/report"
import { useMealPersistenceActions } from "@/src/features/food-analysis"
import {
  trackAnalyticsEvent,
  type AnalyticsFoodRecordSource,
} from "@/src/features/analytics"

import { REPORT_INK as INK, type ReportTone } from "./reportInk"
import {
  buildReportCopy,
  recommendationFallback,
  verdictLabel,
  type ReportIngredient,
  type Translate,
  isNutritionReliable,
  sumReliableNutrient,
} from "./reportCopy"

/**
 * 식단 리포트 **페이지** — 시안(2026-09-04, Figma export `write.svg`).
 *
 * 2026-09-04 부터 바텀시트(RN Modal pageSheet)가 아니라 **별도 페이지**다
 * (`app/meal-report.tsx` 가 이 컴포넌트를 세운다). 그래서 이 파일에는 더 이상
 * AppModal·ModalOverlayHost·pageSheet 가 없다 — 확인창·토스트는 루트 호스트를 탄다.
 *
 * 위에서 아래로(시안 y 좌표): 제목 줄(식단 분석 · X) → 끼니 제목 + 인분 → 사진(327×189
 * r12, 음식 칩 + 식단 수정) → 헤드라인 → 끼니 분할 막대(범례 + 세그먼트 숫자) → 근거 두 줄
 * → "한눈에" 카드(#F9FAFB r12) → 띠 16 → "오늘의 식단 분석": 총 열량 + 판정 배지 → 도넛
 * 4(집중 영양소는 #FFF6F3 카드) → 음식별 판정 → 띠 → 대체 제안 → 하단 버튼 둘 + 상담 링크.
 *
 * 숫자는 서버 리포트(`useMealReport`)의 표시용 문자열을 그대로 쓴다. 리포트가 아직이면
 * 분석 결과(`result`)로 그릴 수 있는 것(제목·사진·칩·총 열량·음식·비율)만 그리고
 * 리포트 자리는 비워 둔다 — 화면이 숫자를 지어내지 않는다.
 *
 * 세 여정(`source`)이 같은 페이지를 쓴다. 신규·복구는 "기록하기" 가 있고 나가면 묻는다,
 * 저장본은 "기록 삭제" 가 있고 묻지 않는다.
 */

interface FoodAnalysisResultProps {
  source: AnalyticsFoodRecordSource
  result: FoodCameraAnalyzeResult | null
  onClose: () => void
  imageUri?: string
  mealType?: MealType
  onAddToRecord?: () => Promise<void> | void
  showAddButton?: boolean
  isUpdating?: boolean
  updateFoodAnalysis: (
    foodAnalysisResultId: number,
    body: FoodAnalysisUpdateRequest,
    sourceResult?: FoodCameraAnalyzeResult,
  ) => Promise<FoodAnalysisUpdateResult | undefined>
  diaryId?: number
  updateDiaryMealType?: (
    diaryId: number,
    mealType: string,
  ) => Promise<{ diaryId: number; mealType: string } | undefined>
  recordDate?: string
  /** 이 기록을 남긴 시각(서버 createdAt, naive UTC). 삭제 확인 미리보기가 쓴다. */
  recordedAt?: string
  onDiaryDeleted?: () => void
  onResultChange?: (result: FoodCameraAnalyzeResult) => void
  onMealTypeChange?: (change: FoodAnalysisMealTypeChange) => void
}

export interface FoodAnalysisMealTypeChange {
  diaryId: number
  fromMealType: MealType
  toMealType: MealType
  imageUri: string | null
}

/* ─── 모션 ──────────────────────────────────────────────────────────
 * 페이지 전환 자체가 이동감을 주므로 스크롤 본문은 정적으로 둔다. 본문 블록마다 애니메이션
 * 레이어를 만들면 페이지가 열린 직후 스크롤할 때 합성 작업이 몰린다. 도넛 채움과 사진 칩,
 * 헤더·하단 버튼처럼 의미 있는 모션만 별도로 유지한다.
 * 시스템 "동작 줄이기" 를 켠 사람에게는 전부 즉시 그린다(ReduceMotion.System).
 */
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

/** 도넛 네 개의 순서. 리포트 예산에 없는 영양소는 그리지 않는다. */
const DONUT_NUTRIENTS = [
  "potassium",
  "sodium",
  "phosphorus",
  "protein",
] as const

function levelTone(level: VerdictLevel): ReportTone {
  if (level === "SAFE") return "ok"
  if (level === "CAUTION") return "tight"
  if (level === "UNKNOWN") return "unknown"
  return "over"
}

/** 판정 배지 — 면은 밝은 색 16%, 글자는 바닥에 맞는 톤(라이트 짙게 / 다크 밝게). */
function verdictTone(level: VerdictLevel, isDark: boolean) {
  const tone = levelTone(level)
  return {
    fg: isDark ? INK.textOnDark[tone] : INK.textOn[tone],
    bg: INK.badgeBg[tone],
  }
}

/** 이 끼니 섭취량 표기. 서버가 끼니 몫의 문자열은 안 보내므로 단위만 붙인다. */
function formatAmount(nutrient: string, value: number): string {
  if (nutrient === "protein") {
    return `${Math.round(value * 10) / 10}g`
  }
  return `${Math.round(value)}mg`
}

export function FoodAnalysisResult({
  source,
  result,
  onClose,
  imageUri,
  mealType,
  onAddToRecord,
  showAddButton = true,
  isUpdating = false,
  updateFoodAnalysis,
  diaryId,
  updateDiaryMealType,
  recordDate,
  recordedAt,
  onDiaryDeleted,
  onResultChange,
  onMealTypeChange,
}: FoodAnalysisResultProps) {
  const { t, i18n } = useTranslation("common")
  const tr: Translate = (key, values) =>
    String(t(key as never, values as never))
  const numberLocale = (i18n.resolvedLanguage ?? i18n.language).startsWith("en")
    ? "en-US"
    : "ko-KR"
  const insets = useSafeAreaInsets()
  const s = useSurface()
  const { width: windowWidth } = useWindowDimensions()
  /*
    사진 카드 폭은 화면 폭에서 **직접** 계산한다. `aspectRatio` 만 주면 부모의 stretch 를 못
    받아 폭이 짧아지고(실측: 왼쪽 24 · 오른쪽 38), 카드가 오른쪽으로 비켜 보인다.
  */
  const photoWidth = windowWidth - X * 2
  const photoHeight = Math.round((photoWidth * 189) / 327)
  const [isEdit, setIsEdit] = useState(false)
  const [isAddingToRecord, setIsAddingToRecord] = useState(false)
  const [displayResult, setDisplayResult] =
    useState<FoodCameraAnalyzeResult | null>(result)
  const [displayMealType, setDisplayMealType] = useState<MealType | undefined>(
    mealType,
  )
  const [displayImageUri, setDisplayImageUri] = useState<string | undefined>(
    imageUri ?? result?.imageUrl ?? undefined,
  )
  const [imageFailed, setImageFailed] = useState(false)
  const [measuredFooterHeight, setMeasuredFooterHeight] = useState(0)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    resolve: (confirmed: boolean) => void
  } | null>(null)
  const {
    startConsultation,
    deleteSavedMeal,
    isStartingConsultation,
    isDeletingDiary,
  } = useMealPersistenceActions({
    confirmDelete: () =>
      new Promise<boolean>((resolve) => setDeleteConfirm({ resolve })),
  })

  useEffect(() => {
    setDisplayResult(result)
  }, [result])

  useEffect(() => {
    setDisplayMealType(mealType)
  }, [mealType])

  /*
    미뤄 둔 삽화 따라잡기(2026-09-11). 서버가 `illustrationPending` 으로 먼저 돌려주면 그림 자리는
    비어 있다. 3초마다 결과를 다시 읽어 그림이 붙으면 갈아 끼우고, 45초가 지나면 그만둔다 —
    그림은 있으면 좋은 것이지 기다릴 것이 아니다. 사진 분석(imageUri 가 있는 경우)에는 돌지 않는다.
  */
  useEffect(() => {
    const id = result?.foodAnalysisResultId
    if (!id || imageUri || result?.imageUrl || result?.illustrationPending !== true) return
    let cancelled = false
    let ticks = 0
    const timer = setInterval(() => {
      ticks += 1
      if (ticks > 15) {
        clearInterval(timer)
        return
      }
      void foodCameraService
        .getFoodAnalysisResult(id)
        .then((fresh) => {
          if (cancelled) return
          if (fresh.imageUrl) {
            setDisplayImageUri(fresh.imageUrl)
            setImageFailed(false)
            clearInterval(timer)
          } else if (fresh.illustrationPending !== true) {
            clearInterval(timer)
          }
        })
        .catch(() => undefined)
    }, 3000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [result?.foodAnalysisResultId, result?.imageUrl, result?.illustrationPending, imageUri])

  useEffect(() => {
    setDisplayImageUri(imageUri ?? result?.imageUrl ?? undefined)
    setImageFailed(false)
  }, [imageUri, result?.imageUrl])

  /**
   * 이 결과를 한 번이라도 손봤는가. 저장 없이 나간 사람 중 **고쳐 놓고도 버린** 몫이
   * 여기서만 갈린다 — "결과가 틀렸다" 와 "고쳐도 안 맞았다" 는 처방이 다르다.
   */
  const editedRef = useRef(false)
  /** 나가기 확인창이 이미 떠 있는가. `handleClosePress` 의 재진입을 막는다. */
  const closingRef = useRef(false)

  useEffect(() => {
    setIsAddingToRecord(false)
    setIsEdit(false)
    editedRef.current = false
  }, [result?.foodAnalysisResultId])

  const { data: mealReport, isLoading: isReportPending } = useMealReport(
    displayResult?.foodAnalysisResultId ?? result?.foodAnalysisResultId,
    { date: recordDate, mealType: displayMealType },
  )

  const handleClosePress = useCallback(async () => {
    if (!showAddButton) {
      // 저장본은 이미 기록에 있다 — 잃을 것이 없으니 묻지 않고, 셀 이탈도 없다.
      onClose()
      return
    }
    // 확인창이 이미 떠 있으면 두 번째 문은 무시한다.
    if (closingRef.current) return
    closingRef.current = true
    /*
      확인창을 **띄운 수**와 **그래도 나간 수**가 둘 다 있어야 문구가 붙잡고 있는지
      보인다. 저장 버튼이 있는 두 자리(신규·복구)만 여기 온다.
    */
    const exitSource = source === "recovered" ? "recovered" : "fresh"
    const edited = editedRef.current
    trackAnalyticsEvent("food_record_leave_prompted", {
      source: exitSource,
      edited,
    })
    try {
      const confirmed = await showConfirm({
        title: t("foodResult.unsavedTitle"),
        description: t("foodResult.unsavedBody"),
        confirmLabel: t("foodResult.leaveWithoutSaving"),
        cancelLabel: t("foodResult.returnToResult"),
        destructive: true,
      })
      if (confirmed) {
        // 이 여정에서 가장 비싼 이탈 — 서버 분석을 이미 한 번 태우고도 기록이 안 남는다.
        trackAnalyticsEvent("food_record_result_abandoned", {
          source: exitSource,
          edited,
        })
        onClose()
      }
    } finally {
      closingRef.current = false
    }
  }, [onClose, showAddButton, source, t])

  if (!displayResult) return null

  const effectiveResult = normalizeFoodAnalysisResult(displayResult)
  const servingsLabel = t("foodResult.servings", {
    count: effectiveResult.servings,
  })

  const handleAddToRecordPress = async () => {
    if (isAddingToRecord) return
    setIsAddingToRecord(true)
    let saved = false
    try {
      await onAddToRecord?.()
      saved = true
    } catch (error) {
      /*
        저장 실패. 여는 쪽의 저장 경로는 오류를 이미 띄우고 `MealReportSaveFailedError` 로
        거부한다(`mealReportPageStore` 의 규약) — 페이지는 열린 채 둔다. 예전에는 실패해도
        닫혔고, 복구된 결과는 그 순간 버려졌다. 규약 밖의 오류만 여기서 알린다.
      */
      if (!(error instanceof MealReportSaveFailedError)) {
        presentError(error, { scope: "meal-diary-register" })
      }
    } finally {
      setIsAddingToRecord(false)
    }
    if (saved) onClose()
  }

  const handleAskAboutMealPress = async () => {
    if (isStartingConsultation) return
    /*
      결과 화면에서 나가는 **네 번째 문**. 이건 이탈이 아니라 이 여정 최대의 전환이고,
      이 이름이 없으면 상담으로 빠져나간 사람이 `food_record_result_abandoned` 에 섞인다.
      실패는 `useMealPersistenceActions` 의 catch 가 센다.
    */
    trackAnalyticsEvent("food_record_consult_started", { source })
    const started = await startConsultation({
      result: effectiveResult,
      mealType: displayMealType,
      recordDate,
      diaryId,
    })
    if (started) onClose()
  }

  const handleDeleteDiaryPress = async () => {
    if (diaryId == null || isDeletingDiary) return
    const deleted = await deleteSavedMeal(diaryId)
    if (!deleted) return
    /*
      **지워진 뒤에만** 센다. 확인 시트를 연 것은 의도이지 삭제가 아니고, 그 의도는
      `sheet_opened{surface:'home_meal_delete'}` 가 이미 세고 있다.
    */
    trackAnalyticsEvent("food_record_deleted", { source: "saved" })
    onClose()
    onDiaryDeleted?.()
  }

  const handleResultChange = (updated: FoodCameraAnalyzeResult) => {
    editedRef.current = true
    setDisplayResult(updated)
    if (updated.imageUrl) setDisplayImageUri(updated.imageUrl)
    onResultChange?.(updated)
  }

  const handleTitleChange = (title: string) => {
    editedRef.current = true
    setDisplayResult((prev) => (prev ? { ...prev, title } : prev))
  }

  const handleMealTypeChange = (change: {
    diaryId: number
    fromMealType: MealType
    toMealType: MealType
  }) => {
    editedRef.current = true
    setDisplayMealType(change.toMealType)
    onMealTypeChange?.({
      ...change,
      imageUri: displayImageUri ?? effectiveResult.imageUrl ?? null,
    })
  }

  const facts = mealReport?.facts
  /*
    다크의 보조 글자(`textMuted`, 51% 알파)는 카드·우물 위에서 2.4~2.7:1 이라 안 읽힌다
    (tests/reportContrast 의 실측). 다크에서는 본문 톤(`text`)을 보조로 쓴다 — 굵기 차로 위계가 선다.
  */
  const mutedInk = s.isDark ? s.text : s.textMuted
  /*
    페이드의 시작색은 바닥색의 **투명판**이다. `"transparent"` 를 쓰면 안드로이드에서 검정으로
    보간돼 밝은 화면 위에 회색 띠가 생긴다(RN 의 알려진 동작).
  */
  const fadeTransparent = s.isDark ? "rgba(31,31,33,0)" : "rgba(255,255,255,0)"
  // 버튼 판 높이 = 위 여백 12 + 버튼 56 + 간격 12 + 링크 44 + 아래 여백(세이프에어리어 + 12)
  const footerHeight =
    measuredFooterHeight || 12 + 56 + 12 + 44 + insets.bottom + 12
  // 시안은 라이트만 있다. 다크에서는 같은 역할의 surface 면으로 대신한다.
  const planes = {
    band: s.isDark ? s.surface : INK.band,
    well: s.isDark ? s.surfaceSunken : INK.well,
    soft: s.isDark ? s.surfaceSunken : INK.brandSoft,
    // 파괴적 동작이 앉는 면 — 브랜드 기운이 없는 회색.
    neutral: s.isDark ? s.surfaceSunken : INK.band,
    track: s.isDark ? s.surfacePressed : INK.ring.track,
    hairline: s.isDark ? s.hairline : INK.hairline,
  }
  /*
    영양 표기는 요리 자체의 값이 아니라 **DB 기준 재료(foods)의 합**이다(기획, 2026-09-04).
    서버가 재료로 풀어 준 항목을 그대로 더해 보여 준다 — 그래야 아래 재료 줄과 위의 합계가
    한 표에서 맞아떨어진다. 재료가 하나도 없으면 서버 합계로 물러선다.
  */
  const ingredientSum = (
    pick: (
      food: (typeof effectiveResult.foods)[number],
    ) => number | null | undefined,
  ) => sumReliableNutrient(effectiveResult.foods, pick)
  /*
    항목이 있는데 전부 PENDING(식품표에 못 이음)이면 열량은 **모른다**. 서버 합계도 그때는
    0 이라 물러설 곳이 아니다 — "0 kcal · 적정" 은 거짓 안심이다(2026-09-05 실측 "순대국").
  */
  const nutritionUnknown =
    effectiveResult.foods.length > 0 &&
    !effectiveResult.foods.some(isNutritionReliable)
  /*
    **일부만** 미확정이어도 합계는 그만큼 덜 세어진 값이다. 아무 표시가 없으면 그 합계가
    이 끼니 전부인 줄 읽는다 — 신장 환자에게 거짓 안심이다(2026-09-05 검수).
  */
  const hasUnconfirmedFood = effectiveResult.foods.some(
    (food) => !isNutritionReliable(food),
  )
  const calories = nutritionUnknown
    ? null
    : Math.round(
        ingredientSum((f) => f.calories) ?? effectiveResult.total.calories,
      )
  const mealAmountOf = (nutrient: string): number | null =>
    nutrient === "potassium"
      ? ingredientSum((f) => f.potassium)
      : nutrient === "sodium"
        ? ingredientSum((f) => f.sodium)
        : nutrient === "phosphorus"
          ? ingredientSum((f) => f.phosphorus)
          : nutrient === "protein"
            ? ingredientSum((f) => f.protein)
            : null
  const caloriesText =
    calories === null
      ? t("foodResult.unknownCalories")
      : `${calories.toLocaleString(numberLocale)} kcal`

  const donuts = facts
    ? DONUT_NUTRIENTS.flatMap((nutrient) => {
        const budget = facts.budgets.find((b) => b.nutrient === nutrient)
        return budget ? [budget] : []
      })
    : []
  const focusNutrient = facts?.focus?.nutrient ?? null

  return (
    <View style={[styles.root, { backgroundColor: s.canvas }]}>
      {/* ── 제목 줄: 식단 분석 · X (시안 y55 h34) ── */}
      <Animated.View
        entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}
        style={[styles.header, { marginTop: insets.top + 8 }]}
      >
        <View style={styles.headerSide} />
        <Text style={[styles.headerTitle, { color: s.textStrong }]}>
          {t("foodResult.title")}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("foodResult.close")}
          onPress={() => void handleClosePress()}
          style={({ pressed }) => [
            styles.headerSide,
            styles.headerButton,
            { opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <Ionicons name="close" size={26} color={s.textStrong} />
        </Pressable>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* ── 끼니 제목 + 끼니 칩 + 인분 (시안 y102 h44) ── */}
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: s.textStrong }]}
            numberOfLines={2}
            lineBreakStrategyIOS="hangul-word"
          >
            {effectiveResult.title}
          </Text>
          <View style={styles.titleMeta}>
            <Text style={[styles.servings, { color: mutedInk }]}>
              {servingsLabel}
            </Text>
          </View>
        </View>

        {/* ── 사진 + 음식 칩 + 식단 수정 (시안 y154 327×189 r12) ── */}
        {displayImageUri && !imageFailed ? (
          <View
            style={[
              styles.photo,
              {
                width: photoWidth,
                height: photoHeight,
                backgroundColor: planes.well,
              },
            ]}
          >
            <Image
              source={remoteImageSource(displayImageUri)}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              onError={() => setImageFailed(true)}
            />
            {/* 음식 칩은 사진이 자리 잡은 뒤 하나씩 떠오른다 — "이걸 알아봤어요" 의 리듬. */}
            <View style={styles.chipCloud} pointerEvents="none">
              {effectiveResult.foods.slice(0, 4).map((food, index) => (
                <Animated.View
                  key={`${food.name}-${index}`}
                  entering={FadeInUp.delay(160 + index * 40)
                    .duration(180)
                    .reduceMotion(ReduceMotion.System)}
                  style={[styles.chip, { backgroundColor: INK.chip }]}
                >
                  <Text style={styles.chipLabel} numberOfLines={1}>
                    {food.name}
                  </Text>
                </Animated.View>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("foodResult.editMeal")}
              onPress={() => {
                hapticSelection()
                setIsEdit(true)
              }}
              style={({ pressed }) => [
                styles.editButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={styles.editButtonLabel}>
                {t("foodResult.editMeal")}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.textMealRow}>
            <Text style={[styles.textMealLabel, { color: mutedInk }]}>
              {t("foodResult.foodCount", {
                count: effectiveResult.foods.length,
              })}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("foodResult.editMeal")}
              onPress={() => {
                hapticSelection()
                setIsEdit(true)
              }}
              style={({ pressed }) => [
                styles.textMealEdit,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.textMealEditLabel, { color: s.textStrong }]}>
                {t("foodResult.editMeal")}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={mutedInk} />
            </Pressable>
          </View>
        )}

        {/* ── 리포트: 헤드라인 · 분할 막대 · 근거 · 한눈에 ── */}
        {mealReport ? (
          <View>
            <ReportInsight
              report={mealReport}
              strong={s.textStrong}
              muted={mutedInk}
              wellColor={planes.well}
              nutritionUnknown={nutritionUnknown}
              hasUnconfirmedFood={hasUnconfirmedFood}
              ingredients={effectiveResult.foods.map((food) => ({
                name: food.name,
                potassium: food.potassium,
                sodium: food.sodium,
                phosphorus: food.phosphorus,
                protein: food.protein,
              }))}
            />
          </View>
        ) : (
          <Text style={[styles.reportPending, { color: s.textWeak }]}>
            {isReportPending
              ? t("foodResult.reportPending")
              : t("foodResult.reportUnavailable")}
          </Text>
        )}

        <View style={[styles.band, { backgroundColor: planes.band }]} />

        {/* ── 오늘의 식단 분석: 총 열량 + 판정 ── */}
        <View>
          <Text style={[styles.sectionTitle, { color: s.textStrong }]}>
            {t("foodResult.analysisTitle")}
          </Text>
          <View style={styles.caloriesRow}>
            <View style={{ gap: 2 }}>
              <Text style={[styles.caloriesLabel, { color: mutedInk }]}>
                {t("foodResult.totalCalories")}
              </Text>
              <Text style={[styles.caloriesValue, { color: s.textStrong }]}>
                {caloriesText}
              </Text>
            </View>
            {facts ? (
              <VerdictBadge
                level={facts.mealVerdict.level}
                label={verdictLabel(facts.mealVerdict.level, tr)}
                isDark={s.isDark}
              />
            ) : null}
          </View>
        </View>

        {/* ── 도넛 4 — 같은 바닥과 고리, 집중 항목은 이름으로 구분 ── */}
        {donuts.length > 0 ? (
          <View style={styles.donutRow}>
            {donuts.map((budget) => (
              <NutrientDonut
                key={budget.nutrient}
                budget={budget}
                isFocus={budget.nutrient === focusNutrient}
                strong={s.textStrong}
                muted={mutedInk}
                trackColor={planes.track}
                isDark={s.isDark}
                mealAmount={mealAmountOf(budget.nutrient)}
                nutritionUnknown={nutritionUnknown}
              />
            ))}
          </View>
        ) : null}

        {/* ── 음식별 판정 (시안 y909 h71) ── */}
        {facts && facts.foods.length > 0 ? (
          <View>
            {facts.foods.map((food, index) => (
              <View key={`${food.name}-${index}`}>
                <FoodRow
                  food={food}
                  strong={s.textStrong}
                  muted={mutedInk}
                  isDark={s.isDark}
                />
              </View>
            ))}
          </View>
        ) : (
          <View>
            {effectiveResult.foods.map((food, index) => (
              <View key={`${food.name}-${index}`} style={styles.foodRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.foodName, { color: s.textStrong }]}>
                    {food.name}
                    {(food.consumedGrams ?? food.analyzedGrams)
                      ? ` ${Math.round(food.consumedGrams ?? food.analyzedGrams ?? 0)}g`
                      : ""}
                  </Text>
                  <Text style={[styles.foodNote, { color: mutedInk }]}>
                    {`${Math.round(food.calories)} kcal`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── 대체 제안 ── */}
        {facts && facts.swaps.length > 0 ? (
          <View>
            <View style={[styles.band, { backgroundColor: planes.band }]} />
            <Text style={[styles.sectionTitle, { color: s.textStrong }]}>
              {t("mealReport.swaps")}
            </Text>
            {facts.swaps.map((swap, index) => (
              <View key={`${swap.fromName}-${index}`} style={styles.swapRow}>
                <View style={styles.swapNames}>
                  <Text
                    style={[styles.swapFrom, { color: s.textWeak }]}
                    numberOfLines={1}
                  >
                    {swap.fromName}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={s.textWeak}
                  />
                  <Text
                    style={[styles.swapTo, { color: s.textStrong }]}
                    numberOfLines={1}
                  >
                    {swap.toName}
                  </Text>
                </View>
                <Text style={[styles.swapDelta, { color: INK.brand }]}>
                  {t("foodResult.swapDelta", {
                    nutrient: swap.nutrientLabel,
                    amount: swap.deltaText,
                  })}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/*
        ── 하단: 버튼 둘 + 상담 링크 (시안 y1392 h124) ──
        버튼 판 위에 36 짜리 페이드를 얹는다(시안 y1356.53 h36 의 선형 그라데이션). 이게 없으면
        본문이 버튼 모서리에서 **잘린 것처럼** 끝난다 — 스크롤이 더 있다는 신호가 사라진다.
      */}
      <LinearGradient
        pointerEvents="none"
        colors={[fadeTransparent, s.canvas]}
        style={[styles.footerFade, { bottom: footerHeight }]}
      />
      <Animated.View
        onLayout={(event) =>
          setMeasuredFooterHeight(event.nativeEvent.layout.height)
        }
        entering={SlideInDown.delay(240)
          .duration(380)
          .easing(Easing.out(Easing.cubic))
          .reduceMotion(ReduceMotion.System)}
        style={[
          styles.footer,
          { backgroundColor: s.canvas, paddingBottom: insets.bottom + 12 },
        ]}
      >
        <View style={styles.footerButtons}>
          {showAddButton ? (
            <>
              <FooterButton
                label={t("foodResult.addFood")}
                onPress={() => setIsEdit(true)}
                tone="soft"
                softColor={planes.soft}
              />
              <FooterButton
                label={
                  isAddingToRecord
                    ? t("foodResult.adding")
                    : t("foodResult.addToLog")
                }
                onPress={() => void handleAddToRecordPress()}
                disabled={isAddingToRecord}
                tone="primary"
              />
            </>
          ) : (
            <>
              <FooterButton
                label={
                  isDeletingDiary
                    ? t("foodResult.deleting")
                    : t("foodResult.delete")
                }
                onPress={() => void handleDeleteDiaryPress()}
                disabled={isDeletingDiary || diaryId == null}
                tone="danger"
                neutralColor={planes.neutral}
                isDark={s.isDark}
              />
              <FooterButton
                label={t("foodResult.addFood")}
                onPress={() => setIsEdit(true)}
                tone="primary"
              />
            </>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("foodResult.askMore")}
          onPress={() => void handleAskAboutMealPress()}
          disabled={isStartingConsultation}
          style={({ pressed }) => [
            styles.consultLink,
            { opacity: pressed || isStartingConsultation ? 0.5 : 1 },
          ]}
        >
          <Text style={[styles.consultLabel, { color: mutedInk }]}>
            {isStartingConsultation
              ? t("foodResult.openingConsult")
              : t("foodResult.askMore")}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={mutedInk} />
        </Pressable>
      </Animated.View>

      {isEdit && (
        <FoodResultEdit
          source={source}
          result={effectiveResult}
          imageUri={displayImageUri}
          onClose={() => setIsEdit(false)}
          mealType={displayMealType ?? null}
          isUpdating={isUpdating}
          updateFoodAnalysis={updateFoodAnalysis}
          onAnalysisChange={handleResultChange}
          onTitleChange={handleTitleChange}
          diaryId={diaryId}
          updateDiaryMealType={updateDiaryMealType}
          onMealTypeChange={handleMealTypeChange}
        />
      )}

      {/* 삭제는 되돌릴 수 없다 — 무엇을 지우는지 카드로 먼저 보여주고 묻는다. */}
      <MealDeleteConfirmSheet
        visible={deleteConfirm !== null}
        preview={{
          mealType: displayMealType ?? null,
          imageUri: displayImageUri ?? effectiveResult.imageUrl ?? null,
          recordedAt: recordedAt ?? null,
        }}
        onKeep={() => {
          deleteConfirm?.resolve(false)
          setDeleteConfirm(null)
        }}
        onDelete={() => {
          deleteConfirm?.resolve(true)
          setDeleteConfirm(null)
        }}
      />
    </View>
  )
}

/* ─── 리포트 블록: 헤드라인 · 분할 막대 · 근거 · 한눈에 ─────────── */

/** 막대 안에는 숫자만 — 단위는 헤드라인이 이미 말했고, 좁은 칸에서 "90…" 으로 잘린다. */
function bareNumber(text: string): string {
  return text.replace(/\s*(mg|g|kcal|ml)$/iu, "")
}

function ReportInsight({
  report,
  strong,
  muted,
  wellColor,
  ingredients,
  nutritionUnknown,
  hasUnconfirmedFood,
}: {
  report: MealReport
  strong: string
  muted: string
  wellColor: string
  ingredients: ReportIngredient[]
  /** 항목은 있는데 전부 영양 미확정 — 근거 대신 "무엇을 하면 되는지" 한 줄을 둔다. */
  nutritionUnknown: boolean
  /** 하나라도 미확정 — 합계가 덜 세어졌다는 사실을 같은 줄로 알린다. */
  hasUnconfirmedFood: boolean
}) {
  const { t } = useTranslation("common")
  // i18next 의 t 는 키 리터럴 타입이라 조립 함수의 느슨한 시그니처에 맞춰 감싼다.
  const tr: Translate = (key, values) =>
    String(t(key as never, values as never))
  const { prose } = report
  /*
    추천 식단에는 음식 조합과 선택 이유를 표시한다. 수치 환산이나 조리 팁을 대신
    끼워 넣으면 식단 추천으로 오해되므로 서버 remainingTip만 사용한다.
  */
  const recommendation =
    [prose.remainingTip]
      .map((line) => line?.trim() ?? "")
      .find((line) => line.length > 0) ?? recommendationFallback(report, tr)
  /*
    문장은 시안 틀(`reportCopy`)로 서버 수치에서 조립한다. 조립 재료가 없으면(집중 영양소
    없음) 서버가 쓴 문장으로 물러선다 — 빈 헤드라인을 두지 않는다.
  */
  const copy = buildReportCopy(report, tr, ingredients)
  const headline = copy?.headline ?? prose.headline
  const evidence = copy?.evidence ?? prose.evidence
  const segmentTotal = (copy?.segments ?? []).reduce(
    (sum, seg) => sum + seg.value,
    0,
  )
  const segments = (copy?.segments ?? []).map((seg) => ({
    ...seg,
    share: segmentTotal > 0 ? seg.value / segmentTotal : 0,
  }))

  return (
    <View style={styles.insight}>
      <EmphasizedText
        style={[styles.headline, { color: strong }]}
        emphasisColor={strong}
        lineBreakStrategyIOS="hangul-word"
        textBreakStrategy="balanced"
      >
        {headline}
      </EmphasizedText>

      {segments.length > 0 ? (
        <View style={styles.splitWrap}>
          <View style={styles.legend}>
            {/* 지난 끼니가 둘이면 key "past" 가 겹친다(아침·점심) — 자리로 가른다. */}
            {segments.map((seg, index) => (
              <View key={`${seg.key}-${index}`} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: INK.split[Math.min(index, 2)] },
                  ]}
                />
                <Text style={[styles.legendLabel, { color: strong }]}>
                  {seg.key === "remaining"
                    ? t("foodResult.remainingBudget")
                    : seg.label}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.splitTrack}>
            {segments.map((seg, index) =>
              seg.value > 0 ? (
                <View
                  key={`${seg.key}-${index}`}
                  style={[
                    styles.splitSeg,
                    {
                      flex: Math.max(seg.share, 0.2),
                      backgroundColor: INK.split[Math.min(index, 2)],
                    },
                  ]}
                >
                  <Text
                    style={styles.splitSegLabel}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    {bareNumber(seg.text)}
                  </Text>
                </View>
              ) : null,
            )}
          </View>
        </View>
      ) : null}

      {hasUnconfirmedFood ? (
        <Text
          style={[styles.evidence, { color: muted }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("foodResult.unknownHint")}
        </Text>
      ) : null}

      {evidence.length > 0 ? (
        <View style={{ gap: 4 }}>
          {evidence.map((line) => (
            <EmphasizedText
              key={line}
              style={[styles.evidence, { color: strong }]}
              emphasisColor={strong}
              emphasisWeight="500"
              lineBreakStrategyIOS="hangul-word"
            >
              {line}
            </EmphasizedText>
          ))}
        </View>
      ) : null}

      {/* 시안의 "추천 음식" 카드 — 바꿔 먹기 한 줄, 없으면 조리 팁, 그것도 없으면 한눈에. */}
      {recommendation ? (
        <View style={[styles.well, { backgroundColor: wellColor }]}>
          <Text style={[styles.wellLabel, { color: muted }]}>
            {t("foodResult.recommend")}
          </Text>
          <EmphasizedText
            style={[styles.wellText, { color: strong }]}
            emphasisColor={strong}
            emphasisWeight="500"
            lineBreakStrategyIOS="hangul-word"
          >
            {recommendation}
          </EmphasizedText>
        </View>
      ) : null}
    </View>
  )
}

function VerdictBadge({
  level,
  label,
  isDark,
}: {
  level: VerdictLevel
  label: string
  isDark: boolean
}) {
  const tone = verdictTone(level, isDark)
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text style={[styles.badgeLabel, { color: tone.fg }]}>{label}</Text>
    </View>
  )
}

/** 도넛 60 — 하루 권장량 대비 오늘 누적 비율. 색은 상태가 정한다(넘김·빠듯·여유). */
function NutrientDonut({
  budget,
  isFocus,
  strong,
  muted,
  trackColor,
  isDark,
  mealAmount,
  nutritionUnknown,
}: {
  budget: ReportBudget
  isFocus: boolean
  strong: string
  muted: string
  trackColor: string
  isDark: boolean
  /** DB 재료 합으로 낸 이 끼니 몫. null 이면 서버 값(thisMeal). */
  mealAmount: number | null
  /** 재료가 있는데 전부 영양 미확정 — 이 끼니 몫은 0 이 아니라 "모른다". */
  nutritionUnknown: boolean
}) {
  const { t } = useTranslation("common")
  const tr: Translate = (key, values) =>
    String(t(key as never, values as never))
  const ratio = budget.usedRatio === null ? null : Math.max(0, budget.usedRatio)
  const percent = ratio === null ? null : Math.round(ratio * 100)
  /*
    한도를 모르면(체중 없는 단백질 등) 비율이 null 이다. 그것을 "ok"(초록)로 그리면
    "모른다" 가 "안전하다" 로 읽힌다 — 중립 회색 톤이 따로 있다(2026-09-05 검수).
  */
  const tone: ReportTone =
    ratio === null
      ? "unknown"
      : budget.isOver || ratio >= 1
        ? "over"
        : ratio >= 0.8
          ? "tight"
          : "ok"
  // 링은 밝은 색, 숫자는 바닥에 맞는 톤 — 노란 숫자는 흰 바닥에서 안 읽힌다(reportInk 머리말).
  const color = INK.ring[tone]
  const textColor = isDark ? INK.textOnDark[tone] : INK.textOn[tone]
  // 고리·숫자 크기를 통일하고 집중 항목은 이름의 굵기와 작은 중립 표시로 구분한다.
  const size = 60
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const shown = Math.min(1, ratio ?? 0)
  // 네 고리는 동시에 차오른다. 항목마다 시차를 주어 시선을 분산시키지 않는다.
  const progress = useSharedValue(0)
  useEffect(() => {
    progress.value = withDelay(
      80,
      withTiming(shown, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    )
  }, [progress, shown])
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }))

  return (
    <View style={styles.donutCell}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={stroke}
            fill="none"
          />
          {shown > 0 ? (
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              animatedProps={ringProps}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          ) : null}
        </Svg>
        <View style={styles.donutCenter} pointerEvents="none">
          <Text
            style={[styles.donutPercent, { color: textColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {percent === null ? "–" : `${percent}%`}
          </Text>
        </View>
      </View>
      <View style={styles.donutLabelWrap}>
        {isFocus ? (
          <View
            accessible={false}
            style={[
              styles.donutFocusMark,
              {
                backgroundColor: isDark ? INK.textOnDark.over : INK.ring.over,
              },
            ]}
          />
        ) : null}
        <Text
          style={[
            styles.donutLabel,
            { color: isFocus ? strong : muted },
            isFocus && styles.donutLabelFocus,
          ]}
          numberOfLines={1}
        >
          {budget.label}
        </Text>
      </View>
      <Text style={[styles.donutValue, { color: strong }]} numberOfLines={1}>
        {/* 전부 미확정이면 서버 합계(0)를 그리지 않는다 — "0mg" 은 "안 먹었다" 로 읽힌다. */}
        {nutritionUnknown
          ? tr("foodResult.unknownCalories")
          : formatAmount(budget.nutrient, mealAmount ?? budget.thisMeal)}
      </Text>
    </View>
  )
}

function FoodRow({
  food,
  strong,
  muted,
  isDark,
}: {
  food: ReportFoodFact
  strong: string
  muted: string
  isDark: boolean
}) {
  const { t } = useTranslation("common")
  // i18next 의 t 는 키 리터럴 타입이라 조립 함수의 느슨한 시그니처에 맞춰 감싼다.
  const tr: Translate = (key, values) =>
    String(t(key as never, values as never))
  const tone = verdictTone(food.level, isDark)
  /*
    설명은 **수치 한 줄**이다(시안 "칼륨 420mg이 식사에 …"). AI 가 쓴 음식 문장(foodNotes)은
    두 줄을 넘겨 "…" 로 잘리고 배지와 높이가 어긋났다(실측 2026-09-04). 문장은 리포트 본문이
    이미 말하고, 줄에는 이 재료가 낸 양과 하루 기준 비중만 둔다.
  */
  const note =
    food.nutrientLabel && food.amountText
      ? food.dailyPercent !== null
        ? tr("mealReport.foodDailyPercent", {
            nutrient: food.nutrientLabel,
            amount: food.amountText,
            percent: food.dailyPercent,
          })
        : `${food.nutrientLabel} ${food.amountText}`
      : null
  return (
    <View style={styles.foodRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={[styles.foodName, { color: strong }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {food.name}
          {food.grams !== null ? ` ${Math.round(food.grams)}g` : ""}
        </Text>
        {note ? (
          <Text
            style={[styles.foodNote, { color: muted }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {note}
          </Text>
        ) : null}
      </View>
      <View style={[styles.foodBadge, { backgroundColor: tone.bg }]}>
        <Text style={[styles.foodBadgeLabel, { color: tone.fg }]}>
          {verdictLabel(food.level, tr)}
        </Text>
      </View>
    </View>
  )
}

/**
 * 하단 버튼. **채워진 브랜드는 화면에 하나뿐이다** — 두 개가 같은 무게면 무엇을 눌러야 할지
 * 사람이 고르지 못한다. 보조는 연한 브랜드 면(권하는 쪽), 파괴는 **중립 면**(권하지 않는 쪽).
 * 파괴를 브랜드 틴트 위에 올리면 "지우기" 가 추천 동작처럼 보인다.
 */
function FooterButton({
  label,
  onPress,
  tone,
  disabled,
  softColor = INK.brandSoft,
  neutralColor = INK.band,
  isDark = false,
}: {
  label: string
  onPress: () => void
  tone: "primary" | "soft" | "danger"
  disabled?: boolean
  softColor?: string
  neutralColor?: string
  isDark?: boolean
}) {
  const bg =
    tone === "primary"
      ? INK.brand
      : tone === "danger"
        ? neutralColor
        : softColor
  const fg =
    tone === "primary"
      ? "#FFFFFF"
      : tone === "danger"
        ? // 어두운 면 위 짙은 빨강은 안 읽힌다(다크 실측 2026-09-04) — 다크는 밝은 톤.
          isDark
          ? INK.textOnDark.over
          : INK.textOn.over
        : INK.brand
  // 누르면 살짝 눌렸다가 스프링으로 돌아온다 — 손끝에 반응이 있어야 "됐다" 를 안다.
  const press = useSharedValue(0)
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.03 }],
    opacity: disabled ? 0.6 : 1 - press.value * 0.1,
  }))
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        hapticSelection()
        onPress()
      }}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 80 })
      }}
      onPressOut={() => {
        press.value = withSpring(0, { damping: 14, stiffness: 220 })
      }}
      disabled={disabled}
      style={{ flex: 1 }}
    >
      <Animated.View
        style={[styles.footerButton, { backgroundColor: bg }, pressStyle]}
      >
        <Text
          style={[styles.footerButtonLabel, { color: fg }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  )
}

/**
 * ── 4pt 격자 ─────────────────────────────────────────────────────────────
 * 이 화면의 모든 간격·높이·줄높이·반경은 4 의 배수다(`tests/homeFourPointGrid.test.ts` 가 지킨다).
 * 시안 실측치(2026-09-04, write.svg)는 격자로 반올림했다 — 47.5 → 48, 57 → 56, 71 → 72,
 * 26 → 24, 29 → 28, 줄높이 23/25/27 → 24/24/28. 옆 여백은 **한 값**(X=24)이고, 줄은 전부
 * `alignItems:"center"` 로 세로 가운데를 맞춘다. 글자 크기는 격자 대상이 아니다(줄높이가 대상).
 */
const X = 24
const S = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32 } as const
/**
 * ── 최소 여백 ─────────────────────────────────────────────────────────────
 * 격자만으로는 "붙어 보임" 을 못 막는다(2026-09-04 실측: 집중 카드 안 도넛 값이 카드 바닥에
 * 닿았다 — 안쪽 합 116 > 셀 112). 그래서 세 개의 바닥값을 두고 셀은 **고정 높이가 아니라
 * 최소 높이**로 잡아 내용이 넘치면 셀이 자란다.
 *   INSET   면(카드·우물·타일) 안쪽에서 글자까지 ≥ 16
 *   EDGE    작은 면(배지·칩·도넛 셀) 안쪽 ≥ 4
 *   TOUCH   누르는 것의 한 변 ≥ 44
 * `tests/homeFourPointGrid.test.ts` 가 이 셋을 소스에서 확인한다.
 */
const MIN = { INSET: 16, EDGE: 4, TOUCH: 44 } as const
/**
 * ── 리듬 3단 ──────────────────────────────────────────────────────────────
 * 화면의 세로 간격은 **세 값만** 쓴다. 값이 다섯 개가 되는 순간 "왜 여기만 18인가" 가
 * 생기고, 그게 곧 정렬이 무너져 보이는 이유다.
 *   SECTION 24  화제가 바뀐다(띠 아래 첫 블록, 섹션과 섹션)
 *   BLOCK   16  같은 화제 안에서 덩어리가 바뀐다(헤드라인 ↔ 막대 ↔ 근거)
 *   ITEM     8  한 덩어리 안의 줄 사이(범례 항목, 라벨과 값)
 */
const RHYTHM = { SECTION: 24, BLOCK: 16, ITEM: 8 } as const

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  header: {
    height: MIN.TOUCH,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: X - S[3],
  },
  headerSide: { width: MIN.TOUCH, height: MIN.TOUCH },
  headerButton: { alignItems: "center", justifyContent: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    lineHeight: S[6],
    letterSpacing: -0.3,
    fontWeight: "600",
  },
  titleRow: {
    marginTop: S[1],
    // 제목은 두 줄까지 간다(lineHeight 24 × 2 = 48 > 44) — 고정 높이면 사진 위로 넘친다.
    minHeight: MIN.TOUCH,
    paddingHorizontal: X,
    flexDirection: "row",
    alignItems: "center",
    gap: S[3],
  },
  title: {
    flex: 1,
    fontSize: 17,
    lineHeight: S[6],
    letterSpacing: -0.34,
    fontWeight: "700",
  },
  titleMeta: { flexDirection: "row", alignItems: "center", gap: S[2] },
  servings: { fontSize: 15, lineHeight: S[5], fontWeight: "500" },
  photo: {
    marginTop: S[2],
    marginHorizontal: X,
    borderRadius: S[3],
    overflow: "hidden",
  },
  textMealRow: {
    marginHorizontal: X,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S[3],
  },
  textMealLabel: { fontSize: 13, lineHeight: S[5], fontWeight: "400" },
  textMealEdit: {
    minHeight: MIN.TOUCH,
    flexDirection: "row",
    alignItems: "center",
    gap: S[1],
  },
  textMealEditLabel: { fontSize: 13, lineHeight: S[5], fontWeight: "500" },
  chipCloud: {
    position: "absolute",
    left: S[3],
    right: S[8] * 3,
    bottom: S[3],
    flexDirection: "row",
    flexWrap: "wrap",
    gap: S[2],
  },
  chip: {
    minHeight: S[6],
    paddingVertical: S[1],
    paddingHorizontal: S[3],
    borderRadius: S[3],
    justifyContent: "center",
  },
  chipLabel: {
    fontSize: 13,
    lineHeight: S[4],
    fontWeight: "600",
    color: "#FFFFFF",
  },
  editButton: {
    position: "absolute",
    right: S[2],
    bottom: S[2],
    height: S[8],
    paddingHorizontal: S[3],
    borderRadius: S[2],
    backgroundColor: INK.photoControl,
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonLabel: {
    fontSize: 14,
    lineHeight: S[5],
    fontWeight: "600",
    color: INK.strong,
  },
  insight: {
    paddingHorizontal: X,
    paddingTop: RHYTHM.SECTION,
    gap: RHYTHM.BLOCK,
  },
  headline: {
    fontSize: 17,
    lineHeight: S[6],
    letterSpacing: -0.34,
    fontWeight: "600",
  },
  reportPending: {
    paddingHorizontal: X,
    paddingTop: S[4],
    fontSize: 15,
    lineHeight: S[5],
    fontWeight: "500",
  },
  splitWrap: { gap: RHYTHM.ITEM },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: S[3],
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: S[2] },
  legendDot: { width: S[2], height: S[2], borderRadius: S[1] },
  legendLabel: { fontSize: 13, lineHeight: S[4], fontWeight: "500" },
  splitTrack: {
    flexDirection: "row",
    height: S[6],
    borderRadius: S[2],
    overflow: "hidden",
    gap: 2,
  },
  splitSeg: { alignItems: "center", justifyContent: "center" },
  // 숫자는 범례와 같은 크기로 두고 그림자 없이 정돈한다.
  splitSegLabel: {
    fontSize: 14,
    lineHeight: S[4],
    fontWeight: "600",
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
  },
  evidence: {
    fontSize: 15,
    lineHeight: S[6],
    letterSpacing: -0.3,
    fontWeight: "500",
  },
  well: {
    marginTop: 0,
    borderRadius: S[3],
    paddingHorizontal: S[5],
    paddingVertical: MIN.INSET,
    gap: S[1],
  },
  wellLabel: { fontSize: 13, lineHeight: S[4], fontWeight: "500" },
  wellText: {
    fontSize: 15,
    lineHeight: S[6],
    letterSpacing: -0.34,
    fontWeight: "500",
  },
  band: { height: RHYTHM.BLOCK, marginTop: RHYTHM.SECTION },
  sectionTitle: {
    paddingHorizontal: X,
    marginTop: RHYTHM.BLOCK,
    marginBottom: RHYTHM.ITEM,
    lineHeight: S[6],
    fontSize: 17,
    letterSpacing: -0.34,
    fontWeight: "600",
  },
  caloriesRow: {
    paddingHorizontal: X,
    minHeight: S[8] + S[6],
    paddingVertical: S[2],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  caloriesLabel: { fontSize: 13, lineHeight: S[4], fontWeight: "500" },
  // 열량은 제목보다 한 단계 크게, 다른 수치와 같은 굵기로 읽힌다.
  caloriesValue: {
    fontSize: 20,
    lineHeight: S[7],
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  badge: {
    minHeight: S[6],
    paddingVertical: S[1],
    paddingHorizontal: S[2],
    borderRadius: S[3],
    alignItems: "center",
    justifyContent: "center",
  },
  badgeLabel: { fontSize: 12, lineHeight: S[4], fontWeight: "600" },
  // 짧은 판정은 내용에 맞는 폭으로, 긴 판정은 글자를 자르지 않고 표시한다.
  foodBadge: {
    minHeight: S[7],
    paddingHorizontal: S[2],
    paddingVertical: S[1],
    // 알약 — 높이(28)의 절반이면 격자를 벗어나지 않으면서 완전히 둥글다.
    borderRadius: S[7] / 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  foodBadgeLabel: { fontSize: 13, lineHeight: S[5], fontWeight: "600" },
  donutRow: {
    marginTop: RHYTHM.ITEM,
    paddingHorizontal: X,
    gap: S[2],
    flexDirection: "row",
    justifyContent: "space-between",
  },
  // 네 셀은 가용 폭을 나눠 쓰고, 고리·라벨·수치 사이의 여백은 유지한다.
  donutCell: {
    flex: 1,
    minWidth: 0,
    minHeight: S[8] * 3 + S[4],
    paddingVertical: MIN.EDGE,
    alignItems: "center",
    justifyContent: "space-between",
    gap: S[1],
  },
  donutCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: S[2],
  },
  // 링 안: 숫자와 % 가 같은 크기·같은 줄. 크기가 다른 % 를 붙이면 글줄이 오른쪽으로 치우쳐
  // 링 중심과 어긋난다(실측). 링 안지름 44 안에서 "155%" 가 들어가는 크기가 13 이다.
  donutPercent: {
    fontSize: 13,
    lineHeight: S[4],
    fontWeight: "600",
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  donutLabel: { fontSize: 13, lineHeight: S[4], fontWeight: "400" },
  donutLabelWrap: {
    minHeight: S[4],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S[1],
  },
  donutLabelFocus: { fontWeight: "600" },
  // 강조점은 라벨 앞에서 글줄의 상하 중앙에 맞춘다.
  donutFocusMark: {
    width: S[1],
    height: S[1],
    borderRadius: S[1],
  },
  donutValue: {
    fontSize: 15,
    lineHeight: S[5],
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  foodRow: {
    minHeight: S[8] * 2 + S[2],
    paddingHorizontal: X,
    paddingVertical: S[4],
    flexDirection: "row",
    alignItems: "center",
    gap: S[3],
  },
  foodName: {
    fontSize: 15,
    lineHeight: S[5],
    letterSpacing: -0.34,
    fontWeight: "600",
  },
  foodNote: { fontSize: 13, lineHeight: S[5], fontWeight: "400" },
  swapRow: {
    minHeight: S[8] + S[4],
    paddingVertical: S[3],
    paddingHorizontal: X,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S[3],
  },
  swapNames: {
    flexDirection: "row",
    alignItems: "center",
    gap: S[2],
    flexShrink: 1,
  },
  swapFrom: { fontSize: 15, lineHeight: S[5], fontWeight: "500" },
  swapTo: { fontSize: 15, lineHeight: S[5], fontWeight: "600" },
  swapDelta: {
    fontSize: 15,
    lineHeight: S[5],
    fontWeight: "600",
    flexShrink: 1,
  },
  footerFade: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 36,
  },
  footer: {
    flexShrink: 0,
    paddingTop: S[3],
    paddingHorizontal: S[5],
    gap: S[3],
  },
  footerButtons: { flexDirection: "row", gap: S[2] },
  footerButton: {
    minHeight: S[8] + S[6],
    paddingVertical: S[3],
    paddingHorizontal: S[3],
    borderRadius: S[4],
    alignItems: "center",
    justifyContent: "center",
  },
  footerButtonLabel: {
    fontSize: 17,
    lineHeight: S[6],
    letterSpacing: -0.34,
    fontWeight: "600",
    textAlign: "center",
    flexShrink: 1,
  },
  consultLink: {
    height: MIN.TOUCH,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S[1],
  },
  consultLabel: {
    fontSize: 15,
    lineHeight: S[6],
    fontWeight: "500",
    flexShrink: 1,
  },
})
