import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import AsyncStorage from "@react-native-async-storage/async-storage"

interface TabVisibilityState {
  showRecipeTab: boolean
  showRestaurantTab: boolean
  setShowRecipeTab: (value: boolean) => void
  setShowRestaurantTab: (value: boolean) => void
}

export const useTabVisibilityStore = create<TabVisibilityState>()(
  persist(
    (set) => ({
      showRecipeTab: false,
      showRestaurantTab: false,
      setShowRecipeTab: (showRecipeTab) => set({ showRecipeTab }),
      setShowRestaurantTab: (showRestaurantTab) => set({ showRestaurantTab }),
    }),
    {
      name: "@sinsin/tab-visibility",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
