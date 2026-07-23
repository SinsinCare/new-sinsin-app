import { create } from "zustand"
import type { AppUser } from "../services/types/serviceTypes"
import type { EntryGate, SessionPersistence } from "../types"

interface AuthState {
  user: AppUser | null
  accountState: string | null
  requiresAdditionalInfo: boolean
  entryGate: EntryGate
  sessionPersistence: SessionPersistence
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: AppUser | null) => void
  setAccountState: (state: string | null) => void
  setRequiresAdditionalInfo: (requiresAdditionalInfo: boolean) => void
  setEntryGate: (entryGate: EntryGate) => void
  setSessionPersistence: (sessionPersistence: SessionPersistence) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accountState: null,
  requiresAdditionalInfo: false,
  entryGate: "HOME",
  sessionPersistence: "persistent",
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
  setEntryGate: (entryGate) => set({ entryGate }),
  setSessionPersistence: (sessionPersistence) => set({ sessionPersistence }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () =>
    set({
      user: null,
      accountState: null,
      requiresAdditionalInfo: false,
      entryGate: "HOME",
      sessionPersistence: "persistent",
      isAuthenticated: false,
      isLoading: false,
    }),
}))
