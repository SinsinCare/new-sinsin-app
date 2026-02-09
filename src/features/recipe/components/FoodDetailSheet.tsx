import { Sheet } from "@tamagui/sheet"
import { ScrollView, Pressable } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { tokens } from "@/src/theme/tokens"
import { KidneyRecommendedFood } from "../types"
import { ScoreGauge } from "./ScoreGauge"
import { FlowTags } from "./FlowTags"

interface FoodDetailSheetProps {
  item: KidneyRecommendedFood | null
  open: boolean
  onClose: () => void
}

function getCkdSafetyLabel(score: number): {
  text: string
  color: string
} {
  if (score >= 80)
    return { text: "3기 안전", color: tokens.color.sub7.val }
  if (score >= 60)
    return {
      text: "보통 — 주의 필요",
      color: tokens.color.primary6.val,
    }
  return { text: "권장하지 않음", color: tokens.color.primary8.val }
}

function KidneyMetricRow({
  label,
  value,
  unit,
  normalizedValue,
}: {
  label: string
  value: number | null
  unit: string
  normalizedValue: number
}) {
  const isLow = normalizedValue < 0.3
  const isMed = normalizedValue < 0.6

  return (
    <XStack
      alignItems="center"
      gap="$3"
      paddingVertical="$2"
      paddingHorizontal="$3"
      backgroundColor={
        isLow
          ? "$secondaryLight"
          : isMed
            ? "$primaryLight"
            : "$dangerBackground"
      }
      borderRadius="$3"
    >
      <Ionicons
        name={isLow ? "checkmark-circle" : "warning"}
        size={22}
        color={isLow ? tokens.color.sub7.val : tokens.color.primary7.val}
      />
      <YStack flex={1}>
        <Text fontSize="$4" fontWeight="600" color="$color">
          {label}
        </Text>
        <Text fontSize="$3" color="$colorSubtle">
          {isLow
            ? "낮음 — 안전 범위"
            : isMed
              ? "보통 수준"
              : "높음 — 섭취 제한"}
        </Text>
      </YStack>
      <Text fontSize="$5" fontWeight="700" color="$color">
        {value != null ? `${value}${unit}` : "N/A"}
      </Text>
    </XStack>
  )
}

function NutritionGridItem({ label, value }: { label: string; value: string }) {
  return (
    <YStack
      flex={1}
      backgroundColor="$backgroundStrong"
      borderRadius="$3"
      padding="$3"
      gap="$1"
    >
      <Text fontSize="$3" color="$colorSubtle" textTransform="uppercase">
        {label}
      </Text>
      <Text fontSize="$5" fontWeight="700" color="$color">
        {value}
      </Text>
    </YStack>
  )
}

function fmt(v: number | null, unit: string): string {
  if (v == null) return "N/A"
  return `${v}${unit}`
}

export function FoodDetailSheet({ item, open, onClose }: FoodDetailSheetProps) {
  if (!item) return null

  const { food, score, penaltyBreakdown } = item
  const safety = getCkdSafetyLabel(score)

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={(isOpen: boolean) => {
        if (!isOpen) onClose()
      }}
      snapPoints={[95]}
      dismissOnSnapToBottom
    >
      <Sheet.Overlay />
      <Sheet.Frame borderTopLeftRadius="$8" borderTopRightRadius="$8">
        <YStack>
          <Sheet.Handle />
          <XStack
            paddingHorizontal="$4"
            paddingVertical="$3"
            alignItems="center"
            borderBottomWidth={1}
            borderBottomColor="$borderColor"
          >
            <Pressable
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={20} color={tokens.color.grey3.val} />
            </Pressable>
            <Text
              flex={1}
              fontSize="$5"
              fontWeight="600"
              color="$color"
              textAlign="center"
              numberOfLines={1}
              marginHorizontal="$3"
            >
              {food.name}
            </Text>
            <YStack width={36} />
          </XStack>
        </YStack>

        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
        >
          <YStack alignItems="center" gap="$2" paddingVertical="$3">
            <ScoreGauge score={score} size={120} strokeWidth={8} />
            <Text fontSize="$3" color="$colorSubtle">
              /100
            </Text>
            <Text fontSize="$5" fontWeight="600" color={safety.color}>
              {safety.text}
            </Text>
          </YStack>

          <YStack alignItems="center">
            <FlowTags tags={item.tags} />
          </YStack>

          <YStack gap="$2">
            <Text fontSize="$6" fontWeight="700" color="$color">
              주요 신장 지표
            </Text>
            <KidneyMetricRow
              label="칼륨"
              value={food.potassium}
              unit="mg"
              normalizedValue={penaltyBreakdown.potassium}
            />
            <KidneyMetricRow
              label="인"
              value={food.phosphorus}
              unit="mg"
              normalizedValue={penaltyBreakdown.phosphorus}
            />
            <KidneyMetricRow
              label="나트륨"
              value={food.sodium}
              unit="mg"
              normalizedValue={penaltyBreakdown.sodium}
            />
          </YStack>

          <YStack gap="$2">
            <Text fontSize="$6" fontWeight="700" color="$color">
              전체 영양 성분
            </Text>
            <XStack gap="$2">
              <NutritionGridItem
                label="칼로리"
                value={`${food.energy} kcal`}
              />
              <NutritionGridItem label="수분" value={fmt(food.water, "g")} />
            </XStack>
            <XStack gap="$2">
              <NutritionGridItem
                label="단백질"
                value={fmt(food.protein, "g")}
              />
              <NutritionGridItem label="지방" value={fmt(food.fat, "g")} />
            </XStack>
            <XStack gap="$2">
              <NutritionGridItem label="식이섬유" value={fmt(food.fiber, "g")} />
              <NutritionGridItem label="당류" value={fmt(food.sugar, "g")} />
            </XStack>
            <XStack gap="$2">
              <NutritionGridItem
                label="칼슘"
                value={fmt(food.calcium, "mg")}
              />
              <NutritionGridItem label="철분" value={fmt(food.iron, "mg")} />
            </XStack>
            <XStack gap="$2">
              <NutritionGridItem
                label="마그네슘"
                value={fmt(food.magnesium, "mg")}
              />
              <NutritionGridItem
                label="비타민 D"
                value={fmt(food.vitaminD, "mcg")}
              />
            </XStack>
          </YStack>

          {food.totalAminoAcid != null && (
            <YStack
              backgroundColor="$primaryLight"
              borderRadius="$4"
              padding="$3"
              gap="$1"
            >
              <XStack gap="$2" alignItems="center">
                <Ionicons
                  name="flask"
                  size={18}
                  color={tokens.color.primary7.val}
                />
                <Text fontSize="$5" fontWeight="600" color="$color">
                  아미노산
                </Text>
              </XStack>
              <Text fontSize="$4" color="$colorSubtle">
                총: {food.totalAminoAcid}mg, 필수:{" "}
                {food.essentialAminoAcid ?? "N/A"}mg
              </Text>
            </YStack>
          )}
        </ScrollView>
      </Sheet.Frame>
    </Sheet>
  )
}
