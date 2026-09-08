import { useState } from "react"
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import { spacing, typography, useV2Theme } from "@/src/design-system-v2"
import { useTranslation } from "react-i18next"

const COLLAPSED_LINES = 3

/** Measure unclamped text off-flow: native platforms differ in clamped line reporting. */
export function ReviewExpandableContent({
  content,
  expanded,
  onExpand,
  color,
}: {
  content: string
  expanded: boolean
  onExpand: () => void
  color: string
}) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const { fontScale } = useWindowDimensions()
  const [width, setWidth] = useState(0)
  const [measurement, setMeasurement] = useState<{
    key: string
    lines: number
  } | null>(null)
  const key = JSON.stringify([content, width, fontScale])
  const measured = measurement?.key === key
  const textStyle = [typography.subtext.large, { color }]
  if (!content) return null
  return (
    <View
      style={styles.root}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <Text
        style={textStyle}
        numberOfLines={expanded ? undefined : COLLAPSED_LINES}
        lineBreakStrategyIOS="hangul-word"
      >
        {content}
      </Text>
      {!expanded && width > 0 && !measured ? (
        <View
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.measure}
        >
          <Text
            style={textStyle}
            lineBreakStrategyIOS="hangul-word"
            onTextLayout={(event) =>
              setMeasurement({ key, lines: event.nativeEvent.lines.length })
            }
          >
            {content}
          </Text>
        </View>
      ) : null}
      {!expanded && measured && measurement.lines > COLLAPSED_LINES ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: false }}
          onPress={onExpand}
          hitSlop={spacing[8]}
        >
          <Text
            style={[
              typography.subtext.medium,
              { color: colors.label.assistive },
            ]}
          >
            {t("restaurant.review.expand")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}
const styles = StyleSheet.create({
  root: { gap: spacing[4] },
  measure: { position: "absolute", left: 0, right: 0, top: 0, opacity: 0 },
})
