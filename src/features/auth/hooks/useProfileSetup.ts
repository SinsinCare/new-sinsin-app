import { useState } from "react"
import { router } from "expo-router"
import { useSignupStore } from "@/src/stores"
import type { ProfileForm } from "../types"

export function useProfileSetup() {
  const setName = useSignupStore((s) => s.setName)
  const setBirth = useSignupStore((s) => s.setBirth)
  const setGenderStore = useSignupStore((s) => s.setGender)
  const setReferralCodeStore = useSignupStore((s) => s.setReferralCode)

  const [birthYear, setBirthYear] = useState("")
  const [birthMonth, setBirthMonth] = useState("")
  const [birthDay, setBirthDay] = useState("")
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER" | "">("")

  const handleYearChange = (v: string) => {
    setBirthYear(v)
    if (birthMonth && birthDay) {
      const maxDay = new Date(Number(v), Number(birthMonth), 0).getDate()
      if (Number(birthDay) > maxDay) setBirthDay("")
    }
  }

  const handleMonthChange = (v: string) => {
    setBirthMonth(v)
    if (birthYear && birthDay) {
      const maxDay = new Date(Number(birthYear), Number(v), 0).getDate()
      if (Number(birthDay) > maxDay) setBirthDay("")
    }
  }

  const handleNext = (data: ProfileForm) => {
    setName(data.name)
    setBirth(birthYear, birthMonth, birthDay)
    setGenderStore(gender)
    setReferralCodeStore(data.referralCode)
    router.push("/(auth)/nickname-setup")
  }

  return {
    birthYear,
    birthMonth,
    birthDay,
    gender,
    handleYearChange,
    handleMonthChange,
    setBirthDay,
    setGender,
    handleNext,
  }
}
