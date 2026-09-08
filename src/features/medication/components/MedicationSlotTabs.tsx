import {
  FONT_SCALE,
  effectiveTextScale,
} from "@/src/design-system-v2/tokens/fontScaling"
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native"
import { useTranslation } from "react-i18next"
import { V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { SLOTS, type MedicationDay, type Slot } from "../types"
import type { MedicationDraft } from "../data/medicationModel"
import { FORM, S } from "./medicationStyles"
export function MedicationSlotTabs({
  day,
  draft,
  value,
  onChange,
  disabled,
}: {
  day: MedicationDay
  draft: MedicationDraft
  value: Slot
  onChange: (slot: Slot) => void
  disabled: boolean
}) {
  const { fontScale: systemFontScale } = useWindowDimensions()
  const fontScale = effectiveTextScale(systemFontScale, FONT_SCALE.body)
  const { t } = useTranslation("medication"),
    s = useSurface()
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.row, fontScale > 1.4 && { flexWrap: "wrap" }]}
    >
      {SLOTS.map((slot) => {
        const items = day.occurrences.filter((o) => o.slot === slot),
          taken = items.filter((o) => draft[o.key] ?? o.taken).length
        const changed = items.some(
          (o) => draft[o.key] !== undefined && draft[o.key] !== o.taken,
        )
        const status = changed
          ? t("checked")
          : items.length === 0
            ? t("none")
            : taken === items.length
              ? t("done")
              : taken
                ? t("partial")
                : t("before")
        const selected = slot === value
        return (
          <Pressable
            key={slot}
            accessibilityRole="tab"
            accessibilityLabel={`${t(`slots.${slot}`)}, ${status}`}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(slot)}
            style={({ pressed }) => [
              styles.tab,
              fontScale > 1.4 && { flexBasis: "45%" },
              {
                backgroundColor: pressed ? s.surfacePressed : s.surfaceSunken,
                borderColor: selected ? s.textStrong : "transparent",
              },
            ]}
          >
            <V2Text
              style={[FORM.option, { textAlign: "center" }]}
              color={selected ? s.textStrong : s.textOnSurface}
            >
              {t(`slots.${slot}`)}
            </V2Text>
            <V2Text
              style={[
                FORM.hint,
                { fontSize: 12, lineHeight: 16, textAlign: "center" },
              ]}
              color={s.textOnSurface}
            >
              {status}
            </V2Text>
          </Pressable>
        )
      })}
    </View>
  )
}
const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: S[2] },
  tab: {
    flex: 1,
    minHeight: 64,
    borderWidth: 1,
    borderRadius: FORM.choiceRadius,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: S[2],
    gap: S[1],
  },
})
