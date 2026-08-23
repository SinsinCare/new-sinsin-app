import { router } from "expo-router"
import { useSignupStore } from "@/src/stores"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import type { PasswordForm } from "../types"

export function useSignupPassword() {
  const setPassword = useSignupStore((s) => s.setPassword)
  const setSignupInProgress = useSignupStore((s) => s.setSignupInProgress)

  const handleNext = (data: PasswordForm) => {
    /* 이 화면의 **유일한 성공 축**이다. CTA 가 규칙 미달이면 계속 disabled 라
       "눌렀는데 안 됐다" 는 사건 자체가 없고, 진입(`auth_signup_step_viewed`
       `{step:'password'}`)만으로는 '들어왔는데 못 나간 사람' 을 셀 수 없었다.
       비밀번호 **값**은 어디에도 싣지 않는다 — 속성이 아예 없다. */
    trackAnalyticsEvent("auth_signup_password_submitted", {})
    setPassword(data.password)
    setSignupInProgress(true)
    router.replace("/(auth)/profile-setup")
  }

  return { handleNext }
}
