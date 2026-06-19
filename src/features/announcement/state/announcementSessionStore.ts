import { create } from "zustand"

interface AnnouncementSessionState {
  checkedThisSession: boolean
  markChecked: () => void
  reset: () => void
}

export const useAnnouncementSessionStore = create<AnnouncementSessionState>(
  (set) => ({
    checkedThisSession: false,
    markChecked: () => set({ checkedThisSession: true }),
    reset: () => set({ checkedThisSession: false }),
  }),
)
