import type { AnnouncementNotice } from "../types"

export const MAX_ANNOUNCEMENT_CHECK_ATTEMPTS = 3

interface AnnouncementSessionSnapshot {
  checkedThisSession: boolean
  requestAttempts: number
}

interface AnnouncementEntryControllerDependencies {
  fetchActivePopup: () => Promise<AnnouncementNotice | null>
  isDismissed: (notice: AnnouncementNotice) => Promise<boolean>
  getSession: () => AnnouncementSessionSnapshot
  recordAttempt: () => void
  markChecked: () => void
  showNotice: (notice: AnnouncementNotice) => void
  onError: (error: unknown) => void
  maxAttempts?: number
}

export function createAnnouncementEntryController({
  fetchActivePopup,
  isDismissed,
  getSession,
  recordAttempt,
  markChecked,
  showNotice,
  onError,
  maxAttempts = MAX_ANNOUNCEMENT_CHECK_ATTEMPTS,
}: AnnouncementEntryControllerDependencies) {
  let inFlight: Promise<void> | null = null
  let generation = 0

  const check = (): Promise<void> => {
    const session = getSession()
    if (session.checkedThisSession || session.requestAttempts >= maxAttempts) {
      return Promise.resolve()
    }
    if (inFlight) return inFlight

    recordAttempt()
    const requestGeneration = generation
    const request = (async () => {
      try {
        const notice = await fetchActivePopup()
        if (requestGeneration !== generation) return

        if (!notice) {
          markChecked()
          return
        }

        const dismissed = await isDismissed(notice)
        if (requestGeneration !== generation) return

        markChecked()
        if (!dismissed) showNotice(notice)
      } catch (error) {
        if (requestGeneration === generation) onError(error)
      } finally {
        inFlight = null
      }
    })()
    inFlight = request
    return request
  }

  return {
    check,
    invalidate() {
      generation += 1
    },
  }
}
