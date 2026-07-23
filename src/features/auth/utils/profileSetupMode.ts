import type { EntryGate, SessionPersistence } from "@/src/types"

interface ProfileSetupModeInput {
  accountState: string | null
  entryGate: EntryGate
  sessionPersistence: SessionPersistence
  requiresAdditionalInfo: boolean
}

/**
 * The server entry gate is authoritative for an incomplete signup session.
 * Account state alone may still be a legacy value while the user must complete
 * their profile before reaching onboarding.
 */
export function isProfileSetupCompletionMode({
  accountState,
  entryGate,
  sessionPersistence,
  requiresAdditionalInfo,
}: ProfileSetupModeInput) {
  return (
    (entryGate === "PROFILE" && sessionPersistence === "ephemeral") ||
    (accountState === "ACTIVE" && requiresAdditionalInfo)
  )
}
