import { StyleSheet, View } from "react-native"
import type { DimensionValue } from "react-native"
import type { VitalStatus } from "../../utils/vitalsJudgment"

interface VitalRangeIndicatorProps {
  status: VitalStatus
  value: number | null
  min: number
  max: number
  defaultValue: number
  color: string
  trackColor: string
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function VitalRangeIndicator({
  status,
  value,
  min,
  max,
  defaultValue,
  color,
  trackColor,
}: VitalRangeIndicatorProps) {
  const displayValue = value ?? defaultValue
  const progress = clamp((displayValue - min) / (max - min), 0, 1)
  const markerLeft = `${progress * 100}%` as DimensionValue

  return (
    <View style={[styles.track, { backgroundColor: trackColor }]}>
      <View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            opacity: status === "none" ? 0.35 : 1,
            width: markerLeft,
          },
        ]}
      />
      <View
        style={[
          styles.marker,
          {
            backgroundColor: color,
            left: markerLeft,
            opacity: status === "none" ? 0.55 : 1,
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 999,
    overflow: "visible",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
  marker: {
    position: "absolute",
    top: -4,
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 999,
  },
})
