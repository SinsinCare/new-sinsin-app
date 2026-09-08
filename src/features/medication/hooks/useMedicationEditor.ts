import { useEffect, useRef, useState } from "react"
import { router } from "expo-router"
import { uuid } from "expo-modules-core"
import { useTranslation } from "react-i18next"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/src/stores/authStore"
import { useRecordExitGuard } from "@/src/features/home/hooks/useRecordExitGuard"
import { useRecordSaveFeedback } from "@/src/features/home/hooks/useRecordSaveFeedback"
import { showActionSheet, showAlert } from "@/src/lib/dialog"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { useMedicationFlowStore } from "../stores/medicationFlowStore"
import {
  createPlanDraft,
  planInput,
  validPlanDraft,
  SLOTS,
  todayKst,
} from "../data/medicationModel"
import { medicationKeys } from "../data/medicationKeys"
import {
  medicationApi,
  isMedicationConflict,
  isMedicationDuplicate,
  isMedicationPlanLimit,
} from "../services/medicationApi"
import { syncMedicationReminders } from "../services/medicationReminders"
import { useMedicationReminderPermission } from "./useMedicationReminderPermission"
import { reminderTimesReady } from "../data/medicationReminderTime"
import type { Plan, PlanInput, Slot } from "../types"
export function useMedicationEditor(onBack: () => void) {
  const { t } = useTranslation("medication"),
    cache = useQueryClient(),
    uid = useAuthStore((s) => s.user?.uid ?? "")
  const flow = useRef(useMedicationFlowStore.getState()).current
  /*
    수정 대상은 상태다(ref 가 아니라). 409 로 "다른 곳에서 바뀌었다" 를 받으면 최신 버전을
    불러와 갈아 끼워야 재시도가 같은 낡은 version 을 다시 보내지 않는다(DEF-6).
  */
  const [existing, setExisting] = useState<Plan | null>(flow.editing)
  const [initial, setInitial] = useState<PlanInput>(() =>
    flow.editing
      ? planInput(flow.editing)
      : {
          ...createPlanDraft(flow.date),
          name: flow.name,
          source: flow.source,
          drugId: flow.drug?.id ?? null,
        },
  )
  const [plan, setPlan] = useState<PlanInput>(initial),
    [amount, setAmount] = useState(existing ? String(existing.dose) : ""),
    [unitChosen, setUnitChosen] = useState(!!existing),
    [error, setError] = useState<string | null>(null),
    [conflict, setConflict] = useState(false),
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
  /** 409 뒤 최신 판을 불러온다. 사용자가 고친 값은 그대로 두고 version·기준만 바꾼다. */
  const reloadExisting = async () => {
    if (!existing) return
    try {
      const latest = (await medicationApi.plans()).find(
        (p) => p.id === existing.id,
      )
      if (!mounted.current) return
      if (!latest || latest.status === "ARCHIVED") {
        setError(t("archiveBody"))
        return
      }
      setExisting(latest)
      setInitial(planInput(latest))
      setConflict(false)
      setError(null)
    } catch {
      if (mounted.current) setError(t("loadError"))
    }
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
    const input: PlanInput = {
        ...plan,
        name: plan.name.trim(),
        dose: Number(amount.replace(",", ".")),
        ...(flow.recognitionId && plan.source === "PHOTO"
          ? { recognitionId: flow.recognitionId }
          : {}),
      },
      key = JSON.stringify(input)
    if (nonce.current?.key !== key) nonce.current = { key, id: uuid.v4() }
    const id = nonce.current.id
    await save.run(async () => {
      try {
        let saved: Plan
        try {
          saved = existing
            ? await medicationApi.update({ ...existing, ...input }, id)
            : await medicationApi.create(input, id)
        } catch (cause) {
          /*
            같은 약이 이미 있다(EX-03). 서버가 막지 않고 확인을 요구한 것이므로, 여기서 묻고
            "따로 등록" 이면 같은 요청을 `allowDuplicate` 로 다시 보낸다(새 멱등키).
          */
          if (!existing && isMedicationDuplicate(cause) && mounted.current) {
            const found = (cause as { result?: { name?: string } }).result
            const choice = await showActionSheet({
              title: t("duplicateTitle"),
              description: t("duplicateBody", {
                name: found?.name ?? input.name,
              }),
              actions: [
                { label: t("duplicateSeparate") },
                { label: t("duplicateEdit") },
              ],
              cancelLabel: t("cancel"),
            })
            if (choice === 0) {
              nonce.current = { key: `${key}:dup`, id: uuid.v4() }
              saved = await medicationApi.create(
                { ...input, allowDuplicate: true },
                nonce.current.id,
              )
              trackAnalyticsEvent("medication_plan_saved", {
                source: input.source,
                existing: false,
                reminder: input.reminder,
                slot_count: input.slots.length,
                duplicate_kept: true,
              })
            } else {
              if (choice === 1) router.replace("/medication/manage")
              return false
            }
          } else throw cause
        }
        if (!saved) return false
        if (
          !mounted.current ||
          String(useAuthStore.getState().user?.uid) !== String(uid)
        )
          return false
        trackAnalyticsEvent("medication_plan_saved", {
          source: input.source,
          existing: !!existing,
          reminder: input.reminder,
          slot_count: input.slots.length,
          duplicate_kept: false,
        })
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
        if (mounted.current) {
          const conflicted = isMedicationConflict(cause)
          setConflict(conflicted)
          setError(
            conflicted
              ? t("conflictTitle")
              : isMedicationPlanLimit(cause)
                ? t("planLimit")
                : t("editorError"),
          )
        }
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
    conflict,
    reloadExisting,
    existing,
    drug: flow.drug,
    onBack,
  }
}
