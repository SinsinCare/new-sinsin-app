import { Modal, ScrollView, Image } from "react-native"
import { useState } from "react"
import { YStack, XStack, Text, View } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { tokens } from "@/src/theme/tokens"
import type {
  FoodAnalysisUpdateRequest,
  FoodCameraAnalyzeResult,
} from "@/src/types"
import type { MealType } from "../types"
import { getRestrictionStyle } from "../utils/getRestrictionStyle"
import { MacroBar } from "./record/MacroBar"
import { Icon, IconName } from "@/src/shared/components/Icon"
import { FoodResultEdit } from "./FoodResultEdit"

const NUTRIENT_ICON: Record<string, IconName> = {
  나트륨: "sodium",
  칼륨: "potassium",
  인: "phosphorus",
  단백질: "protein",
}

interface FoodAnalysisResultProps {
  result: FoodCameraAnalyzeResult | null
  open: boolean
  onClose: () => void
  imageUri?: string
  mealType?: MealType
  onAddToRecord?: () => Promise<void> | void
  showAddButton?: boolean
  updateFoodAnalysis: (
    foodAnalysisResultId: number,
    body: FoodAnalysisUpdateRequest,
  ) => Promise<boolean>
}

const MEAL_TYPE_ICON: Record<MealType, string> = {
  BREAKFAST: "sunny-outline",
  LUNCH: "partly-sunny-outline",
  DINNER: "moon-outline",
  SNACKS: "cafe-outline",
}

const MEAL_LABEL: Record<MealType, string> = {
  BREAKFAST: "아침",
  LUNCH: "점심",
  DINNER: "저녁",
  SNACKS: "간식",
}

function NutrientCell({ label, value }: { label: string; value: string }) {
  const iconName = NUTRIENT_ICON[label]
  return (
    <YStack flex={1} alignItems="center">
      {iconName && <Icon name={iconName} size={30} />}
      <View height={10} />
      <Text fontSize="$3">{label}</Text>
      <Text fontSize={14} fontWeight="600">
        {value.includes(".") ? parseFloat(value).toFixed(1) : value}
      </Text>
    </YStack>
  )
}

