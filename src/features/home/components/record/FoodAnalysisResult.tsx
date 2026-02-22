import { Modal, ScrollView, Pressable, Image, StyleSheet } from "react-native"
import { YStack, XStack, Text, View } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { tokens } from "@/src/theme/tokens"
import type { FoodCameraAnalyzeResult } from "@/src/types"
import type { MealType } from "../../types"

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

function getRestrictionStyle(level: string): {
  label: string
  bg: string
  color: string
} {
  switch (level.toLowerCase()) {
    case "safe":
      return {
        label: "안전해요",
        bg: "$secondaryLight",
        color: "$secondary",
      }
    case "caution":
      return {
        label: "주의 필요",
        bg: "$primary2",
        color: "$primaryHover",
      }
    case "restricted":
      return {
        label: "제한 필요",
        bg: tokens.color.restrictionBg.val,
        color: tokens.color.restrictionText.val,
      }
    default:
      return {
        label: level,
        bg: "$colorSubtle" + "1A",
        color: "$colorPress",
      }
  }
}

function MacroBar({
  carbs,
  protein,
  fat,
}: {
  carbs: number
  protein: number
  fat: number
}) {
  const carbKcal = carbs * 4
  const proteinKcal = protein * 4
  const fatKcal = fat * 9
  const total = carbKcal + proteinKcal + fatKcal || 1

  const carbPct = Math.round((carbKcal / total) * 100)
  const proteinPct = Math.round((proteinKcal / total) * 100)
  const fatPct = 100 - carbPct - proteinPct

  return (
    <YStack gap="$2">
      <XStack gap="$3">
        {[
          { label: "탄수화물", value: `${carbs}g`, color: "$sub9" },
          { label: "단백질", value: `${protein}g`, color: "$sub6" },
          { label: "지방", value: `${fat}g`, color: "$sub4" },
        ].map(({ label, value, color }) => (
          <XStack key={label} alignItems="center" gap="$1.5">
            <View
              width={8}
              height={8}
              borderRadius={4}
              backgroundColor={color}
            />
            <Text fontSize="$3" color="$colorSubtle">
              {label} {value}
            </Text>
          </XStack>
        ))}
      </XStack>
      <XStack height={28} borderRadius={4} overflow="hidden">
        <View
          flex={carbPct}
          backgroundColor="$sub9"
          borderTopLeftRadius={4}
          borderBottomLeftRadius={4}
          alignItems="center"
          justifyContent="center"
        >
          {carbPct >= 8 && <Text style={styles.macroBarLabel}>{carbPct}%</Text>}
        </View>
        <View
          flex={proteinPct}
          backgroundColor="$sub6"
          alignItems="center"
          justifyContent="center"
        >
          {proteinPct >= 8 && (
            <Text style={styles.macroBarLabel}>{proteinPct}%</Text>
          )}
        </View>
        <View
          flex={fatPct}
          backgroundColor="$sub4"
          borderTopRightRadius={4}
          borderBottomRightRadius={4}
          alignItems="center"
          justifyContent="center"
        >
          {fatPct >= 8 && <Text style={styles.macroBarLabel}>{fatPct}%</Text>}
        </View>
      </XStack>
    </YStack>
  )
}

function NutrientCell({ label, value }: { label: string; value: string }) {
  return (
    <YStack flex={1} alignItems="center">
      <View style={styles.nutrientIcon} />
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
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text
            fontSize="$5"
            fontWeight="600"
            color="$color"
            textAlign="center"
            flex={1}
          >
            식단 분석
          </Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={tokens.color.grey3.val} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
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
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.foodImage} />
              <Pressable style={styles.editButton}>
                <Ionicons name="pencil" size={12} color="white" />
                <Text style={styles.editButtonText}>식단 수정</Text>
              </Pressable>
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
          <Pressable style={styles.chatButton}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color={tokens.color.grey3.val}
            />
            <Text style={styles.chatButtonText}>식사에 대해 질문하기</Text>
          </Pressable>
        </ScrollView>

        {/* 하단 고정 버튼 */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            style={styles.addButton}
            onPress={() => {
              onAddToRecord?.()
              onClose()
            }}
          >
            <Text style={styles.addButtonText}>기록에 추가하기</Text>
          </Pressable>
        </View>
      </YStack>
    </Modal>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 30,
    paddingBottom: 10,
    backgroundColor: tokens.color.appBg.val,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingTop: 4,
  },
  imageContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  foodImage: {
    width: "100%",
    height: 220,
    resizeMode: "cover",
  },
  foodLabel: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  foodLabelNum: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  foodLabelText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
  editButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  editButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
  macroBarContainer: {
    flexDirection: "row",
    height: 28,
    borderRadius: 4,
    overflow: "hidden",
  },
  macroBarSegment: {
    alignItems: "center",
    justifyContent: "center",
  },
  macroBarLabel: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },
  nutrientIcon: {
    width: 30,
    height: 30,
    borderRadius: 5,
    backgroundColor: tokens.color.grey7.val,
    marginBottom: 2,
  },
  restrictionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  restrictionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 24,
    paddingVertical: 12,
    marginHorizontal: 15,
    backgroundColor: "#EAEAF0",
    borderRadius: 20,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: tokens.color.appBg.val,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tokens.color.grey5.val,
  },
  addButton: {
    backgroundColor: tokens.color.primary7.val,
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
})
