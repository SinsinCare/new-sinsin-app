import { create } from "zustand"
export type MedicationReminderIssue =
  | "permission"
  | "capacity"
  | "connection"
  | null
export const useMedicationReminderStore = create<{
  owner: string
  problem: boolean
  syncing: boolean
  issue: MedicationReminderIssue
  coveredUntil: string | null
  nextAt: string | null
  renewalAt: string | null
}>(() => ({
  owner: "",
  problem: false,
  syncing: false,
  issue: null,
  coveredUntil: null,
  nextAt: null,
  renewalAt: null,
}))
