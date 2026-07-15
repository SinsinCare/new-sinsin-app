import { create } from "zustand"

interface AnnouncementSessionState {
  checkedThisSession: boolean
  requestAttempts: number
  recordAttempt: () => void
  markChecked: () => void
  reset: () => void
}

export const useAnnouncementSessionStore = create<AnnouncementSessionState>(
  (set) => ({
    checkedThisSession: false,
    requestAttempts: 0,
    recordAttempt: () =>
      set((state) => ({ requestAttempts: state.requestAttempts + 1 })),
    markChecked: () => set({ checkedThisSession: true }),
    reset: () => set({ checkedThisSession: false, requestAttempts: 0 }),
  }),
)
