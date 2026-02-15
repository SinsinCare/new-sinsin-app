import { useState } from "react"
import { TouchableOpacity } from "react-native"
import { Text, XStack } from "tamagui"
import { RecordResultCard } from "./RecordResultCard"
import { MOCK_YESTERDAY_WEIGHT } from "../../data/weightConstants"
import { decreaseWeight, increaseWeight } from "../../utils/adjustWeight"

export function WeigthRecordResult() {
  const [weight, setWeight] = useState(MOCK_YESTERDAY_WEIGHT)

  const decrease = () => setWeight((prev) => decreaseWeight(prev))
  const increase = () => setWeight((prev) => increaseWeight(prev))
  const reset = () => setWeight(MOCK_YESTERDAY_WEIGHT)

  return (
    <RecordResultCard
      type="weight"
      title="오늘의 체중을 기록해 주세요."
      onReset={reset}
    >
      <Text fontSize="$3" color="$color.grey5">
        어제: {MOCK_YESTERDAY_WEIGHT}kg
      </Text>
      <XStack
        alignItems="center"
        justifyContent="flex-end"
        gap="$3"
        paddingTop="$4"
      >
        <TouchableOpacity onPress={decrease}>
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
        <TouchableOpacity onPress={increase}>
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