export function FoodAnalysisResult({
  result,
  open,
  onClose,
  imageUri,
  mealType,
  onAddToRecord,
  showAddButton = true,
  updateFoodAnalysis,
}: FoodAnalysisResultProps) {
  const insets = useSafeAreaInsets()
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [isEdit, setIsEdit] = useState(false)

  if (!result) return null

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

  const servingsLabel = `${result.servings}인분`

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClosePress}
    >
      <YStack flex={1} backgroundColor="$appBg">
        {/* Header */}
        <XStack
          alignItems="center"
          paddingHorizontal={12}
          paddingTop={30}
          paddingBottom={10}
          backgroundColor={tokens.color.appBg.val}
        >
          <View width={40} />
          <Text
            fontSize="$5"
            fontWeight="600"
            color="$color"
            textAlign="center"
            flex={1}
          >
            식단 분석
          </Text>
          <XStack
            width={40}
            height={40}
            alignItems="center"
            justifyContent="center"
            onPress={handleClosePress}
            pressStyle={{ opacity: 0.7 }}
          >
            <Ionicons name="close" size={22} color={tokens.color.grey3.val} />
          </XStack>
        </XStack>

        <ScrollView
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
              color="$color"
              flexShrink={1}
              flex={1}
            >
              {result.title}{" "}
              <Text fontSize="$4" color="$colorSubtle" fontWeight="700">
                {servingsLabel}
              </Text>
            </Text>
            {mealType && (
              <XStack
                alignItems="center"
                gap="$1"
                backgroundColor="$backgroundFocus"
                paddingHorizontal="$3"
                paddingVertical={6}
                borderRadius="$8"
                flexShrink={0}
              >
                <Ionicons
                  name={
                    MEAL_TYPE_ICON[mealType] as keyof typeof Ionicons.glyphMap
                  }
                  size={15}
                />
                <Text fontSize={14} color="$color" fontWeight="500">
                  {MEAL_LABEL[mealType]}
                </Text>
              </XStack>
            )}
          </XStack>

          {/* 음식 이미지 */}
          {imageUri && (
            <View marginHorizontal="$4" borderRadius={16} overflow="hidden">
              <Image
                source={{ uri: imageUri }}
                style={{ width: "100%", height: 220, resizeMode: "cover" }}
              />
              <XStack
                position="absolute"
                bottom={10}
                right={10}
                alignItems="center"
                backgroundColor="$offWhite"
                borderRadius={8}
                paddingHorizontal={9}
                paddingVertical={7}
                gap={3}
                opacity={0.9}
                pressStyle={{ opacity: 0.5 }}
                onPress={handleEditPress}
              >
                <Icon name="edit" size={18} />
                <Text fontSize={12} fontWeight="600" color="$color.grey4">
                  식단 수정
                </Text>
              </XStack>
            </View>
          )}

          {/* 한줄평 */}
          <YStack
            marginHorizontal="$4"
            marginTop="$4"
            backgroundColor="$cardBackground"
            borderRadius="$4"
            padding="$4"
            gap="$2"
          >
            <Text fontSize="$3" color="$colorSubtle" fontWeight="600">
              한줄평
            </Text>
            <Text fontSize="$4" color="$color" lineHeight={22} fontWeight="600">
              {result.evaluation.comment}
            </Text>
          </YStack>

          {/* 총 열량 */}
          <YStack
            marginHorizontal="$4"
            marginTop="$3"
            backgroundColor="$cardBackground"
            borderRadius="$4"
            padding="$4"
          >
            <Text fontSize="$4" fontWeight="600">
              총 열량
            </Text>
            <XStack alignItems="baseline" gap="$1">
              <Text fontSize={30} fontWeight="600" color="$color">
                {Math.round(result.total.calories)}
              </Text>
              <Text fontSize="$5" color="$colorSubtle" fontWeight="500">
                Kcal
              </Text>
            </XStack>
            <View height="$2" />
            <MacroBar
              carbs={result.total.carbohydrates}
              protein={result.total.protein}
              fat={result.total.fat}
            />
          </YStack>

          {/* 식단 세부 분석 */}
          <YStack marginHorizontal="$4" marginTop="$5" gap="$3">
            <Text fontSize={22} fontWeight="700" color="$color">
              식단 세부 분석
            </Text>
            {result.foods.map((food, i) => {
              const restriction = getRestrictionStyle(food.restrictionLevel)
              return (
                <YStack
                  key={i}
                  backgroundColor="$cardBackground"
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
                        color="$color"
                        numberOfLines={1}
                        flexShrink={1}
                      >
                        {food.name}
                      </Text>
                      <XStack paddingHorizontal={1}>
                        <Text fontSize="$3" color="$colorSubtle" flexShrink={0}>
                          {food.servingSizeValue}
                        </Text>
                        <Text fontSize="$3" color="$colorSubtle" flexShrink={0}>
                          {food.servingSizeUnit}
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
                        {restriction.label}
                      </Text>
                    </View>
                  </XStack>

                  <XStack gap="$2">
                    <NutrientCell label="나트륨" value={`${food.sodium}mg`} />
                    <NutrientCell label="칼륨" value={`${food.potassium}mg`} />
                    <NutrientCell label="인" value={`${food.phosphorus}mg`} />
                    <NutrientCell label="단백질" value={`${food.protein}g`} />
                  </XStack>
                </YStack>
              )
            })}
          </YStack>

          {/* 더 건강하게 식사하는 법 */}
          {result.evaluation.cautionFoods.length > 0 && (
            <YStack marginHorizontal="$4" marginTop="$5" gap="$3">
              <Text fontSize={22} fontWeight="700" color="$color">
                더 건강하게 식사하는 법
              </Text>
              <YStack
                backgroundColor="$cardBackground"
                borderRadius="$4"
                padding="$4"
                gap="$6"
              >
                {result.evaluation.cautionFoods.map((item, i) => (
                  <YStack key={i} gap="$2">
                    <Text fontSize="$3" fontWeight="700" color="$colorSubtle">
                      주의해야 할 음식 {i + 1}: {item.food}
                    </Text>
                    <Text fontSize={15} fontWeight="500" lineHeight={22}>
                      {item.reason}
                    </Text>
                  </YStack>
                ))}
              </YStack>
            </YStack>
          )}

          {/* 식사에 대해 질문하기 */}
          <XStack
            alignItems="center"
            justifyContent="center"
            gap={6}
            marginTop={24}
            paddingVertical={17}
            marginHorizontal={15}
            backgroundColor="#EAEAF0"
            borderRadius={20}
            pressStyle={{ opacity: 0.7 }}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color={tokens.color.grey3.val}
            />
            <Text fontSize={16} fontWeight="500">
              식사에 대해 질문하기
            </Text>
          </XStack>
        </ScrollView>

        {/* 하단 고정 버튼 */}
        {showAddButton && (
          <YStack
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            backgroundColor={tokens.color.appBg.val}
            paddingHorizontal={16}
            paddingTop={12}
            paddingBottom={insets.bottom + 12}
          >
            <YStack
              backgroundColor={tokens.color.primary7.val}
              borderRadius={30}
              height={54}
              alignItems="center"
              justifyContent="center"
              onPress={async () => {
                await onAddToRecord?.()
                onClose()
              }}
              pressStyle={{ opacity: 0.8 }}
            >
              <Text color="white" fontSize={16} fontWeight="700">
                기록에 추가하기
              </Text>
            </YStack>
          </YStack>
        )}
      </YStack>

      {/* 나가기 확인 오버레이 */}
      {showExitConfirm && (
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          backgroundColor="rgba(0,0,0,0.3)"
          justifyContent="center"
          alignItems="center"
        >
          <YStack
            backgroundColor={tokens.color.offWhite.val}
            borderRadius={15}
            overflow="hidden"
          >
            <YStack
              paddingHorizontal="$10"
              paddingTop="$8"
              paddingBottom="$6"
              gap="$2"
            >
              <Text fontSize={16} fontWeight="600" textAlign="center">
                아직 식단을 기록하지 않았어요.
              </Text>
              <Text
                fontSize={14}
                color="$colorSubtle"
                textAlign="center"
                lineHeight={22}
              >
                식단을 기록에 추가해 주세요.
              </Text>
            </YStack>

            <View height={1} backgroundColor="#E5E5E5" />

            <XStack>
              <YStack
                flex={1}
                alignItems="center"
                paddingVertical="$4"
                onPress={() => {
                  setShowExitConfirm(false)
                  onClose()
                }}
                pressStyle={{ opacity: 0.6 }}
              >
                <Text
                  color={tokens.color.primary9.val}
                  fontSize={15}
                  fontWeight="500"
                >
                  나가기
                </Text>
              </YStack>

              <View width={1} backgroundColor="#E5E5E5" />

              <YStack
                flex={1}
                alignItems="center"
                paddingVertical="$4"
                onPress={() => setShowExitConfirm(false)}
                pressStyle={{ opacity: 0.8 }}
              >
                <Text fontSize={15} fontWeight="500">
                  돌아가기
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </YStack>
      )}
      {isEdit && (
        <FoodResultEdit
          result={result}
          imageUri={imageUri}
          onClose={() => setIsEdit(false)}
          mealType={mealType ?? null}
          updateFoodAnalysis={updateFoodAnalysis}
        />
      )}
    </Modal>
  )
}
