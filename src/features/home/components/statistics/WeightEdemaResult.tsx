import { Text, XStack, YStack } from "tamagui"
import { EDEMA_LEVEL_TO_LABEL } from "../../data/EdemaConstants"
import { DateAnalysisBodyRecord } from "@/src/types"
import { useColorScheme } from "react-native"

interface WeightEdemaResultProps {
  bodyRecords?: {
    today: DateAnalysisBodyRecord | null
    previous: DateAnalysisBodyRecord | null
  }
}

export function WeightEdemaResult({ bodyRecords }: WeightEdemaResultProps) {
  const todayWeight = bodyRecords?.today?.weightKg ?? 0
  const previousWeight = bodyRecords?.previous?.weightKg ?? 0
  const todayEdema = bodyRecords?.today?.edemaLevel
    ? (EDEMA_LEVEL_TO_LABEL[bodyRecords.today.edemaLevel] ?? null)
    : null
  const previousEdema = bodyRecords?.previous?.edemaLevel
    ? (EDEMA_LEVEL_TO_LABEL[bodyRecords.previous.edemaLevel] ?? null)
    : null
  const isDarkMode = useColorScheme() === "dark"

  return (
    <YStack paddingVertical="$4" gap="$3">
      <Text
        fontSize={20}
        fontWeight="600"
        color={isDarkMode ? "$textDark" : "$black"}
      >
        체중·부종 기록
      </Text>

      <XStack
        backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
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
          backgroundColor={isDarkMode ? "$grey4" : "$borderColor"}
        />

        <YStack width="55%" gap="$1">
          <Text fontSize={14} color="$colorSubtle" fontWeight="600">
            체중
          </Text>
          <Text
            fontSize={18}
            fontWeight="600"
            color={isDarkMode ? "$textDark" : "$black"}
          >
            {todayWeight > 0 ? `${todayWeight}kg` : "기록 없음"}
          </Text>
          <Text
            paddingTop="$2"
            fontSize={14}
            fontWeight="500"
            color="$colorSubtle"
          >
            전날: {previousWeight > 0 ? `${previousWeight}kg` : "기록 없음"}
          </Text>
        </YStack>

        <YStack flex={1} gap="$1">
          <Text fontSize={14} color="$colorSubtle" fontWeight="600">
            붓기
          </Text>
          <Text
            fontSize={18}
            fontWeight="600"
            color={isDarkMode ? "$textDark" : "$black"}
          >
            {todayEdema ?? "기록 없음"}
          </Text>
          <Text
            paddingTop="$2"
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
