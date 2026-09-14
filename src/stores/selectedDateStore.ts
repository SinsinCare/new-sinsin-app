import { create } from "zustand"

interface SelectedDateState {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
}

export const useSelectedDateStore = create<SelectedDateState>((set) => ({
  selectedDate: new Date(),
  setSelectedDate: (selectedDate) =>
    set({ selectedDate: new Date(selectedDate) }),
}))
