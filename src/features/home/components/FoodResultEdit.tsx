import { useEffect, useRef, useState } from "react"
import {
  Animated,
  Image,
  Modal,
  TextInput,
  TouchableOpacity,
} from "react-native"
import { Text, View, XStack, YStack } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import { FoodCameraAnalyzeResult } from "@/src/types"
import { Icon } from "@/src/shared/components"
import { MEAL_OPTIONS } from "../data/mealConstants"
import { MealType } from "../types"

interface FoodResultEditProps {
  result: FoodCameraAnalyzeResult | null
  imageUri?: string
  onClose: () => void
  mealType: MealType | null
}

export function FoodResultEdit({
  result,
  imageUri,
  onClose,
  mealType,
}: FoodResultEditProps) {
  const initialFoods = result?.foods ?? []
  const [foods, setFoods] = useState(
    initialFoods.map((f) => ({
      ...f,
      amount: String(f.servingSizeValue ?? ""),
      unit: f.servingSizeUnit,
    })),
  )

  const defaultMealName =
    result?.foods
      .slice(0, 2)
      .map((f) => f.name)
      .join("와 ") ?? ""
  const [mealName, setMealName] = useState(defaultMealName)
  const [isNameEdit, setIsNameEdit] = useState(false)
  const [editingName, setEditingName] = useState("")
  const nameEditInputRef = useRef<TextInput>(null)

  const handleNameEdit = () => {
    setEditingName("")
    setIsNameEdit(true)
    setTimeout(() => nameEditInputRef.current?.focus(), 100)
  }

  const handleNameConfirm = () => {
    setMealName(editingName.trim() || mealName)
    setIsNameEdit(false)
  }

  const handleAmountChange = (index: number, value: string) => {
    setFoods((prev) =>
      prev.map((f, i) => (i === index ? { ...f, amount: value } : f)),
    )
  }

  const EATEN_STEPS = ["조금 먹었어요", "반 정도", "3/4", "다 먹었어요"]
  const initialEatenStep = Math.min(
    3,
    Math.max(
      0,
      Math.round((((result?.eatenPercentage ?? 1) - 0.25) / 0.75) * 3),
    ),
  )
  const [eatenStep, setEatenStep] = useState(initialEatenStep)
  const [trackWidth, setTrackWidth] = useState(0)
  const THUMB_SIZE = 22

  const handleTrackTouch = (locationX: number) => {
    if (trackWidth === 0) return
    setEatenStep(Math.min(3, Math.floor(locationX / (trackWidth / 4))))
  }

  const thumbAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (trackWidth === 0) return
    Animated.spring(thumbAnim, {
      toValue: ((2 * eatenStep + 1) / 8) * trackWidth - THUMB_SIZE / 2,
      useNativeDriver: true,
      tension: 120,
      friction: 10,
    }).start()
  }, [eatenStep, trackWidth, thumbAnim])

  const [addStep, setAddStep] = useState<"idle" | "name" | "amount">("idle")
  const [newMenuName, setNewMenuName] = useState("")
  const [newMenuAmount, setNewMenuAmount] = useState("")
  const [newMenuUnit, setNewMenuUnit] = useState("인분")
  const nameInputRef = useRef<TextInput>(null)
  const amountInputRef = useRef<TextInput>(null)

  const UNIT_OPTIONS = ["인분", "g", "개", "잔"]

  const handleDelete = (index: number) => {
    setFoods((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddMenu = () => {
    setAddStep("name")
    setNewMenuName("")
    setTimeout(() => nameInputRef.current?.focus(), 100)
  }

  const handleNameSubmit = () => {
    if (!newMenuName.trim()) return
    setAddStep("amount")
    setNewMenuAmount("")
    setTimeout(() => amountInputRef.current?.focus(), 100)
  }

  const handleAmountSubmit = () => {
    setFoods((prev) => [
      {
        name: newMenuName.trim(),
        amount: newMenuAmount,
        unit: newMenuUnit,
        restrictionLevel: "",
        servingSizeValue: newMenuAmount ? Number(newMenuAmount) : null,
        servingSizeUnit: newMenuUnit,
        calories: 0,
        protein: 0,
        carbohydrates: 0,
        fat: 0,
        sodium: 0,
        potassium: 0,
        phosphorus: 0,
        water: 0,
      },
      ...prev,
    ])
    setAddStep("idle")
    setNewMenuName("")
    setNewMenuAmount("")
  }

  return (
    <YStack
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      backgroundColor={tokens.color.appBg.val}
      zIndex={10}
    >
      <XStack
        paddingHorizontal="$8"
        paddingVertical="$10"
        justifyContent="space-between"
      >
        <TouchableOpacity onPress={onClose}>
          <Text fontSize={16} fontWeight={500} color="$colorSubtle">
            취소
          </Text>
        </TouchableOpacity>
        <Text fontSize={17} fontWeight={600}>
          식단 수정하기
        </Text>
        <TouchableOpacity>
          <Text fontSize={16} fontWeight={500} color="$colorSubtle">
            완료
          </Text>
        </TouchableOpacity>
      </XStack>

      <View gap="$8">
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
              <Text fontSize={18} fontWeight="600" paddingLeft="$1">
                {mealName}{" "}
              </Text>
              <Icon name="edit" size={20} onPress={handleNameEdit} />
            </XStack>

            <XStack justifyContent="space-between" alignItems="center" gap="$1">
              {MEAL_OPTIONS.map((opt) => {
                const isSelected = mealType === opt.type
                return (
                  <TouchableOpacity
                    key={opt.type}
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
                      <Icon name={opt.icon} size={16} />
                      <Text fontSize={15}>{opt.label}</Text>
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
              backgroundColor="$cardBackground"
              borderRadius="$5"
              width={280}
              overflow="hidden"
            >
              <YStack paddingHorizontal="$5" paddingVertical="$6" gap="$4">
                <Text fontSize={16} fontWeight={600} textAlign="center">
                  식단 이름 수정
                </Text>
                <View
                  borderWidth={1}
                  borderColor="$borderColor"
                  borderRadius="$5"
                  paddingHorizontal="$3"
                  paddingVertical="$2"
                >
                  <TextInput
                    ref={nameEditInputRef}
                    value={editingName}
                    onChangeText={setEditingName}
                    placeholder={defaultMealName}
                    placeholderTextColor={tokens.color.grey5.val}
                    returnKeyType="done"
                    onSubmitEditing={handleNameConfirm}
                    style={{
                      fontSize: 14,
                      color: tokens.color.grey1.val,
                      fontWeight: 500,
                    }}
                  />
                </View>
              </YStack>

              <View height={1} backgroundColor="$borderColor" />

              <XStack>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 14, alignItems: "center" }}
                  onPress={() => setIsNameEdit(false)}
                >
                  <Text fontSize={16} color="$colorSubtle">
                    취소
                  </Text>
                </TouchableOpacity>
                <View width={1} backgroundColor="$borderColor" />
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 14, alignItems: "center" }}
                  onPress={handleNameConfirm}
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
            <Text fontSize={17} fontWeight={600}>
              식단 세부 수정
            </Text>
            <TouchableOpacity onPress={handleAddMenu}>
              <XStack paddingRight="$1" gap="$1">
                <Icon name="plus" size={16} />
                <Text fontSize={15} fontWeight={600} color="$colorSubtle">
                  메뉴 추가
                </Text>
              </XStack>
            </TouchableOpacity>
          </XStack>

          <View
            backgroundColor="$cardBackground"
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
                    }}
                  />
                  <XStack gap="$2" justifyContent="center" paddingVertical="$2">
                    {UNIT_OPTIONS.map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        onPress={() => setNewMenuUnit(unit)}
                      >
                        <View
                          width={60}
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
                <XStack key={i} alignItems="center" gap="$3">
                  <Text fontWeight={500} fontSize={15} flex={1}>
                    {f.name}
                  </Text>
                  <TextInput
                    value={f.amount}
                    onChangeText={(v) => handleAmountChange(i, v)}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: tokens.color.grey8.val,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 15,
                      textAlign: "center",
                      minWidth: 80,
                    }}
                  />
                  <Text fontSize={15} width={14} textAlign="left">
                    {f.unit}
                  </Text>
                  <TouchableOpacity onPress={() => handleDelete(i)}>
                    <View
                      width={20}
                      height={20}
                      borderRadius={12}
                      backgroundColor="$backgroundPress"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text
                        fontSize={18}
                        lineHeight={20}
                        color="$white"
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
          backgroundColor="$cardBackground"
          marginHorizontal="$4"
          borderRadius="$5"
          paddingHorizontal="$4"
          paddingVertical="$5"
        >
          <Text fontSize={15} fontWeight={600} marginBottom="$4">
            얼마나 드셨나요?
          </Text>
          <View
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderMove={(e) => handleTrackTouch(e.nativeEvent.locationX)}
            onResponderRelease={(e) =>
              handleTrackTouch(e.nativeEvent.locationX)
            }
            style={{ height: THUMB_SIZE + 8, justifyContent: "center" }}
          >
            {/* 배경 트랙 */}
            <View
              style={{
                height: 30,
                backgroundColor: tokens.color.grey8.val,
                borderRadius: 15,
              }}
            />
            {/* 썸 */}
            {trackWidth > 0 && (
              <Animated.View
                style={{
                  position: "absolute",
                  transform: [{ translateX: thumbAnim }],
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                  borderRadius: THUMB_SIZE / 2,
                  backgroundColor: tokens.color.pureWhite.val,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              />
            )}
          </View>
          <XStack marginTop="$2">
            {EATEN_STEPS.map((label, i) => (
              <View key={i} flex={1} alignItems="center">
                <Text
                  fontSize={13}
                  fontWeight={i === eatenStep ? 500 : 400}
                  color={i === eatenStep ? "$color" : "$colorSubtle"}
                >
                  {label}
                </Text>
              </View>
            ))}
          </XStack>
        </View>
      </View>
    </YStack>
  )
}
