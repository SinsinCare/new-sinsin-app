import { useEffect, useState, useCallback, useRef } from "react"
import { Alert, BackHandler } from "react-native"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { onboardingService } from "@/src/services/data/onboardingService"
import { authService } from "@/src/services/auth/authService"
import { useOnboardingStore } from "@/src/stores/onboardingStore"
import { useAuthStore } from "@/src/stores/authStore"
import { useSignupStore } from "@/src/stores/signupStore"
import type { OnboardingStep } from "../types"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { getErrorMessage } from "@/src/lib/errorUtils"

type Phase = "welcome" | "steps" | "complete"

export function useOnboarding() {
  const { t } = useTranslation("auth")
  const [phase, setPhase] = useState<Phase>("welcome")
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  // 저장 상태 복원 중에는 전체 로딩을, 환자 선택 후 질문을 가져오는 동안에는
  // 현재 welcome 화면과 CTA 로딩을 유지한다.
  const [isInitializing, setIsInitializing] = useState(true)
  const [isLoadingSteps, setIsLoadingSteps] = useState(false)
  const [stepsLoadError, setStepsLoadError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const loadStepsAttemptRef = useRef(0)
  const lastViewedStepRef = useRef<string | null>(null)
  const completionViewedRef = useRef(false)

  // persist hydration 상태 추적
  const [isStoreHydrated, setIsStoreHydrated] = useState(() =>
    useOnboardingStore.persist.hasHydrated(),
  )

  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const setAccountState = useAuthStore((s) => s.setAccountState)
  const setRequiresAdditionalInfo = useAuthStore(
    (s) => s.setRequiresAdditionalInfo,
  )
  const setEntryGate = useAuthStore((s) => s.setEntryGate)
  const setSessionPersistence = useAuthStore((s) => s.setSessionPersistence)
  const resetSignup = useSignupStore((s) => s.reset)
  const {
    hasCkd,
    currentStepIndex,
    answers,
    prepareForUser,
    setHasCkd,
    setCurrentStepIndex,
    setAnswer,
    getAnswersArray,
    setOnboardingInProgress,
    resetProgress,
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
    trackAnalyticsEvent("onboarding_started", {})
    setOnboardingInProgress(true)
    return () => {
      setOnboardingInProgress(false)
    }
  }, [setOnboardingInProgress])

  const loadSteps = useCallback(
    async (isCkd: boolean) => {
      const attempt = ++loadStepsAttemptRef.current
      setIsLoadingSteps(true)
      try {
        const data = await onboardingService.getSteps(isCkd)
        if (attempt !== loadStepsAttemptRef.current) return
        if (data.length === 0) {
          setSteps([])
          setPhase("steps")
          setStepsLoadError(t("onboarding.noQuestions"))
          trackAnalyticsEvent("onboarding_steps_load_failed", {})
          return
        }
        setSteps(data)
        setStepsLoadError(null)
        setPhase("steps")
        trackAnalyticsEvent("onboarding_steps_loaded", {
          step_count: data.length,
        })
      } catch {
        if (attempt !== loadStepsAttemptRef.current) return
        setSteps([])
        setPhase("steps")
        setStepsLoadError(t("onboarding.loadFailed"))
        trackAnalyticsEvent("onboarding_steps_load_failed", {})
      } finally {
        if (attempt === loadStepsAttemptRef.current) {
          setIsLoadingSteps(false)
        }
      }
    },
    [t],
  )

  // hydration 완료 후 현재 사용자에게 속한 진행 상태만 복원
  useEffect(() => {
    if (!isStoreHydrated || !user) return

    const canResume = prepareForUser(user.uid)

    const initialize = async () => {
      if (canResume && hasCkd !== null) {
        // 동일 사용자의 이전 진행 데이터가 있으면 해당 스텝으로 복원
        await loadSteps(hasCkd)
      } else {
        // 신규 사용자이거나 소유자가 없는 기존 데이터면 진단 화면부터 시작
        setPhase("welcome")
        setSteps([])
      }
      setIsInitializing(false)
    }

    void initialize()
    // hasCkd 변화에는 반응하지 않고 사용자/스토리지 준비 시점에만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStoreHydrated, user?.uid])

  const handleWelcomeSelect = (isCkd: boolean) => {
    setHasCkd(isCkd)
  }

  const handleWelcomeConfirm = () => {
    if (hasCkd === null || isLoadingSteps) return
    void loadSteps(hasCkd)
  }

  const retrySteps = useCallback(() => {
    if (hasCkd === null || isLoadingSteps) return
    void loadSteps(hasCkd)
  }, [hasCkd, isLoadingSteps, loadSteps])

  const currentStep = steps[currentStepIndex]
  const isLastStep = currentStepIndex === steps.length - 1
  const currentAnswer = currentStep ? answers[currentStep.step] : undefined

  useEffect(() => {
    if (phase !== "steps" || isLoadingSteps || !currentStep) return
    const viewKey = `${currentStepIndex}:${steps.length}`
    if (lastViewedStepRef.current === viewKey) return
    lastViewedStepRef.current = viewKey
    trackAnalyticsEvent("onboarding_step_viewed", {
      step_index: currentStepIndex,
      step_count: steps.length,
    })
  }, [currentStep, currentStepIndex, isLoadingSteps, phase, steps.length])

  useEffect(() => {
    if (phase !== "complete" || completionViewedRef.current) return
    completionViewedRef.current = true
    trackAnalyticsEvent("onboarding_completion_viewed", {})
  }, [phase])

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
      Alert.alert(
        t("onboarding.saveFailedTitle"),
        t("onboarding.loginRequired"),
      )
      return
    }
    setIsSubmitting(true)
    try {
      await onboardingService.submitAnswers(hasCkd, getAnswersArray())
      const promotedSession = await authService.promoteSession()
      trackAnalyticsEvent("onboarding_submitted", {})
      setUser(promotedSession.user)
      setAccountState(promotedSession.accountState)
      setRequiresAdditionalInfo(promotedSession.requiresAdditionalInfo)
      setEntryGate(promotedSession.entryGate ?? "HOME")
      setSessionPersistence(promotedSession.sessionPersistence ?? "persistent")
      resetOnboarding()
      setPhase("complete")
    } catch (error) {
      trackAnalyticsEvent("onboarding_submit_failed", {})
      Alert.alert(
        t("onboarding.saveFailedTitle"),
        getErrorMessage(error, t("onboarding.saveFailed")),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (isSubmitting || !hasValidAnswer()) return
    trackAnalyticsEvent("onboarding_step_completed", {
      step_index: currentStepIndex,
      step_count: steps.length,
    })
    if (isLastStep) {
      completeOnboarding()
    } else {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  const handleBack = useCallback(() => {
    if (phase === "complete") return
    if (phase === "steps" && (steps.length === 0 || currentStepIndex === 0)) {
      loadStepsAttemptRef.current += 1
      setIsLoadingSteps(false)
      setStepsLoadError(null)
      setPhase("welcome")
      setSteps([])
      resetProgress()
    } else if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }, [
    phase,
    steps.length,
    currentStepIndex,
    resetProgress,
    setCurrentStepIndex,
  ])

  const handleCompletionStart = useCallback(() => {
    trackAnalyticsEvent("onboarding_completion_cta_pressed", {})
    resetSignup()
    router.replace("/(tabs)/home")
  }, [resetSignup])

  // Android 하드웨어 백 버튼: 온보딩 중 앱 종료 방지
  useEffect(() => {
    const onBackPress = () => {
      if (phase === "welcome" || phase === "complete") {
        return true // welcome에서는 뒤로 가기 차단 (앱 종료 방지)
      }
      handleBack()
      return true
    }
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress)
    return () => sub.remove()
  }, [phase, handleBack])

  return {
    phase,
    hasCkd,
    steps,
    currentStep,
    currentStepIndex,
    currentAnswer,
    isInitializing,
    isLoadingSteps,
    stepsLoadError,
    isSubmitting,
    isLastStep,
    hasValidAnswer,
    handleWelcomeSelect,
    handleWelcomeConfirm,
    retrySteps,
    handleOnlySelect,
    handleMultiToggle,
    handleInputChange,
    handleNext,
    handleBack,
    handleCompletionStart,
  }
}
