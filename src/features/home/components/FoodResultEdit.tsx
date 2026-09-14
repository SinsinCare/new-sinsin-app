import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { useEffect, useMemo, useState } from "react"
import {
  useV2Theme,
  V2Box,
  V2HStack,
  V2Text,
  V2VStack,
  V2Button,
  V2SegmentControl,
  V2TextField,
} from "@/src/design-system-v2"
import { Image, Platform, TouchableOpacity } from "react-native"
import { AppModal } from "@/src/shared/components/AppModal"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"
import {
  FoodAnalysisUpdateRequest,
  FoodAnalysisUpdateResult,
  FoodCameraAnalyzeResult,
} from "@/src/types"
import { Icon } from "@/src/shared/components"
import { LoadingOverlay } from "./LoadingOverlay"
import { ConsumedAmountSelector } from "./ConsumedAmountSelector"
import { UNIT_OPTIONS } from "../data/foodEditConstants"
import { MEAL_OPTIONS } from "../data/mealConstants"
import { MealType } from "../types"
import { useFoodEdit } from "../hooks/useFoodEdit"
import { updateFoodTitle } from "../hooks/useFoodAnalysis"
import { useQueryClient } from "@tanstack/react-query"
import {
  buildFoodAnalysisUpdateRequest,
  applyOptimisticConsumption,
  getInitialEatenStep,
  validateMenuAmount,
  validateMenuName,
  validateMealTitle,
} from "../utils/foodEditUtils"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import type { AnalyticsFoodRecordSource } from "@/src/features/analytics/events"
import { useTranslation } from "react-i18next"

import { showErrorToast } from "@/src/lib/toast"

type UnitTranslationKey =
  | "foodEdit.unit.serving"
  | "foodEdit.unit.piece"
  | "foodEdit.unit.glass"

const UNIT_KEY_BY_CANONICAL: Record<string, UnitTranslationKey> = {
  [UNIT_OPTIONS[0]]: "foodEdit.unit.serving",
  [UNIT_OPTIONS[2]]: "foodEdit.unit.piece",
  [UNIT_OPTIONS[3]]: "foodEdit.unit.glass",
}

function getUnitTranslationKey(unit: string): UnitTranslationKey | undefined {
  const canonicalKey = UNIT_KEY_BY_CANONICAL[unit]
  if (canonicalKey) return canonicalKey

  switch (unit.trim().toLowerCase()) {
    case "serving":
    case "servings":
      return "foodEdit.unit.serving"
    case "piece":
    case "pieces":
      return "foodEdit.unit.piece"
    case "glass":
    case "glasses":
      return "foodEdit.unit.glass"
    default:
      return undefined
  }
}

interface FoodResultEditProps {
  /** 어디서 수정에 들어왔는지 — 진입 계측에만 쓴다. */
  source: AnalyticsFoodRecordSource
  result: FoodCameraAnalyzeResult | null
  imageUri?: string
  onClose: () => void
  mealType: MealType | null
  isUpdating?: boolean
  updateFoodAnalysis: (
    foodAnalysisResultId: number,
    body: FoodAnalysisUpdateRequest,
    sourceResult?: FoodCameraAnalyzeResult,
  ) => Promise<FoodAnalysisUpdateResult | undefined>
  onTitleChange?: (title: string) => void
  diaryId?: number
  updateDiaryMealType?: (
    diaryId: number,
    mealType: string,
  ) => Promise<{ diaryId: number; mealType: string } | undefined>
  onAnalysisChange?: (result: FoodAnalysisUpdateResult) => void
  onMealTypeChange?: (change: {
    diaryId: number
    fromMealType: MealType
    toMealType: MealType
  }) => void
}

