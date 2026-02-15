import { TouchableOpacity } from "react-native"
import { Text, XStack } from "tamagui"
import { RecordResultCard } from "./RecordResultCard"

interface WeigthRecordResultProps {
  weight: number
  yesterdayWeight: number
  onDecrease: () => void
  onIncrease: () => void
  onReset: () => void
}

export function WeigthRecordResult({
  weight,
  yesterdayWeight,
  onDecrease,
  onIncrease,
  onReset,
}: WeigthRecordResultProps) {
  return (
    <RecordResultCard
      type="weight"
      title="오늘의 체중을 기록해 주세요."
      onReset={onReset}
    >
      <Text fontSize="$3" color="$color.grey5">
        어제: {yesterdayWeight}kg
      </Text>
      <XStack
        alignItems="center"
        justifyContent="flex-end"
        gap="$3"
        paddingTop="$4"
      >
        <TouchableOpacity onPress={onDecrease}>
          <XStack
            backgroundColor="$pureWhite"
            paddingVertical="$2"
            paddingHorizontal="$3"
            borderRadius="$4"
          >
            <Text fontSize="$4" fontWeight="500">
              -0.1kg
            </Text>
          </XStack>
        </TouchableOpacity>
        <XStack
          backgroundColor="$white"
          paddingVertical="$2"
          paddingHorizontal="$6"
          borderRadius="$4"
        >
          <Text fontSize="$4" fontWeight="600">
            {weight.toFixed(1)}kg
          </Text>
        </XStack>
        <TouchableOpacity onPress={onIncrease}>
          <XStack
            backgroundColor="$pureWhite"
            paddingVertical="$2"
            paddingHorizontal="$3"
            borderRadius="$4"
          >
            <Text fontSize="$4" fontWeight="500">
              +0.1kg
            </Text>
          </XStack>
        </TouchableOpacity>
      </XStack>
    </RecordResultCard>
  )
}
