import { create } from "zustand"
import type { AppUser } from "../services/types/serviceTypes"
import type { EntryGate, SessionPersistence } from "../types"

/** 로그인·복구·프로필 완료가 한 번에 적용하는 세션의 모양. */
export interface AuthSessionSnapshot {
  user: AppUser | null
  accountState: string | null
  requiresAdditionalInfo: boolean
  entryGate: EntryGate
  sessionPersistence: SessionPersistence
}

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
  /**
   * 세션 다섯 칸을 `set` 한 번으로 바꾼다. 칸마다 따로 부르면 구독자가 다섯 번
   * 렌더되고, 그 사이 `isAuthenticated` 만 먼저 참이 된 중간 상태가 화면에 보인다.
   */
  applySession: (session: AuthSessionSnapshot) => void
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
  applySession: (session) =>
    set({
      ...session,
      isAuthenticated: !!session.user,
      isLoading: false,
    }),
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
