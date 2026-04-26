import { Text, YStack } from "tamagui"
import { EdemaRecord } from "./EdemaRecord"
import { WeightRecord } from "./WeightRecord"
import { useState, useEffect } from "react"
import { decreaseWeight, increaseWeight } from "../../utils/adjustWeight"
import type { DateAnalysisBodyRecord } from "@/src/types"
import { useWeightEdemaRecord } from "../../hooks/useWeightEdemaRecord"
import { useColorScheme } from "react-native"
import type { EdemaLevel } from "../../types"

interface WeightEdemaTrackerProps {
  bodyRecords?: {
    today: DateAnalysisBodyRecord | null
    previous: DateAnalysisBodyRecord | null
  }
  selectedDate: Date
}

export function WeightEdemaTracker({
  bodyRecords,
  selectedDate,
}: WeightEdemaTrackerProps) {
  const [weight, setWeight] = useState<string>("")
  const [edemaLevel, setEdemaLevel] = useState<EdemaLevel | null>(null)
  const { updateWeight, updateEdema, isLoading } = useWeightEdemaRecord()
  const isDarkMode = useColorScheme() === "dark"

  useEffect(() => {
    const today = bodyRecords?.today ?? null
    setWeight(today?.weightKg != null ? String(today.weightKg) : "")
    setEdemaLevel(today?.edemaLevel ?? null)
  }, [bodyRecords])

  const yesterdayWeight = bodyRecords?.previous?.weightKg ?? null
  const yesterdayEdema = bodyRecords?.previous?.edemaLevel ?? null

  const selectedDateStr = selectedDate.toISOString().split("T")[0]

  const handleSave = (weightStr: string) => {
    const val = parseFloat(weightStr)
    if (!isNaN(val) && val > 0) {
      updateWeight(val, selectedDateStr)
    }
  }

  const handleEdemaSave = (level: EdemaLevel) => {
    setEdemaLevel(level)
    updateEdema(level, selectedDateStr)
  }

  const handleDecrease = () => {
    const current = parseFloat(weight) || yesterdayWeight || 0
    const newVal = decreaseWeight(current).toFixed(1)
    setWeight(newVal)
    handleSave(newVal)
  }

  const handleIncrease = () => {
    const current = parseFloat(weight) || yesterdayWeight || 0
    const newVal = increaseWeight(current).toFixed(1)
    setWeight(newVal)
    handleSave(newVal)
  }

  return (
    <YStack paddingVertical="$3" gap="$3">
      <Text
        fontSize={20}
        fontWeight="600"
        color={isDarkMode ? "$textDark" : "$black"}
      >
        체중·부종 기록
      </Text>

      <WeightRecord
        weight={weight}
        yesterdayWeight={yesterdayWeight}
        isDarkMode={isDarkMode}
        isLoading={isLoading}
        onChangeWeight={setWeight}
        onDecrease={handleDecrease}
        onIncrease={handleIncrease}
        onSave={handleSave}
      />

      <EdemaRecord
        selected={edemaLevel}
        yesterdayEdema={yesterdayEdema}
        isDarkMode={isDarkMode}
        isLoading={isLoading}
        onSave={handleEdemaSave}
      />
    </YStack>
  )
}
