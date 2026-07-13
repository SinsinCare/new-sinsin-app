import { useState } from "react"
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text, View, XStack, YStack } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import {
  FoodAnalysisUpdateRequest,
  FoodAnalysisUpdateResult,
  FoodCameraAnalyzeResult,
} from "@/src/types"
import { Icon } from "@/src/shared/components"
import { LoadingOverlay } from "./LoadingOverlay"
import { EatenSlider } from "./EatenSlider"
import { UNIT_OPTIONS } from "../data/foodEditConstants"
import { MEAL_OPTIONS } from "../data/mealConstants"
import { MealType } from "../types"
import { useFoodEdit } from "../hooks/useFoodEdit"
import { useFoodAnalysis } from "../hooks/useFoodAnalysis"
import {
  buildFoodAnalysisUpdateRequest,
  applyOptimisticConsumption,
  getInitialEatenStep,
  validateMealTitle,
} from "../utils/foodEditUtils"

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
    setNewMenuName,
    newMenuAmount,
    setNewMenuAmount,
    newMenuUnit,
    setNewMenuUnit,
    nameEditInputRef,
    nameInputRef,
    amountInputRef,
    handleNameEdit,
    handleNameConfirm,
    handleFoodNameChange,
    handleAmountChange,
    handleDelete,
    handleAddMenu,
    handleNameSubmit,
    handleAmountSubmit,
  } = useFoodEdit(result, mealType)

  const { updateFoodTitle } = useFoodAnalysis()
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(
    mealType,
  )
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
      Alert.alert("업데이트 실패", validation.message)
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
    }
  }
  const isDarkMode = useAppColorScheme() === "dark"
  const textColor = isDarkMode
    ? tokens.color.textDark.val
    : tokens.color.grey1.val
  const inputBg = isDarkMode
    ? tokens.color.appBgDark.val
    : tokens.color.grey8.val

  const handleSubmit = async () => {
    if (!result) return
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
      !mealTypeChanged
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
    if (ok) onClose()
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
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
        >
          <Text fontSize={16} fontWeight={500} color="$colorSubtle">
            취소
          </Text>
        </TouchableOpacity>
        <Text
          fontSize={17}
          fontWeight={600}
          color={isDarkMode ? "$textDark" : "$black"}
        >
          식단 수정하기
        </Text>
        <TouchableOpacity
          onPress={handleSubmit}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
        >
          <Text fontSize={16} fontWeight={600} color="$sub6">
            완료
          </Text>
        </TouchableOpacity>
      </XStack>

      <ScrollView contentContainerStyle={{ gap: 32, paddingBottom: 60 }}>
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
                        ? tokens.color.sub6.val + "29"
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
                            ? isDarkMode
                              ? tokens.color.textDarkSub.val
                              : tokens.color.grey1.val
                            : tokens.color.grey6.val
                        }
                      />
                      <Text
                        fontSize={15}
                        fontWeight={500}
                        color={
                          isSelected
                            ? isDarkMode
                              ? "$textDarkSub"
                              : "$color"
                            : "$colorSubtle"
                        }
                      >
                        {opt.label}
                      </Text>
                    </XStack>
                  </TouchableOpacity>
                )
              })}
            </XStack>
          </YStack>
        </XStack>

        <Modal
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
                  식단 이름 수정
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
                    취소
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
                  <Text fontSize={16} fontWeight={600} color="$sub6">
                    확인
                  </Text>
                </TouchableOpacity>
              </XStack>
            </YStack>
          </View>
        </Modal>

        <YStack gap="$3">
          <XStack justifyContent="space-between" paddingHorizontal="$5">
            <Text
              fontSize={17}
              fontWeight={600}
              color={isDarkMode ? "$textDark" : "$black"}
            >
              식단 세부 수정
            </Text>
            <TouchableOpacity onPress={handleAddMenu}>
              <XStack paddingRight="$1" gap={3}>
                <Icon name="plus" size={17} />
                <Text fontSize={15} fontWeight={600} color="$colorSubtle">
                  메뉴 추가
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
                <XStack alignItems="center" paddingVertical="$2" gap="$3">
                  <TextInput
                    ref={nameInputRef}
                    value={newMenuName}
                    onChangeText={setNewMenuName}
                    placeholder="메뉴 이름"
                    placeholderTextColor={tokens.color.grey5.val}
                    returnKeyType="next"
                    onSubmitEditing={handleNameSubmit}
                    style={{
                      flex: 1,
                      paddingLeft: 1,
                      fontSize: 15,
                      fontWeight: "500",
                      color: textColor,
                    }}
                  />
                </XStack>
              )}
              {addStep === "amount" && (
                <YStack gap="$2">
                  <XStack alignItems="center" gap="$3">
                    <Text fontWeight={500} fontSize={15} flex={1}>
                      {newMenuName}
                    </Text>
                  </XStack>
                  <TextInput
                    ref={amountInputRef}
                    value={newMenuAmount}
                    onChangeText={setNewMenuAmount}
                    placeholder="양을 입력해 주세요"
                    placeholderTextColor={tokens.color.grey5.val}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={handleAmountSubmit}
                    style={{
                      alignSelf: "stretch",
                      borderRadius: 10,
                      paddingVertical: 8,
                      fontSize: 16,
                      fontWeight: "600",
                      textAlign: "center",
                      color: textColor,
                    }}
                  />
                  <XStack gap="$2" justifyContent="center" paddingVertical="$2">
                    {UNIT_OPTIONS.map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        onPress={() => setNewMenuUnit(unit)}
                      >
                        <View
                          width={65}
                          height={35}
                          alignItems="center"
                          justifyContent="center"
                          borderRadius="$4"
                          backgroundColor={
                            newMenuUnit === unit
                              ? tokens.color.sub6.val + "29"
                              : tokens.color.grey8.val
                          }
                        >
                          <Text
                            fontSize={14}
                            fontWeight={500}
                            color="$colorSubtle"
                          >
                            {unit}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </XStack>
                </YStack>
              )}
              {foods.map((f, i) => (
                <XStack key={i} alignItems="center" gap="$2">
                  <TextInput
                    value={f.name}
                    onChangeText={(v) => handleFoodNameChange(i, v)}
                    placeholder="음식 이름"
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
                    fontSize={f.unit === "인분" ? 12 : 14}
                    width={21}
                    textAlign="center"
                    color={isDarkMode ? "$textDark" : "$black"}
                  >
                    {f.unit}
                  </Text>
                  <TouchableOpacity onPress={() => handleDelete(i)}>
                    <View
                      width={20}
                      height={20}
                      borderRadius={12}
                      backgroundColor={inputBg}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text
                        fontSize={18}
                        lineHeight={20}
                        color="$pureWhite"
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
            얼마나 드셨나요?
          </Text>
          <EatenSlider value={eatenStep} onChange={setEatenStep} />
          {hasBroth && (
            <YStack marginTop="$5" gap="$3">
              <Text
                fontSize={15}
                fontWeight={600}
                paddingLeft={4}
                color={isDarkMode ? "$textDark" : "$black"}
              >
                국물은 얼마나 드셨나요?
              </Text>
              <Text fontSize={13} color="$colorSubtle" paddingLeft={4}>
                건더기와 국물 양을 나누어 계산해요.
              </Text>
              <EatenSlider value={brothStep} onChange={setBrothStep} />
            </YStack>
          )}
        </View>
      </ScrollView>

      <LoadingOverlay visible={isUpdating} message="식단을 수정하고 있어요" />
    </YStack>
  )
}
