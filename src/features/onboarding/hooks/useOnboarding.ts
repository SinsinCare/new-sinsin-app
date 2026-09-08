import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { BackHandler } from "react-native"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { onboardingService } from "@/src/services/data/onboardingService"
import { authService } from "@/src/services/auth/authService"
import { useOnboardingStore } from "@/src/stores/onboardingStore"
import { useAuthStore } from "@/src/stores/authStore"
import { useSignupStore } from "@/src/stores/signupStore"
import type { OnboardingStep } from "../types"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { useAnnouncementSessionStore } from "@/src/features/announcement/state/announcementSessionStore"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { presentError, toAnalyticsFailKind } from "@/src/lib/errorMessage"

import { showErrorToast } from "@/src/lib/toast"

type Phase = "welcome" | "steps" | "complete"

/** CKD 흐름의 진단 시기 질문. 여기서 "예방 목적"을 고르면 진단 자체가 없다. */
const DIAGNOSIS_TIMING_STEP = 2
const PREVENTIVE_KEY = "PREVENTIVE"
/**
 * 진단이 없으면 물을 수 없는 질문들 — 진단 연·월, 진단 원인.
 *
 * 9(진단 연·월)는 서버 질문 목록에서 빠졌지만 목록에 **남겨 둔다.** 구버전 서버에
 * 붙으면 그 스텝이 여전히 내려오고, 그때도 예방 목적 사용자에게는 숨겨야 한다.
 * 새 서버에서는 목록에 없으니 이 필터가 그냥 아무 일도 하지 않는다.
 */
const DIAGNOSIS_ONLY_STEPS = [9, 10]

/**
 * 후속 질문(투석·이식)의 답은 **같은 스텝의 selectedKeys 에 함께** 담는다.
 *
 * 별도 스텝도, 별도 저장 슬롯도 만들지 않았다. 그래서 진행률·뒤로가기·복원·제출이
 * 전부 손대지 않은 채 그대로 동작한다. 두 축은 키 접두사로 갈린다.
 */
const FOLLOW_UP_KEY_PREFIX = "KRT_"

function isFollowUpKey(key: string): boolean {
  return key.startsWith(FOLLOW_UP_KEY_PREFIX)
}

function primaryKeyOf(selectedKeys: string[] | undefined): string | undefined {
  return selectedKeys?.find((key) => !isFollowUpKey(key))
}

