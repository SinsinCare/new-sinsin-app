import { Modal, ScrollView, Image } from "react-native"
import { YStack, XStack, Text, View } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { tokens } from "@/src/theme/tokens"
import type { FoodCameraAnalyzeResult } from "@/src/types"
import type { MealType } from "../../types"
import { getRestrictionStyle } from "../../utils/getRestrictionStyle"
import { MacroBar } from "./MacroBar"

interface FoodAnalysisResultProps {
  result: FoodCameraAnalyzeResult | null
  open: boolean
  onClose: () => void
  imageUri?: string
  mealType?: MealType
  onAddToRecord?: () => void
}

const MEAL_TYPE_ICON: Record<MealType, string> = {
  아침: "sunny-outline",
  점심: "partly-sunny-outline",
  저녁: "moon-outline",
  간식: "cafe-outline",
}

function NutrientCell({ label, value }: { label: string; value: string }) {
  return (
    <YStack flex={1} alignItems="center">
      <View
        width={30}
        height={30}
        borderRadius={5}
        backgroundColor="$grey7"
        marginBottom={2}
      />
      <View height={10} />
      <Text fontSize="$3">{label}</Text>
      <Text fontSize={14} fontWeight="600">
        {value}
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
}: FoodAnalysisResultProps) {
  const insets = useSafeAreaInsets()

  if (!result) return null

  const foodTitle = result.foods.map((f) => f.name).join("와 ")
  const servingsLabel = `${result.servings}인분`

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <YStack flex={1} backgroundColor={tokens.color.appBg.val}>
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
            onPress={onClose}
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
            alignItems="center"
            justifyContent="space-between"
          >
            <XStack alignItems="baseline" gap="$1" flex={1}>
              <Text fontSize={22} fontWeight="700" color="$color">
                {foodTitle}
              </Text>
              <Text fontSize="$4" color="$colorSubtle" fontWeight="700">
                {servingsLabel}
              </Text>
            </XStack>
            {mealType && (
              <XStack
                alignItems="center"
                gap="$1"
                backgroundColor="#EAEAF0"
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$4"
              >
                <Ionicons
                  name={
                    MEAL_TYPE_ICON[mealType] as keyof typeof Ionicons.glyphMap
                  }
                  size={14}
                  color={tokens.color.grey3.val}
                />
                <Text fontSize={14} color="$colorSubtle" fontWeight="700">
                  {mealType}
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
                backgroundColor="rgba(0,0,0,0.55)"
                borderRadius={16}
                paddingHorizontal={10}
                paddingVertical={5}
                gap={4}
                pressStyle={{ opacity: 0.7 }}
              >
                <Ionicons name="pencil" size={12} color="white" />
                <Text color="white" fontSize={12} fontWeight="500">
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
            <Text fontSize="$4" color="$color" lineHeight={22}>
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
                {result.total.calories}
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
                  >
                    <XStack alignItems="baseline" gap="$1">
                      <Text fontSize="$4" fontWeight="600" color="$color">
                        {food.name}
                      </Text>
                      <Text fontSize="$3" color="$colorSubtle">
                        {food.servingSize}
                      </Text>
                    </XStack>
                    <View
                      paddingHorizontal={8}
                      paddingVertical={4}
                      borderRadius={8}
                      backgroundColor={restriction.bg}
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
                gap="$4"
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
            paddingVertical={12}
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
            onPress={() => {
              onAddToRecord?.()
              onClose()
            }}
            pressStyle={{ opacity: 0.8 }}
          >
            <Text color="white" fontSize={16} fontWeight="700">
              기록에 추가하기
            </Text>
          </YStack>
        </YStack>
      </YStack>
    </Modal>
  )
}
