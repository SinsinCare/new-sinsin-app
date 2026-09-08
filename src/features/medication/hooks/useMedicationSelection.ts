import { useRef } from "react"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { showActionSheet, showAlert } from "@/src/lib/dialog"
import { medicationApi } from "../services/medicationApi"
import { useMedicationFlowStore } from "../stores/medicationFlowStore"
import type { Drug } from "../types"
export function useMedicationSelection() {
  const { t } = useTranslation("medication"),
    lock = useRef(false)
  return async (
    drug: Drug | null,
    source: "CATALOG" | "PHOTO" = "CATALOG",
    name = "",
  ) => {
    if (lock.current) return
    lock.current = true
    try {
      const plans = await medicationApi.plans()
      const match = plans.find(
        (p) =>
          p.status !== "ARCHIVED" &&
          (drug ? p.drugId === drug.id : p.name.trim() === name.trim()),
      )
      if (match) {
        const answer = await showActionSheet({
          title: t("duplicateTitle"),
          description: t("duplicateBody"),
          actions: [{ label: t("editExisting") }, { label: t("addSeparate") }],
          cancelLabel: t("cancel"),
        })
        if (answer === null) return
        if (answer === 0) {
          useMedicationFlowStore.getState().edit(match)
          router.push("/medication/edit")
          return
        }
      }
      useMedicationFlowStore.getState().select(drug, source, name)
      router.push("/medication/edit")
    } catch {
      await showAlert({ title: t("loadError"), description: t("reload") })
    } finally {
      lock.current = false
    }
  }
}
