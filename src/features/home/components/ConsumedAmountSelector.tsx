import { StyleSheet, Text, View } from "react-native"
import { V2SegmentControl } from "@/src/design-system-v2"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { spacing, typography } from "@/src/design-system-v2/tokens"
import { EATEN_PRESETS } from "../data/foodEditConstants"
import { useTranslation } from "react-i18next"

interface ConsumedAmountSelectorProps {
  value: number
  onChange: (step: number) => void
  accessibilityLabel?: string
}

const ITEMS = EATEN_PRESETS.map((preset) => ({
  label: preset.label,
  value: String(preset.step),
}))

export function ConsumedAmountSelector({
  value,
  onChange,
  accessibilityLabel,
}: ConsumedAmountSelectorProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()

  return (
    <View
      accessibilityLabel={
        accessibilityLabel ?? t("foodEdit.chooseConsumedAmount")
      }
      style={styles.root}
    >
      <V2SegmentControl
        items={ITEMS}
        value={String(value)}
        onChange={(nextValue) => onChange(Number(nextValue))}
        size="s"
        alignment="fixed"
      />
      <View style={styles.descriptions}>
        {EATEN_PRESETS.map((preset) => {
          const selected = preset.step === value
          return (
            <Text
              key={preset.step}
              accessibilityState={{ selected }}
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
              style={[
                styles.description,
                selected
                  ? typography.subtext.mediumStrong
                  : typography.subtext.medium,
                {
                  color: selected
                    ? colors.primary.primary
                    : colors.label.alternative,
                },
              ]}
            >
              {t(`foodEdit.consumed.${preset.step}`)}
            </Text>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    gap: spacing[6],
  },
  descriptions: {
    flexDirection: "row",
  },
  description: {
    flex: 1,
    textAlign: "center",
  },
})
