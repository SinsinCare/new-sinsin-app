import { YStack } from "tamagui"
import { NutrientGraph } from "./NutrientGraph"
import {
  CKD_NUTRIENT_LIMITS,
  MOCK_CURRENT_INTAKE,
} from "../../data/nutrientConstants"

export function IntakeSummary() {
  return (
    <YStack paddingVertical="$3" gap="$3">
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
  )
}
