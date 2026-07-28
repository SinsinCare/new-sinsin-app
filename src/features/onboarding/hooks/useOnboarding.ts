import { useEffect, useState, useCallback, useRef } from "react"
import { Alert, BackHandler } from "react-native"
import { router } from "expo-router"
import { onboardingService } from "@/src/services/data/onboardingService"
import { authService } from "@/src/services/auth/authService"
import { useOnboardingStore } from "@/src/stores/onboardingStore"
import { useAuthStore } from "@/src/stores/authStore"
import { useSignupStore } from "@/src/stores/signupStore"
import type { OnboardingStep } from "../types"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { resolveOnboardingStepIndex } from "../data/onboardingStepRecovery"
import {
  canNavigateOnboardingBack,
  isValidPositiveDecimal,
} from "../data/onboardingValidation"

type Phase = "welcome" | "steps"

export function useOnboarding() {
  const [phase, setPhase] = useState<Phase>("welcome")
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  // 저장 상태 복원 중에는 전체 로딩을, 환자 선택 후 질문을 가져오는 동안에는
  // 현재 welcome 화면과 CTA 로딩을 유지한다.
  const [isInitializing, setIsInitializing] = useState(true)
  const [isLoadingSteps, setIsLoadingSteps] = useState(false)
  const [hasQuestionLoadError, setHasQuestionLoadError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSkipping, setIsSkipping] = useState(false)
  const lastViewedStepRef = useRef<string | null>(null)
  const skipInFlightRef = useRef(false)

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

  const showQuestionLoadError = useCallback(() => {
    setSteps([])
    setPhase("welcome")
    setHasQuestionLoadError(true)
    trackAnalyticsEvent("onboarding_steps_load_failed", {})
  }, [])

  const loadSteps = useCallback(
    async (isCkd: boolean) => {
      setIsLoadingSteps(true)
      setHasQuestionLoadError(false)
      try {
        const data = await onboardingService.getSteps(isCkd)
        const recoveredStepIndex = resolveOnboardingStepIndex(
          currentStepIndex,
          data.length,
        )

        if (recoveredStepIndex === null) {
          showQuestionLoadError()
          return
        }

        if (recoveredStepIndex !== currentStepIndex) {
          setCurrentStepIndex(recoveredStepIndex)
        }

        setSteps(data)
        setPhase("steps")
        trackAnalyticsEvent("onboarding_steps_loaded", {
          step_count: data.length,
        })
      } catch {
        showQuestionLoadError()
      } finally {
        setIsLoadingSteps(false)
      }
    },
    [currentStepIndex, setCurrentStepIndex, showQuestionLoadError],
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

  const handleQuestionLoadRetry = () => {
    if (hasCkd === null || isLoadingSteps) return
    void loadSteps(hasCkd)
  }

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

  const hasValidAnswer = useCallback(() => {
    if (!currentStep) return false
    if (!currentAnswer) return false
    if (currentStep.type === "input") {
      const vals = currentAnswer.inputValues ?? {}
      return currentStep.values.every((v) => {
        const raw = vals[v.key]?.trim()
        if (!raw) return false
        if (v.type === "number") {
          return isValidPositiveDecimal(raw)
        }
        return true
      })
    }
    return (currentAnswer.selectedKeys?.length ?? 0) > 0
  }, [currentStep, currentAnswer])

  const handleOptionSelectionConfirm = (
    type: OnboardingStep["type"],
    selectedKeys: string[],
  ) => {
    if (!currentStep || type === "input") return
    setAnswer(currentStep.step, {
      step: currentStep.step,
      type,
      selectedKeys,
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
      const promotedSession = await authService.promoteSession()
      trackAnalyticsEvent("onboarding_submitted", {})
      setUser(promotedSession.user)
      setAccountState(promotedSession.accountState)
      setRequiresAdditionalInfo(promotedSession.requiresAdditionalInfo)
      setEntryGate(promotedSession.entryGate ?? "HOME")
      setSessionPersistence(promotedSession.sessionPersistence ?? "persistent")
      resetOnboarding()
      resetSignup()
      router.replace("/(tabs)/home")
    } catch (error) {
      trackAnalyticsEvent("onboarding_submit_failed", {})
      Alert.alert(
        "오류",
        error instanceof Error
          ? error.message
          : "온보딩을 완료할 수 없습니다. 다시 시도해주세요.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (isSubmitting || isSkipping || !hasValidAnswer()) return
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
    if (!canNavigateOnboardingBack(isSubmitting || isSkipping)) {
      return
    }
    if (phase === "steps" && currentStepIndex === 0) {
      setPhase("welcome")
      setSteps([])
      resetProgress()
    } else if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }, [
    phase,
    isSubmitting,
    isSkipping,
    currentStepIndex,
    resetProgress,
    setCurrentStepIndex,
  ])

  const completeSkip = useCallback(async () => {
    if (!user || skipInFlightRef.current) return
    skipInFlightRef.current = true
    setIsSkipping(true)
    try {
      await onboardingService.skipOnboarding()
      const promotedSession = await authService.promoteSession()
      setUser(promotedSession.user)
      setAccountState(promotedSession.accountState)
      setRequiresAdditionalInfo(promotedSession.requiresAdditionalInfo)
      setEntryGate(promotedSession.entryGate ?? "HOME")
      setSessionPersistence(promotedSession.sessionPersistence ?? "persistent")
      resetOnboarding()
      resetSignup()
      trackAnalyticsEvent("onboarding_skipped", {})
      router.replace("/(tabs)/home")
    } catch (error) {
      trackAnalyticsEvent("onboarding_skip_failed", {})
      Alert.alert(
        "오류",
        error instanceof Error
          ? error.message
          : "온보딩을 건너뛸 수 없습니다. 다시 시도해주세요.",
      )
    } finally {
      skipInFlightRef.current = false
      setIsSkipping(false)
    }
  }, [
    resetOnboarding,
    resetSignup,
    setAccountState,
    setEntryGate,
    setRequiresAdditionalInfo,
    setSessionPersistence,
    setUser,
    user,
  ])

  const handleSkip = useCallback(() => {
    if (isSubmitting || isSkipping || skipInFlightRef.current) return
    trackAnalyticsEvent("onboarding_skip_confirmation_viewed", {})
    Alert.alert(
      "온보딩을 건너뛸까요?",
      "나중에 내 정보에서 입력할 수 있어요.",
      [
        { text: "계속 입력하기", style: "cancel" },
        {
          text: "건너뛰기",
          style: "destructive",
          onPress: () => void completeSkip(),
        },
      ],
    )
  }, [completeSkip, isSkipping, isSubmitting])

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

  return {
    phase,
    hasCkd,
    steps,
    currentStep,
    currentStepIndex,
    currentAnswer,
    isInitializing,
    isLoadingSteps,
    hasQuestionLoadError,
    isSubmitting,
    isSkipping,
    isLastStep,
    hasValidAnswer,
    handleWelcomeSelect,
    handleWelcomeConfirm,
    handleQuestionLoadRetry,
    handleOptionSelectionConfirm,
    handleInputChange,
    handleNext,
    handleBack,
    handleSkip,
  }
}
