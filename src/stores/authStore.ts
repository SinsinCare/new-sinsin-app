import { create } from "zustand"
import type { AppUser } from "../services/types/serviceTypes"

interface AuthState {
  user: AppUser | null
  accountState: string | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: AppUser | null) => void
  setAccountState: (state: string | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accountState: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),
  setAccountState: (accountState) => set({ accountState }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () =>
    set({
      user: null,
      accountState: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}))
