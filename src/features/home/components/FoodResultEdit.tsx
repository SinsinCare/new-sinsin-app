import { useEffect, useMemo, useState } from "react"
import { Image, Platform, TextInput, TouchableOpacity } from "react-native"
import { AppModal } from "@/src/shared/components/AppModal"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text, View, XStack, YStack } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import {
  FoodAnalysisUpdateRequest,
  FoodAnalysisUpdateResult,
  FoodCameraAnalyzeResult,
} from "@/src/types"
import { Icon } from "@/src/shared/components"
import { V2Button, V2SegmentControl, V2TextField } from "@/src/design-system-v2"
import { LoadingOverlay } from "./LoadingOverlay"
import { ConsumedAmountSelector } from "./ConsumedAmountSelector"
import { UNIT_OPTIONS } from "../data/foodEditConstants"
import { MEAL_OPTIONS } from "../data/mealConstants"
import { MealType } from "../types"
import { useFoodEdit } from "../hooks/useFoodEdit"
import { useFoodAnalysis } from "../hooks/useFoodAnalysis"
import {
  buildFoodAnalysisUpdateRequest,
  applyOptimisticConsumption,
  getInitialEatenStep,
  validateMenuAmount,
  validateMenuName,
  validateMealTitle,
} from "../utils/foodEditUtils"
import { trackAnalyticsEvent } from "@/src/features/analytics"
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

  const { updateFoodTitle } = useFoodAnalysis()
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(
    mealType,
  )
  const [titleChanged, setTitleChanged] = useState(false)

  useEffect(() => {
    trackAnalyticsEvent("food_record_edit_started", {})
  }, [])
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

  const handleCancel = () => {
    if (titleChanged) {
      trackAnalyticsEvent("food_record_edit_succeeded", {
        items_changed: false,
        consumption_changed: false,
        slot_changed: false,
        label_changed: true,
      })
    }
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
    const initialEatenStep = getInitialEatenStep(result.eatenPercentage)
    const eatenPercentageChanged = eatenStep !== initialEatenStep
    const initialBrothStep = getInitialEatenStep(
      result.brothConsumedRatio == null
        ? result.eatenPercentage
        : result.brothConsumedRatio * 100,
    )
    const brothPercentageChanged = hasBroth && brothStep !== initialBrothStep
    const foodsChanged =
      foods.length !== result.foods.length ||
      foods.some((f, i) => {
        const orig = result.foods[i]
        return (
          f.name !== orig.name ||
          Number(f.amount) !== orig.servingSizeValue ||
          f.unit !== orig.servingSizeUnit
        )
      })
    const mealTypeChanged =
      diaryId != null &&
      updateDiaryMealType != null &&
      selectedMealType != null &&
      mealType != null &&
      selectedMealType !== mealType

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
    if (ok && mealTypeChanged) {
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
    <YStack
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      backgroundColor={isDarkMode ? "$appBgDark" : "$appBg"}
      zIndex={10}
    >
      <XStack
        paddingHorizontal="$8"
        paddingVertical="$10"
        justifyContent="space-between"
      >
        <TouchableOpacity
          onPress={handleCancel}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
        >
          <Text fontSize={16} fontWeight={500} color="$colorSubtle">
            {t("action.cancel")}
          </Text>
        </TouchableOpacity>
        <Text
          fontSize={17}
          fontWeight={700}
          color={isDarkMode ? "$textDark" : "$black"}
        >
          {t("foodResult.edit")}
        </Text>
        {/* 저장은 하단 CTA 하나로 — 헤더 우측은 폭만 맞춘다 */}
        <View width={40} />
      </XStack>

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
        <XStack>
          {imageUri && (
            <View marginLeft={19} marginRight={13} overflow="hidden">
              <Image
                source={{ uri: imageUri }}
                style={{
                  width: 80,
                  height: 80,
                  resizeMode: "cover",
                  borderRadius: 10,
                }}
              />
            </View>
          )}
          <YStack gap="$2" justifyContent="center">
            <XStack>
              <Text
                fontSize={18}
                fontWeight="600"
                paddingLeft="$1"
                color={isDarkMode ? "$textDark" : "$black"}
              >
                {mealName}{" "}
              </Text>
              <Icon name="edit" size={22} onPress={handleNameEdit} />
            </XStack>

            <XStack justifyContent="space-between" alignItems="center" gap={4}>
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
                    <XStack alignItems="center" gap={3}>
                      <Icon
                        name={opt.icon}
                        size={16}
                        color={
                          isSelected
                            ? tokens.color.primary.val
                            : tokens.color.grey6.val
                        }
                      />
                      <Text
                        fontSize={15}
                        fontWeight={isSelected ? 700 : 500}
                        color={
                          isSelected ? tokens.color.primary.val : "$colorSubtle"
                        }
                      >
                        {t(`meal.${opt.type}`)}
                      </Text>
                    </XStack>
                  </TouchableOpacity>
                )
              })}
            </XStack>
          </YStack>
        </XStack>

        <AppModal
          visible={isNameEdit}
          animationType="fade"
          transparent
          onRequestClose={() => setIsNameEdit(false)}
        >
          <View
            flex={1}
            justifyContent="center"
            alignItems="center"
            backgroundColor="rgba(0,0,0,0.4)"
          >
            <YStack
              backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
              borderRadius="$5"
              width={280}
              overflow="hidden"
            >
              <YStack paddingHorizontal="$5" paddingVertical="$6" gap="$4">
                <Text
                  fontSize={16}
                  fontWeight={600}
                  textAlign="center"
                  color={isDarkMode ? "$textDark" : "$black"}
                >
                  {t("foodEdit.renameMeal")}
                </Text>
                <View
                  borderWidth={1}
                  borderColor={isDarkMode ? "$grey3" : "$borderColor"}
                  borderRadius="$5"
                  paddingHorizontal="$3"
                  paddingVertical="$2"
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
                      fontWeight: "500",
                    }}
                  />
                </View>
              </YStack>

              <View
                height={1}
                backgroundColor={isDarkMode ? "$grey3" : "$borderColor"}
              />

              <XStack>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 14, alignItems: "center" }}
                  onPress={() => setIsNameEdit(false)}
                >
                  <Text fontSize={16} color="$colorSubtle">
                    {t("action.cancel")}
                  </Text>
                </TouchableOpacity>
                <View
                  width={1}
                  backgroundColor={isDarkMode ? "$grey3" : "$borderColor"}
                />
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 14, alignItems: "center" }}
                  onPress={handleTitleEdit}
                >
                  <Text
                    fontSize={16}
                    fontWeight={600}
                    color={tokens.color.primary.val}
                  >
                    {t("action.confirm")}
                  </Text>
                </TouchableOpacity>
              </XStack>
            </YStack>
          </View>
        </AppModal>

        <YStack gap="$3">
          <XStack justifyContent="space-between" paddingHorizontal="$5">
            <Text
              fontSize={17}
              fontWeight={600}
              color={isDarkMode ? "$textDark" : "$black"}
            >
              {t("foodEdit.foodsAndAmounts")}
            </Text>
            <TouchableOpacity onPress={handleAddMenu}>
              <XStack paddingRight="$1" gap={3}>
                <Icon name="plus" size={17} />
                <Text fontSize={15} fontWeight={600} color="$colorSubtle">
                  {t("foodEdit.addMenu")}
                </Text>
              </XStack>
            </TouchableOpacity>
          </XStack>

          <View
            backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
            marginHorizontal="$4"
            borderRadius="$5"
            paddingHorizontal="$4"
            paddingVertical="$5"
          >
            <YStack gap="$3">
              {addStep === "name" && (
                <XStack alignItems="flex-start" paddingVertical="$2" gap="$2">
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
                </XStack>
              )}
              {addStep === "amount" && (
                <YStack gap="$3">
                  <XStack alignItems="center" gap="$3">
                    <Text fontWeight={500} fontSize={15} flex={1}>
                      {newMenuName}
                    </Text>
                  </XStack>
                  <XStack alignItems="flex-start" gap="$2">
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
                  </XStack>
                  <V2Button
                    size="m"
                    fullWidth
                    onPress={handleAmountSubmit}
                    accessibilityLabel={t("foodEdit.confirmAmount")}
                  >
                    {t("action.confirm")}
                  </V2Button>
                </YStack>
              )}
              {foods.map((f, i) => (
                <XStack key={i} alignItems="center" gap="$2">
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
                  <Text
                    fontSize={
                      getUnitTranslationKey(f.unit) === "foodEdit.unit.serving"
                        ? 12
                        : 14
                    }
                    width={21}
                    textAlign="center"
                    color={isDarkMode ? "$textDark" : "$black"}
                  >
                    {getUnitLabel(f.unit)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDelete(i)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={t("foodEdit.deleteMenu", {
                      name: f.name || t("foodEdit.menu"),
                    })}
                  >
                    <View
                      width={22}
                      height={22}
                      borderRadius={11}
                      backgroundColor={isDarkMode ? "#3A3A40" : "#DADCE0"}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text
                        fontSize={15}
                        lineHeight={17}
                        fontWeight="600"
                        color={isDarkMode ? "$textDark" : "#5A5C63"}
                        textAlign="center"
                      >
                        ×
                      </Text>
                    </View>
                  </TouchableOpacity>
                </XStack>
              ))}
            </YStack>
          </View>
        </YStack>

        <View
          backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
          marginHorizontal="$4"
          borderRadius="$5"
          paddingHorizontal="$4"
          paddingVertical="$5"
        >
          <Text
            fontSize={16}
            fontWeight={600}
            marginBottom="$4"
            paddingLeft={4}
            color={isDarkMode ? "$textDark" : "$black"}
          >
            {t("foodEdit.howMuch")}
          </Text>
          <ConsumedAmountSelector value={eatenStep} onChange={setEatenStep} />
          {hasBroth && (
            <YStack marginTop="$5" gap="$3">
              <Text
                fontSize={15}
                fontWeight={600}
                paddingLeft={4}
                color={isDarkMode ? "$textDark" : "$black"}
              >
                {t("foodEdit.howMuchBroth")}
              </Text>
              <Text fontSize={13} color="$colorSubtle" paddingLeft={4}>
                {t("foodEdit.brothHint")}
              </Text>
              <ConsumedAmountSelector
                value={brothStep}
                onChange={setBrothStep}
                accessibilityLabel={t("foodEdit.chooseBrothAmount")}
              />
            </YStack>
          )}
        </View>
      </KeyboardAwareScrollView>

      {/* 저장은 손이 닿는 하단 한 곳 — 헤더 우측 텍스트 버튼보다 놓치지 않는다 */}
      <View paddingHorizontal={20} paddingTop={10} paddingBottom={34}>
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
          <Text fontSize={16} fontWeight={700} color="#FFFFFF">
            {t("action.save")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 결과 pageSheet(네이티브 Modal) 안이라 루트 포털은 뒤에 깔린다 — inline. */}
      <LoadingOverlay
        visible={isUpdating}
        message={t("foodEdit.saving")}
        inline
      />
    </YStack>
  )
}
