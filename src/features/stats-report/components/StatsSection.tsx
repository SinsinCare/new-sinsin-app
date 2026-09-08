import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import { useReportSurface } from "../hooks/useReportSurface"
import { TYPE } from "@/src/theme/surface"

/** A titled panel groups related evidence; dividers separate rows inside the panel. */
export function StatsSection({
  title,
  caption,
  children,
}: {
  title: string
  caption?: string | null
  children: ReactNode
}) {
  const s = useReportSurface()
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={[styles.title, { color: s.textStrong }]}>{title}</Text>
        {!!caption && (
          <Text style={[styles.caption, { color: s.textMuted }]}>
            {caption}
          </Text>
        )}
      </View>
      <View
        style={[
          styles.panel,
          { backgroundColor: s.card, borderColor: s.hairline },
        ]}
      >
        {children}
      </View>
    </View>
  )
}

export const statsStyles = StyleSheet.create({
  row: {
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  label: { ...TYPE.cardTitle, fontWeight: "600", flexShrink: 1 },
  detail: { ...TYPE.caption, lineHeight: 21 },
  meta: { ...TYPE.cardSub, lineHeight: 18 },
  numbers: { fontVariant: ["tabular-nums"] },
})
const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  section: { gap: 12 },
  heading: { gap: 5, paddingHorizontal: 2 },
  title: { ...TYPE.sectionTitle, fontWeight: "700" },
  caption: { ...TYPE.caption, lineHeight: 20 },
})
