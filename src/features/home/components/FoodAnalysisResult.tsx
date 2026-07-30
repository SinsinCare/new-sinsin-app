import {
  Modal,
  ScrollView,
  Image,
  Alert,
  ActionSheetIOS,
  Platform,
  Pressable,
} from "react-native"
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
import { useTranslation } from "react-i18next"

interface FoodAnalysisResultProps {
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
          <Text fontSize={11.5} lineHeight={16} color="$colorSubtle">
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
  onDiaryDeleted,
  onResultChange,
  onMealTypeChange,
}: FoodAnalysisResultProps) {
  const { t, i18n } = useTranslation("common")
  const language = (i18n.resolvedLanguage ?? i18n.language).startsWith("en")
    ? "en"
    : "ko"
  const insets = useSafeAreaInsets()
  const [showExitConfirm, setShowExitConfirm] = useState(false)
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
  const {
    startConsultation,
    deleteSavedMeal,
    isStartingConsultation,
    isDeletingDiary,
  } = useMealPersistenceActions()

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

  useEffect(() => {
    setIsAddingToRecord(false)
    setIsEdit(false)
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

  const handleShare = useCallback(async () => {
    if (!shareCardRef.current) return

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            t("foodResult.shareInstagram"),
            t("foodResult.shareOther"),
            t("action.cancel"),
          ],
          cancelButtonIndex: 2,
        },
        async (buttonIndex) => {
          try {
            if (buttonIndex === 0) {
              // base64로 캡처하여 Instagram Stories에 직접 공유
              const base64 = await captureRef(shareCardRef, {
                format: "png",
                quality: 1,
                result: "base64",
              })
              await Share.shareSingle({
                social: Social.InstagramStories,
                appId: FACEBOOK_APP_ID,
                stickerImage: `data:image/png;base64,${base64}`,
                backgroundBottomColor: "#FFFFFF",
                backgroundTopColor: "#FFFFFF",
              })
            } else if (buttonIndex === 1) {
              // 파일로 캡처하여 시스템 공유 시트
              const uri = await captureRef(shareCardRef, {
                format: "png",
                quality: 1,
                result: "tmpfile",
              })
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                  mimeType: "image/png",
                  UTI: "public.png",
                })
              }
            }
          } catch {
            Alert.alert(
              t("foodResult.instagramErrorTitle"),
              t("foodResult.instagramErrorBody"),
            )
          }
        },
      )
    } else {
      // Android: Instagram Stories 시도 후 실패 시 일반 공유
      try {
        const base64 = await captureRef(shareCardRef, {
          format: "png",
          quality: 1,
          result: "base64",
        })
        await Share.shareSingle({
          social: Social.InstagramStories,
          appId: FACEBOOK_APP_ID,
          stickerImage: `data:image/png;base64,${base64}`,
          backgroundBottomColor: "#FFFFFF",
          backgroundTopColor: "#FFFFFF",
        })
      } catch {
        const uri = await captureRef(shareCardRef, {
          format: "png",
          quality: 1,
          result: "tmpfile",
        })
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            UTI: "public.png",
          })
        }
      }
    }
  }, [t])

  if (!displayResult) return null

  const effectiveResult = normalizeFoodAnalysisResult(displayResult)

  const handleEditPress = () => {
    setIsEdit(true)
  }

  const handleClosePress = () => {
    if (showAddButton) {
      setShowExitConfirm(true)
    } else {
      onClose()
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
    onClose()
    onDiaryDeleted?.()
  }

  const handleResultChange = (updated: FoodCameraAnalyzeResult) => {
    setDisplayResult(updated)
    if (updated.imageUrl) setDisplayImageUri(updated.imageUrl)
    onResultChange?.(updated)
  }

  const handleTitleChange = (title: string) => {
    setDisplayResult((prev) => (prev ? { ...prev, title } : prev))
  }

  const handleMealTypeChange = (change: {
    diaryId: number
    fromMealType: MealType
    toMealType: MealType
  }) => {
    setDisplayMealType(change.toMealType)
    onMealTypeChange?.({
      ...change,
      imageUri: displayImageUri ?? effectiveResult.imageUrl ?? null,
    })
  }

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClosePress}
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
            onPress={handleClosePress}
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
                  <Text fontSize={12.5} color="$colorSubtle">
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
            <XStack
              marginHorizontal="$4"
              marginTop="$3"
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderRadius="$4"
              backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
              alignItems="center"
              justifyContent="space-between"
              gap="$2"
            >
              <Text fontSize="$3" fontWeight="600" color="$sub8">
                {effectiveResult.consumptionRevision
                  ? t("foodResult.consumedBasis")
                  : t("foodResult.photoBasis")}
              </Text>
              <Text fontSize="$3" color="$colorSubtle" textAlign="right">
                {t("foodResult.amountHint")}
              </Text>
            </XStack>
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
              눌러 달라고 조르는 배너가 아니다. */}
          <YStack marginHorizontal={20} marginTop={28} gap={10}>
            <View
              height={0.5}
              backgroundColor={
                isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(23,24,28,0.06)"
              }
            />
            <Text fontSize={12} color="$colorSubtle" lineHeight={18}>
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
                  <Text fontSize={12.5} color="$colorSubtle">
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

      {/* 나가기 확인 오버레이 */}
      {showExitConfirm && (
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          backgroundColor="rgba(0,0,0,0.5)"
          justifyContent="center"
          alignItems="center"
        >
          <YStack
            backgroundColor={
              isDarkMode
                ? tokens.color.cardBgDark.val
                : tokens.color.offWhite.val
            }
            borderRadius={15}
            overflow="hidden"
          >
            <YStack
              paddingHorizontal="$10"
              paddingTop="$8"
              paddingBottom="$6"
              gap="$2"
            >
              <Text
                fontSize={16}
                fontWeight="600"
                textAlign="center"
                color={isDarkMode ? "$textDark" : "$color"}
              >
                {t("foodResult.unsavedTitle")}
              </Text>
              <Text
                fontSize={14}
                color="$colorSubtle"
                textAlign="center"
                lineHeight={22}
              >
                {t("foodResult.unsavedBody")}
              </Text>
            </YStack>

            <View
              height={1}
              backgroundColor={isDarkMode ? tokens.color.grey2.val : "#E5E5E5"}
            />

            <XStack>
              <Pressable
                onPress={() => {
                  setShowExitConfirm(false)
                  onClose()
                }}
                accessibilityRole="button"
                accessibilityLabel={t("foodResult.leaveWithoutSaving")}
                style={({ pressed }) => ({
                  flex: 1,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <YStack alignItems="center" paddingVertical="$4">
                  <Text
                    color={tokens.color.primary9.val}
                    fontSize={15}
                    fontWeight="500"
                  >
                    {t("foodResult.leaveWithoutSaving")}
                  </Text>
                </YStack>
              </Pressable>

              <View
                width={1}
                backgroundColor={
                  isDarkMode ? tokens.color.grey2.val : "#E5E5E5"
                }
              />

              <Pressable
                onPress={() => setShowExitConfirm(false)}
                accessibilityRole="button"
                accessibilityLabel={t("foodResult.returnToResult")}
                style={({ pressed }) => ({
                  flex: 1,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <YStack alignItems="center" paddingVertical="$4">
                  <Text
                    fontSize={15}
                    fontWeight="500"
                    color={isDarkMode ? "$textDark" : "$color"}
                  >
                    {t("foodResult.returnToResult")}
                  </Text>
                </YStack>
              </Pressable>
            </XStack>
          </YStack>
        </YStack>
      )}
      {isEdit && (
        <FoodResultEdit
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
    </Modal>
  )
}
