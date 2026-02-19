import { Text, YStack } from "tamagui"
import { EdemaRecord } from "./EdemaRecord"
import { WeightRecord } from "./WeightRecord"
import { EdemaLevel } from "../../data/EdemaConstants"
import { useState } from "react"
import { decreaseWeight, increaseWeight } from "../../utils/adjustWeight"

// TODO: 백엔드에서 어제 체중 조회 — 데이터 없으면 null
const MOCK_YESTERDAY_WEIGHT: number | null = null

export function WeightEdemaTracker() {
  const [weight, setWeight] = useState<string>("")
  const [edemaLevel, setEdemaLevel] = useState<EdemaLevel | null>(null)

  const handleDecrease = () => {
    const current = parseFloat(weight) || 0
    setWeight(decreaseWeight(current).toFixed(1))
  }

  const handleIncrease = () => {
    const current = parseFloat(weight) || 0
    setWeight(increaseWeight(current).toFixed(1))
  }

  return (
    <YStack paddingVertical="$3" gap="$3">
      <Text fontSize="$6" fontWeight="700">
        체중·부종 기록
      </Text>

      <WeightRecord
        weight={weight}
        yesterdayWeight={MOCK_YESTERDAY_WEIGHT}
        onChangeWeight={setWeight}
        onDecrease={handleDecrease}
        onIncrease={handleIncrease}
        onReset={() => setWeight("")}
      />

      <EdemaRecord selected={edemaLevel} onSelect={setEdemaLevel} />
    </YStack>
  )
}
