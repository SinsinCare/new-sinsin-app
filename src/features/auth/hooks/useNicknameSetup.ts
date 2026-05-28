import { useState } from "react"
import { router } from "expo-router"
import { nicknameService, authService, api } from "@/src/services"
import { useSignupStore, useAuthStore } from "@/src/stores"
import { ApiError } from "@/src/services/core/apiError"
import { showErrorToast } from "@/src/lib/toast"
import type { NicknameForm } from "../types"

export function useNicknameSetup() {
  const signupState = useSignupStore()
  const setUser = useAuthStore((s) => s.setUser)
  const setAccountState = useAuthStore((s) => s.setAccountState)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (data: NicknameForm) => {
    setIsLoading(true)
    setError("")
    try {
      const available = await nicknameService.checkNicknameAvailability(
        data.nickname,
      )
      if (!available) {
        setError("이미 사용 중인 닉네임입니다.")
        return
      }

      const user = await authService.signup({
        signupToken: signupState.signupToken,
        termsOfServiceAgree: signupState.termsOfServiceAgree,
        privacyPolicyAgree: signupState.privacyPolicyAgree,
        marketingAgree: signupState.marketingAgree,
        password: signupState.password,
        name: signupState.name,
        birthYear: Number(signupState.birthYear),
        birthMonth: Number(signupState.birthMonth),
        birthDay: Number(signupState.birthDay),
        recommender: signupState.referralCode,
        nickName: data.nickname,
      })

      setUser(user)
      setAccountState("PENDING_ONBOARDING")

      if (signupState.gender) {
        try {
          await api.patch("/user/profile", {
            nickName: data.nickname,
            name: signupState.name,
            gender: signupState.gender,
          })
        } catch {
          // 성별 저장 실패는 무시 — 계정 생성은 이미 완료됨
        }
      }
      signupState.setNickname(data.nickname)
      router.replace("/(auth)/signup-complete")
    } catch (e: unknown) {
      if (e instanceof ApiError && e.isNetworkError) {
        showErrorToast(e.message)
      } else {
        setError(e instanceof Error ? e.message : "회원가입에 실패했습니다.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return { isLoading, error, handleSubmit }
}
