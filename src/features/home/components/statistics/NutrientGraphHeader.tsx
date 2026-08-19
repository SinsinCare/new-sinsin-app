import { useTranslation } from "react-i18next"

import { useV2Theme, V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import { fmt } from "../../utils/graphUtils"
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
  const { colors } = useV2Theme()
  const numberLocale = (i18n.resolvedLanguage ?? i18n.language).startsWith("en")
    ? "en-US"
    : "ko-KR"

  /*
    원래 `isOver ? "$primary" : isDarkMode ? "$textDark" : "$color"` 였다.
    v2 의 `label.strong` 은 스킴에 맞는 값을 이미 들고 있으므로 **다크 분기가 사라진다**
    — 그래서 `useAppColorScheme()` 도 더 필요 없다.
  */
  const headingColor = isOver ? colors.primary.primary : colors.label.strong

  return (
    <V2VStack gap={3}>
      <V2Text token="title.xSmall" color={headingColor}>
        {t(`nutrient.${nutrientKey}`)}
      </V2Text>
      <V2HStack align="baseline">
        <V2Text
          color={headingColor}
          style={{ fontSize: 19, fontWeight: "600" }}
        >
          {fmt(current, numberLocale)}
          {unit}
        </V2Text>
        <V2Text token="body.mediumWeak" color={colors.label.neutral}>
          /{fmt(max, numberLocale)}
          {unit}{" "}
          {isReferenceLimit
            ? t("stats.nutrientGraph.generalReference")
            : t("stats.nutrientGraph.personalReference")}
        </V2Text>
      </V2HStack>
      <V2Text
        color={colors.label.neutral}
        style={{ fontSize: 11, marginTop: 1 }}
        lineBreakStrategyIOS="hangul-word"
      >
        {isReferenceLimit
          ? t("stats.nutrientGraph.generalBody")
          : nutrientKey === "protein"
            ? t("stats.nutrientGraph.proteinBody")
            : t("stats.nutrientGraph.personalBody")}
      </V2Text>
    </V2VStack>
  )
}
