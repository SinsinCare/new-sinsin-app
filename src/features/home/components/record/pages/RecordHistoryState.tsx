import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { V2Button, V2Skeleton } from "@/src/design-system-v2"
import { Text } from "@/src/shared/components/AppText"
import { useSurface } from "@/src/hooks/useSurface"
import { PAGE_X, S, TABLE } from "./recordPageSpec"

export function RecordHistoryState({
  loading,
  error,
  onRetry,
  emptyLabel,
}: {
  loading: boolean
  error: boolean
  onRetry: () => void
  emptyLabel: string
}) {
  const s = useSurface()
  const { t } = useTranslation("common")
  if (loading)
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={t("home.recordPage.historyLoading")}
        style={styles.state}
      >
        {[0, 1].map((row) => (
          <View key={row} style={styles.skeletonRow}>
            <V2Skeleton width="22%" height={16} />
            <V2Skeleton width="48%" height={16} />
          </View>
        ))}
      </View>
    )
  return (
    <View style={styles.state}>
      <Text style={[styles.label, { color: s.text }]}>
        {error ? t("home.recordPage.historyError") : emptyLabel}
      </Text>
      {error && (
        <V2Button size="s" color="neutral" variant="weak" onPress={onRetry}>
          {t("home.recordPage.retryHistory")}
        </V2Button>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  state: {
    minHeight: TABLE.rowHeight * 2 + S[4] * 2,
    paddingHorizontal: PAGE_X,
    paddingVertical: S[4],
    gap: S[3],
    alignItems: "center",
  },
  label: { fontSize: TABLE.fontSize, lineHeight: 22, textAlign: "center" },
  skeletonRow: {
    flexDirection: "row",
    width: "100%",
    minHeight: TABLE.rowHeight,
    justifyContent: "space-between",
    alignItems: "center",
  },
})
