import { create } from "zustand"
import type { FoodCameraAnalyzeResult } from "@/src/types"
import type { MealType } from "@/src/features/home/types"

export interface PendingAnalysis {
  result: FoodCameraAnalyzeResult
  mealType: MealType
  imageUri: string | null
}

interface PendingAnalysisState {
  pending: PendingAnalysis | null
  setPending: (pending: PendingAnalysis | null) => void
}

export const usePendingAnalysisStore = create<PendingAnalysisState>((set) => ({
  pending: null,
  setPending: (pending) => set({ pending }),
}))
