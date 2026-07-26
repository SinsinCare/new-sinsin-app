import type { AuthSessionResult } from "@/src/services/types/serviceTypes"

export type AuthSessionBootstrapOutcome =
  | "already_authenticated"
  | "restored"
  | "cleared"
  | "preserved_active_session"

interface AuthSessionBootstrapDependencies {
  isAuthenticated: () => boolean
  restoreSession: () => Promise<AuthSessionResult | null>
  applyAuthSession: (result: AuthSessionResult) => void
  clearClientSession: () => Promise<void>
}

/**
 * Restores a persisted session only during the app bootstrap.
 *
 * A user can finish an interactive login while the restore request is still in
 * flight. In that case the newly authenticated session must win over the stale
 * restore result (including a null result).
 */
export async function bootstrapAuthSession({
  isAuthenticated,
  restoreSession,
  applyAuthSession,
  clearClientSession,
}: AuthSessionBootstrapDependencies): Promise<AuthSessionBootstrapOutcome> {
  if (isAuthenticated()) return "already_authenticated"

  const restoredSession = await restoreSession()

  if (isAuthenticated()) return "preserved_active_session"

  if (restoredSession) {
    applyAuthSession(restoredSession)
    return "restored"
  }

  await clearClientSession()
  return "cleared"
}
