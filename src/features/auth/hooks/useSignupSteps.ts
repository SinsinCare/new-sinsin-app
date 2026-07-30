import { useCallback, useEffect, useRef, useState } from "react"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { authService, nicknameService } from "@/src/services"
import { useAuthStore, useSignupStore } from "@/src/stores"
import { useAuth } from "@/src/hooks"
import { ApiError } from "@/src/services/core/apiError"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { showErrorToast } from "@/src/lib/toast"
import {
  identifyAnalyticsUser,
  trackAnalyticsEvent,
} from "@/src/features/analytics"
import { getDestinationForAccountState } from "../utils/accountStateRoute"
import { isProfileSetupCompletionMode } from "../utils/profileSetupMode"
import {
  EMPTY_SIGNUP_DRAFT,
  SIGNUP_STEP_IDS,
  buildSignupDraftFromProfile,
  buildSignupProfilePayload,
  getSignupStepProgress,
  shouldVerifyNicknameAvailability,
  validateSignupStep,
  type SignupDraft,
} from "../data/signupSteps"

/** 전환 방향. 앞으로 갈 때와 뒤로 갈 때 화면이 반대로 흘러야 위치 감각이 산다. */
export type SignupStepDirection = "forward" | "backward"

/**
 * 회원가입 스텝 상태머신.
 *
 * 한 라우트(`/(auth)/profile-setup`) 안에서 여섯 질문을 순서대로 넘긴다.
 * 예전에는 profile-setup(5개 필드 한 폼) → nickname-setup(별도 라우트)으로 갈렸는데,
 * 그러면 뒤로가기 한 번에 입력이 통째로 날아가고 어느 필드가 문제인지도 흐렸다.
 *
 * 제출 경로는 둘이다.
 *  - 이메일 가입: 마지막 스텝에서 `POST /auth/signup` (스토어의 약관·비밀번호와 합친다)
 *  - 소셜 가입·추가정보 backfill: `POST /user/profile/complete`
 */
