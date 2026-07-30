import { Text, XStack, YStack } from "tamagui"
import { DateAnalysisBodyRecord } from "@/src/types"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { useTranslation } from "react-i18next"

import { normalizeEdemaLevel } from "@/src/features/home/data/EdemaConstants"

interface WeightEdemaResultProps {
  bodyRecords?: {
    today: DateAnalysisBodyRecord | null
    previous: DateAnalysisBodyRecord | null
  }
}

export function WeightEdemaResult({ bodyRecords }: WeightEdemaResultProps) {
  const { t } = useTranslation()
  const todayWeight = bodyRecords?.today?.weightKg ?? 0
  const previousWeight = bodyRecords?.previous?.weightKg ?? 0
  // 서버에 남은 구 표기(SOME)를 화면이 아는 단계로 맞춘다 — 안 하면
  // `stats.body.edema.SOME` 이 그대로 렌더된다.
  const todayEdema = normalizeEdemaLevel(bodyRecords?.today?.edemaLevel)
  const previousEdema = normalizeEdemaLevel(bodyRecords?.previous?.edemaLevel)
  const isDarkMode = useAppColorScheme() === "dark"

  return (
    <YStack paddingVertical="$4" gap="$3">
      <Text
        fontSize={20}
        fontWeight="600"
        color={isDarkMode ? "$textDark" : "$black"}
      >
        {t("stats.body.title")}
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
            {t("stats.body.weight")}
          </Text>
          <Text
            fontSize={18}
            fontWeight="600"
            color={isDarkMode ? "$textDark" : "$black"}
          >
            {todayWeight > 0 ? `${todayWeight}kg` : t("stats.body.noRecord")}
          </Text>
          <Text
            paddingTop="$2"
            fontSize={14}
            fontWeight="500"
            color="$colorSubtle"
          >
            {t("stats.body.previous")}:{" "}
            {previousWeight > 0
              ? `${previousWeight}kg`
              : t("stats.body.noRecord")}
          </Text>
        </YStack>

        <YStack flex={1} gap="$1">
          <Text fontSize={14} color="$colorSubtle" fontWeight="600">
            {t("stats.body.swelling")}
          </Text>
          <Text
            fontSize={18}
            fontWeight="600"
            color={isDarkMode ? "$textDark" : "$black"}
          >
            {todayEdema
              ? t(`stats.body.edema.${todayEdema}`)
              : t("stats.body.noRecord")}
          </Text>
          <Text
            paddingTop="$2"
            fontSize={14}
            fontWeight="500"
            color="$colorSubtle"
          >
            {t("stats.body.previous")}:{" "}
            {previousEdema
              ? t(`stats.body.edema.${previousEdema}`)
              : t("stats.body.noRecord")}
          </Text>
        </YStack>
      </XStack>
    </YStack>
  )
}
