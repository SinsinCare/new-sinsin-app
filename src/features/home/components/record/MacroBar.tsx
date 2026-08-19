import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"

import { useV2Theme, V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import { tokens } from "@/src/theme/tokens"

interface MacroBarProps {
  carbs: number
  protein: number
  fat: number
}

export function MacroBar({ carbs, protein, fat }: MacroBarProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const carbKcal = carbs * 4
  const proteinKcal = protein * 4
  const fatKcal = fat * 9
  const total = carbKcal + proteinKcal + fatKcal || 1

  const carbPct = Math.round((carbKcal / total) * 100)
  const proteinPct = Math.round((proteinKcal / total) * 100)
  const fatPct = 100 - carbPct - proteinPct

  /*
    `$sub9/$sub6/$sub4` 는 앱의 보조(청록) 스케일이다 — 탄/단/지를 한 계열의
    농담으로 구분한다. v2 에 같은 3단이 없어 앱 토큰을 그대로 쓴다.
  */
  const MACRO = [
    {
      label: t("mealReport.nutrients.carbohydrates"),
      value: `${Math.round(carbs * 10) / 10}g`,
      color: tokens.color.sub9.val,
      pct: carbPct,
    },
    {
      label: t("mealReport.nutrients.protein"),
      value: `${Math.round(protein * 10) / 10}g`,
      color: tokens.color.sub6.val,
      pct: proteinPct,
    },
    {
      label: t("mealReport.nutrients.fat"),
      value: `${Math.round(fat * 10) / 10}g`,
      color: tokens.color.sub4.val,
      pct: fatPct,
    },
  ]

  return (
    <V2VStack gap={8}>
      <V2HStack gap={12}>
        {MACRO.map(({ label, value, color }) => (
          <V2HStack key={label} align="center" gap={6}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <V2Text token="caption.medium" color={colors.label.neutral}>
              {label} {value}
            </V2Text>
          </V2HStack>
        ))}
      </V2HStack>
      <V2HStack style={styles.bar}>
        {MACRO.map(({ label, color, pct }, i) => (
          <View
            key={label}
            style={[
              styles.segment,
              { flex: pct, backgroundColor: color },
              i === 0 && styles.segmentFirst,
              i === MACRO.length - 1 && styles.segmentLast,
            ]}
          >
            {/* 8% 미만이면 숫자가 칸을 넘쳐 읽을 수 없다 — 그때는 숨긴다. */}
            {pct >= 8 && <V2Text style={styles.label}>{pct}%</V2Text>}
          </View>
        ))}
      </V2HStack>
    </V2VStack>
  )
}

const styles = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4 },
  bar: { height: 28, borderRadius: 4, overflow: "hidden" },
  segment: { alignItems: "center", justifyContent: "center" },
  segmentFirst: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  segmentLast: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  label: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },
})
