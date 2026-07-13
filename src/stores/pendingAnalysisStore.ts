import { create } from "zustand"
import type { FoodAnalysisJob, FoodCameraAnalyzeResult } from "@/src/types"
import type { MealType } from "@/src/features/home/types"

export interface PendingAnalysis {
  result: FoodCameraAnalyzeResult
  mealType: MealType
  imageUri: string | null
}

export interface PendingAnalysisConfirmation {
  job: FoodAnalysisJob
  mealType: MealType
  imageUri: string | null
}

interface PendingAnalysisState {
  pending: PendingAnalysis | null
  pendingConfirmation: PendingAnalysisConfirmation | null
  setPending: (pending: PendingAnalysis | null) => void
  setPendingConfirmation: (pending: PendingAnalysisConfirmation | null) => void
}

export const usePendingAnalysisStore = create<PendingAnalysisState>((set) => ({
  pending: null,
  pendingConfirmation: null,
  setPending: (pending) => set({ pending }),
  setPendingConfirmation: (pendingConfirmation) => set({ pendingConfirmation }),
}))
