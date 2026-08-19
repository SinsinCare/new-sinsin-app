import { ScrollView, Image, Pressable } from "react-native"
import { AppModal } from "@/src/shared/components/AppModal"
import { useState, useRef, useCallback, useEffect } from "react"
import { router } from "expo-router"
import { YStack, XStack, Text, View } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import ViewShot, { captureRef } from "react-native-view-shot"
import * as Sharing from "expo-sharing"
import Share, { Social } from "react-native-share"
import { tokens } from "@/src/theme/tokens"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import type {
  FoodAnalysisUpdateRequest,
  FoodAnalysisUpdateResult,
  FoodCameraAnalyzeResult,
} from "@/src/types"
import { normalizeFoodAnalysisResult } from "@/src/shared/utils/foodAnalysisResult"
import type { MealType } from "../types"
import { getRestrictionStyle } from "../utils/getRestrictionStyle"
import { MacroBar } from "./record/MacroBar"
import { Icon } from "@/src/shared/components/Icon"
import { FoodResultEdit } from "./FoodResultEdit"
import { MealReportView } from "@/src/features/food-report/components/MealReportView"
import { useMealReport } from "@/src/features/food-report/hooks/useMealReport"
import { FoodNutrientDonuts } from "./FoodNutrientDonuts"
import { ShareCard } from "./ShareCard"
import { useMealPersistenceActions } from "@/src/features/food-analysis"
import { MealDeleteConfirmSheet } from "./MealDeleteConfirmSheet"
import { useTranslation } from "react-i18next"
import {
  trackAnalyticsEvent,
  type AnalyticsFoodRecordSource,
} from "@/src/features/analytics"

import {
  ModalOverlayHost,
  afterSiblingModalsGone,
} from "@/src/shared/components"

import { showErrorToast } from "@/src/lib/toast"
import { showActionSheet, showConfirm } from "@/src/lib/dialog"

interface FoodAnalysisResultProps {
  /**
   * 어느 결과 화면인가. 같은 컴포넌트가 세 번 서는데(방금 분석 · 저장된 기록 ·
   * 복구된 결과) 셋은 전환율이 다른 별개의 여정이고, 화면 축은 셋 다 `home` 이라
   * 절대 안 갈린다. 선택 값이 아니라 **필수**인 이유가 이것이다.
   */
  source: AnalyticsFoodRecordSource
  result: FoodCameraAnalyzeResult | null
  open: boolean
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

/**
 * 리포트 하단 공유 카드 — 제목은 행동, 캡션은 그 행동의 결과를 말한다.
 * "공유하기" 같은 기능 이름 대신 "무슨 일이 생기는지"를 쓴다(UX 라이팅).
 */
function ShareActionCard({
  icon,
  title,
  caption,
  isDarkMode,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  caption: string
  isDarkMode: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.85 : 1 })}
    >
      <YStack
        backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
        borderRadius={20}
        paddingVertical={14}
        paddingHorizontal={14}
        gap={8}
        flex={1}
      >
        <XStack
          width={34}
          height={34}
          borderRadius={999}
          backgroundColor={isDarkMode ? "#2E2E33" : "#F2F3F5"}
          alignItems="center"
          justifyContent="center"
        >
          <Ionicons
            name={icon}
            size={17}
            color={
              isDarkMode ? tokens.color.textDarkSub.val : tokens.color.grey4.val
            }
          />
        </XStack>
        <YStack gap={2}>
          <Text
            fontSize={14}
            fontWeight="700"
            color={isDarkMode ? "$textDark" : "$color"}
          >
            {title}
          </Text>
          <Text
            fontSize={11.5}
            lineHeight={16}
            color="$colorSubtle"
            lineBreakStrategyIOS="hangul-word"
          >
            {caption}
          </Text>
        </YStack>
      </YStack>
    </Pressable>
  )
}

const MEAL_TYPE_ICON: Record<MealType, string> = {
  BREAKFAST: "sunny-outline",
  LUNCH: "partly-sunny-outline",
  DINNER: "moon-outline",
  SNACKS: "cafe-outline",
}

const ENGLISH_PORTION_UNITS: Record<
  string,
  { singular: string; plural: string }
> = {
  인분: { singular: "serving", plural: "servings" },
  serving: { singular: "serving", plural: "servings" },
  servings: { singular: "serving", plural: "servings" },
  개: { singular: "piece", plural: "pieces" },
  piece: { singular: "piece", plural: "pieces" },
  pieces: { singular: "piece", plural: "pieces" },
  잔: { singular: "cup", plural: "cups" },
  컵: { singular: "cup", plural: "cups" },
  cup: { singular: "cup", plural: "cups" },
  cups: { singular: "cup", plural: "cups" },
  glass: { singular: "glass", plural: "glasses" },
  glasses: { singular: "glass", plural: "glasses" },
  공기: { singular: "bowl", plural: "bowls" },
  국그릇: { singular: "bowl", plural: "bowls" },
  bowl: { singular: "bowl", plural: "bowls" },
  bowls: { singular: "bowl", plural: "bowls" },
  대접: { singular: "large bowl", plural: "large bowls" },
  "large bowl": { singular: "large bowl", plural: "large bowls" },
  조각: { singular: "piece", plural: "pieces" },
  큰술: { singular: "tbsp", plural: "tbsp" },
  tbsp: { singular: "tbsp", plural: "tbsp" },
  작은술: { singular: "tsp", plural: "tsp" },
  tsp: { singular: "tsp", plural: "tsp" },
}

