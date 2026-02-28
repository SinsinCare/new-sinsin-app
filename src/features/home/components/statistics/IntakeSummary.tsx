import { YStack } from "tamagui"
import { NutrientGraph } from "./NutrientGraph"
import { CKD_NUTRIENT_LIMITS } from "../../data/nutrientConstants"
import { DateAnalysis } from "@/src/types"

const NUTRIENT_KEY_MAP: Partial<Record<string, keyof DateAnalysis>> = {
  단백질: "protein",
  나트륨: "sodium",
  칼륨: "potassium",
  인: "phosphorus",
}

interface IntakeSummaryProps {
  analysis: DateAnalysis | null
}

export function IntakeSummary({ analysis }: IntakeSummaryProps) {
  const getIntake = (nutrient: string): number => {
    if (!analysis) return 0
    if (nutrient === "수분") return analysis.water + analysis.extraWater
    const key = NUTRIENT_KEY_MAP[nutrient]
    return key ? (analysis[key] as number) : 0
  }

  return (
    <YStack paddingVertical="$3" gap="$3">
      {CKD_NUTRIENT_LIMITS.map((limit) => (
        <NutrientGraph
          key={limit.nutrient}
          nutrient={limit.nutrient}
          current={getIntake(limit.nutrient)}
          max={limit.max}
          unit={limit.unit}
        />
      ))}
    </YStack>
  )
}
