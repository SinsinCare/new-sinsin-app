import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import Svg, { Circle } from "react-native-svg"
import { XStack, YStack, Text } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import type { FoodCameraFood } from "@/src/types"
import {
  useNutrientLimits,
  type NutrientLimits,
} from "@/src/features/nutrition/hooks/useNutrientLimits"
import { useTranslation } from "react-i18next"

type NutrientKey = "sodium" | "potassium" | "phosphorus" | "protein"

const NUTRIENT_KEYS: NutrientKey[] = [
  "sodium",
  "potassium",
  "phosphorus",
  "protein",
]

function dailyLimitFor(
  key: NutrientKey,
  limits: NutrientLimits,
): number | null {
  switch (key) {
    case "sodium":
      return limits.sodiumMg
    case "potassium":
      return limits.potassiumMg
    case "phosphorus":
      return limits.phosphorusMg
    case "protein":
      // 서버가 체중을 곱해 준다. 체중을 모르면 null — 예전처럼 60kg 로 가정하지 않는다.
      return limits.proteinGDay
  }
}

function valueFor(food: FoodCameraFood, key: NutrientKey): number | null {
  switch (key) {
    case "sodium":
      return food.sodium
    case "potassium":
      return food.potassium
    case "phosphorus":
      return food.phosphorus
    case "protein":
      return food.protein
  }
}

function formatAmount(key: NutrientKey, val: number | null): string {
  if (val == null) return "—"
  if (key === "protein") {
    const rounded = Math.round(val * 10) / 10
    return Number.isInteger(rounded) ? `${rounded}g` : `${rounded.toFixed(1)}g`
  }
  return `${Math.round(val)}mg`
}

/** 일일 한도 대비 비율: 적절(초록) / 주의(노랑) / 과다(빨강) */
function donutLevelColors(
  percent: number | null,
  isDark: boolean,
): { stroke: string; centerColor: string } {
  if (percent == null) {
    const neutral = isDark ? tokens.color.grey5.val : tokens.color.grey6.val
    return { stroke: neutral, centerColor: neutral }
  }
  if (percent < 40) {
    return {
      stroke: isDark ? "#5BC5AB" : tokens.color.sub8.val,
      centerColor: isDark ? "#A3F0DE" : tokens.color.sub8.val,
    }
  }
  if (percent < 70) {
    return {
      stroke: isDark ? "#FBBF24" : "#D97706",
      centerColor: isDark ? "#FCD34D" : "#B45309",
    }
  }
  return {
    stroke: isDark ? "#F87171" : tokens.color.restrictionText.val,
    centerColor: isDark ? "#FCA5A5" : tokens.color.primary8.val,
  }
}

const DONUT_SIZE = 60
const STROKE = 5
const RADIUS = (DONUT_SIZE - STROKE) / 2 - 1
const CX = DONUT_SIZE / 2
const CY = DONUT_SIZE / 2
const CIRC = 2 * Math.PI * RADIUS

function NutrientDonut({
  label,
  amountStr,
  percent,
  isDark,
}: {
  label: string
  amountStr: string
  percent: number | null
  isDark: boolean
}) {
  const { stroke, centerColor } = donutLevelColors(percent, isDark)
  const arcPercent =
    percent == null ? 0 : Math.min(Math.max(percent, 0), 100)
  const dash = (arcPercent / 100) * CIRC
  const displayPct =
    percent == null
      ? null
      : percent >= 100
        ? Math.round(percent)
        : Math.max(0, Math.round(percent))
  const centerLabel =
    displayPct == null
      ? "—"
      : displayPct > 999
        ? "999%+"
        : `${Math.min(displayPct, 999)}%`

  const trackColor = isDark
    ? tokens.color.grey4.val + "66"
    : tokens.color.grey8.val

  return (
    <YStack
      flex={1}
      alignItems="center"
      paddingVertical="$1"
      paddingHorizontal={2}
      minWidth={0}
    >
      <YStack
        position="relative"
        width={DONUT_SIZE}
        height={DONUT_SIZE}
        alignSelf="center"
      >
        <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
          <Circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            stroke={trackColor}
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            stroke={stroke}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={`${dash} ${CIRC}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${CX} ${CY})`}
          />
        </Svg>
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          alignItems="center"
          justifyContent="center"
          pointerEvents="none"
        >
          <Text
            fontSize={14}
            lineHeight={18}
            fontWeight="800"
            color={centerColor}
          >
            {centerLabel}
          </Text>
        </YStack>
      </YStack>
      <Text
        fontSize="$4"
        fontWeight="600"
        color={isDark ? "$textDark" : "$color"}
        marginTop={6}
        textAlign="center"
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        fontSize="$5"
        fontWeight="700"
        color={isDark ? "$textDark" : "$color"}
        textAlign="center"
        numberOfLines={1}
      >
        {amountStr}
      </Text>
    </YStack>
  )
}

interface FoodNutrientDonutsProps {
  food: FoodCameraFood
}

export function FoodNutrientDonuts({ food }: FoodNutrientDonutsProps) {
  const { t } = useTranslation("common")
  const isDark = useAppColorScheme() === "dark"
  const limits = useNutrientLimits()

  return (
    <XStack gap="$2" alignItems="stretch">
      {NUTRIENT_KEYS.map((key) => {
        const limit = dailyLimitFor(key, limits)
        const amount = valueFor(food, key)
        // 기준을 모르면 0%가 아니라 미확인 상태로 그린다.
        const rawPct =
          amount != null && limit != null && limit > 0
            ? (amount / limit) * 100
            : null
        return (
          <NutrientDonut
            key={key}
            label={t(`mealReport.nutrients.${key}`)}
            amountStr={formatAmount(key, amount)}
            percent={rawPct}
            isDark={isDark}
          />
        )
      })}
    </XStack>
  )
}
