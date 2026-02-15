import { Text, YStack } from "tamagui"
import { NutrientGraph } from "./NutrientGraph"
import {
  CKD_NUTRIENT_LIMITS,
  MOCK_CURRENT_INTAKE,
} from "../../data/nutrientConstants"

export function IntakeSummary() {
  return (
    <YStack paddingVertical="$3" gap="$3">
      <Text fontSize="$6" fontWeight="700">
        섭취량 한눈에 보기
      </Text>
      <YStack
        backgroundColor="$backgroundFocus"
        borderRadius="$6"
        padding="$3"
        gap="$2"
      >
        {CKD_NUTRIENT_LIMITS.map((limit) => (
          <NutrientGraph
            key={limit.nutrient}
            nutrient={limit.nutrient}
            current={MOCK_CURRENT_INTAKE[limit.nutrient]}
            max={limit.max}
            unit={limit.unit}
          />
        ))}
      </YStack>
    </YStack>
  )
}
