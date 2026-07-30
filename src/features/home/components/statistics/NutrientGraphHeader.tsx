import { Text, XStack, YStack } from "tamagui"
import { fmt } from "../../utils/graphUtils"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { useTranslation } from "react-i18next"
import type { NutrientKey } from "@/src/features/nutrition/hooks/useNutrientLimits"

interface NutrientGraphHeaderProps {
  nutrientKey: NutrientKey
  current: number
  max: number
  unit: string
  isOver: boolean
  isReferenceLimit: boolean
}

export function NutrientGraphHeader({
  nutrientKey,
  current,
  max,
  unit,
  isOver,
  isReferenceLimit,
}: NutrientGraphHeaderProps) {
  const { t, i18n } = useTranslation()
  const numberLocale = (i18n.resolvedLanguage ?? i18n.language).startsWith("en")
    ? "en-US"
    : "ko-KR"
  const isDarkMode = useAppColorScheme() === "dark"

  return (
    <YStack gap={3}>
      <Text
        fontSize={17}
        fontWeight="600"
        color={isOver ? "$primary" : isDarkMode ? "$textDark" : "$color"}
      >
        {t(`nutrient.${nutrientKey}`)}
      </Text>
      <XStack alignItems="baseline">
        <Text
          fontSize={19}
          fontWeight="600"
          color={isOver ? "$primary" : isDarkMode ? "$textDark" : "$color"}
        >
          {fmt(current, numberLocale)}
          {unit}
        </Text>
        <Text fontSize={15} color="$colorSubtle">
          /{fmt(max, numberLocale)}
          {unit}{" "}
          {isReferenceLimit
            ? t("stats.nutrientGraph.generalReference")
            : t("stats.nutrientGraph.personalReference")}
        </Text>
      </XStack>
      <Text fontSize={11} color="$colorSubtle" marginTop={1}>
        {isReferenceLimit
          ? t("stats.nutrientGraph.generalBody")
          : nutrientKey === "protein"
            ? t("stats.nutrientGraph.proteinBody")
            : t("stats.nutrientGraph.personalBody")}
      </Text>
    </YStack>
  )
}
