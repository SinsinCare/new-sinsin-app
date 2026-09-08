import { useEffect, useRef, useState } from "react"
import { router } from "expo-router"
import { uuid } from "expo-modules-core"
import { useTranslation } from "react-i18next"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/src/stores/authStore"
import { useRecordExitGuard } from "@/src/features/home/hooks/useRecordExitGuard"
import { useRecordSaveFeedback } from "@/src/features/home/hooks/useRecordSaveFeedback"
import { showAlert } from "@/src/lib/dialog"
import { useMedicationFlowStore } from "../stores/medicationFlowStore"
import {
  createPlanDraft,
  planInput,
  validPlanDraft,
  SLOTS,
  todayKst,
} from "../data/medicationModel"
import { medicationKeys } from "../data/medicationKeys"
import { medicationApi, isMedicationConflict } from "../services/medicationApi"
import { syncMedicationReminders } from "../services/medicationReminders"
import { useMedicationReminderPermission } from "./useMedicationReminderPermission"
import { reminderTimesReady } from "../data/medicationReminderTime"
import type { PlanInput, Slot } from "../types"
export function useMedicationEditor(onBack: () => void) {
  const { t } = useTranslation("medication"),
    cache = useQueryClient(),
    uid = useAuthStore((s) => s.user?.uid ?? "")
  const flow = useRef(useMedicationFlowStore.getState()).current,
    existing = flow.editing
  const initial = useRef(
    existing
      ? planInput(existing)
      : {
          ...createPlanDraft(flow.date),
          name: flow.name,
          source: flow.source,
          drugId: flow.drug?.id ?? null,
        },
  ).current
  const [plan, setPlan] = useState<PlanInput>(initial),
    [amount, setAmount] = useState(existing ? String(existing.dose) : ""),
    [unitChosen, setUnitChosen] = useState(!!existing),
    [error, setError] = useState<string | null>(null),
    [confirmedTimes, setConfirmedTimes] = useState<Slot[]>(
      existing?.reminder ? existing.slots : [],
    )
  const reminderPermission = useMedicationReminderPermission()
  const today = todayKst()
  const day = useQuery({
    queryKey: medicationKeys.day(uid, today),
    queryFn: () => medicationApi.day(today),
    enabled: !!existing && plan.reminder && !!uid,
  })
  const takenSlots =
    day.data?.occurrences
      .filter((o) => o.planId === existing?.id && o.taken)
      .map((o) => o.slot) ?? []
  const save = useRecordSaveFeedback(),
    mounted = useRef(true),
    nonce = useRef<{ key: string; id: string } | null>(null)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const dirty =
    JSON.stringify(plan) !== JSON.stringify(initial) ||
    amount !== (existing ? String(existing.dose) : "") ||
    unitChosen !== !!existing
  const guard = useRecordExitGuard({
    hasChanges: dirty,
    isSaving: save.isSaving,
    onBack: () => router.dismissTo("/record/medication"),
    confirmation: {
      title: t("discardTitle"),
      description: t("registerGuard"),
      confirmLabel: t("discard"),
      cancelLabel: t("keep"),
    },
  })
  const set = (patch: Partial<PlanInput>) => {
    if (save.isSaving) return
    setPlan((p) => ({ ...p, ...patch }))
    setError(null)
  }
  const toggleSlot = (slot: Slot) => {
    const slots = SLOTS.filter((s) =>
      s === slot ? !plan.slots.includes(s) : plan.slots.includes(s),
    )
    set({ slots, reminder: slots.length > 0 && plan.reminder })
  }
  const reminder = (value: boolean) =>
    set({ reminder: value && plan.slots.length > 0 })
  const setReminderTime = (slot: Slot, clock: string) => {
    if (save.isSaving) return
    set({ reminderTimes: { ...plan.reminderTimes, [slot]: clock } })
    setConfirmedTimes((times) => [...new Set([...times, slot])])
  }
  const valid =
    validPlanDraft(plan, amount, unitChosen) &&
    reminderTimesReady(plan, confirmedTimes)
  const submit = async () => {
    if (!valid || reminderPermission.busy) return
    if (plan.reminder && !(await reminderPermission.ensure())) {
      if (mounted.current) setError(t("reminderPermissionRequired"))
      return
    }
    if (!mounted.current) return
    const input = {
        ...plan,
        name: plan.name.trim(),
        dose: Number(amount.replace(",", ".")),
      },
      key = JSON.stringify(input)
    if (nonce.current?.key !== key) nonce.current = { key, id: uuid.v4() }
    const id = nonce.current.id
    await save.run(async () => {
      try {
        const saved = existing
          ? await medicationApi.update({ ...existing, ...input }, id)
          : await medicationApi.create(input, id)
        if (
          !mounted.current ||
          String(useAuthStore.getState().user?.uid) !== String(uid)
        )
          return false
        useMedicationFlowStore.getState().added(saved)
        await cache.invalidateQueries({ queryKey: medicationKeys.root(uid) })
        void cache.invalidateQueries({
          predicate: (q) => q.queryKey[0] === "dateAnalysis",
        })
        const synced = await syncMedicationReminders(uid).catch(() => false)
        if (!mounted.current) return false
        if (!synced) await showAlert({ title: t("savedReminderError") })
        guard.leaveAfterSave()
        return true
      } catch (cause) {
        if (mounted.current)
          setError(
            t(isMedicationConflict(cause) ? "conflictTitle" : "editorError"),
          )
        return false
      }
    })
  }
  return {
    plan,
    amount,
    setAmount,
    unitChosen,
    setUnitChosen,
    set,
    toggleSlot,
    reminder,
    permissionBusy: reminderPermission.busy,
    reminderPermission,
    confirmedTimes,
    setReminderTime,
    takenSlots,
    takenDate: day.data?.date,
    valid,
    dirty,
    save,
    submit,
    error,
    existing,
    drug: flow.drug,
    onBack,
  }
}
