import { Text, YStack } from "tamagui"
import { EdemaRecord } from "./EdemaRecord"
import { WeightRecord } from "./WeightRecord"
import { EdemaLevel } from "../../data/EdemaConstants"

interface WeightEdemaTrackerProps {
  weight: string
  onChangeWeight: (value: string) => void
  yesterdayWeight: number | null
  edemaLevel: EdemaLevel | null
  onSelectEdema: (level: EdemaLevel) => void
}

export function WeightEdemaTracker({
  weight,
  onChangeWeight,
  yesterdayWeight,
  edemaLevel,
  onSelectEdema,
}: WeightEdemaTrackerProps) {
  return (
    <YStack paddingVertical="$3" gap="$3">
      <Text fontSize="$6" fontWeight="700">
        체중·부종 기록하기
      </Text>
      <EdemaRecord selected={edemaLevel} onSelect={onSelectEdema} />
      <WeightRecord
        weight={weight}
        onChangeWeight={onChangeWeight}
        yesterdayWeight={yesterdayWeight}
      />
    </YStack>
  )
}
