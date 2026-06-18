import { create } from "zustand"
import type { AppUser } from "../services/types/serviceTypes"

interface AuthState {
  user: AppUser | null
  accountState: string | null
  requiresAdditionalInfo: boolean
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: AppUser | null) => void
  setAccountState: (state: string | null) => void
  setRequiresAdditionalInfo: (requiresAdditionalInfo: boolean) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accountState: null,
  requiresAdditionalInfo: false,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),
  setAccountState: (accountState) => set({ accountState }),
  setRequiresAdditionalInfo: (requiresAdditionalInfo) =>
    set({ requiresAdditionalInfo }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () =>
    set({
      user: null,
      accountState: null,
      requiresAdditionalInfo: false,
      isAuthenticated: false,
      isLoading: false,
    }),
}))
