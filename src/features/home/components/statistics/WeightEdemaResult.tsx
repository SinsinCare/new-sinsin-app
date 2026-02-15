import { Text, YStack } from "tamagui"
import { WeigthRecordResult } from "./WeigthRecordResult"

export function WeightEdemaResult() {
  return (
    <YStack paddingVertical="$3" gap="$3">
      <Text fontSize="$6" fontWeight="700">
        체중·부종 기록
      </Text>
      <WeigthRecordResult />
    </YStack>
  )
}
