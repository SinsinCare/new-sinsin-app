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
import {
  EATEN_STEPS,
  THUMB_SIZE,
  UNIT_OPTIONS,
} from "../data/foodEditConstants"
import { MEAL_OPTIONS } from "../data/mealConstants"
import { MealType } from "../types"
import { useFoodEdit } from "../hooks/useFoodEdit"

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
  const {
    foods,
    mealName,
    isNameEdit,
    editingName,
    setEditingName,
    setIsNameEdit,
    eatenStep,
    trackWidth,
    setTrackWidth,
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
    thumbAnim,
    defaultMealName,
    handleNameEdit,
    handleNameConfirm,
    handleAmountChange,
    handleDelete,
    handleTrackTouch,
    handleAddMenu,
    handleNameSubmit,
    handleAmountSubmit,
  } = useFoodEdit(result, mealType)

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
              <Icon name="edit" size={22} onPress={handleNameEdit} />
            </XStack>

            <XStack justifyContent="space-between" alignItems="center" gap={4}>
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
                      <Icon
                        name={opt.icon}
                        size={16}
                        color={
                          isSelected
                            ? tokens.color.grey1.val
                            : tokens.color.grey6.val
                        }
                      />
                      <Text
                        fontSize={15}
                        fontWeight={500}
                        color={isSelected ? "$color" : "$colorSubtle"}
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
                      fontWeight: "500",
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
              <XStack paddingRight="$1" gap={3}>
                <Icon name="plus" size={17} />
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
                  <Text
                    fontSize={f.unit === "인분" ? 12 : 14}
                    width={21}
                    textAlign="center"
                  >
                    {f.unit}
                  </Text>
                  <TouchableOpacity onPress={() => handleDelete(i)}>
                    <View
                      width={20}
                      height={20}
                      borderRadius={12}
                      backgroundColor={tokens.color.deleteBg.val}
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
          backgroundColor="$cardBackground"
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
          >
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
                backgroundColor: tokens.color.deleteBg.val,
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
