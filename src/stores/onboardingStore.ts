import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import AsyncStorage from "@react-native-async-storage/async-storage"
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

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
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
    }),
    {
      name: "onboarding-progress",
      storage: createJSONStorage(() => AsyncStorage),
      // 런타임 플래그는 제외하고 진행 데이터만 영속
      partialize: (state) => ({
        hasCkd: state.hasCkd,
        currentStepIndex: state.currentStepIndex,
        answers: state.answers,
      }),
    },
  ),
)
