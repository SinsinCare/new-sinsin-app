import { create } from "zustand"

interface SelectedDateState {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  resetToToday: () => void
}

export const useSelectedDateStore = create<SelectedDateState>((set) => ({
  selectedDate: new Date(),
  setSelectedDate: (selectedDate) =>
    set({ selectedDate: new Date(selectedDate) }),
  resetToToday: () => set({ selectedDate: new Date() }),
}))
