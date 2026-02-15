import { useState } from "react"
import { Text, YStack } from "tamagui"
import { WeigthRecordResult } from "./WeigthRecordResult"
import { EdemaRecordResult } from "./EdemaRecordResult"
import { MOCK_YESTERDAY_WEIGHT } from "../../data/weightConstants"
import { EdemaLevel } from "../../data/EdemaConstants"
import { decreaseWeight, increaseWeight } from "../../utils/adjustWeight"

export function WeightEdemaResult() {
  const [weight, setWeight] = useState(MOCK_YESTERDAY_WEIGHT)
  const [edemaLevel, setEdemaLevel] = useState<EdemaLevel | null>(null)

  return (
    <YStack paddingVertical="$3" gap="$3">
      <Text fontSize="$6" fontWeight="700">
        체중·부종 기록
      </Text>
      <WeigthRecordResult
        weight={weight}
        yesterdayWeight={MOCK_YESTERDAY_WEIGHT}
        onDecrease={() => setWeight((prev) => decreaseWeight(prev))}
        onIncrease={() => setWeight((prev) => increaseWeight(prev))}
        onReset={() => setWeight(MOCK_YESTERDAY_WEIGHT)}
      />
      <EdemaRecordResult selected={edemaLevel} onSelect={setEdemaLevel} />
    </YStack>
  )
}
