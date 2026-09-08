import { Pressable, StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { displayReminderClock } from "../data/medicationReminderTime"
import type { Occurrence } from "../types"
import { FORM, MIN, S } from "./medicationStyles"
export function MedicationDoseRow({
  item,
  checked,
  disabled,
  onToggle,
  onMore,
  management = false,
}: {
  item: Occurrence
  checked: boolean
  disabled: boolean
  onToggle: () => void
  onMore: () => void
  management?: boolean
}) {
  const { t, i18n } = useTranslation("medication"),
    s = useSurface(),
    plan = item.plan
  const time = item.recordedAt
    ? new Date(item.recordedAt).toLocaleTimeString("ko-KR", {
        timeZone: "Asia/Seoul",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : null
  const status =
    checked !== item.taken
      ? t("checked")
      : item.taken
        ? item.timeKnown && time
          ? t("recordedTime", { time })
          : t("pastRecorded")
        : null
  const label = `${plan.name}, ${plan.dose}${t(`units.${plan.unit}`)}`
  return (
    <View style={[styles.row, { borderBottomColor: s.border }]}>
      <Pressable
        onPress={onToggle}
        onLongPress={onMore}
        disabled={disabled}
        accessibilityRole={management ? "button" : "checkbox"}
        accessibilityLabel={[
          label,
          plan.timing !== "UNSPECIFIED" ? t(`timings.${plan.timing}`) : null,
          status,
        ]
          .filter(Boolean)
          .join(", ")}
        accessibilityState={{ ...(management ? {} : { checked }), disabled }}
        style={({ pressed }) => [styles.check, { opacity: pressed ? 0.65 : 1 }]}
      >
        <Ionicons
          accessible={false}
          name={
            management
              ? "medical-outline"
              : checked
                ? "checkmark-circle"
                : "ellipse-outline"
          }
          size={26}
          color={checked ? s.brand : s.textMuted}
        />
        <View style={styles.copy}>
          <V2Text style={FORM.option} color={s.textStrong}>
            {plan.name}
          </V2Text>
          <View style={styles.meta}>
            <V2Text style={FORM.hint} color={s.text}>
              {plan.dose} {t(`units.${plan.unit}`)}
            </V2Text>
            {plan.timing !== "UNSPECIFIED" ? (
              <V2Text style={FORM.hint} color={s.text}>
                · {t(`timings.${plan.timing}`)}
              </V2Text>
            ) : null}
          </View>
          {management ? (
            <V2Text style={FORM.hint} color={s.text}>
              {plan.slots
                .map(
                  (slot) =>
                    `${t(`slots.${slot}`)}${plan.reminder && plan.status === "ACTIVE" ? ` ${displayReminderClock(plan.reminderTimes[slot], i18n.language)}` : ""}`,
                )
                .join(" · ")}
            </V2Text>
          ) : null}
          {management ? (
            <V2Text style={FORM.hint} color={s.text}>
              {t(
                plan.status === "PAUSED"
                  ? "reminderPaused"
                  : plan.reminder
                    ? "reminderActive"
                    : "reminderInactive",
              )}
            </V2Text>
          ) : null}
          {plan.drug?.guide ? (
            <V2Text style={FORM.hint} color={s.text}>
              {plan.drug.guide.text}
            </V2Text>
          ) : null}
          {status ? (
            <V2Text style={FORM.hint} color={s.text}>
              {status}
            </V2Text>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("more", { name: plan.name })}
        onPress={onMore}
        disabled={disabled}
        style={styles.more}
      >
        <Ionicons
          accessible={false}
          name="ellipsis-horizontal"
          size={20}
          color={s.text}
        />
      </Pressable>
    </View>
  )
}
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  check: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: S[3],
    paddingVertical: S[5],
    minHeight: 84,
  },
  copy: { flex: 1, gap: S[1] },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: S[1] },
  more: {
    width: MIN.TOUCH,
    minHeight: MIN.TOUCH,
    alignItems: "flex-end",
    justifyContent: "center",
  },
})
