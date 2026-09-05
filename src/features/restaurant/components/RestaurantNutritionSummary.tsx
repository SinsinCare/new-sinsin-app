import { StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import { spacing, typography, useV2Theme } from "@/src/design-system-v2"
import { dynamicKey } from "@/src/i18n/dynamicKey"
import type { RestaurantSafetyDto } from "../types"
import {
  cardSafetyBadges,
  cardSafetyNoteKey,
  showsAnalysisPendingChip,
} from "../utils/cardSafetyBadge"
import { safetyBadge } from "../utils/safetyBadge"

/** Read the existing personal verdict; do not recalculate or promote unknown data. */
export function RestaurantNutritionSummary({
  safety,
}: {
  safety: RestaurantSafetyDto | null
}) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const badges = cardSafetyBadges(safety)
  const badge = badges.level ? safetyBadge(badges.level, colors) : null
  const pending = showsAnalysisPendingChip(safety)
  if (!badge && !pending) return null

  const note = badges.note
    ? t(dynamicKey(cardSafetyNoteKey(badges.note)), {
        count:
          badges.note.kind === "SAFE_MENU_COUNT"
            ? badges.note.count
            : undefined,
        driver:
          badges.note.kind === "DRIVER"
            ? t(dynamicKey(`restaurant.safety.driver.${badges.note.driver}`))
            : undefined,
      })
    : null
  const level = badge ? t(dynamicKey(badge.labelKey)) : null
  const summary = pending
    ? t("restaurant.safety.analysisPending")
    : (badges.note?.kind === "DRIVER" ? [note, level] : [level, note])
        .filter(Boolean)
        .join(" · ")

  return (
    <View style={styles.row}>
      <Text style={[typography.subtext.small, { color: colors.label.neutral }]}>
        {t("restaurant.card.nutritionReference")}
      </Text>
      <View style={styles.summary}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[
            styles.dot,
            { backgroundColor: badge?.fg ?? colors.label.alternative },
          ]}
        />
        <Text
          style={[
            typography.subtext.medium,
            styles.text,
            { color: colors.label.normal },
          ]}
        >
          {summary}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    marginTop: spacing[6],
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: spacing[8],
    rowGap: spacing[4],
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    flexShrink: 1,
  },
  dot: { width: spacing[4], height: spacing[4], borderRadius: spacing[2] },
  text: { flexShrink: 1 },
})
