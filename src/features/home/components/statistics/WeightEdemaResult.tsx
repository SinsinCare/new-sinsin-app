import { useState, useEffect } from "react"
import { Text, XStack, YStack } from "tamagui"
import { EdemaLevel } from "../../data/EdemaConstants"
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

      <XStack
        backgroundColor="$cardBackground"
        borderRadius="$6"
        paddingVertical="$4"
        paddingHorizontal="$5"
        position="relative"
      >
        <YStack
          position="absolute"
          top="$2"
          bottom="$2"
          left="55%"
          width={1}
          backgroundColor="$borderColor"
        />

        <YStack width="55%" gap="$1">
          <Text fontSize={15} color="$colorSubtle" fontWeight="600">
            체중
          </Text>
          <Text fontSize={18} fontWeight="600">
            {weight > 0 ? `${weight}kg` : "기록 없음"}
          </Text>
          <Text
            paddingTop="$1"
            fontSize={14}
            fontWeight="500"
            color="$colorSubtle"
          >
            전날: {previousWeight > 0 ? `${previousWeight}kg` : "기록 없음"}
          </Text>
        </YStack>

        <YStack flex={1} gap="$1">
          <Text fontSize={15} color="$colorSubtle" fontWeight="600">
            붓기
          </Text>
          <Text fontSize={18} fontWeight="600">
            {edemaLevel ?? "기록 없음"}
          </Text>
          <Text
            paddingTop="$1"
            fontSize={14}
            fontWeight="500"
            color="$colorSubtle"
          >
            전날: {previousEdema ?? "기록 없음"}
          </Text>
        </YStack>
      </XStack>
    </YStack>
  )
}
