import { StyleSheet, View } from "react-native"
import { V2Text, useV2Theme } from "@/src/design-system-v2"
import type { StatsConsultCardData } from "../utils/statsConsultMessage"

export function StatsConsultCard({ data }: { data: StatsConsultCardData }) {
  const { colors } = useV2Theme()
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background.lower,
          borderColor: colors.line.normal,
        },
      ]}
    >
      <V2Text token="subtext.mediumStrong" color={colors.label.normal}>
        {data.label}
      </V2Text>
      <V2Text token="subtext.medium" color={colors.label.neutral}>
        {data.startDate === data.endDate
          ? data.startDate
          : `${data.startDate} – ${data.endDate}`}
      </V2Text>
      <View style={[styles.question, { borderTopColor: colors.line.normal }]}>
        <V2Text
          token="subtext.large"
          color={colors.label.normal}
          lineBreakStrategyIOS="hangul-word"
        >
          {data.question}
        </V2Text>
      </View>
    </View>
  )
}
const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  question: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