export function useSignupSteps() {
  const { t } = useTranslation("auth")
  const signupStore = useSignupStore()
  const setNicknameStore = useSignupStore((s) => s.setNickname)
  const setUser = useAuthStore((s) => s.setUser)
  const setAccountState = useAuthStore((s) => s.setAccountState)
  const setRequiresAdditionalInfo = useAuthStore(
    (s) => s.setRequiresAdditionalInfo,
  )
  const setEntryGate = useAuthStore((s) => s.setEntryGate)
  const setSessionPersistence = useAuthStore((s) => s.setSessionPersistence)
  const {
    accountState,
    entryGate,
    sessionPersistence,
    requiresAdditionalInfo,
    completeProfile,
    getProfile,
  } = useAuth()

  const [draft, setDraft] = useState<SignupDraft>(EMPTY_SIGNUP_DRAFT)
  const [stepIndex, setStepIndex] = useState(0)
  const [direction, setDirection] = useState<SignupStepDirection>("forward")
  const [stepError, setStepError] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPrefilling, setIsPrefilling] = useState(false)
  const initialNickname = useRef("")

  const isBackfillMode = accountState === "ACTIVE" && requiresAdditionalInfo
  const isCompletionMode = isProfileSetupCompletionMode({
    accountState,
    entryGate,
    sessionPersistence,
    requiresAdditionalInfo,
  })

  const step = SIGNUP_STEP_IDS[stepIndex]
  const isLastStep = stepIndex === SIGNUP_STEP_IDS.length - 1
  const validity = validateSignupStep(step, draft)

  useEffect(() => {
    // 라우트가 하나라 화면 전환으로는 스텝을 못 센다. 여기서 직접 찍어야
    // 여섯 질문 중 어디서 이탈하는지 퍼널에 남는다.
    trackAnalyticsEvent("auth_signup_step_viewed", { step })
  }, [step])

  // 이미 가입한 계정이 빠진 정보를 채우러 들어온 경우에만 서버 값을 당겨온다.
  useEffect(() => {
    if (!isBackfillMode) return
    let cancelled = false

    const loadProfile = async () => {
      setIsPrefilling(true)
      setSubmitError("")
      try {
        const profile = await getProfile()
        if (cancelled) return
        initialNickname.current = profile.nickName ?? ""
        setDraft(buildSignupDraftFromProfile(profile))
      } catch (e: unknown) {
        if (cancelled) return
        setSubmitError(getErrorMessage(e, t("profile.loadFailed")))
      } finally {
        if (!cancelled) setIsPrefilling(false)
      }
    }

    void loadProfile()
    return () => {
      cancelled = true
    }
  }, [getProfile, isBackfillMode, t])

  const updateDraft = useCallback((patch: Partial<SignupDraft>) => {
    setStepError("")
    setSubmitError("")
    setDraft((prev) => ({ ...prev, ...patch }))
  }, [])

  const submit = useCallback(async () => {
    const payload = buildSignupProfilePayload(draft)
    if (!payload) {
      // 마지막 스텝만 보고 쏘지 않는다. 앞 스텝이 비었으면 그 스텝으로 되돌린다.
      const brokenIndex = SIGNUP_STEP_IDS.findIndex(
        (id) => !validateSignupStep(id, draft).canProceed,
      )
      if (brokenIndex >= 0) {
        setDirection("backward")
        setStepIndex(brokenIndex)
      }
      return
    }

    setIsSubmitting(true)
    setSubmitError("")
    try {
      if (isCompletionMode) {
        const result = await completeProfile(payload)
        router.replace(
          getDestinationForAccountState(
            result.accountState,
            result.requiresAdditionalInfo,
            result.entryGate,
          ),
        )
        return
      }

      const result = await authService.signup({
        ...payload,
        signupToken: signupStore.signupToken,
        termsOfServiceAgree: signupStore.termsOfServiceAgree,
        privacyPolicyAgree: signupStore.privacyPolicyAgree,
        marketingAgree: signupStore.marketingAgree,
        password: signupStore.password,
        recommender: "",
      })

      setUser(result.user)
      setAccountState(result.accountState)
      setRequiresAdditionalInfo(result.requiresAdditionalInfo)
      setEntryGate(result.entryGate ?? "ONBOARDING")
      setSessionPersistence(result.sessionPersistence ?? "ephemeral")
      identifyAnalyticsUser(result.user.uid)
      trackAnalyticsEvent("auth_signup_completed", { method: "email" })
      setNicknameStore(payload.nickName)
      router.replace("/onboarding")
    } catch (e: unknown) {
      if (!isCompletionMode) {
        trackAnalyticsEvent("auth_signup_failed", {
          method: "email",
          stage: "account",
        })
      }
      if (e instanceof ApiError && e.isNetworkError) {
        showErrorToast(getErrorMessage(e))
      } else {
        setSubmitError(
          getErrorMessage(
            e,
            isCompletionMode
              ? t("profile.saveFailed")
              : t("profile.signupFailed"),
          ),
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [
    completeProfile,
    draft,
    isCompletionMode,
    setAccountState,
    setEntryGate,
    setNicknameStore,
    setRequiresAdditionalInfo,
    setSessionPersistence,
    setUser,
    signupStore.marketingAgree,
    signupStore.password,
    signupStore.privacyPolicyAgree,
    signupStore.signupToken,
    signupStore.termsOfServiceAgree,
    t,
  ])

  const goNext = useCallback(async () => {
    if (!validity.canProceed || isChecking || isSubmitting || isPrefilling) {
      return false
    }

    // 닉네임은 넘어가기 직전에 한 번만 확인한다. 타이핑마다 물으면 서버도,
    // "사용 중" 문구가 깜빡이는 화면도 시끄럽다.
    if (
      step === "nickname" &&
      shouldVerifyNicknameAvailability(draft.nickname, initialNickname.current)
    ) {
      setIsChecking(true)
      try {
        const available = await nicknameService.checkNicknameAvailability(
          draft.nickname.trim(),
        )
        if (!available) {
          setStepError(t("profile.nickname.taken"))
          return false
        }
      } catch (e: unknown) {
        if (e instanceof ApiError && e.isNetworkError) {
          showErrorToast(getErrorMessage(e))
        } else {
          setStepError(t("profile.nickname.checkFailed"))
        }
        return false
      } finally {
        setIsChecking(false)
      }
    }

    if (isLastStep) {
      await submit()
      return true
    }

    setStepError("")
    setDirection("forward")
    setStepIndex((prev) => prev + 1)
    return true
  }, [
    draft.nickname,
    isChecking,
    isLastStep,
    isPrefilling,
    isSubmitting,
    step,
    submit,
    t,
    validity.canProceed,
  ])

  const goBack = useCallback(() => {
    if (isSubmitting) return
    if (stepIndex > 0) {
      setStepError("")
      setSubmitError("")
      setDirection("backward")
      setStepIndex((prev) => prev - 1)
      return
    }

    // 첫 스텝에서 뒤로: 가입 진입점이라 스택이 비어 있을 수 있다. 그대로
    // router.back() 을 부르면 GO_BACK 경고만 뜨고 아무 일도 일어나지 않는다.
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace("/(auth)/login")
  }, [isSubmitting, stepIndex])

  return {
    step,
    stepIndex,
    stepCount: SIGNUP_STEP_IDS.length,
    direction,
    progress: getSignupStepProgress(stepIndex),
    isLastStep,
    isCompletionMode,
    draft,
    updateDraft,
    /** 현재 스텝 입력 자체의 판정. 입력 전에는 조용하다. */
    validity,
    /** 서버에 물어봐야 알 수 있는 오류(닉네임 중복 등). */
    stepError,
    submitError,
    isBusy: isChecking || isSubmitting,
    isPrefilling,
    goNext,
    goBack,
  }
}
