import { useState, useEffect } from "react"
import { Text, YStack } from "tamagui"
import { EdemaRecordResult } from "./EdemaRecordResult"
import { EdemaLevel } from "../../data/EdemaConstants"
import { decreaseWeight, increaseWeight } from "../../utils/adjustWeight"
import { WeightRecordResult } from "./WeightRecordResult"
import { DateAnalysisBodyRecord } from "@/src/types"

interface WeightEdemaResultProps {
  bodyRecords?: {
    today: DateAnalysisBodyRecord | null
    previous: DateAnalysisBodyRecord | null
  }
}

export function WeightEdemaResult({ bodyRecords }: WeightEdemaResultProps) {
  const todayWeight = bodyRecords?.today?.weightKg ?? 0
  const previousWeight = bodyRecords?.previous?.weightKg ?? 0
  const todayEdema =
    (bodyRecords?.today?.edemaLevel as EdemaLevel | undefined) ?? null
  const previousEdema = bodyRecords?.previous?.edemaLevel ?? null

  const [weight, setWeight] = useState(todayWeight)
  const [edemaLevel, setEdemaLevel] = useState<EdemaLevel | null>(todayEdema)

  useEffect(() => {
    setWeight(todayWeight)
    setEdemaLevel(todayEdema)
  }, [bodyRecords])

  return (
    <YStack paddingVertical="$4" gap="$3">
      <Text fontSize={22} fontWeight="700">
        체중·부종 기록
      </Text>
      <WeightRecordResult
        weight={weight}
        yesterdayWeight={previousWeight}
        onDecrease={() => setWeight((prev) => decreaseWeight(prev))}
        onIncrease={() => setWeight((prev) => increaseWeight(prev))}
        onReset={() => setWeight(todayWeight)}
      />
      <EdemaRecordResult
        selected={edemaLevel}
        onSelect={setEdemaLevel}
        yesterdayEdema={previousEdema}
      />
    </YStack>
  )
}
