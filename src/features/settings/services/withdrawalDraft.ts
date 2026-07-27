import type { WithdrawalReasonCode } from "../data/constants"

export type WithdrawalDraft = {
  reasonCode: WithdrawalReasonCode
  otherDetail: string | null
  deleteMyPosts: boolean
}

let currentDraft: WithdrawalDraft | null = null

export function saveWithdrawalDraft(draft: WithdrawalDraft): void {
  currentDraft = draft
}

export function getWithdrawalDraft(): WithdrawalDraft | null {
  return currentDraft
}

export function clearWithdrawalDraft(): void {
  currentDraft = null
}
