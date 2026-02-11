import { create } from "zustand"

interface SignupState {
  isSignupInProgress: boolean
  email: string
  name: string
  birthYear: string
  birthMonth: string
  birthDay: string
  gender: "male" | "female" | ""
  referralCode: string
  nickname: string
  setSignupInProgress: (v: boolean) => void
  setEmail: (email: string) => void
  setName: (name: string) => void
  setBirth: (year: string, month: string, day: string) => void
  setGender: (gender: "male" | "female" | "") => void
  setReferralCode: (code: string) => void
  setNickname: (nickname: string) => void
  reset: () => void
}

const initialState = {
  isSignupInProgress: false,
  email: "",
  name: "",
  birthYear: "",
  birthMonth: "",
  birthDay: "",
  gender: "" as const,
  referralCode: "",
  nickname: "",
}

export const useSignupStore = create<SignupState>((set) => ({
  ...initialState,
  setSignupInProgress: (isSignupInProgress) => set({ isSignupInProgress }),
  setEmail: (email) => set({ email }),
  setName: (name) => set({ name }),
  setBirth: (birthYear, birthMonth, birthDay) =>
    set({ birthYear, birthMonth, birthDay }),
  setGender: (gender) => set({ gender }),
  setReferralCode: (referralCode) => set({ referralCode }),
  setNickname: (nickname) => set({ nickname }),
  reset: () => set(initialState),
}))
