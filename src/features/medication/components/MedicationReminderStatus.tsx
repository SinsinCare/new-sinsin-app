import { Linking, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { V2Button, V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { useMedicationReminderStore } from "../stores/medicationReminderStore"
import { syncMedicationReminders } from "../services/medicationReminders"
import { FORM, medStyles } from "./medicationStyles"

export function MedicationReminderStatus({ uid }: { uid: string | number }) {
  const state = useMedicationReminderStore(),
    s = useSurface(),
    { t, i18n } = useTranslation("medication")
  if (state.owner !== String(uid) || (!state.problem && !state.coveredUntil))
    return null
  const permission = state.issue === "permission",
    capacity = state.issue === "capacity"
  const until = state.coveredUntil
    ? new Date(state.coveredUntil).toLocaleString(i18n.language, {
        timeZone: "Asia/Seoul",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : null
  return (
    <View style={[medStyles.note, { backgroundColor: s.surfaceSunken }]}>
      <View style={medStyles.row}>
        <Ionicons
          accessible={false}
          name={
            state.problem
              ? "notifications-off-outline"
              : "notifications-outline"
          }
          size={20}
          color={s.textOnSurface}
        />
        <V2Text style={[FORM.option, medStyles.grow]} color={s.textStrong}>
          {t(
            permission
              ? "reminderBlocked"
              : capacity
                ? "reminderCapacity"
                : state.problem
                  ? "reminderProblem"
                  : "reminderReserved",
            { date: until },
          )}
        </V2Text>
      </View>
      {state.problem && until && !permission ? (
        <V2Text style={FORM.hint} color={s.textOnSurface}>
          {t("reminderReserved", { date: until })}
        </V2Text>
      ) : null}
      <V2Text style={FORM.hint} color={s.textOnSurface}>
        {t(
          permission
            ? "reminderPermissionAction"
            : capacity
              ? "reminderCapacityHint"
              : state.problem
                ? "reminderProblemBody"
                : state.renewalAt
                  ? "reminderCoverageHint"
                  : "reminderCoverageShortHint",
        )}
      </V2Text>
      {state.problem ? (
        <V2Button
          color="neutral"
          variant="weak"
          size="m"
          multilineLabel
          loading={state.syncing}
          onPress={() =>
            permission
              ? void Linking.openSettings()
              : void syncMedicationReminders(uid).catch(() => {})
          }
        >
          {t(permission ? "openSettings" : "retryReminders")}
        </V2Button>
      ) : null}
    </View>
  )
}
