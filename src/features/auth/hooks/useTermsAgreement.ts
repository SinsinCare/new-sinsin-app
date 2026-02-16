import { useState, useCallback } from "react"
import { router } from "expo-router"
import { useSignupStore } from "@/src/stores"
import { TERMS } from "../data/terms"

export function useTermsAgreement() {
  const [agreed, setAgreed] = useState<Record<string, boolean>>({})
  const { setTermsOfServiceAgree, setPrivacyPolicyAgree, setMarketingAgree } =
    useSignupStore()

  const allChecked = TERMS.every((t) => agreed[t.id])
  const requiredChecked = TERMS.filter((t) => t.required).every(
    (t) => agreed[t.id],
  )

  const toggleAll = useCallback(() => {
    if (allChecked) {
      setAgreed({})
    } else {
      const next: Record<string, boolean> = {}
      TERMS.forEach((t) => {
        next[t.id] = true
      })
      setAgreed(next)
    }
  }, [allChecked])

  const toggleItem = useCallback((id: string) => {
    setAgreed((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const handleNext = () => {
    setTermsOfServiceAgree(!!agreed["service"])
    setPrivacyPolicyAgree(!!agreed["privacy"])
    setMarketingAgree(!!agreed["marketing"])
    router.push("/(auth)/signup-email")
  }

  return {
    terms: TERMS,
    agreed,
    allChecked,
    requiredChecked,
    toggleAll,
    toggleItem,
    handleNext,
  }
}
