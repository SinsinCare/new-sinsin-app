import { useEffect, useState } from "react"
import {
  AppState,
  Keyboard,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { V2Disclosure, V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { FORM, medStyles } from "./medicationStyles"
import { MedicationTimePicker } from "./MedicationTimePicker"
import {
  displayReminderClock,
  nextMedicationReminder,
  reminderTimesReady,
} from "../data/medicationReminderTime"
import type { ReminderPermission } from "../hooks/useMedicationReminderPermission"
import { todayKst } from "../data/medicationModel"
import type { PlanInput, Slot } from "../types"

export function MedicationReminderSettings({
  plan,
  confirmed,
  disabled,
  permission,
  onToggle,
  onTime,
  onSettings,
  taken,
  takenDate,
}: {
  plan: PlanInput
  confirmed: Slot[]
  disabled: boolean
  permission: ReminderPermission
  onToggle: (value: boolean) => void
  onTime: (slot: Slot, clock: string) => void
  onSettings: () => void
  taken: Slot[]
  takenDate?: string
}) {
  const { t, i18n } = useTranslation("medication"),
    s = useSurface()
  const [editing, setEditing] = useState<Slot | null>(null)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!plan.reminder) return
    const refresh = () => setNow(new Date())
    refresh()
    const timer = setInterval(refresh, 30000)
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh()
    })
    return () => {
      clearInterval(timer)
      subscription.remove()
    }
  }, [plan.reminder])
  const hasSlots = plan.slots.length > 0
  const ready = reminderTimesReady(plan, confirmed)
  const next = ready
    ? nextMedicationReminder(
        plan,
        now,
        takenDate === todayKst(now) ? taken : [],
      )
    : null
  const nextLabel = next?.at.toLocaleString(i18n.language, {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
  return (
    <View style={medStyles.section}>
      <View style={[medStyles.row, { justifyContent: "space-between" }]}>
        <View style={medStyles.grow}>
          <V2Text style={FORM.label} color={s.textStrong}>
            {t("reminder")}
          </V2Text>
          <V2Text style={FORM.hint} color={s.text}>
            {t(hasSlots ? "reminderHint" : "reminderChooseSlot")}
          </V2Text>
        </View>
        <Switch
          accessibilityLabel={t("reminder")}
          value={plan.reminder && hasSlots}
          disabled={disabled || !hasSlots}
          onValueChange={onToggle}
          trackColor={{ true: s.brand }}
        />
      </View>
      <V2Disclosure open={plan.reminder && hasSlots}>
        <View style={{ gap: 12 }}>
          <View style={[styles.times, { backgroundColor: s.surfaceSunken }]}>
            {plan.slots.map((slot, index) => (
              <Pressable
                key={slot}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`${t(`slots.${slot}`)} ${t("reminder")}, ${confirmed.includes(slot) ? displayReminderClock(plan.reminderTimes[slot], i18n.language) : t("reminderSetTime")}`}
                onPress={() => {
                  Keyboard.dismiss()
                  setEditing(slot)
                }}
                style={({ pressed }) => [
                  styles.timeRow,
                  {
                    opacity: pressed ? 0.65 : 1,
                    borderTopWidth: index ? StyleSheet.hairlineWidth : 0,
                    borderTopColor: s.border,
                  },
                ]}
              >
                <V2Text style={FORM.option} color={s.textStrong}>
                  {t(`slots.${slot}`)}
                </V2Text>
                <View style={[medStyles.row, { gap: 6, flexShrink: 1 }]}>
                  <V2Text
                    style={FORM.option}
                    color={confirmed.includes(slot) ? s.textStrong : s.brand}
                  >
                    {confirmed.includes(slot)
                      ? displayReminderClock(
                          plan.reminderTimes[slot],
                          i18n.language,
                        )
                      : t("reminderSetTime")}
                  </V2Text>
                  <Ionicons
                    accessible={false}
                    name="chevron-forward"
                    size={16}
                    color={s.textMuted}
                  />
                </View>
              </Pressable>
            ))}
          </View>
          {permission === "blocked" || permission === "quiet" ? (
            <Pressable
              accessibilityRole="button"
              onPress={onSettings}
              style={[styles.permission, { backgroundColor: s.surfaceSunken }]}
            >
              <Ionicons
                name="notifications-off-outline"
                size={18}
                color={s.text}
              />
              <View style={medStyles.grow}>
                <V2Text style={FORM.option} color={s.textStrong}>
                  {t(
                    permission === "blocked"
                      ? "reminderBlocked"
                      : "reminderQuiet",
                  )}
                </V2Text>
                <V2Text style={FORM.hint} color={s.text}>
                  {t("reminderPermissionAction")}
                </V2Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={s.textMuted} />
            </Pressable>
          ) : nextLabel ? (
            <View style={styles.preview}>
              <Ionicons
                accessible={false}
                name="notifications-outline"
                size={16}
                color={s.text}
              />
              <V2Text style={[FORM.hint, { flex: 1 }]} color={s.text}>
                {t("reminderNext", { time: nextLabel })}
              </V2Text>
            </View>
          ) : null}
          <V2Text style={FORM.hint} color={s.text}>
            {t("reminderScheduleHint")}
          </V2Text>
          {plan.timing !== "UNSPECIFIED" ? (
            <V2Text style={FORM.hint} color={s.text}>
              {t("reminderMealRelation")}
            </V2Text>
          ) : null}
        </View>
      </V2Disclosure>
      {editing && plan.reminder && plan.slots.includes(editing) ? (
        <MedicationTimePicker
          slot={editing}
          clock={plan.reminderTimes[editing]}
          onClose={() => setEditing(null)}
          onConfirm={(clock) => {
            onTime(editing, clock)
            setEditing(null)
          }}
        />
      ) : null}
    </View>
  )
}
const styles = StyleSheet.create({
  times: { borderRadius: 16, paddingHorizontal: 16 },
  timeRow: {
    minHeight: 56,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  preview: { flexDirection: "row", alignItems: "center", gap: 8 },
  permission: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
})
