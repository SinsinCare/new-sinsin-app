import { create } from "zustand"
import type { OnboardingAnswer } from "../types"

interface OnboardingState {
  isOnboardingInProgress: boolean
  hasCkd: boolean | null
  currentStepIndex: number
  answers: Record<number, OnboardingAnswer>
  setOnboardingInProgress: (v: boolean) => void
  setHasCkd: (v: boolean | null) => void
  setCurrentStepIndex: (index: number) => void
  setAnswer: (step: number, answer: OnboardingAnswer) => void
  getAnswersArray: () => OnboardingAnswer[]
  reset: () => void
}

const initialState = {
  isOnboardingInProgress: false,
  hasCkd: null as boolean | null,
  currentStepIndex: 0,
  answers: {} as Record<number, OnboardingAnswer>,
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  ...initialState,
  setOnboardingInProgress: (isOnboardingInProgress) =>
    set({ isOnboardingInProgress }),
  setHasCkd: (hasCkd) => set({ hasCkd }),
  setCurrentStepIndex: (currentStepIndex) => set({ currentStepIndex }),
  setAnswer: (step, answer) =>
    set((state) => ({
      answers: { ...state.answers, [step]: answer },
    })),
  getAnswersArray: () => Object.values(get().answers),
  reset: () => set(initialState),
}))
