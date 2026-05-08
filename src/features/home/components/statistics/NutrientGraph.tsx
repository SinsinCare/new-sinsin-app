import { YStack } from "tamagui"
import { NutrientBarSection } from "./NutrientBarSection"
import { NutrientGraphHeader } from "./NutrientGraphHeader"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"

interface NutrientGraphProps {
  nutrient: string
  current: number
  max: number
  unit: string
}

export function NutrientGraph({
  nutrient,
  current,
  max,
  unit,
}: NutrientGraphProps) {
  const isOver = current > max
  const isEmpty = current === 0
  const atLimit = current === max && current > 0

  const totalMax = Math.max(current, max)
  const fillPct = totalMax > 0 ? (current / totalMax) * 100 : 0
  const limitPct = totalMax > 0 ? (max / totalMax) * 100 : 100

  const isDarkMode = useAppColorScheme() === "dark"

  return (
    <YStack
      backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
      borderRadius={12}
      padding={16}
      gap={5}
    >
      <NutrientGraphHeader
        nutrient={nutrient}
        current={current}
        max={max}
        unit={unit}
        isOver={isOver}
      />
      <NutrientBarSection
        isOver={isOver}
        isEmpty={isEmpty}
        atLimit={atLimit}
        fillPct={fillPct}
        limitPct={limitPct}
        current={current}
        max={max}
        unit={unit}
      />
    </YStack>
  )
}
