import * as Notifications from "expo-notifications"
import { Platform } from "react-native"
import i18n from "@/src/i18n"
import { useAuthStore } from "@/src/stores/authStore"
import { medicationApi } from "./medicationApi"
import { todayKst } from "../data/medicationModel"
import {
  allocateMedicationReminders,
  buildMedicationReminders,
} from "../data/medicationReminders"
import { useMedicationReminderStore } from "../stores/medicationReminderStore"
const PREFIX = "medication-v2:"
let queue: Promise<unknown> = Promise.resolve()
let generation = 0
export function cancelMedicationReminders() {
  ++generation
  useMedicationReminderStore.setState({
    owner: "",
    problem: false,
    syncing: false,
    issue: null,
    coveredUntil: null,
    nextAt: null,
    renewalAt: null,
  })
  const work = queue
    .catch(() => {})
    .then(async () => {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync()
      await Promise.all(
        scheduled
          .filter((n) => n.identifier.startsWith(PREFIX))
          .map((n) =>
            Notifications.cancelScheduledNotificationAsync(n.identifier),
          ),
      )
    })
  queue = work
  return work
}
export function syncMedicationReminders(
  uid: string | number,
): Promise<boolean> {
  const revision = ++generation
  const valid = () =>
    revision === generation &&
    String(useAuthStore.getState().user?.uid ?? "") === String(uid)
  useMedicationReminderStore.setState({ owner: String(uid), syncing: true })
  const work = queue
    .catch(() => {})
    .then(async () => {
      if (!valid()) return false
      const [plans, day, permission] = await Promise.all([
        medicationApi.plans(),
        medicationApi.day(todayKst()),
        Notifications.getPermissionsAsync(),
      ])
      if (!valid()) return false
      const scheduled = await Notifications.getAllScheduledNotificationsAsync(),
        own = scheduled.filter((n) => n.identifier.startsWith(PREFIX))
      const allowed =
        permission.granted ||
        (permission.ios != null &&
          permission.ios.status ===
            Notifications.IosAuthorizationStatus.PROVISIONAL)
      const desired = allowed
        ? buildMedicationReminders(plans, day, new Date(), 90)
        : []
      // iOS allows 64 pending notifications. Reserve four for other app operations.
      const budget =
        Platform.OS === "ios"
          ? Math.max(0, 60 - (scheduled.length - own.length))
          : 60
      const allocation = allocateMedicationReminders(desired, budget)
      const { selected, renewalAt } = allocation
      const renewalId = `${PREFIX}${uid}:renewal`
      const wanted = new Set(selected.map((r) => `${PREFIX}${uid}:${r.key}`))
      if (renewalAt) wanted.add(renewalId)
      await Promise.all(
        own
          .filter((n) => !wanted.has(n.identifier))
          .map((n) =>
            Notifications.cancelScheduledNotificationAsync(n.identifier),
          ),
      )
      if (!valid()) return false
      if (Platform.OS === "android")
        await Notifications.setNotificationChannelAsync("medication", {
          name: i18n.t("reminder", { ns: "medication" }),
          importance: Notifications.AndroidImportance.DEFAULT,
        })
      for (const reminder of selected) {
        if (!valid()) return false
        const identifier = `${PREFIX}${uid}:${reminder.key}`
        // Replace by stable ID so localization changes cannot leave duplicate reminders.
        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: i18n.t("notificationTitle", { ns: "medication" }),
            body: i18n.t("notificationBody", {
              ns: "medication",
              slot: i18n.t(`slots.${reminder.slot}`, { ns: "medication" }),
            }),
            data: {
              type: "medication_reminder",
              date: reminder.date,
              slot: reminder.slot,
            },
            sound: "default",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminder.at,
            channelId: "medication",
          },
        })
      }
      if (!valid()) return false
      if (renewalAt) {
        const date = new Date(allocation.coveredUntil!).toLocaleDateString(
          i18n.language,
          {
            timeZone: "Asia/Seoul",
            month: "long",
            day: "numeric",
          },
        )
        await Notifications.scheduleNotificationAsync({
          identifier: renewalId,
          content: {
            title: i18n.t("reminderRenewalTitle", { ns: "medication" }),
            body: i18n.t("reminderRenewalBody", { ns: "medication", date }),
            data: { type: "medication_reminder_renewal" },
            sound: "default",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: renewalAt,
            channelId: "medication",
          },
        })
      }
      if (!valid()) return false
      const pending = await Notifications.getAllScheduledNotificationsAsync()
      const registered = new Set(pending.map((n) => n.identifier))
      if ([...wanted].some((id) => !registered.has(id)))
        throw new Error("Medication notification registration incomplete")
      if (!valid()) return false
      const issue =
        plans.some((p) => p.status === "ACTIVE" && p.reminder) && !allowed
          ? "permission"
          : allocation.limited
            ? "capacity"
            : null
      useMedicationReminderStore.setState({
        issue,
        coveredUntil: allocation.coveredUntil,
        nextAt: selected[0]?.at.toISOString() ?? null,
        renewalAt: renewalAt?.toISOString() ?? null,
      })
      return !issue
    })
  const reported = work.then(
    (ok) => {
      if (valid())
        useMedicationReminderStore.setState({
          owner: String(uid),
          syncing: false,
          problem: !ok,
        })
      return ok
    },
    (error: unknown) => {
      if (valid())
        useMedicationReminderStore.setState({
          owner: String(uid),
          syncing: false,
          problem: true,
          issue: "connection",
        })
      throw error
    },
  )
  queue = reported
  return reported
}
