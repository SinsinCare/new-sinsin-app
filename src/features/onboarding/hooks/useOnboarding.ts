import { useEffect, useState, useCallback, useMemo, useRef } from "react"
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

/** CKD 흐름의 진단 시기 질문. 여기서 "예방 목적"을 고르면 진단 자체가 없다. */
const DIAGNOSIS_TIMING_STEP = 2
const PREVENTIVE_KEY = "PREVENTIVE"
/** 진단이 없으면 물을 수 없는 질문들 — 진단 연·월, 진단 원인. */
const DIAGNOSIS_ONLY_STEPS = [9, 10]

/**
 * 진단받은 적 없는 사용자에게 "언제 진단받았는지"와 "원인이 무엇인지"를 묻지 않는다.
 * 답을 지우지는 않는다 — 뒤로 가서 다시 고르면 그대로 살아난다. 대신 제출할 때
 * 보이지 않는 스텝의 답은 빼서, 경로를 바꾼 흔적이 저장되지 않게 한다.
 */
function visibleStepsFor(
  steps: OnboardingStep[],
  answers: Record<number, { selectedKeys?: string[] }>,
): OnboardingStep[] {
  const preventive =
    answers[DIAGNOSIS_TIMING_STEP]?.selectedKeys?.includes(PREVENTIVE_KEY)
  if (!preventive) return steps
  return steps.filter((step) => !DIAGNOSIS_ONLY_STEPS.includes(step.step))
}

export function useOnboarding() {
  const { t } = useTranslation("auth")
  const [phase, setPhase] = useState<Phase>("welcome")
  const [loadedSteps, setLoadedSteps] = useState<OnboardingStep[]>([])
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
          setLoadedSteps([])
          setPhase("steps")
          setStepsLoadError(t("onboarding.noQuestions"))
          trackAnalyticsEvent("onboarding_steps_load_failed", {})
          return
        }
        setLoadedSteps(data)
        setStepsLoadError(null)
        setPhase("steps")
        trackAnalyticsEvent("onboarding_steps_loaded", {
          step_count: data.length,
        })
      } catch {
        if (attempt !== loadStepsAttemptRef.current) return
        setLoadedSteps([])
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
        setLoadedSteps([])
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

  // 화면에 실제로 보여줄 목록. 앞선 답에 따라 줄어들 수 있으므로 `loadedSteps` 대신
  // 이걸 기준으로 인덱스·진행률·마지막 스텝 판정을 한다.
  const steps = useMemo(
    () => visibleStepsFor(loadedSteps, answers),
    [loadedSteps, answers],
  )

  // 목록이 줄어드는 경우(앞 답을 바꿔 스텝이 빠지거나, 복원한 인덱스가 서버 질문 수보다
  // 큰 경우)를 막는다. 범위를 벗어난 인덱스는 화면이 빈 스텝을 그리다 터진다.
  useEffect(() => {
    if (steps.length === 0) return
    if (currentStepIndex > steps.length - 1) {
      setCurrentStepIndex(steps.length - 1)
    }
  }, [steps.length, currentStepIndex, setCurrentStepIndex])

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
    // 진단 연·월은 선택 입력이다 — 기억나지 않는 사람을 여기서 붙잡지 않는다.
    if (currentStep.type === "date") return true
    if (!currentAnswer) return false
    if (currentStep.type === "input") {
      const vals = currentAnswer.inputValues ?? {}
      return currentStep.values.every((v) => {
        const raw = vals[v.key]?.trim()
        // 선택 필드(키)는 비워 둔 채 넘어갈 수 있다. 값을 넣었다면 형식은 따진다.
        if (!raw) return v.required === false
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

  // input 과 date 가 같이 쓴다 — 둘 다 key→문자열 한 벌로 저장하고 제출도 같은 모양이다.
  const handleInputChange = (key: string, text: string) => {
    if (!currentStep) return
    const existing = currentAnswer?.inputValues ?? {}
    setAnswer(currentStep.step, {
      step: currentStep.step,
      type: currentStep.type === "date" ? "date" : "input",
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
      // 화면에서 사라진 스텝의 답은 보내지 않는다. 진단 시기를 "예방 목적"으로 바꾸기
      // 전에 골라 둔 진단 연·월이 그대로 저장되면, 진단받은 적 없는 사람에게 진단일이
      // 생긴다.
      const visibleStepNumbers = new Set(steps.map((step) => step.step))
      await onboardingService.submitAnswers(
        hasCkd,
        getAnswersArray().filter((answer) =>
          visibleStepNumbers.has(answer.step),
        ),
      )
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
      setLoadedSteps([])
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
