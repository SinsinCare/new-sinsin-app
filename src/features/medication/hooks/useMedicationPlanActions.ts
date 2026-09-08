import { syncMedicationReminders } from "../services/medicationReminders"
import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"
import { router } from "expo-router"
import { uuid } from "expo-modules-core"
import { showActionSheet, showConfirm, showAlert } from "@/src/lib/dialog"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { hapticSelection } from "@/src/lib/haptics"
import { useAuthStore } from "@/src/stores/authStore"
import { medicationApi } from "../services/medicationApi"
import { useMedicationFlowStore } from "../stores/medicationFlowStore"
import { medicationKeys } from "../data/medicationKeys"
import type { Plan } from "../types"
export function useMedicationPlanActions() {
  const { t } = useTranslation("medication"),
    queryClient = useQueryClient(),
    uid = useAuthStore((s) => s.user?.uid ?? "")
  const lock = useRef(false),
    [busy, setBusy] = useState(false)
  /**
   * `known` 은 화면이 이미 들고 있는 최신 플랜 목록(하루 응답의 `plans`). 있으면 왕복 없이
   * 바로 시트를 연다 — 길게 눌렀는데 몇 초간 아무 반응이 없던 문제(DEF-14).
   */
  const open = async (snapshot: Plan, known?: readonly Plan[]) => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    hapticSelection()
    try {
      const plans = known?.some((p) => p.id === snapshot.id)
          ? known
          : await medicationApi.plans(),
        plan = plans.find((p) => p.id === snapshot.id)
      if (!plan || plan.status === "ARCHIVED") {
        await showAlert({ title: snapshot.name, description: t("archiveBody") })
        return
      }
      const action = await showActionSheet({
        title: plan.name,
        actions: [
          { label: t("edit") },
          { label: t(plan.status === "PAUSED" ? "resume" : "pause") },
          { label: t("archive"), destructive: true },
        ],
        cancelLabel: t("cancel"),
      })
      if (action === null) return
      if (action === 0) {
        useMedicationFlowStore.getState().edit(plan)
        router.push("/medication/edit")
        return
      }
      if (
        action === 2 &&
        !(await showConfirm({
          title: t("archiveTitle"),
          description: t("archiveBody"),
          confirmLabel: t("archive"),
          cancelLabel: t("cancel"),
          destructive: true,
          buttonLayout: "vertical",
        }))
      )
        return
      if (
        action === 1 &&
        plan.status === "ACTIVE" &&
        !(await showConfirm({
          title: t("pause"),
          description: t("pauseBody"),
          confirmLabel: t("pause"),
          cancelLabel: t("cancel"),
          buttonLayout: "vertical",
        }))
      )
        return
      const status =
        action === 2
          ? "ARCHIVED"
          : plan.status === "PAUSED"
            ? "ACTIVE"
            : "PAUSED"
      await medicationApi.update({ ...plan, status }, uuid.v4())
      trackAnalyticsEvent("medication_plan_status_changed", { status })
      const synced = await syncMedicationReminders(uid).catch(() => false)
      if (!synced) await showAlert({ title: t("savedReminderError") })
      await queryClient.invalidateQueries({
        queryKey: medicationKeys.root(uid),
      })
      void queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "dateAnalysis",
      })
    } catch {
      await showAlert({ title: t("loadError"), description: t("reload") })
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return { open, busy }
}
