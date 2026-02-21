import { useEffect, useState, useCallback } from "react"
import { Alert } from "react-native"
import { router } from "expo-router"
import { onboardingService } from "@/src/services/data/onboardingService"
import { useOnboardingStore } from "@/src/stores/onboardingStore"
import { useAuthStore } from "@/src/stores/authStore"
import type { OnboardingStep } from "../types"

type Phase = "welcome" | "steps"

export function useOnboarding() {
  const [phase, setPhase] = useState<Phase>("welcome")
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const user = useAuthStore((s) => s.user)
  const setAccountState = useAuthStore((s) => s.setAccountState)
  const {
    hasCkd,
    currentStepIndex,
    answers,
    setHasCkd,
    setCurrentStepIndex,
    setAnswer,
    getAnswersArray,
    setOnboardingInProgress,
    reset: resetOnboarding,
  } = useOnboardingStore()

  useEffect(() => {
    setOnboardingInProgress(true)
    return () => {
      setOnboardingInProgress(false)
    }
  }, [setOnboardingInProgress])

  const loadSteps = async (isCkd: boolean) => {
    setIsLoading(true)
    try {
      const data = await onboardingService.getSteps(isCkd)
      setSteps(data)
      setPhase("steps")
    } catch {
      Alert.alert("오류", "온보딩 데이터를 불러올 수 없습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleWelcomeSelect = (isCkd: boolean) => {
    setHasCkd(isCkd)
  }

  const handleWelcomeConfirm = () => {
    if (hasCkd === null) return
    loadSteps(hasCkd)
  }

  const currentStep = steps[currentStepIndex]
  const isLastStep = currentStepIndex === steps.length - 1
  const currentAnswer = currentStep ? answers[currentStep.step] : undefined

  const hasValidAnswer = useCallback(() => {
    if (!currentStep) return false
    if (!currentAnswer) return false
    if (currentStep.type === "input") {
      const vals = currentAnswer.inputValues ?? {}
      return currentStep.values.every((v) => !!vals[v.key]?.trim())
    }
    return (currentAnswer.selectedKeys?.length ?? 0) > 0
  }, [currentStep, currentAnswer])

  const handleOnlySelect = (key: string) => {
    if (!currentStep) return
    setAnswer(currentStep.step, {
      step: currentStep.step,
      type: "only",
      selectedKeys: [key],
    })
  }

  const handleMultiToggle = (key: string) => {
    if (!currentStep) return
    const current = currentAnswer?.selectedKeys ?? []
    const updated = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key]
    setAnswer(currentStep.step, {
      step: currentStep.step,
      type: "multi",
      selectedKeys: updated,
    })
  }

  const handleInputChange = (key: string, text: string) => {
    if (!currentStep) return
    const existing = currentAnswer?.inputValues ?? {}
    setAnswer(currentStep.step, {
      step: currentStep.step,
      type: "input",
      inputValues: { ...existing, [key]: text },
    })
  }

  const completeOnboarding = async () => {
    if (!user || hasCkd === null) return
    setIsSubmitting(true)
    try {
      await onboardingService.submitAnswers(hasCkd, getAnswersArray())
      setAccountState("ACTIVE")
      resetOnboarding()
      router.replace("/(tabs)/home")
    } catch {
      Alert.alert("오류", "온보딩을 완료할 수 없습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (isLastStep) {
      completeOnboarding()
    } else {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  const handleBack = () => {
    if (phase === "steps" && currentStepIndex === 0) {
      setPhase("welcome")
      setSteps([])
      setHasCkd(null)
    } else if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const handleSkip = async () => {
    if (!user) return
    setIsSubmitting(true)
    try {
      setAccountState("ACTIVE")
      resetOnboarding()
      router.replace("/(tabs)/home")
    } catch {
      Alert.alert("오류", "처리 중 문제가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    phase,
    hasCkd,
    steps,
    currentStep,
    currentStepIndex,
    currentAnswer,
    isLoading,
    isSubmitting,
    isLastStep,
    hasValidAnswer,
    handleWelcomeSelect,
    handleWelcomeConfirm,
    handleOnlySelect,
    handleMultiToggle,
    handleInputChange,
    handleNext,
    handleBack,
    handleSkip,
  }
}
