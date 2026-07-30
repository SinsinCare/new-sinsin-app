import { YStack } from "tamagui"
import { NutrientGraph } from "./NutrientGraph"
import {
  NutrientKey,
  useNutrientLimits,
} from "@/src/features/nutrition/hooks/useNutrientLimits"
import { DateAnalysis } from "@/src/types"

const NUTRIENT_KEY_MAP: Record<NutrientKey, keyof DateAnalysis> = {
  protein: "protein",
  sodium: "sodium",
  potassium: "potassium",
  phosphorus: "phosphorus",
}

interface IntakeSummaryProps {
  analysis: DateAnalysis | null
}

export function IntakeSummary({ analysis }: IntakeSummaryProps) {
  // 예전에는 하드코딩 표를 그렸다. 단백질이 체중과 무관하게 48g 고정이라
  // 90kg 1기 환자(서버 목표 72g)가 "초과" 판정을 받았다.
  const { bars, isFallback } = useNutrientLimits()

  const getIntake = (nutrient: NutrientKey): number => {
    if (!analysis) return 0
    const key = NUTRIENT_KEY_MAP[nutrient]
    return key ? (analysis[key] as number) : 0
  }

  return (
    <YStack paddingVertical="$3" gap="$3">
      {bars.map((limit) => (
        <NutrientGraph
          key={limit.nutrient}
          nutrientKey={limit.nutrient}
          current={getIntake(limit.nutrient)}
          max={limit.max}
          unit={limit.unit}
          isReferenceLimit={isFallback}
        />
      ))}
    </YStack>
  )
}
