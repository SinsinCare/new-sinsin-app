import { useEffect, useState, useCallback } from "react"
import { Alert, BackHandler } from "react-native"
import { router } from "expo-router"
import { onboardingService } from "@/src/services/data/onboardingService"
import { useOnboardingStore } from "@/src/stores/onboardingStore"
import { useAuthStore } from "@/src/stores/authStore"
import type { OnboardingStep } from "../types"

type Phase = "welcome" | "steps"

export function useOnboarding() {
  const [phase, setPhase] = useState<Phase>("welcome")
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  // hydration 완료 전까지 로딩 화면을 보여주기 위해 true로 시작
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // persist hydration 상태 추적
  const [isStoreHydrated, setIsStoreHydrated] = useState(() =>
    useOnboardingStore.persist.hasHydrated(),
  )

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

  // AsyncStorage hydration 완료 대기
  useEffect(() => {
    if (isStoreHydrated) return
    const unsub = useOnboardingStore.persist.onFinishHydration(() => {
      setIsStoreHydrated(true)
    })
    return unsub
  }, [isStoreHydrated])

  useEffect(() => {
    setOnboardingInProgress(true)
    return () => {
      setOnboardingInProgress(false)
    }
  }, [setOnboardingInProgress])

  const loadSteps = useCallback(async (isCkd: boolean) => {
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
  }, [])

  // hydration 완료 후 저장된 진행 상태 복원
  useEffect(() => {
    if (!isStoreHydrated) return

    if (hasCkd !== null) {
      // 이전 진행 데이터가 있으면 해당 스텝으로 자동 복원
      loadSteps(hasCkd)
    } else {
      // 처음 시작이면 welcome 화면 표시
      setIsLoading(false)
    }
    // hasCkd 변화에 반응하지 않도록 hydration 시점에만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStoreHydrated])

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
      return currentStep.values.every((v) => {
        const raw = vals[v.key]?.trim()
        if (!raw) return false
        if (v.type === "number") {
          const num = parseFloat(raw)
          return !isNaN(num) && num > 0
        }
        return true
      })
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
    if (!user || hasCkd === null) {
      Alert.alert("오류", "온보딩을 완료할 수 없습니다. 다시 시도해주세요.")
      return
    }
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

  const handleBack = useCallback(() => {
    if (phase === "steps" && currentStepIndex === 0) {
      setPhase("welcome")
      setSteps([])
      resetOnboarding()
    } else if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }, [phase, currentStepIndex, resetOnboarding, setCurrentStepIndex])

  // Android 하드웨어 백 버튼: 온보딩 중 앱 종료 방지
  useEffect(() => {
    const onBackPress = () => {
      if (phase === "welcome") {
        return true // welcome에서는 뒤로 가기 차단 (앱 종료 방지)
      }
      handleBack()
      return true
    }
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress)
    return () => sub.remove()
  }, [phase, handleBack])

  const handleSkip = async () => {
    if (!user) return
    setIsSubmitting(true)
    try {
      await onboardingService.skipOnboarding()
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
