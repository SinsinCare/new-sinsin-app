import { syncMedicationReminders } from "../services/medicationReminders"
import { useCallback, useEffect, useRef, useState } from "react"
import { useFocusEffect } from "@react-navigation/native"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { uuid } from "expo-modules-core"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "@/src/stores/authStore"
import { useRecordExitGuard } from "@/src/features/home/hooks/useRecordExitGuard"
import { useRecordSaveFeedback } from "@/src/features/home/hooks/useRecordSaveFeedback"
import { useHealthEntryInput } from "@/src/features/home/hooks/useHealthEntryInput"
import { showConfirm } from "@/src/lib/dialog"
import { medicationApi, isMedicationConflict } from "../services/medicationApi"
import {
  rebaseMedicationDraft,
  doseChanges,
  firstPendingSlot,
  type MedicationDraft,
} from "../data/medicationModel"
import { medicationKeys } from "../data/medicationKeys"
import { useMedicationFlowStore } from "../stores/medicationFlowStore"
import type { MedicationDay, Slot } from "../types"

export function useMedicationDiary(
  date: string,
  onBack: () => void,
  preferred?: Slot,
) {
  const { t } = useTranslation("medication")
  const uid = useAuthStore((s) => s.user?.uid ?? "")
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: medicationKeys.day(uid, date),
    queryFn: ({ signal }) => medicationApi.day(date, signal),
    enabled: !!uid,
    staleTime: 0,
    refetchOnWindowFocus: false,
  })
  const refetchDay = query.refetch
  const [base, setBase] = useState<MedicationDay | null>(null)
  const [draft, setDraft] = useState<MedicationDraft>({})
  const [slot, setSlot] = useState<Slot>(preferred ?? "BREAKFAST")
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const save = useRecordSaveFeedback()
  const dirty = base ? doseChanges(base, draft).length > 0 : false
  const latest = useRef({ base, draft, dirty })
  latest.current = { base, draft, dirty }
  const nonce = useRef<{ key: string; id: string } | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const owner = useRef(uid)
  owner.current = uid
  const initialized = useRef(false)
  const mark = useHealthEntryInput("medication", true)
  const guard = useRecordExitGuard({
    hasChanges: dirty,
    isSaving: save.isSaving,
    onBack,
    confirmation: {
      title: t("discardTitle"),
      description: t("discardBody"),
      confirmLabel: t("discard"),
      cancelLabel: t("keep"),
    },
  })
  useEffect(() => {
    setBase(null)
    setDraft({})
    initialized.current = false
    nonce.current = null
    setError(null)
    setConflict(false)
  }, [date, uid])
  useEffect(() => {
    if (!query.data) return
    if (latest.current.dirty && latest.current.base) {
      const rebased = rebaseMedicationDraft(
        latest.current.base,
        query.data,
        latest.current.draft,
      )
      if (!rebased) {
        setConflict(true)
        setError(t("conflictTitle"))
        return
      }
      setDraft(rebased)
    }
    setBase(query.data)
    if (!initialized.current) {
      setSlot(firstPendingSlot(query.data, preferred))
      initialized.current = true
    }
  }, [query.data, preferred, t])
  useFocusEffect(
    useCallback(() => {
      const state = useMedicationFlowStore.getState()
      if (state.addedSlot) {
        setSlot(state.addedSlot)
        state.clearAdded()
      }
      if (initialized.current) void refetchDay()
    }, [refetchDay]),
  )
  const toggle = (key: string) => {
    if (save.isSaving || !base || date > base.today) return
    const current = base.occurrences.find((o) => o.key === key)
    if (!current) return
    save.reset()
    setError(null)
    setDraft((value) => ({ ...value, [key]: !(value[key] ?? current.taken) }))
    mark("card")
  }
  const toggleAll = () => {
    if (save.isSaving || !base || date > base.today) return
    const items = base.occurrences.filter((o) => o.slot === slot)
    const all = items.every((o) => draft[o.key] ?? o.taken)
    save.reset()
    setError(null)
    setDraft((value) => ({
      ...value,
      ...Object.fromEntries(items.map((o) => [o.key, !all])),
    }))
    mark("card")
  }
  const reload = async () => {
    if (
      dirty &&
      !(await showConfirm({
        title: t("conflictTitle"),
        description: t("conflictBody"),
        confirmLabel: t("reload"),
        cancelLabel: t("keep"),
        buttonLayout: "vertical",
      }))
    )
      return
    const result = await query.refetch()
    if (result.data) {
      setBase(result.data)
      setDraft({})
      nonce.current = null
      setConflict(false)
      setError(null)
    }
  }
  const submit = async () => {
    const state = latest.current
    if (!state.base || !state.dirty || date > state.base.today) return false
    const changes = doseChanges(state.base, state.draft),
      key = JSON.stringify({ date, revision: state.base.revision, changes })
    if (nonce.current?.key !== key) nonce.current = { key, id: uuid.v4() }
    const requestId = nonce.current.id,
      requestOwner = uid
    return save.run(async () => {
      try {
        const confirmed = await medicationApi.saveDay(
          date,
          state.base!.revision,
          changes,
          requestId,
        )
        if (!mounted.current || owner.current !== requestOwner) return false
        queryClient.setQueryData(medicationKeys.day(uid, date), confirmed)
        setBase(confirmed)
        setDraft({})
        latest.current = { base: confirmed, draft: {}, dirty: false }
        nonce.current = null
        void queryClient.invalidateQueries({
          predicate: (q) => q.queryKey[0] === "dateAnalysis",
        })
        void syncMedicationReminders(uid).catch(() => {})
        guard.leaveAfterSave()
        return true
      } catch (cause) {
        if (mounted.current && owner.current === requestOwner) {
          setConflict(isMedicationConflict(cause))
          setError(
            t(isMedicationConflict(cause) ? "conflictTitle" : "saveError"),
          )
        }
        return false
      }
    })
  }
  return {
    base,
    draft,
    slot,
    setSlot,
    save,
    dirty,
    changes: base ? doseChanges(base, draft).length : 0,
    error,
    conflict,
    query,
    toggle,
    toggleAll,
    reload,
    submit,
  }
}