function followUpKeyOf(selectedKeys: string[] | undefined): string | undefined {
  return selectedKeys?.find(isFollowUpKey)
}

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
          /* 200 인데 0건이다. 오류가 아니라서 어떤 오류 통로도 안 지나가고, 지금까지는
             5xx 와 **같은 한 숫자**였다 — 고칠 대상이 서로 완전히 다른데도. */
          trackAnalyticsEvent("onboarding_steps_load_failed", {
            fail_kind: "empty",
          })
          return
        }
        setLoadedSteps(data)
        setStepsLoadError(null)
        setPhase("steps")
        trackAnalyticsEvent("onboarding_steps_loaded", {
          step_count: data.length,
        })
      } catch (error) {
        // 뒤늦게 도착한 옛 시도의 실패로 화면을 덮지 않는다 — 진단 여부를 바꿔 다시
        // 부르면 앞선 요청은 버려진 요청이고, 사용자가 한 일의 결과가 아니다.
        if (attempt !== loadStepsAttemptRef.current) return
        setLoadedSteps([])
        setPhase("steps")
        /*
          "인터넷 연결을 확인한 뒤…" 를 걷었다. 이 화면은 로그인 직후에 뜨므로 연결이
          끊긴 상태로 여기까지 오기 어렵다 — 실제로 흔한 것은 점검·5xx 다. 원인은
          `resolveError` 가 고르고, 다음 걸음(다시 불러오기 / 진단 여부 다시 선택)은
          화면 아래 두 버튼이 이미 말한다.
        */
        // 취소된 요청이면 빈 문자열이 온다 — 그때는 화면이 자기 폴백 문장을 쓰게 둔다.
        setStepsLoadError(getErrorMessage(error) || null)
        /* 이 갈래도 `presentError` 를 안 부른다 — 화면이 문장 하나와 버튼 둘을 직접
           그린다. 그래서 `app_error_presented` 로 대체되지 않는다. */
        trackAnalyticsEvent("onboarding_steps_load_failed", {
          fail_kind: toAnalyticsFailKind(error),
        })
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
    /* 온보딩 첫 관문의 통과. **선택값(진단 여부)은 싣지 않는다** — 건강 정보이고,
       중립적인 키로 우회하는 것도 같은 우회다. 통과 여부만 센다. */
    trackAnalyticsEvent("onboarding_welcome_confirmed", {})
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

  /*
    진단 여부를 묻는 첫 화면. `onboarding_started` 는 마운트마다 나가지만, 저장된 진행이
    있으면 welcome 을 **건너뛰고** 바로 질문으로 간다(위 initialize) — 그래서 started 를
    welcome 통과율의 분모로 쓰면 복귀자가 섞인다.

    `isInitializing` 가드가 없으면 안 된다: `phase` 의 초기값이 'welcome' 이라 복원 중인
    사람도 한 프레임 동안 여기 있다. 되돌아온 경우(`onboarding_welcome_returned`)에는
    다시 세는 것이 맞다 — 그건 새로 그려진 화면이다.
  */
  const welcomeViewedRef = useRef(false)
  useEffect(() => {
    if (isInitializing) return
    if (phase !== "welcome") {
      welcomeViewedRef.current = false
      return
    }
    if (welcomeViewedRef.current) return
    welcomeViewedRef.current = true
    trackAnalyticsEvent("onboarding_welcome_viewed", {})
  }, [isInitializing, phase])

  useEffect(() => {
    if (phase !== "steps" || isLoadingSteps || !currentStep) return
    const viewKey = `${currentStepIndex}:${steps.length}`
    if (lastViewedStepRef.current === viewKey) return
    lastViewedStepRef.current = viewKey
    trackAnalyticsEvent("onboarding_step_viewed", {
      step_index: currentStepIndex,
      step_count: steps.length,
      // 인덱스는 분기에 따라 같은 번호가 다른 질문을 가리킨다. 유형이라도 있어야
      // "입력형에서만 막힌다" 같은 판정이 된다. 서버 질문번호는 일부러 안 싣는다.
      step_kind: currentStep.type,
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
    const primary = primaryKeyOf(currentAnswer.selectedKeys)
    if (primary === undefined) return false

    // 후속 질문이 필수인 선택지에서는 답이 있어야 넘어간다. 나머지 선택지에서는
    // 기본값이 미리 들어가 있으므로 사실상 바로 통과한다.
    const followUp = currentStep.followUp
    if (followUp?.requiredFor.includes(primary)) {
      return followUpKeyOf(currentAnswer.selectedKeys) !== undefined
    }
    return true
  }, [currentStep, currentAnswer])

  const handleOnlySelect = (key: string) => {
    if (!currentStep) return
    const followUp = currentStep.followUp
    const keys = [key]

    if (followUp) {
      const previous = followUpKeyOf(currentAnswer?.selectedKeys)
      const mustAnswer = followUp.requiredFor.includes(key)
      // 4·5기와 "잘 모르겠어요"에서는 기본값을 끌고 오지 않는다. 앞에서 1기를 고르며
      // 자동으로 붙은 "아니요"가 그대로 따라오면, 정작 투석 여부가 중요한 사람이
      // 질문을 한 번도 보지 않고 통과한다. 단백질 한도가 0.6 과 1.2 로 갈리는 자리다.
      const carried =
        previous !== undefined &&
        !(mustAnswer && previous === followUp.defaultKey)
          ? previous
          : mustAnswer
            ? undefined
            : (followUp.defaultKey ?? undefined)
      if (carried !== undefined) keys.push(carried)
    }

    setAnswer(currentStep.step, {
      step: currentStep.step,
      type: "only",
      selectedKeys: keys,
    })
  }

  const handleFollowUpSelect = (key: string) => {
    if (!currentStep) return
    const primary = primaryKeyOf(currentAnswer?.selectedKeys)
    // 본 질문에 답하기 전에는 후속 질문이 보이지 않으므로 여기 오지 않는다.
    if (primary === undefined) return
    setAnswer(currentStep.step, {
      step: currentStep.step,
      type: "only",
      selectedKeys: [primary, key],
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
      showErrorToast(
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
      /*
        폴백("입력한 내용을 저장하지 못했어요")을 걷었다. 그것이 서버 코드를 이겨서,
        `ONBOARDING_ERROR_001`(빠뜨린 항목)·`002`(목록에 없는 값)·`003`(이미 마침)이
        전부 같은 한 줄로 뭉개졌다. 003 은 특히 재시도해도 영원히 같은 실패라, 카탈로그가
        주는 "홈으로" 버튼이 유일한 출구다.
      */
      presentError(error, {
        scope: "onboarding-submit",
        retry: () => void completeOnboarding(),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (isSubmitting || !hasValidAnswer() || !currentStep) return
    trackAnalyticsEvent("onboarding_step_completed", {
      step_index: currentStepIndex,
      step_count: steps.length,
      step_kind: currentStep.type,
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
      /* 진행이 **초기화되는 유일한 자리**다(아래 `resetProgress`). 첫 질문에서 되돌아온
         것과 실패 화면에서 '진단 다시 선택' 을 누른 것이 여기로 합쳐지는데, 둘 다 앞선
         답을 버린다는 점에서 같은 사건이다. 여기를 왕복하는 사람은 갇힌 사람이다. */
      trackAnalyticsEvent("onboarding_welcome_returned", {})
      loadStepsAttemptRef.current += 1
      setIsLoadingSteps(false)
      setStepsLoadError(null)
      setPhase("welcome")
      setLoadedSteps([])
      resetProgress()
    } else if (currentStepIndex > 0) {
      /* 순번 퍼널(같은 이름 8회)은 뒤로 갔다 다시 완료하면 순번이 밀리는 **상한
         추정치**다. 그 오차의 크기를 재는 것이 이 수의 유일한 쓸모다. */
      trackAnalyticsEvent("onboarding_step_reverted", {
        step_index: currentStepIndex,
        step_count: steps.length,
      })
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
    /*
      갓 가입한 사람의 **첫 홈 화면은 공지 팝업으로 덮지 않는다.**

      온보딩을 막 끝낸 사람에게 앱의 첫인상은 홈이어야 하는데, 공지 팝업이 그 자리를
      가로챘다. 아직 앱이 뭘 하는 곳인지도 모르는 상태에서 맥락 없는 전면 이미지 모달이
      뜨니 "무섭다" 는 피드백이 나왔다. 공지가 나쁜 게 아니라 **순서가 틀렸다.**

      이번 세션만 체크한 것으로 표시한다 — 앱을 다시 켜면(= 새 세션) 정상적으로 뜬다.
      공지를 영구히 숨기는 것이 아니라 첫 인사보다 뒤로 미루는 것이다.
    */
    useAnnouncementSessionStore.getState().markChecked()
    router.replace("/(tabs)/home")
  }, [resetSignup])

  // Android 하드웨어 백 버튼: 온보딩 중 앱 종료 방지
  useEffect(() => {
    const onBackPress = () => {
      if (phase === "welcome" || phase === "complete") {
        return true // welcome/complete에서는 뒤로 가기 차단 (앱 종료 방지)
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
    handleFollowUpSelect,
    handleMultiToggle,
    handleInputChange,
    handleNext,
    handleBack,
    handleCompletionStart,
  }
}
