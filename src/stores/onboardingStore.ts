import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { OnboardingAnswer } from "../types"

interface OnboardingState {
  isOnboardingInProgress: boolean
  ownerUserId: string | null
  hasCkd: boolean | null
  currentStepIndex: number
  answers: Record<number, OnboardingAnswer>
  setOnboardingInProgress: (v: boolean) => void
  prepareForUser: (userId: string) => boolean
  setHasCkd: (v: boolean | null) => void
  setCurrentStepIndex: (index: number) => void
  setAnswer: (step: number, answer: OnboardingAnswer) => void
  getAnswersArray: () => OnboardingAnswer[]
  resetProgress: () => void
  reset: () => void
}

const initialState = {
  isOnboardingInProgress: false,
  ownerUserId: null as string | null,
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
      prepareForUser: (userId) => {
        if (get().ownerUserId === userId) return true

        set({
          ownerUserId: userId,
          hasCkd: null,
          currentStepIndex: 0,
          answers: {},
        })
        return false
      },
      setHasCkd: (hasCkd) => set({ hasCkd }),
      setCurrentStepIndex: (currentStepIndex) => set({ currentStepIndex }),
      setAnswer: (step, answer) =>
        set((state) => ({
          answers: { ...state.answers, [step]: answer },
        })),
      getAnswersArray: () => Object.values(get().answers),
      resetProgress: () =>
        set({
          hasCkd: null,
          currentStepIndex: 0,
          answers: {},
        }),
      reset: () => set(initialState),
    }),
    {
      name: "onboarding-progress",
      storage: createJSONStorage(() => AsyncStorage),
      // 런타임 플래그는 제외하고 진행 데이터만 영속
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        hasCkd: state.hasCkd,
        currentStepIndex: state.currentStepIndex,
        answers: state.answers,
      }),
    },
  ),
)
