import { create } from "zustand"

interface SignupState {
  isSignupInProgress: boolean
  email: string
  signupToken: string
  password: string
  termsOfServiceAgree: boolean
  privacyPolicyAgree: boolean
  marketingAgree: boolean
  phoneNumber: string
  name: string
  birthYear: string
  birthMonth: string
  birthDay: string
  gender: "MALE" | "FEMALE" | "OTHER" | ""
  acquisitionSource:
    | "APP_STORE"
    | "INSTAGRAM"
    | "YOUTUBE"
    | "KAKAO"
    | "BLOG"
    | "NAVER_CAFE"
    | "FRIEND"
    | "OTHER"
    | ""
  acquisitionSourceOther: string
  referralCode: string
  nickname: string
  setSignupInProgress: (v: boolean) => void
  setEmail: (email: string) => void
  setSignupToken: (token: string) => void
  setPassword: (password: string) => void
  setTermsOfServiceAgree: (v: boolean) => void
  setPrivacyPolicyAgree: (v: boolean) => void
  setMarketingAgree: (v: boolean) => void
  setPhoneNumber: (phoneNumber: string) => void
  setName: (name: string) => void
  setBirth: (year: string, month: string, day: string) => void
  setGender: (gender: "MALE" | "FEMALE" | "OTHER" | "") => void
  setAcquisitionSource: (
    source:
      | "APP_STORE"
      | "INSTAGRAM"
      | "YOUTUBE"
      | "KAKAO"
      | "BLOG"
      | "NAVER_CAFE"
      | "FRIEND"
      | "OTHER"
      | "",
  ) => void
  setAcquisitionSourceOther: (value: string) => void
  setReferralCode: (code: string) => void
  setNickname: (nickname: string) => void
  reset: () => void
}

const initialState = {
  isSignupInProgress: false,
  email: "",
  signupToken: "",
  password: "",
  termsOfServiceAgree: false,
  privacyPolicyAgree: false,
  marketingAgree: false,
  phoneNumber: "",
  name: "",
  birthYear: "",
  birthMonth: "",
  birthDay: "",
  gender: "" as const,
  acquisitionSource: "" as const,
  acquisitionSourceOther: "",
  referralCode: "",
  nickname: "",
}

export const useSignupStore = create<SignupState>((set) => ({
  ...initialState,
  setSignupInProgress: (isSignupInProgress) => set({ isSignupInProgress }),
  setEmail: (email) => set({ email }),
  setSignupToken: (signupToken) => set({ signupToken }),
  setPassword: (password) => set({ password }),
  setTermsOfServiceAgree: (termsOfServiceAgree) => set({ termsOfServiceAgree }),
  setPrivacyPolicyAgree: (privacyPolicyAgree) => set({ privacyPolicyAgree }),
  setMarketingAgree: (marketingAgree) => set({ marketingAgree }),
  setPhoneNumber: (phoneNumber) => set({ phoneNumber }),
  setName: (name) => set({ name }),
  setBirth: (birthYear, birthMonth, birthDay) =>
    set({ birthYear, birthMonth, birthDay }),
  setGender: (gender) => set({ gender }),
  setAcquisitionSource: (acquisitionSource) => set({ acquisitionSource }),
  setAcquisitionSourceOther: (acquisitionSourceOther) =>
    set({ acquisitionSourceOther }),
  setReferralCode: (referralCode) => set({ referralCode }),
  setNickname: (nickname) => set({ nickname }),
  reset: () => set(initialState),
}))