const KOREAN_PORTION_UNITS: Record<string, string> = {
  serving: "인분",
  servings: "인분",
  piece: "개",
  pieces: "개",
  cup: "컵",
  cups: "컵",
  glass: "잔",
  glasses: "잔",
  bowl: "공기",
  bowls: "공기",
  "large bowl": "대접",
  "large bowls": "대접",
  tbsp: "큰술",
  tsp: "작은술",
}

function formatFoodPortion(
  value: number | null,
  unit: string,
  language: "ko" | "en",
): string {
  const valueText = value == null ? "" : String(value)
  const normalizedUnit = unit.trim().toLowerCase()
  if (language === "ko") {
    return `${valueText}${KOREAN_PORTION_UNITS[normalizedUnit] ?? unit}`
  }

  if (normalizedUnit === "g" || normalizedUnit === "ml") {
    return `${valueText}${normalizedUnit}`
  }
  const forms = ENGLISH_PORTION_UNITS[normalizedUnit] ?? {
    singular: unit,
    plural: unit,
  }
  const displayUnit = value === 1 ? forms.singular : forms.plural
  return [valueText, displayUnit].filter(Boolean).join(" ")
}

export function FoodAnalysisResult({
  source,
  result,
  open,
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
  const language = (i18n.resolvedLanguage ?? i18n.language).startsWith("en")
    ? "en"
    : "ko"
  const insets = useSafeAreaInsets()
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
  /**
   * 삭제 확인 시트의 대기표. 컨트롤러의 confirmDelete 프라미스를 시트의
   * 그대로 두기/지우기 버튼이 풀어 준다 — 무엇을 지우는지 카드로 먼저 보여주는
   * 시트(MealDeleteConfirmSheet)가 기본 확인창을 대신한다.
   */
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

  useEffect(() => {
    setDisplayImageUri(imageUri ?? result?.imageUrl ?? undefined)
    setImageFailed(false)
  }, [imageUri, result?.imageUrl])

  /**
   * 이 결과를 한 번이라도 손봤는가. 저장 없이 나간 사람 중 **고쳐 놓고도 버린** 몫이
   * 여기서만 갈린다 — "결과가 틀렸다" 와 "고쳐도 안 맞았다" 는 처방이 다르다.
   *
   * state 가 아니라 ref 인 이유는 이 값이 아무것도 그리지 않기 때문이다. state 로 두면
   * 수정할 때마다 결과 화면 전체가 한 번 더 그려진다.
   */
  const editedRef = useRef(false)

  /**
   * 나가기 확인창이 이미 떠 있는가. `handleClosePress` 의 재진입을 막는다.
   *
   * **이 훅은 조기 반환(`if (!displayResult) return null`)보다 위에 있어야 한다.**
   * 아래에 두면 결과가 없을 때는 호출되지 않고 생기면 호출돼 렌더마다 훅 개수가
   * 달라진다 — `Rendered more hooks than during the previous render` 로 화면이 죽는다.
   * (실제로 그렇게 한 번 깨뜨렸다. 이 파일은 조기 반환이 중간에 있어서 특히 쉽다.)
   *
   * 왜 필요한지는 `handleClosePress` 머리말에 적었다.
   */
  const closingRef = useRef(false)

  useEffect(() => {
    setIsAddingToRecord(false)
    setIsEdit(false)
    editedRef.current = false
  }, [result?.foodAnalysisResultId])

  // 리포트는 서버가 만들어 저장한다. 실패해도 화면은 예전 한줄평으로 버틴다.
  // `result` 는 신규 분석 경로에만 들어온다. 저장된 다이어리를 다시 열 때는
  // displayResult 로만 오므로 둘 다 본다.
  // isLoading(=pending+fetching)을 쓴다 — 쿼리가 비활성이면 pending 이
  // 영원히 true 라 스켈레톤이 안 사라진다.
  const { data: mealReport, isLoading: isReportPending } = useMealReport(
    displayResult?.foodAnalysisResultId ?? result?.foodAnalysisResultId,
  )

  const isDarkMode = useAppColorScheme() === "dark"
  const shareCardRef = useRef<ViewShot>(null)
  const FACEBOOK_APP_ID = "1306082818293951"

  /*
    ■ 이 화면의 공유가 두 번 깨졌다 — 원인이 서로 다르다

    (1) 2026-08-10 "눌러도 아무 일도 안 일어남"
        공유 시트는 RN 모달이 아니라 **네이티브 present** 다. iOS 는 present/dismiss 가
        이미 진행 중이면 새 present 를 **조용히 거부한다**. 액션시트의 dismiss 전환이
        끝나기 전이라 매번 거부됐다. → `afterModalTransitions()` 로 전이 큐를 기다렸다.

    (2) 2026-08-19 "시트가 컴포넌트 뒤에 떠서 안 보임"  ← 지금 고치는 것
        (1)의 대기로는 부족했다. 전이 큐가 비었다는 건 "움직이는 모달이 없다" 이지
        **"떠 있는 모달이 없다"** 가 아니다. 액션시트가 가만히 떠 있으면 큐는 비어 있다.

        그 상태에서 공유를 부르면 계층이 어긋난다 — expo-sharing 은
        `keyWindow.rootViewController` 에서 **topmost 까지 타고 올라가** present 하는데
        (expo-modules-core `Utilities.swift`), RN Modal 은 자기 뷰트리의
        `reactViewController` 에 present 한다(topmost 탐색 없음). 이 화면은
        `presentationStyle="pageSheet"` 라 밑의 VC 가 살아 있어서, 둘이 고른 VC 가
        갈리면 활동 시트가 **pageSheet 뒤로 들어간다.** 거부가 아니라 "떠 있는데 안 보임".

        → `afterSiblingModalsGone(1)`. 시간이 아니라 **레지스트리가 비는 것**을 기다린다.
        인자 1 은 이 결과 모달 자신 — 그건 남아 있어야 한다.
  */
  const shareToSystemSheet = useCallback(async () => {
    const uri = await captureRef(shareCardRef, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    })
    await afterSiblingModalsGone(1)
    /*
      **못 쓰면 조용히 넘어가지 않는다.** 종전에는 `if (available)` 뿐이라 사용할 수 없을 때
      아무 일도 일어나지 않았다 — 고장이 정상처럼 보이는 바로 그 모양이다. 던지면 호출부가
      안내를 띄운다.
    */
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("sharing_unavailable")
    }
    await Sharing.shareAsync(uri, {
      mimeType: "image/png",
      UTI: "public.png",
    })
  }, [])

  const shareToInstagramStories = useCallback(async () => {
    const base64 = await captureRef(shareCardRef, {
      format: "png",
      quality: 1,
      result: "base64",
    })
    // 인스타그램도 네이티브 present 다 — 위 `shareToSystemSheet` 와 같은 이유로 기다린다.
    await afterSiblingModalsGone(1)
    await Share.shareSingle({
      social: Social.InstagramStories,
      appId: FACEBOOK_APP_ID,
      stickerImage: `data:image/png;base64,${base64}`,
      backgroundBottomColor: "#FFFFFF",
      backgroundTopColor: "#FFFFFF",
    })
  }, [])

  /**
   * 카카오톡으로 공유.
   *
   * **`react-native-share` 의 `Social` enum 에 카카오가 없다**(facebook·instagram·
   * whatsapp·telegram… 뿐). 그래서 `shareSingle` 로는 못 보낸다. 대신 시스템 공유
   * 시트를 열되 **카카오톡을 목적지로 지목**하는 방식이 아니라, iOS 활동 시트에서
   * 사용자가 카카오톡을 고르게 한다 — 우리가 하는 일은 이미지 파일을 그쪽으로
   * 넘길 수 있는 상태로 만들어 시트를 여는 것까지다.
   *
   * `app.json` 의 `LSApplicationQueriesSchemes` 에 `kakaotalk`·`kakaolink` 가
   * 이미 있으므로 활동 시트에 카카오톡이 노출된다. 설치돼 있지 않으면 목록에
   * 안 뜨고, 그건 실패가 아니라 정상이다.
   */
  const shareToKakao = useCallback(async () => {
    const uri = await captureRef(shareCardRef, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    })
    await afterSiblingModalsGone(1)
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("sharing_unavailable")
    }
    await Sharing.shareAsync(uri, {
      mimeType: "image/png",
      UTI: "public.png",
      dialogTitle: t("foodResult.shareKakao"),
    })
  }, [t])

  /**
   * 공유. 예전엔 iOS 만 ActionSheetIOS 로 물었고 안드로이드는 묻지 않은 채
   * 인스타를 먼저 시도하다 실패하면 일반 공유로 넘어갔다 — 같은 버튼이 OS 마다
   * 다르게 굴었다. 이제 두 OS 모두 같은 시트에서 고른다.
   *
   * 카카오톡을 **따로 뺀 이유**: 국내 사용자의 공유는 사실상 카톡 하나다.
   * `다른 앱으로 공유` 안에 묻어 두면 활동 시트에서 한 번 더 찾아야 한다.
   */
  const handleShare = useCallback(async () => {
    if (!shareCardRef.current) return

    const picked = await showActionSheet({
      actions: [
        { label: t("foodResult.shareKakao") },
        { label: t("foodResult.shareInstagram") },
        { label: t("foodResult.shareOther") },
      ],
      cancelLabel: t("action.cancel"),
    })
    if (picked == null) return

    try {
      if (picked === 0) await shareToKakao()
      else if (picked === 1) await shareToInstagramStories()
      else await shareToSystemSheet()
    } catch {
      // 인스타가 없거나 실패해도 공유 자체는 살려 준다.
      if (picked === 1) {
        try {
          await shareToSystemSheet()
          return
        } catch {
          // 아래 공통 안내로 떨어진다
        }
        showErrorToast(
          t("foodResult.instagramErrorTitle"),
          t("foodResult.instagramErrorBody"),
        )
        return
      }
      /*
        `다른 앱으로 공유` 가 실패했는데 "인스타그램으로 열지 못했어요" 를 띄우던 자리다.
        고르지도 않은 앱 이름이 나오면 사용자는 자기가 뭘 잘못 눌렀는지 되짚게 된다.
      */
      showErrorToast(
        t("foodResult.shareErrorTitle"),
        t("foodResult.shareErrorBody"),
      )
    }
  }, [t, shareToKakao, shareToInstagramStories, shareToSystemSheet])

  if (!displayResult) return null

  const effectiveResult = normalizeFoodAnalysisResult(displayResult)

  const handleEditPress = () => {
    setIsEdit(true)
  }

  /**
   * 아직 기록에 담지 않은 결과를 두고 나가는 자리.
   *
   * 예전엔 이 확인창만 손으로 만든 `absoluteFill` 오버레이였다 — 앱의 확인창을
   * V2Modal 로 모을 때 여기만 남았고, 정작 사용자가 제일 자주 보는 확인창이
   * 혼자 다른 얼굴이었다. `showConfirm` 은 이 화면 안의 `<ModalOverlayHost />`
   * 를 타므로 열린 RN Modal 안에서도 뜬다(ModalOverlayHost 머리말).
   *
   * ■ **확인창이 두 장 뜨던 것** (2026-08-19 수정)
   *
   *   이 화면에는 나가는 문이 **둘**이다 — 헤더의 `✕` 와 `onRequestClose`
   *   (iOS pageSheet 아래로 쓸어내리기 · 안드로이드 뒤로가기). 둘 다 이 함수를
   *   부르는데 `await showConfirm(...)` 는 **사용자가 답할 때까지 돌아오지 않는다.**
   *   그 사이 다른 문이 한 번 더 열리면 요청이 **큐에 두 개** 쌓인다.
   *
   *   `V2DialogHost` 는 큐를 순서대로 비우므로(그쪽 `settle` 주석) 사용자에게는
   *   **한 장을 닫으면 똑같은 것이 또 뜨는** 것으로 보인다. 실제 제보가 그 모양이었다.
   *
   *   특히 pageSheet 은 확인창이 떠 있는 동안에도 시트를 계속 끌 수 있어서
   *   재진입이 쉽다. 그래서 `closingRef` 로 **한 번에 하나만** 통과시킨다.
   *   그 ref 는 조기 반환보다 **위에서** 선언한다(훅 규칙 — 그쪽 주석 참고).
   */
  const handleClosePress = async () => {
    if (!showAddButton) {
      // 저장본은 이미 기록에 있다 — 잃을 것이 없으니 묻지 않고, 셀 이탈도 없다.
      onClose()
      return
    }
    // 확인창이 이미 떠 있으면 두 번째 문은 무시한다(위 머리말).
    if (closingRef.current) return
    closingRef.current = true
    /*
      확인창을 **띄운 수**와 **그래도 나간 수**가 둘 다 있어야 문구가 붙잡고 있는지
      보인다. 하나만 세면 문구를 고쳐도 좋아졌는지 알 수 없다.

      저장 버튼이 있는 두 자리(신규·복구)만 여기 온다.
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
      // 머물기를 골랐으면 다음 시도에 다시 물어야 한다. 나가는 경우에도 풀어 둔다 —
      // 이 컴포넌트는 언마운트되지 않고 `open` 만 false 가 되므로(RecordView 가 셋을
      // 항상 세운다) 잠금이 남으면 **다음 번에 확인창이 영영 안 뜬다.**
      closingRef.current = false
    }
  }

  const servingsLabel = t("foodResult.servings", {
    count: effectiveResult.servings,
  })

  const handleAddToRecordPress = async () => {
    if (isAddingToRecord) return
    setIsAddingToRecord(true)
    try {
      await onAddToRecord?.()
      onClose()
    } finally {
      setIsAddingToRecord(false)
    }
  }

  const handleAskAboutMealPress = async () => {
    if (isStartingConsultation) return
    /*
      결과 화면에서 나가는 **네 번째 문**(설계 §J2-0 정정 2). 이건 이탈이 아니라 이
      여정 최대의 전환이고, 이 이름이 없으면 상담으로 빠져나간 사람이
      `food_record_result_abandoned` 에 섞여 가장 값비싼 이탈이 부풀어 보인다.

      실패는 여기가 아니라 `useMealPersistenceActions` 의 catch 가 센다 — 그래야
      한 사건이 한 자리에서만 나가고, 실패의 갈래(`fail_kind`)가 오류 정본에서 온다.
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
      `sheet_opened{surface:'home_meal_delete'}` 가 이미 세고 있다 — 두 이름의 차가
      곧 확인 시트가 되돌린 오조작이다.
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

  return (
    <AppModal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => void handleClosePress()}
    >
      <YStack flex={1} backgroundColor={isDarkMode ? "$appBgDark" : "$appBg"}>
        {/* Header */}
        <XStack
          alignItems="center"
          paddingHorizontal={12}
          paddingTop={30}
          paddingBottom={10}
          backgroundColor={isDarkMode ? "$appBgDark" : "$appBg"}
        >
          <Pressable
            onPress={handleShare}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("foodResult.share")}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <XStack
              width={40}
              height={40}
              alignItems="center"
              justifyContent="center"
            >
              <Ionicons
                name="share-outline"
                size={22}
                color={
                  isDarkMode
                    ? tokens.color.textDark.val
                    : tokens.color.grey3.val
                }
              />
            </XStack>
          </Pressable>
          <Text
            fontSize="$5"
            fontWeight="600"
            color={isDarkMode ? "$textDark" : "$color"}
            textAlign="center"
            flex={1}
          >
            {t("foodResult.title")}
          </Text>
          <Pressable
            onPress={() => void handleClosePress()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("foodResult.close")}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <XStack
              width={40}
              height={40}
              alignItems="center"
              justifyContent="center"
            >
              <Ionicons
                name="close"
                size={22}
                color={
                  isDarkMode
                    ? tokens.color.textDark.val
                    : tokens.color.grey3.val
                }
              />
            </XStack>
          </Pressable>
        </XStack>

        <ScrollView
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 4,
            paddingBottom: insets.bottom + 100,
          }}
        >
          {/* 음식 제목 + 식사 타입 */}
          <XStack
            paddingHorizontal="$4"
            paddingVertical="$3"
            alignItems="flex-start"
            gap="$2"
          >
            <Text
              fontSize={22}
              fontWeight="700"
              color={isDarkMode ? "$textDark" : "$color"}
              flexShrink={1}
              flex={1}
              lineBreakStrategyIOS="hangul-word"
            >
              {effectiveResult.title}{" "}
              <Text fontSize="$4" color="$colorSubtle" fontWeight="700">
                {servingsLabel}
              </Text>
            </Text>
            {displayMealType && (
              <XStack
                alignItems="center"
                gap="$1"
                backgroundColor={
                  isDarkMode ? "$cardBgDark" : "$backgroundFocus"
                }
                paddingHorizontal="$3"
                paddingVertical={6}
                borderRadius="$8"
                flexShrink={0}
              >
                <Ionicons
                  name={
                    MEAL_TYPE_ICON[
                      displayMealType
                    ] as keyof typeof Ionicons.glyphMap
                  }
                  size={15}
                  color={
                    isDarkMode
                      ? tokens.color.textDark.val
                      : tokens.color.black.val
                  }
                />
                <Text
                  fontSize={14}
                  color={isDarkMode ? "$textDark" : "$color"}
                  fontWeight="500"
                >
                  {t(`meal.${displayMealType}`)}
                </Text>
              </XStack>
            )}
          </XStack>

          {/* 음식 이미지 — 없거나 로드에 실패하면 아래 컴팩트 행으로 대신한다.
              빈 회색 박스 220pt 를 그대로 두면 글로 기록한 식사가 "고장난 화면"처럼 보인다. */}
          {displayImageUri && !imageFailed && (
            <View marginHorizontal="$4" borderRadius={16} overflow="hidden">
              <Image
                source={{ uri: displayImageUri }}
                style={{ width: "100%", height: 220, resizeMode: "cover" }}
                onError={() => setImageFailed(true)}
              />
              <Pressable
                onPress={handleEditPress}
                accessibilityRole="button"
                accessibilityLabel={t("foodResult.edit")}
                style={({ pressed }) => ({
                  position: "absolute",
                  bottom: 10,
                  right: 10,
                  opacity: pressed ? 0.5 : 0.9,
                })}
              >
                <XStack
                  alignItems="center"
                  backgroundColor="$offWhite"
                  borderRadius={8}
                  paddingHorizontal={9}
                  paddingVertical={7}
                  gap={3}
                >
                  <Icon name="edit" size={18} />
                  <Text fontSize={12} fontWeight="600" color="$color.grey4">
                    {t("foodResult.edit")}
                  </Text>
                </XStack>
              </Pressable>
            </View>
          )}

          {/* 사진 없는 기록(글로 남긴 식사 등) — 수정 진입을 잃지 않으면서 화면을 낭비하지 않는다 */}
          {(!displayImageUri || imageFailed) && (
            <Pressable
              onPress={handleEditPress}
              accessibilityRole="button"
              accessibilityLabel={t("foodResult.edit")}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <XStack
                marginHorizontal="$4"
                paddingHorizontal={16}
                paddingVertical={14}
                borderRadius={16}
                backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
                alignItems="center"
                gap={10}
              >
                {/* 아이콘 사각형도 그레이 — 수정 진입은 안내지 액션 촉구가 아니다 */}
                <XStack
                  width={36}
                  height={36}
                  borderRadius={12}
                  backgroundColor={isDarkMode ? "$cardBgDark" : "#F2F3F5"}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={
                      isDarkMode
                        ? tokens.color.textDarkSub.val
                        : tokens.color.grey3.val
                    }
                  />
                </XStack>
                <YStack flex={1}>
                  <Text
                    fontSize={14}
                    fontWeight="600"
                    color={isDarkMode ? "$textDark" : "$color"}
                  >
                    {t("foodResult.textMeal")}
                  </Text>
                  <Text
                    fontSize={12.5}
                    color="$colorSubtle"
                    lineBreakStrategyIOS="hangul-word"
                  >
                    {t("foodResult.textMealHint")}
                  </Text>
                </YStack>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={
                    isDarkMode
                      ? tokens.color.textDarkSub.val
                      : tokens.color.grey3.val
                  }
                />
              </XStack>
            </Pressable>
          )}

          {(effectiveResult.revision ||
            effectiveResult.consumptionRevision) && (
            /* 한 줄에 나란히 두지 않는다. RN 의 Text 는 flexShrink 기본값이 0이라
               행 안에서 줄지 않고 **상자 밖으로 그대로 넘친다** — 좁은 기기와 큰 글자
               설정에서 "먹은 양을 바꾸면…" 이 카드를 뚫고 나가던 것이 그것이다.
               기준 라벨과 안내문은 길이가 서로 독립이므로 세로로 쌓는다. */
            <YStack
              marginHorizontal="$4"
              marginTop="$3"
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderRadius="$4"
              backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
              gap="$1"
            >
              <Text fontSize="$3" fontWeight="600" color="$sub8">
                {effectiveResult.consumptionRevision
                  ? t("foodResult.consumedBasis")
                  : t("foodResult.photoBasis")}
              </Text>
              <Text
                fontSize="$3"
                color="$colorSubtle"
                lineBreakStrategyIOS="hangul-word"
              >
                {t("foodResult.amountHint")}
              </Text>
            </YStack>
          )}

          {/* 인사이트 리포트 — 판정·근거·남은 예산·음식별 이유·대체.
              수치 전체는 여기 안의 "상세 영양표 보기" 시트로 내렸다.

              로딩 중에는 스켈레톤을 그린다. 예전 한줄평을 임시로 보였다가
              리포트로 바꾸면 "2초 보이다 사라지는 글"이 된다(실제 사용자 피드백) —
              폴백은 로딩이 아니라 **실패**에만 쓴다. */}
          {mealReport ? (
            <YStack marginHorizontal="$4" marginTop="$4">
              <MealReportView report={mealReport} />
            </YStack>
          ) : isReportPending ? (
            <YStack
              marginHorizontal="$4"
              marginTop="$4"
              backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
              borderRadius={16}
              padding={18}
              gap={10}
            >
              {[168, 260, 210].map((width, i) => (
                <View
                  key={i}
                  width={width}
                  height={i === 1 ? 22 : 13}
                  borderRadius={6}
                  backgroundColor={
                    isDarkMode ? "rgba(255,255,255,0.07)" : "#F2F3F5"
                  }
                />
              ))}
            </YStack>
          ) : (
            /* 리포트 조회가 실패하면 레거시 AI 평가문을 다시 노출하지 않는다.
                예전 평가문은 현재 책임·근거 정책을 거치지 않았기 때문이다. */
            <YStack
              marginHorizontal="$4"
              marginTop="$4"
              backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
              borderRadius="$4"
              padding="$4"
              gap="$2"
            >
              <Text fontSize="$3" color="$colorSubtle" fontWeight="600">
                {t("foodResult.nutrientsReady")}
              </Text>
              <Text
                fontSize="$4"
                color={isDarkMode ? "$textDark" : "$color"}
                lineHeight={22}
                fontWeight="600"
                lineBreakStrategyIOS="hangul-word"
              >
                {t("foodResult.reportUnavailable")}
              </Text>
            </YStack>
          )}

          {/* 아래 수치 블록은 리포트가 뜨면 감춘다 — 리포트의 "남은 예산"과
              "상세 영양표" 가 같은 내용을 더 읽기 쉽게 말한다. 둘 다 띄우면
              같은 숫자가 두 번 나오고 화면이 다시 수치 위주가 된다. */}
          {!mealReport && !isReportPending && (
            <>
              {/* 총 열량 */}
              <YStack
                marginHorizontal="$4"
                marginTop="$3"
                backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
                borderRadius="$4"
                padding="$4"
              >
                <Text
                  fontSize="$4"
                  fontWeight="600"
                  color={isDarkMode ? "$textDark" : "$color"}
                >
                  {t("foodResult.totalCalories")}
                </Text>
                <XStack alignItems="baseline" gap="$1">
                  <Text
                    fontSize={30}
                    fontWeight="600"
                    color={isDarkMode ? "$textDark" : "$color"}
                  >
                    {Math.round(effectiveResult.total.calories)}
                  </Text>
                  <Text fontSize="$5" color="$colorSubtle" fontWeight="500">
                    Kcal
                  </Text>
                </XStack>
                <View height="$2" />
                <MacroBar
                  carbs={effectiveResult.total.carbohydrates}
                  protein={effectiveResult.total.protein}
                  fat={effectiveResult.total.fat}
                />
              </YStack>

              {/* 식단 세부 분석 */}
              <YStack marginHorizontal="$4" marginTop="$5" gap="$3">
                <Text
                  fontSize={22}
                  fontWeight="700"
                  color={isDarkMode ? "$textDark" : "$color"}
                >
                  {t("foodResult.nutrientDetails")}
                </Text>
                <XStack
                  alignItems="flex-start"
                  gap="$2"
                  paddingHorizontal={2}
                  marginTop={-4}
                >
                  <Icon name="info" size={16} color={tokens.color.grey6.val} />
                  <Text
                    fontSize="$3"
                    color="$colorSubtle"
                    flex={1}
                    lineHeight={20}
                    lineBreakStrategyIOS="hangul-word"
                  >
                    {t("foodResult.chartExplanation")}
                  </Text>
                </XStack>
                {effectiveResult.foods.map((food, i) => {
                  const restriction = getRestrictionStyle(food.restrictionLevel)
                  return (
                    <YStack
                      key={i}
                      backgroundColor={
                        isDarkMode ? "$cardBgDark" : "$cardBackground"
                      }
                      borderRadius="$4"
                      padding="$4"
                      paddingVertical="$5"
                      gap="$3"
                    >
                      <XStack
                        alignItems="center"
                        justifyContent="space-between"
                        paddingBottom={8}
                        gap="$2"
                      >
                        <XStack
                          alignItems="baseline"
                          gap="$1"
                          flex={1}
                          flexShrink={1}
                        >
                          <Text
                            fontSize="$4"
                            fontWeight="600"
                            color={isDarkMode ? "$textDark" : "$color"}
                            numberOfLines={1}
                            flexShrink={1}
                          >
                            {food.name}
                          </Text>
                          <XStack paddingHorizontal={1}>
                            <Text
                              fontSize="$3"
                              color="$colorSubtle"
                              flexShrink={0}
                            >
                              {formatFoodPortion(
                                food.servingSizeValue,
                                food.servingSizeUnit,
                                language,
                              )}
                            </Text>
                          </XStack>
                        </XStack>
                        <View
                          paddingHorizontal={8}
                          paddingVertical={4}
                          borderRadius={8}
                          backgroundColor={restriction.bg}
                          flexShrink={0}
                        >
                          <Text
                            fontSize="$3"
                            fontWeight="500"
                            color={restriction.color}
                          >
                            {t(restriction.labelKey)}
                          </Text>
                        </View>
                      </XStack>

                      {(food.provenance || food.analyzedGrams != null) && (
                        <XStack gap="$2" flexWrap="wrap" marginTop={-6}>
                          {food.provenance && (
                            <Text fontSize="$3" color="$colorSubtle">
                              {t(`foodResult.provenance.${food.provenance}`)}
                            </Text>
                          )}
                          {food.analyzedGrams != null && (
                            <Text fontSize="$3" color="$colorSubtle">
                              {t("foodResult.inPhoto", {
                                amount: Math.round(food.analyzedGrams),
                              })}
                              {food.consumedGrams != null
                                ? ` · ${t("foodResult.consumed", {
                                    amount: Math.round(food.consumedGrams),
                                  })}`
                                : ""}
                            </Text>
                          )}
                        </XStack>
                      )}

                      <FoodNutrientDonuts food={food} />
                    </YStack>
                  )
                })}
              </YStack>
            </>
          )}

          {/* 의료 정보 출처 — 본문과 경쟁하지 않는 조용한 푸터.
              카드·이모지·유채색 링크를 걷어냈다: 출처는 신뢰의 근거이지
              눌러 달라고 조르는 배너가 아니다.

              간격은 4의 배수로만 둔다(20·8). 28+10 이던 예전 값은 본문 섹션
              사이(24)보다 넓어서, 조용한 푸터가 오히려 새 섹션처럼 떠 보였다. */}
          <YStack marginHorizontal={20} marginTop={20} gap={8}>
            <View
              height={0.5}
              backgroundColor={
                isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(23,24,28,0.06)"
              }
            />
            <Text
              fontSize={12}
              color="$colorSubtle"
              lineHeight={18}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("foodResult.referencesNote")}
            </Text>
            <Pressable
              onPress={() => {
                onClose()
                router.push("/(settings)/medical-reference")
              }}
              accessibilityRole="button"
              accessibilityLabel={t("foodResult.openAllReferences")}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              hitSlop={8}
            >
              <XStack alignItems="center" gap={2}>
                <Text
                  fontSize={12.5}
                  fontWeight="600"
                  color={isDarkMode ? "$textDarkSub" : "$colorSubtle"}
                >
                  {t("foodResult.openReferences")}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={12}
                  color={
                    isDarkMode
                      ? tokens.color.textDarkSub.val
                      : tokens.color.grey3.val
                  }
                />
              </XStack>
            </Pressable>
          </YStack>

          {/* ── 다음 행동 — 리포트를 읽고 나서 할 수 있는 일들.
              공유 두 장(스토리·커뮤니티)을 나란히, 그 아래 AI 질문을
              전폭 행으로. 셋 다 흰 카드라 위계는 크기와 자리로만 말한다. */}
          <YStack marginHorizontal={15} marginTop={16} gap={10}>
            {diaryId != null && displayImageUri && !imageFailed && (
              <XStack gap={10}>
                <ShareActionCard
                  icon="sparkles-outline"
                  title={t("foodResult.story")}
                  caption={t("foodResult.storyCaption")}
                  isDarkMode={isDarkMode}
                  onPress={() => {
                    onClose()
                    router.push("/(write)/story/new")
                  }}
                />
                <ShareActionCard
                  icon="people-outline"
                  title={t("foodResult.community")}
                  caption={t("foodResult.communityCaption")}
                  isDarkMode={isDarkMode}
                  onPress={() => {
                    onClose()
                    router.push("/(write)/free/new")
                  }}
                />
              </XStack>
            )}

            <Pressable
              onPress={() => void handleAskAboutMealPress()}
              disabled={isStartingConsultation}
              accessibilityRole="button"
              accessibilityLabel={t("foodResult.askMore")}
              style={({ pressed }) => ({
                opacity: isStartingConsultation ? 0.6 : pressed ? 0.85 : 1,
              })}
            >
              <XStack
                alignItems="center"
                gap={12}
                paddingVertical={14}
                paddingHorizontal={16}
                backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
                borderRadius={20}
              >
                <XStack
                  width={38}
                  height={38}
                  borderRadius={999}
                  backgroundColor={
                    isDarkMode ? "rgba(254,113,57,0.18)" : "#FFF6F2"
                  }
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons
                    name="chatbubble-ellipses"
                    size={18}
                    color={tokens.color.primary.val}
                  />
                </XStack>
                <YStack flex={1} gap={1}>
                  <Text
                    fontSize={15}
                    fontWeight="700"
                    color={isDarkMode ? "$textDark" : "$color"}
                  >
                    {isStartingConsultation
                      ? t("foodResult.openingConsult")
                      : t("foodResult.askMore")}
                  </Text>
                  <Text
                    fontSize={12.5}
                    color="$colorSubtle"
                    lineBreakStrategyIOS="hangul-word"
                  >
                    {t("foodResult.askMoreCaption")}
                  </Text>
                </YStack>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={
                    isDarkMode
                      ? tokens.color.textDarkSub.val
                      : tokens.color.grey3.val
                  }
                />
              </XStack>
            </Pressable>
          </YStack>

          {diaryId != null && (
            <Pressable
              onPress={() => void handleDeleteDiaryPress()}
              disabled={isDeletingDiary}
              accessibilityRole="button"
              accessibilityLabel={t("foodResult.delete")}
              style={({ pressed }) => ({
                opacity: isDeletingDiary ? 0.6 : pressed ? 0.7 : 1,
              })}
            >
              <XStack
                alignItems="center"
                justifyContent="center"
                gap={6}
                marginTop={10}
                paddingVertical={15}
                marginHorizontal={15}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={tokens.color.primary9.val}
                />
                <Text
                  fontSize={15}
                  fontWeight="500"
                  color={tokens.color.primary9.val}
                >
                  {isDeletingDiary
                    ? t("foodResult.deleting")
                    : t("foodResult.delete")}
                </Text>
              </XStack>
            </Pressable>
          )}
        </ScrollView>

        {/* 하단 고정 버튼 */}
        {showAddButton && (
          <YStack
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            backgroundColor={isDarkMode ? "$appBgDark" : "$appBg"}
            paddingHorizontal={16}
            paddingTop={12}
            paddingBottom={insets.bottom + 12}
          >
            <Pressable
              onPress={handleAddToRecordPress}
              disabled={isAddingToRecord}
              accessibilityRole="button"
              accessibilityLabel={t("foodResult.addToLog")}
              style={({ pressed }) => ({
                width: "100%",
                opacity: isAddingToRecord ? 0.7 : pressed ? 0.8 : 1,
              })}
            >
              <YStack
                backgroundColor={tokens.color.primary7.val}
                borderRadius={30}
                height={54}
                alignItems="center"
                justifyContent="center"
              >
                <Text color="white" fontSize={16} fontWeight="700">
                  {isAddingToRecord
                    ? t("foodResult.adding")
                    : t("foodResult.addToLog")}
                </Text>
              </YStack>
            </Pressable>
          </YStack>
        )}
      </YStack>

      {/* 공유 카드 (offscreen) */}
      <ShareCard
        ref={shareCardRef}
        result={effectiveResult}
        imageUri={displayImageUri}
        mealType={displayMealType}
      />

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

      {/* 이 모달이 루트 토스트/다이얼로그를 덮으므로 안쪽에도 호스트를 둔다 */}
      <ModalOverlayHost />
    </AppModal>
  )
}
