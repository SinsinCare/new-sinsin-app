import { Text, YStack } from "tamagui"
import EdemaRecord from "./EdemaRecord"
import WeightRecord from "./WeightRecord"

const WeightEdemaTracker = () => {
  return (
    <YStack paddingHorizontal="$3" paddingVertical="$3" gap="$3">
      <Text fontSize="$6" fontWeight="600">
        체중·부종 기록하기
      </Text>
      <EdemaRecord />
      <WeightRecord yesterdayWeight={60.4} />
    </YStack>
  )
}

export default WeightEdemaTracker
