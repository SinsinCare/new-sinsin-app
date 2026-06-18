import { useEffect, useState } from "react"
import { router } from "expo-router"
import { useSignupStore } from "@/src/stores"
import { useAuth } from "@/src/hooks"
import { ApiError } from "@/src/services/core/apiError"
import { showErrorToast } from "@/src/lib/toast"
import { getDestinationForAccountState } from "../utils/accountStateRoute"
import type { ProfileForm } from "../types"
import type { AcquisitionSourceInput } from "../data/acquisitionSources"
import type { AuthProfile } from "@/src/types"

function validDatePart(value: number) {
  return value > 0 ? String(value) : ""
}

export function useProfileSetup() {
  const setName = useSignupStore((s) => s.setName)
  const setBirth = useSignupStore((s) => s.setBirth)
  const setGenderStore = useSignupStore((s) => s.setGender)
  const setAcquisitionSourceStore = useSignupStore(
    (s) => s.setAcquisitionSource,
  )
  const setAcquisitionSourceOtherStore = useSignupStore(
    (s) => s.setAcquisitionSourceOther,
  )
  const setReferralCodeStore = useSignupStore((s) => s.setReferralCode)
  const {
    accountState,
    requiresAdditionalInfo,
    completeProfile,
    getProfile,
  } = useAuth()

  const [birthYear, setBirthYear] = useState("")
  const [birthMonth, setBirthMonth] = useState("")
  const [birthDay, setBirthDay] = useState("")
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER" | "">("")
  const [acquisitionSource, setAcquisitionSource] =
    useState<AcquisitionSourceInput>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPrefilling, setIsPrefilling] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [prefillValues, setPrefillValues] = useState<ProfileForm | null>(null)

  const isSocialProfileMode = accountState === "PENDING_PROFILE"
  const isBackfillMode =
    accountState === "ACTIVE" && requiresAdditionalInfo
  const isCompletionMode = isSocialProfileMode || isBackfillMode

  useEffect(() => {
    let cancelled = false

    const prefillProfile = (profile: AuthProfile) => {
      setBirthYear(validDatePart(profile.birthYear))
      setBirthMonth(validDatePart(profile.birthMonth))
      setBirthDay(validDatePart(profile.birthDay))
      setGender(profile.gender ?? "")
      if (profile.acquisitionSource) {
        setAcquisitionSource(profile.acquisitionSource)
      }
      setPrefillValues({
        name: profile.name ?? "",
        acquisitionSourceOther: profile.acquisitionSourceOther ?? "",
        referralCode: "",
      })
    }

    const loadProfile = async () => {
      setIsPrefilling(true)
      setSubmitError("")
      try {
        const profile = await getProfile()
        if (!cancelled) prefillProfile(profile)
      } catch (e: unknown) {
        if (!cancelled) {
          setSubmitError(
            e instanceof Error
              ? e.message
              : "프로필 정보를 불러오지 못했습니다.",
          )
        }
      } finally {
        if (!cancelled) setIsPrefilling(false)
      }
    }

    if (isBackfillMode) {
      loadProfile()
    } else {
      setPrefillValues(null)
    }

    return () => {
      cancelled = true
    }
  }, [getProfile, isBackfillMode])

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

  const handleNext = async (data: ProfileForm) => {
    if (!gender || !acquisitionSource || isSubmitting) return

    const acquisitionSourceOther = data.acquisitionSourceOther.trim()
    const referralCode = data.referralCode.trim()

    setSubmitError("")

    if (isCompletionMode) {
      setIsSubmitting(true)
      try {
        const result = await completeProfile({
          name: data.name.trim(),
          birthYear: Number(birthYear),
          birthMonth: Number(birthMonth),
          birthDay: Number(birthDay),
          gender,
          acquisitionSource,
          acquisitionSourceOther:
            acquisitionSource === "OTHER" ? acquisitionSourceOther : null,
          recommender: referralCode || undefined,
        })
        router.replace(
          getDestinationForAccountState(
            result.accountState,
            result.requiresAdditionalInfo,
          ),
        )
      } catch (e: unknown) {
        if (e instanceof ApiError && e.isNetworkError) {
          showErrorToast(e.message)
        } else {
          setSubmitError(
            e instanceof Error
              ? e.message
              : "필수정보 저장에 실패했습니다.",
          )
        }
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    setName(data.name.trim())
    setBirth(birthYear, birthMonth, birthDay)
    setGenderStore(gender)
    setAcquisitionSourceStore(acquisitionSource)
    setAcquisitionSourceOtherStore(
      acquisitionSource === "OTHER" ? acquisitionSourceOther : "",
    )
    setReferralCodeStore(referralCode)
    router.push("/(auth)/nickname-setup")
  }

  return {
    birthYear,
    birthMonth,
    birthDay,
    gender,
    acquisitionSource,
    isSocialProfileMode,
    isBackfillMode,
    isCompletionMode,
    isPrefilling,
    isSubmitting,
    submitError,
    prefillValues,
    handleYearChange,
    handleMonthChange,
    setBirthDay,
    setGender,
    setAcquisitionSource,
    handleNext,
  }
}