export function FoodResultEdit({
  source,
  result,
  imageUri,
  onClose,
  mealType,
  isUpdating = false,
  updateFoodAnalysis,
  onTitleChange,
  diaryId,
  updateDiaryMealType,
  onAnalysisChange,
  onMealTypeChange,
}: FoodResultEditProps) {
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation("common")
  const unitSegments = useMemo(
    () =>
      UNIT_OPTIONS.map((unit) => {
        const translationKey = getUnitTranslationKey(unit)
        return {
          label: translationKey ? t(translationKey) : unit,
          value: unit,
        }
      }),
    [t],
  )
  const getUnitLabel = (unit: string) => {
    const translationKey = getUnitTranslationKey(unit)
    return translationKey ? t(translationKey) : unit
  }
  const {
    foods,
    mealName,
    isNameEdit,
    editingName,
    setEditingName,
    setIsNameEdit,
    eatenStep,
    setEatenStep,
    addStep,
    newMenuName,
    newMenuNameError,
    newMenuAmount,
    newMenuAmountError,
    newMenuUnit,
    setNewMenuUnit,
    nameEditInputRef,
    handleNameEdit,
    handleNameConfirm,
    handleFoodNameChange,
    handleAmountChange,
    handleDelete,
    handleAddMenu,
    handleNewMenuNameChange,
    handleNewMenuAmountChange,
    handleNameSubmit,
    handleAmountSubmit,
  } = useFoodEdit(result, mealType)

  // 이름 변경은 훅 상태가 필요 없다 — `useFoodAnalysis` 한 벌을 더 세우지 않고 캐시 손잡이만 넘긴다.
  const queryClient = useQueryClient()
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(
    mealType,
  )
  const [titleChanged, setTitleChanged] = useState(false)

  // 이 화면은 `isEdit` 일 때만 마운트되므로 마운트 1회 = 수정 진입 1회다.
  useEffect(() => {
    trackAnalyticsEvent("food_record_edit_started", { source })
  }, [source])
  const hasBroth =
    result?.foods.some(
      (food) =>
        food.isBroth || /국|탕|찌개|전골|라면|우동|육수/.test(food.name),
    ) ?? false
  const [brothStep, setBrothStep] = useState(() =>
    getInitialEatenStep(
      result?.brothConsumedRatio == null
        ? result?.eatenPercentage
        : result.brothConsumedRatio * 100,
    ),
  )

  const handleTitleEdit = async () => {
    if (!result) return
    const validation = validateMealTitle(editingName)
    if (!validation.isValid) {
      showErrorToast(t("foodEdit.checkMealName"), t("foodEdit.enterMealName"))
      return
    }
    const newTitle = editingName.trim()
    const response = await updateFoodTitle(
      queryClient,
      result.foodAnalysisResultId,
      newTitle,
    )
    if (response) {
      handleNameConfirm()
      onTitleChange?.(newTitle)
      setTitleChanged(true)
    } else {
      trackAnalyticsEvent("food_record_edit_failed", {
        items_changed: false,
        consumption_changed: false,
        slot_changed: false,
        label_changed: true,
      })
    }
  }
  const isDarkMode = useAppColorScheme() === "dark"
  const textColor = isDarkMode
    ? tokens.color.textDark.val
    : tokens.color.grey1.val
  const inputBg = isDarkMode
    ? tokens.color.appBgDark.val
    : tokens.color.grey8.val

  /**
   * 무엇이 바뀌었는지 한 곳에서 판정한다.
   *
   * 제출과 취소가 **같은 판정**을 써야 한다 — 취소의 `changed` 가 제출과 다른 기준이면
   * "고치다 말고 취소" 와 "열어만 보고 닫음" 을 가르는 그 숫자를 믿을 수 없다.
   */
  const describeChanges = () => {
    if (!result) {
      return {
        eatenPercentageChanged: false,
        brothPercentageChanged: false,
        foodsChanged: false,
        mealTypeChanged: false,
      }
    }
    const initialEatenStep = getInitialEatenStep(result.eatenPercentage)
    const initialBrothStep = getInitialEatenStep(
      result.brothConsumedRatio == null
        ? result.eatenPercentage
        : result.brothConsumedRatio * 100,
    )
    return {
      eatenPercentageChanged: eatenStep !== initialEatenStep,
      brothPercentageChanged: hasBroth && brothStep !== initialBrothStep,
      foodsChanged:
        foods.length !== result.foods.length ||
        foods.some((f, i) => {
          const orig = result.foods[i]
          return (
            f.name !== orig.name ||
            Number(f.amount) !== orig.servingSizeValue ||
            f.unit !== orig.servingSizeUnit
          )
        }),
      mealTypeChanged:
        diaryId != null &&
        updateDiaryMealType != null &&
        selectedMealType != null &&
        mealType != null &&
        selectedMealType !== mealType,
    }
  }

  const handleCancel = () => {
    if (titleChanged) {
      /*
        이름 변경은 그 자리에서 서버에 반영된다 — 되돌릴 것이 없으므로 취소가 아니라
        성공이다. 그래서 이 갈래는 `_cancelled` 로 세지 않는다.
      */
      trackAnalyticsEvent("food_record_edit_succeeded", {
        items_changed: false,
        consumption_changed: false,
        slot_changed: false,
        label_changed: true,
      })
      onClose()
      return
    }
    /*
      수정 화면까지 갔다가 되돌아 나온 사람. `changed` 가 '고치다 말고 취소' 와
      '열어만 보고 닫음' 을 가른다 — 앞은 입력 UI, 뒤는 진입점 문구 문제다.
    */
    const changes = describeChanges()
    trackAnalyticsEvent("food_record_edit_cancelled", {
      source,
      changed:
        changes.eatenPercentageChanged ||
        changes.brothPercentageChanged ||
        changes.foodsChanged ||
        changes.mealTypeChanged,
    })
    onClose()
  }

  const handleSubmit = async () => {
    if (!result) return
    const hasInvalidFood = foods.some(
      (food) =>
        !validateMenuName(food.name).isValid ||
        !validateMenuAmount(food.amount).isValid,
    )
    if (hasInvalidFood) {
      showErrorToast(t("foodEdit.checkInput"), t("foodEdit.checkInputBody"))
      return
    }
    const {
      eatenPercentageChanged,
      brothPercentageChanged,
      foodsChanged,
      mealTypeChanged,
    } = describeChanges()
    if (
      !eatenPercentageChanged &&
      !brothPercentageChanged &&
      !foodsChanged &&
      !mealTypeChanged &&
      !titleChanged
    ) {
      onClose()
      return
    }

    let ok = true
    if (eatenPercentageChanged || brothPercentageChanged || foodsChanged) {
      const body: FoodAnalysisUpdateRequest = buildFoodAnalysisUpdateRequest({
        servings: result.servings,
        eatenPercentage: (eatenStep + 1) * 25,
        brothConsumedRatio: hasBroth ? (brothStep + 1) * 0.25 : undefined,
        includeConsumptionContract: result.analysisId != null,
        foods,
      })
      const shouldOptimisticallyUpdate =
        result.analysisId != null && !foodsChanged && eatenPercentageChanged
      if (shouldOptimisticallyUpdate) {
        onAnalysisChange?.(
          applyOptimisticConsumption(result, (eatenStep + 1) * 0.25),
        )
      }
      const updated = await updateFoodAnalysis(
        result.foodAnalysisResultId,
        body,
        result,
      )
      if (updated) {
        onAnalysisChange?.(updated)
      } else {
        if (shouldOptimisticallyUpdate) onAnalysisChange?.(result)
        ok = false
      }
    }
    /*
      `mealTypeChanged` 가 참이면 아래 넷은 모두 non-null 이다(describeChanges 참조).
      다만 판정이 함수 밖으로 나가면서 tsc 의 좁히기가 여기까지 따라오지 못하므로
      **한 번 더 확인**한다 — 단언(`!`)으로 덮지 않는다.
    */
    if (
      ok &&
      mealTypeChanged &&
      updateDiaryMealType != null &&
      diaryId != null &&
      selectedMealType != null &&
      mealType != null
    ) {
      const changed = await updateDiaryMealType(diaryId, selectedMealType)
      if (changed) {
        onMealTypeChange?.({
          diaryId: changed.diaryId,
          fromMealType: mealType,
          toMealType: selectedMealType,
        })
      } else {
        ok = false
      }
    }
    const changeProperties = {
      items_changed: foodsChanged,
      consumption_changed: eatenPercentageChanged || brothPercentageChanged,
      slot_changed: mealTypeChanged,
      label_changed: titleChanged,
    }
    if (ok) {
      trackAnalyticsEvent("food_record_edit_succeeded", changeProperties)
      onClose()
    } else {
      trackAnalyticsEvent("food_record_edit_failed", changeProperties)
    }
  }

  return (
    <V2VStack
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.background.default,
        zIndex: 10,
      }}
    >
      <V2HStack
        paddingHorizontal={24}
        justify="space-between"
        align="center"
        style={{ minHeight: 44, marginTop: insets.top + 8, marginBottom: 24 }}
      >
        <TouchableOpacity
          onPress={handleCancel}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
        >
          <V2Text
            color={colors.label.alternative}
            style={{ fontSize: 16, fontWeight: 500 }}
          >
            {t("action.cancel")}
          </V2Text>
        </TouchableOpacity>
        <V2Text
          color={colors.label.normal}
          style={{ fontSize: 17, fontWeight: 700 }}
        >
          {t("foodResult.edit")}
        </V2Text>
        {/* 저장은 하단 CTA 하나로 — 헤더 우측은 폭만 맞춘다 */}
        <V2Box style={{ width: 40 }} />
      </V2HStack>

      <KeyboardAwareScrollView
        bounces={false}
        overScrollMode="never"
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 32, paddingBottom: 60 }}
        bottomOffset={24}
        disableScrollOnKeyboardHide
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
      >
        <V2HStack>
          {imageUri && (
            <V2Box
              style={{ marginLeft: 19, marginRight: 13, overflow: "hidden" }}
            >
              <Image
                source={{ uri: imageUri }}
                style={{
                  width: 80,
                  height: 80,
                  resizeMode: "cover",
                  borderRadius: 10,
                }}
              />
            </V2Box>
          )}
          <V2VStack gap={8} justify="center">
            <V2HStack>
              <V2Text
                color={colors.label.normal}
                lineBreakStrategyIOS="hangul-word"
                style={{ fontSize: 18, fontWeight: "600", paddingLeft: 4 }}
              >
                {mealName}{" "}
              </V2Text>
              <Icon name="edit" size={22} onPress={handleNameEdit} />
            </V2HStack>

            <V2HStack justify="space-between" align="center" gap={4}>
              {MEAL_OPTIONS.map((opt) => {
                const isSelected = selectedMealType === opt.type
                return (
                  <TouchableOpacity
                    key={opt.type}
                    onPress={() => setSelectedMealType(opt.type)}
                    style={{
                      backgroundColor: isSelected
                        ? tokens.color.primary.val + "1F"
                        : "transparent",
                      borderRadius: 15,
                      paddingLeft: 6,
                      paddingRight: 9,
                      paddingVertical: 6,
                    }}
                  >
                    <V2HStack align="center" gap={3}>
                      <Icon
                        name={opt.icon}
                        size={16}
                        color={
                          isSelected
                            ? tokens.color.primary.val
                            : tokens.color.grey6.val
                        }
                      />
                      <V2Text
                        color={
                          isSelected
                            ? tokens.color.primary.val
                            : colors.label.alternative
                        }
                        style={{
                          fontSize: 15,
                          fontWeight: isSelected ? 700 : 500,
                        }}
                      >
                        {t(`meal.${opt.type}`)}
                      </V2Text>
                    </V2HStack>
                  </TouchableOpacity>
                )
              })}
            </V2HStack>
          </V2VStack>
        </V2HStack>

        <AppModal
          visible={isNameEdit}
          animationType="fade"
          transparent
          onRequestClose={() => setIsNameEdit(false)}
        >
          <V2Box
            flex={1}
            justify="center"
            align="center"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            <V2VStack
              style={{
                backgroundColor: colors.background.lower,
                borderRadius: 10,
                width: 280,
                overflow: "hidden",
              }}
            >
              <V2VStack paddingHorizontal={20} paddingVertical={24} gap={16}>
                <V2Text
                  color={colors.label.normal}
                  style={{ fontSize: 16, fontWeight: 600, textAlign: "center" }}
                >
                  {t("foodEdit.renameMeal")}
                </V2Text>
                <V2Box
                  paddingHorizontal={12}
                  paddingVertical={8}
                  style={{
                    borderWidth: 1,
                    borderColor: isDarkMode
                      ? tokens.color.grey3.val
                      : colors.line.normal,
                    borderRadius: 10,
                  }}
                >
                  <TextInput
                    ref={nameEditInputRef}
                    value={editingName}
                    onChangeText={setEditingName}
                    placeholder={result?.title}
                    placeholderTextColor={tokens.color.grey5.val}
                    returnKeyType="done"
                    onSubmitEditing={handleTitleEdit}
                    style={{
                      fontSize: 14,
                      color: textColor,
                      // 굵기는 face 로 말한다 — RN 은 굵기 prop 만으로는
                      // Pretendard 를 못 고르고 OS 기본 서체로 떨어진다
                      // (tests/typefaceLineage 가 지키는 계약).
                      fontFamily: "Pretendard-Medium",
                    }}
                  />
                </V2Box>
              </V2VStack>

              <V2Box
                style={{
                  height: 1,
                  backgroundColor: isDarkMode
                    ? tokens.color.grey3.val
                    : colors.line.normal,
                }}
              />

              <V2HStack>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 14, alignItems: "center" }}
                  onPress={() => setIsNameEdit(false)}
                >
                  <V2Text
                    color={colors.label.alternative}
                    style={{ fontSize: 16 }}
                  >
                    {t("action.cancel")}
                  </V2Text>
                </TouchableOpacity>
                <V2Box
                  style={{
                    width: 1,
                    backgroundColor: isDarkMode
                      ? tokens.color.grey3.val
                      : colors.line.normal,
                  }}
                />
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 14, alignItems: "center" }}
                  onPress={handleTitleEdit}
                >
                  <V2Text
                    color={tokens.color.primary.val}
                    style={{ fontSize: 16, fontWeight: 600 }}
                  >
                    {t("action.confirm")}
                  </V2Text>
                </TouchableOpacity>
              </V2HStack>
            </V2VStack>
          </V2Box>
        </AppModal>

        <V2VStack gap={12}>
          <V2HStack justify="space-between" paddingHorizontal={20}>
            <V2Text
              color={colors.label.normal}
              style={{ fontSize: 17, fontWeight: 600 }}
            >
              {t("foodEdit.foodsAndAmounts")}
            </V2Text>
            <TouchableOpacity onPress={handleAddMenu}>
              <V2HStack paddingRight={4} gap={3}>
                <Icon name="plus" size={17} />
                <V2Text
                  color={colors.label.alternative}
                  style={{ fontSize: 15, fontWeight: 600 }}
                >
                  {t("foodEdit.addMenu")}
                </V2Text>
              </V2HStack>
            </TouchableOpacity>
          </V2HStack>

          <V2Box
            paddingHorizontal={16}
            paddingVertical={20}
            style={{
              backgroundColor: colors.background.lower,
              marginHorizontal: 16,
              borderRadius: 10,
            }}
          >
            <V2VStack gap={12}>
              {addStep === "name" && (
                <V2HStack align="flex-start" paddingVertical={8} gap={8}>
                  <V2TextField
                    autoFocus
                    value={newMenuName}
                    onChangeText={handleNewMenuNameChange}
                    placeholder={t("foodEdit.menuName")}
                    returnKeyType="done"
                    onSubmitEditing={handleNameSubmit}
                    error={newMenuNameError || false}
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <V2Button
                    size="l"
                    onPress={handleNameSubmit}
                    accessibilityLabel={t("foodEdit.confirmMenuName")}
                  >
                    {t("action.confirm")}
                  </V2Button>
                </V2HStack>
              )}
              {addStep === "amount" && (
                <V2VStack gap={12}>
                  <V2HStack align="center" gap={12}>
                    <V2Text style={{ fontWeight: 500, fontSize: 15, flex: 1 }}>
                      {newMenuName}
                    </V2Text>
                  </V2HStack>
                  <V2HStack align="flex-start" gap={8}>
                    <V2TextField
                      autoFocus
                      value={newMenuAmount}
                      onChangeText={handleNewMenuAmountChange}
                      placeholder={t("foodEdit.amount")}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      onSubmitEditing={handleAmountSubmit}
                      error={newMenuAmountError || false}
                      style={{ flex: 1, minWidth: 0 }}
                      inputStyle={{ textAlign: "center" }}
                    />
                    <V2SegmentControl
                      items={unitSegments}
                      value={newMenuUnit}
                      onChange={(unit) =>
                        setNewMenuUnit(unit as typeof newMenuUnit)
                      }
                      size="s"
                      alignment="fixed"
                      style={{ flex: 2 }}
                    />
                  </V2HStack>
                  <V2Button
                    size="m"
                    fullWidth
                    onPress={handleAmountSubmit}
                    accessibilityLabel={t("foodEdit.confirmAmount")}
                  >
                    {t("action.confirm")}
                  </V2Button>
                </V2VStack>
              )}
              {foods.map((f, i) => (
                <V2HStack key={f.editKey} align="center" gap={8}>
                  <TextInput
                    value={f.name}
                    onChangeText={(v) => handleFoodNameChange(i, v)}
                    placeholder={t("foodEdit.foodName")}
                    placeholderTextColor={tokens.color.grey5.val}
                    style={{
                      flex: 1,
                      backgroundColor: inputBg,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 15,
                      fontWeight: "500",
                      color: textColor,
                    }}
                  />
                  <TextInput
                    value={f.amount}
                    onChangeText={(v) => handleAmountChange(i, v)}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: inputBg,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 15,
                      textAlign: "center",
                      minWidth: 80,
                      color: textColor,
                    }}
                  />
                  <V2Text
                    color={colors.label.normal}
                    style={{
                      fontSize:
                        getUnitTranslationKey(f.unit) ===
                        "foodEdit.unit.serving"
                          ? 12
                          : 14,
                      width: 21,
                      textAlign: "center",
                    }}
                  >
                    {getUnitLabel(f.unit)}
                  </V2Text>
                  <TouchableOpacity
                    onPress={() => handleDelete(i)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={t("foodEdit.deleteMenu", {
                      name: f.name || t("foodEdit.menu"),
                    })}
                  >
                    <V2Box
                      align="center"
                      justify="center"
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: colors.fill.alternative,
                      }}
                    >
                      <V2Text
                        color={colors.label.neutral}
                        style={{
                          fontSize: 15,
                          lineHeight: 17,
                          fontWeight: "600",
                          textAlign: "center",
                        }}
                      >
                        ×
                      </V2Text>
                    </V2Box>
                  </TouchableOpacity>
                </V2HStack>
              ))}
            </V2VStack>
          </V2Box>
        </V2VStack>

        <V2Box
          paddingHorizontal={16}
          paddingVertical={20}
          style={{
            backgroundColor: colors.background.lower,
            marginHorizontal: 16,
            borderRadius: 10,
          }}
        >
          <V2Text
            color={colors.label.normal}
            style={{
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 16,
              paddingLeft: 4,
            }}
          >
            {t("foodEdit.howMuch")}
          </V2Text>
          <ConsumedAmountSelector value={eatenStep} onChange={setEatenStep} />
          {hasBroth && (
            <V2VStack gap={12} style={{ marginTop: 20 }}>
              <V2Text
                color={colors.label.normal}
                style={{ fontSize: 15, fontWeight: 600, paddingLeft: 4 }}
              >
                {t("foodEdit.howMuchBroth")}
              </V2Text>
              <V2Text
                color={colors.label.alternative}
                lineBreakStrategyIOS="hangul-word"
                style={{ fontSize: 13, paddingLeft: 4 }}
              >
                {t("foodEdit.brothHint")}
              </V2Text>
              <ConsumedAmountSelector
                value={brothStep}
                onChange={setBrothStep}
                accessibilityLabel={t("foodEdit.chooseBrothAmount")}
              />
            </V2VStack>
          )}
        </V2Box>
      </KeyboardAwareScrollView>

      {/* 저장은 손이 닿는 하단 한 곳 — 헤더 우측 텍스트 버튼보다 놓치지 않는다 */}
      <V2Box
        paddingHorizontal={20}
        paddingTop={12}
        paddingBottom={insets.bottom + 12}
      >
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isUpdating}
          accessibilityLabel={t("foodEdit.save")}
          style={{
            height: 56,
            borderRadius: 16,
            backgroundColor: tokens.color.primary.val,
            alignItems: "center",
            justifyContent: "center",
            opacity: isUpdating ? 0.6 : 1,
          }}
        >
          <V2Text color="#FFFFFF" style={{ fontSize: 16, fontWeight: 700 }}>
            {t("action.save")}
          </V2Text>
        </TouchableOpacity>
      </V2Box>

      {/* 결과 pageSheet(네이티브 Modal) 안이라 루트 포털은 뒤에 깔린다 — inline. */}
      <LoadingOverlay
        visible={isUpdating}
        message={t("foodEdit.saving")}
        inline
      />
    </V2VStack>
  )
}
