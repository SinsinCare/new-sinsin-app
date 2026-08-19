import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"

import { useV2Theme, V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import { DateAnalysisBodyRecord } from "@/src/types"
import { normalizeEdemaLevel } from "@/src/features/home/data/EdemaConstants"
import { roundForDisplay } from "@/src/shared/utils/displayNumber"

interface WeightEdemaResultProps {
  bodyRecords?: {
    today: DateAnalysisBodyRecord | null
    previous: DateAnalysisBodyRecord | null
  }
}

export function WeightEdemaResult({ bodyRecords }: WeightEdemaResultProps) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()
  const todayWeight = bodyRecords?.today?.weightKg ?? 0
  const previousWeight = bodyRecords?.previous?.weightKg ?? 0
  // 서버에 남은 구 표기(SOME)를 화면이 아는 단계로 맞춘다 — 안 하면
  // `stats.body.edema.SOME` 이 그대로 렌더된다.
  const todayEdema = normalizeEdemaLevel(bodyRecords?.today?.edemaLevel)
  const previousEdema = normalizeEdemaLevel(bodyRecords?.previous?.edemaLevel)

  return (
    <V2VStack paddingVertical={16} gap={12}>
      <V2Text color={colors.label.strong} style={styles.heading}>
        {t("stats.body.title")}
      </V2Text>

      <V2HStack
        paddingVertical={16}
        paddingHorizontal={20}
        style={[styles.card, { backgroundColor: colors.background.default }]}
      >
        {/*
          가운데 세로 구분선. tamagui 는 `position: relative` 가 기본이라 부모에
          아무 것도 안 줘도 절대배치가 먹었지만, RN 은 부모에 `position: relative` 를
          명시해야 한다(styles.card).
        */}
        <View
          style={[styles.divider, { backgroundColor: colors.line.normal }]}
        />

        <V2VStack gap={4} style={styles.leftColumn}>
          <V2Text color={colors.label.neutral} style={styles.metricLabel}>
            {t("stats.body.weight")}
          </V2Text>
          <V2Text color={colors.label.strong} style={styles.metricValue}>
            {todayWeight > 0
              ? `${roundForDisplay(todayWeight, 1)}kg`
              : t("stats.body.noRecord")}
          </V2Text>
          <V2Text color={colors.label.neutral} style={styles.previous}>
            {t("stats.body.previous")}:{" "}
            {previousWeight > 0
              ? `${roundForDisplay(previousWeight, 1)}kg`
              : t("stats.body.noRecord")}
          </V2Text>
        </V2VStack>

        <V2VStack flex={1} gap={4}>
          <V2Text color={colors.label.neutral} style={styles.metricLabel}>
            {t("stats.body.swelling")}
          </V2Text>
          <V2Text color={colors.label.strong} style={styles.metricValue}>
            {todayEdema
              ? t(`stats.body.edema.${todayEdema}`)
              : t("stats.body.noRecord")}
          </V2Text>
          <V2Text color={colors.label.neutral} style={styles.previous}>
            {t("stats.body.previous")}:{" "}
            {previousEdema
              ? t(`stats.body.edema.${previousEdema}`)
              : t("stats.body.noRecord")}
          </V2Text>
        </V2VStack>
      </V2HStack>
    </V2VStack>
  )
}

const styles = StyleSheet.create({
  heading: { fontSize: 20, fontWeight: "600" },
  card: { borderRadius: 12, position: "relative" },
  divider: { position: "absolute", top: 8, bottom: 8, left: "55%", width: 1 },
  leftColumn: { width: "55%" },
  metricLabel: { fontSize: 14, fontWeight: "600" },
  metricValue: { fontSize: 18, fontWeight: "600" },
  previous: { paddingTop: 8, fontSize: 14, fontWeight: "500" },
})
