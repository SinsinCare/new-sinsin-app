import { useColorScheme } from "react-native"
import { XStack, YStack, Text, View } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import type { NutrientBudget } from "../types"

interface NutrientBarProps {
  label: string
  remaining: number
  unit: string
  color: string
}

function NutrientBar({ label, remaining, unit, color }: NutrientBarProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const subColor = isDark
    ? tokens.color.textDarkSub.val
    : tokens.color.grey5.val

  return (
    <YStack flex={1} alignItems="center" gap={2}>
      <Text fontSize={11} fontFamily="$body" color={subColor}>
        {label}
      </Text>
      <View
        height={4}
        width="100%"
        borderRadius={2}
        backgroundColor={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"}
      >
        <View
          height={4}
          width={`${Math.min(100, Math.max(10, remaining > 0 ? 100 : 0))}%`}
          borderRadius={2}
          backgroundColor={color}
        />
      </View>
      <Text fontSize={11} fontFamily="$body" fontWeight="600" color={color}>
        {remaining > 0 ? `${Math.round(remaining)}${unit}` : "초과"}
      </Text>
    </YStack>
  )
}

interface NutrientBudgetBarProps {
  budget: NutrientBudget
}

export function NutrientBudgetBar({ budget }: NutrientBudgetBarProps) {
  return (
    <XStack gap={8}>
      <NutrientBar
        label="나트륨"
        remaining={budget.sodiumMg}
        unit="mg"
        color="#EE6145"
      />
      <NutrientBar
        label="칼륨"
        remaining={budget.potassiumMg}
        unit="mg"
        color="#0D896A"
      />
      <NutrientBar
        label="인"
        remaining={budget.phosphorusMg}
        unit="mg"
        color="#7C3AED"
      />
      <NutrientBar
        label="단백질"
        remaining={budget.proteinG}
        unit="g"
        color="#0369A1"
      />
    </XStack>
  )
}
