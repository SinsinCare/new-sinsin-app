import type { ReactNode } from "react"
import { StyleSheet, View, useWindowDimensions } from "react-native"
import { V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { FORM, S, WATER_CARD } from "./recordPageSpec"
import { recordFieldLabel } from "./recordInk"

/** One measurement leads; artwork is secondary and yields space to larger text. */
export function RecordMetricSummary({
  label,
  value,
  unit,
  detail,
  artwork,
}: {
  label: string
  value: string
  unit: string
  detail?: string
  artwork?: ReactNode
}) {
  const s = useSurface()
  const { fontScale } = useWindowDimensions()
  return (
    <View style={[styles.panel, { backgroundColor: s.surfaceSunken }]}>
      <View style={styles.copy}>
        <V2Text style={FORM.body} color={recordFieldLabel(s)}>
          {label}
        </V2Text>
        <View style={styles.valueRow}>
          <V2Text
            style={[FORM.metric, { flexShrink: 1 }]}
            color={s.textStrong}
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.85}
          >
            {value}
          </V2Text>
          <V2Text style={FORM.body} color={recordFieldLabel(s)}>
            {unit}
          </V2Text>
        </View>
        {detail ? (
          <V2Text style={styles.detail} color={recordFieldLabel(s)}>
            {detail}
          </V2Text>
        ) : null}
      </View>
      {artwork && fontScale <= 1.2 ? (
        <View
          style={styles.artwork}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {artwork}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    minHeight: WATER_CARD.height,
    borderRadius: WATER_CARD.radius,
    padding: S[5],
    flexDirection: "row",
    alignItems: "center",
    gap: S[3],
  },
  copy: { flex: 1, minWidth: 0, gap: S[2] },
  valueRow: { flexDirection: "row", alignItems: "baseline", gap: S[2] },
  detail: { ...FORM.hint, marginTop: S[2] },
  artwork: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
  },
})
