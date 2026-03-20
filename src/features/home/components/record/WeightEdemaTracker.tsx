import { Text, YStack } from "tamagui"
import { EdemaRecord } from "./EdemaRecord"
import { WeightRecord } from "./WeightRecord"
import {
  EdemaLevel,
  EDEMA_LEVEL_TO_LABEL,
  LABEL_TO_EDEMA_LEVEL,
} from "../../data/EdemaConstants"
import { useState, useEffect } from "react"
import { decreaseWeight, increaseWeight } from "../../utils/adjustWeight"
import type { DateAnalysisBodyRecord } from "@/src/types"
import { useWeightEdemaRecord } from "../../hooks/useWeightEdemaRecord"
import { useColorScheme } from "react-native"

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
  const { updateWeight, updateEdema } = useWeightEdemaRecord()
  const isDarkMode = useColorScheme() === "dark"

  useEffect(() => {
    const today = bodyRecords?.today ?? null
    setWeight(today?.weightKg != null ? String(today.weightKg) : "")
    setEdemaLevel(
      today?.edemaLevel
        ? (EDEMA_LEVEL_TO_LABEL[today.edemaLevel] ?? null)
        : null,
    )
  }, [bodyRecords])

  const yesterdayWeight = bodyRecords?.previous?.weightKg ?? null
  const yesterdayEdema = bodyRecords?.previous?.edemaLevel
    ? (EDEMA_LEVEL_TO_LABEL[bodyRecords.previous.edemaLevel] ?? null)
    : null

  const selectDate = selectedDate.toISOString().split("T")[0]

  const handleSave = (weightStr: string) => {
    const val = parseFloat(weightStr)
    if (!isNaN(val) && val > 0) {
      updateWeight(val, selectDate)
    }
  }

  const handleEdemaSave = (edemaLevel: EdemaLevel) => {
    setEdemaLevel(edemaLevel)
    updateEdema(LABEL_TO_EDEMA_LEVEL[edemaLevel], selectDate)
  }

  const handleDecrease = () => {
    const current = parseFloat(weight) || 0
    const newVal = decreaseWeight(current).toFixed(1)
    setWeight(newVal)
    handleSave(newVal)
  }

  const handleIncrease = () => {
    const current = parseFloat(weight) || 0
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
        onChangeWeight={setWeight}
        onDecrease={handleDecrease}
        onIncrease={handleIncrease}
        onReset={() => setWeight("")}
        onSave={handleSave}
      />

      <EdemaRecord
        selected={edemaLevel}
        yesterdayEdema={yesterdayEdema}
        onSave={handleEdemaSave}
      />
    </YStack>
  )
}
