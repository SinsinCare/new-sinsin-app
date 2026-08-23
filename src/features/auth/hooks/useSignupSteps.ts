import { useCallback, useEffect, useRef, useState } from "react"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { authService, nicknameService } from "@/src/services"
import { useAuthStore, useSignupStore } from "@/src/stores"
import { useAuth } from "@/src/hooks"
import { ApiError } from "@/src/services/core/apiError"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { presentError } from "@/src/lib/errorMessage"
import { useGoBack } from "@/src/shared/navigation"
import {
  identifyAnalyticsUser,
  trackAnalyticsEvent,
  type AnalyticsSignupMode,
} from "@/src/features/analytics"
import { showConfirm } from "@/src/lib/dialog"
import { getDestinationForAccountState } from "../utils/accountStateRoute"
import {
  isProfileSetupCompletionMode,
  resolveProfileSetupExit,
} from "../utils/profileSetupMode"
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
    isAuthenticated,
    completeProfile,
    getProfile,
    signOut,
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
  /* 확인창이 떠 있는 동안 들어오는 두 번째 요청을 접는다. 하드웨어 백과 헤더 컨트롤이
     같은 함수를 지나므로, 막지 않으면 `V2DialogHost` 의 큐에 같은 확인창이 쌓인다. */
  const isExiting = useRef(false)

  const isBackfillMode = accountState === "ACTIVE" && requiresAdditionalInfo
  const isCompletionMode = isProfileSetupCompletionMode({
    accountState,
    entryGate,
    sessionPersistence,
    requiresAdditionalInfo,
  })

  /*
    이 라우트가 하는 세 가지 일 중 무엇인가. **여섯 질문의 모든 진행 이벤트가 이 값을
    싣는다** — 안 실으면 '가입 완주율' 에 이미 가입한 사람의 backfill 이 섞이고,
    서버 퍼널의 `prop:mode=signup` 스코프는 그 키를 안 싣는 스텝을 통째로 떨군다
    (설계 §J1-0 정정 2).

    판정 순서가 중요하다: backfill 은 `isCompletionMode` 의 조건도 만족하므로
    (`accountState==='ACTIVE' && requiresAdditionalInfo`) 먼저 본다.
  */
  const analyticsMode: AnalyticsSignupMode = isBackfillMode
    ? "backfill"
    : isCompletionMode
      ? "completion"
      : "signup"

  /* 첫 스텝에서 나가려 할 때 갈 수 있는 곳. 판정 근거는 `resolveProfileSetupExit`
     머리말 — 이 화면에 갇히느냐는 완성/backfill 이 아니라 **루트 가드가 붙잡느냐**로
     갈린다. */
  const exitRoute = resolveProfileSetupExit({
    accountState,
    entryGate,
    isAuthenticated,
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
        setSubmitError(getErrorMessage(e))
      } finally {
        if (!cancelled) setIsPrefilling(false)
      }
    }

    void loadProfile()
    return () => {
      cancelled = true
    }
  }, [getProfile, isBackfillMode])

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

      /*
        **이메일 인증을 안 거쳤으면 여기서 멈춘다.**

        `signupToken`·`password` 는 이 화면이 아니라 앞의 signup-email·signup-password
        에서 스토어에 담긴다. 그런데 스토어는 온보딩 끝에서만 비워지므로, 소셜로 가입한
        뒤 로그아웃하고 다시 `회원가입` 으로 들어오면 **여섯 스텝을 다 채우고도 그 둘이
        빈 채**로 남는다. 그대로 쏘면 서버가 `signupToken: minLength 1` 에서 잘라
        `잘못된 요청입니다` 만 돌려주고, 화면에는 마지막 스텝(경로) 아래에 그 문구가
        떠서 **"경로 입력이 고장났다"처럼 보인다** — 2026-08-19 제보가 정확히 이것이고,
        경로를 무엇으로 고르든 실패한 이유도 이것이다.

        고칠 수 있는 사람에게 고칠 수 있는 곳을 준다: 이메일 인증 단계로 돌려보낸다.
      */
      if (!signupStore.signupToken || !signupStore.password) {
        trackAnalyticsEvent("auth_signup_failed", {
          method: "email",
          stage: "account",
        })
        setSubmitError(t("signup.steps.verificationExpired"))
        router.replace("/(auth)/signup-email")
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
        // 통신 실패는 입력이 아니라 상황의 문제라 폼 아래 붙여 두지 않는다.
        presentError(e, { scope: "signup-submit" })
      } else {
        /*
          화면 폴백을 넘기지 않는다.

          이 지점에서 서버가 돌려주는 것은 이미 가입된 이메일(`SIGNUP_ERROR_001`) ·
          중복 닉네임(`SIGNUP_ERROR_003`) · 만료된 가입 토큰(`TOKEN_ERROR_005`) ·
          잘못된 생년월일(`SIGNUP_ERROR_002`) 네 가지다. 넷 다 **사용자가 직접 고쳐야
          고쳐지는** 오류라, "회원가입을 마치지 못했어요" 한 문장으로 뭉개면 같은 값으로
          다시 시도하는 것 말고 할 수 있는 게 없다.
        */
        setSubmitError(getErrorMessage(e))
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [
    completeProfile,
    draft,
    isCompletionMode,
    t,
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
          /* 이 여정에서 **서버 왕복 뒤에야** 알려 주는 유일한 실패다. 200 응답이라
             오류 통로를 안 지나가므로 이 이름이 없으면 어디에도 안 남는다. */
          trackAnalyticsEvent("auth_signup_step_blocked", {
            step,
            fail_kind: "taken",
            mode: analyticsMode,
          })
          setStepError(t("profile.nickname.taken"))
          return false
        }
      } catch (e: unknown) {
        if (e instanceof ApiError && e.isNetworkError) {
          /* 통신 실패는 여기서 세지 않는다 — `presentError` 를 지나가므로
             `app_error_presented{kind:'offline'}` 가 이미 같은 사건을 센다. */
          presentError(e, { scope: "nickname-check" })
        } else {
          trackAnalyticsEvent("auth_signup_step_blocked", {
            step,
            fail_kind: "server",
            mode: analyticsMode,
          })
          // "닉네임을 확인하지 못했어요" 는 이미 쓰고 있는 닉네임(`SIGNUP_ERROR_003`)
          // 까지 덮었다. 무엇을 고쳐야 하는지는 서버 코드만 안다.
          setStepError(getErrorMessage(e))
        }
        return false
      } finally {
        setIsChecking(false)
      }
    }

    /*
      여섯 질문의 **성공 축**. 마지막 질문은 제출을 태우기 직전에 쏜다 — 제출 실패로
      되돌아오더라도 그 질문 자체는 끝낸 것이고, 제출 실패는 `auth_signup_failed` 가
      따로 센다.

      전진이 확정된 뒤(중복 확인까지 통과한 뒤)여야 한다. 앞에 두면 닉네임 중복으로
      막힌 사람이 통과한 것으로 세어진다.
    */
    trackAnalyticsEvent("auth_signup_step_completed", {
      step,
      step_index: stepIndex,
      mode: analyticsMode,
    })

    if (isLastStep) {
      await submit()
      return true
    }

    setStepError("")
    setDirection("forward")
    setStepIndex((prev) => prev + 1)
    return true
  }, [
    analyticsMode,
    draft.nickname,
    isChecking,
    isLastStep,
    isPrefilling,
    isSubmitting,
    step,
    stepIndex,
    submit,
    t,
    validity.canProceed,
  ])

  /**
   * CTA 가 비활성인 채로 제출이 시도된 경우(엔터 키). 화면이 `hapticInvalid` 를 울리는
   * 그 자리에서 부른다.
   *
   * 훅이 이 함수를 내주는 이유는 `mode`·`step` 을 화면으로 흘리지 않기 위해서다 —
   * 화면이 스스로 이벤트를 조립하기 시작하면 같은 이름의 속성이 두 곳에서 갈린다.
   */
  const reportStepInputBlocked = useCallback(() => {
    trackAnalyticsEvent("auth_signup_step_blocked", {
      step,
      fail_kind: "invalid_input",
      mode: analyticsMode,
    })
  }, [analyticsMode, step])

  /* 스텝 안에서의 뒤로가기는 이 훅이 상태로 처리한다. 화면 밖으로 나가는 것은
     한 경우뿐이다 — 첫 스텝에서 뒤로. */
  const exitSignup = useGoBack()

  /**
   * 로그아웃하고 로그인 화면으로 — 가드가 붙잡는 상태에서 **유일하게 열려 있는 문**.
   *
   * ■ 즉시 나가지 않고 먼저 묻는 이유
   *
   * 이 자리를 떠나면 지금까지 입력한 여섯 질문의 답이 사라지고 **세션까지 끊긴다.**
   * 되돌리려면 소셜 로그인을 처음부터 다시 해야 한다 — 실수로 스친 뒤로가기가
   * 그렇게 되면 안 된다. 선택을 묻는 표면은 이 저장소 규칙대로 `V2Modal` 이고,
   * 훅에서는 그 선언형 컴포넌트를 못 쓰므로 명령형 껍데기(`showConfirm`)로 부른다.
   *
   * ■ `signOut("explicit")` 인 이유
   *
   * `"automatic"` 은 임시 세션이 백그라운드에서 잘린 것 — **사용자가 원한 적 없는**
   * 로그아웃이라 로그인 퍼널의 재로그인 분모를 설명하는 데 쓰인다(`useAuth` 의 해당
   * 주석). 여기는 사용자가 확인창에서 직접 고른 것이라 그 코호트에 섞이면 안 된다.
   *
   * ■ 목적지를 직접 지정하는 이유
   *
   * 로그아웃 뒤에도 가드는 우리를 옮겨 주지 않는다 — 인증 그룹 안의 비로그인 사용자는
   * `STAY` 다(`resolveGuard`). 여기서 보내지 않으면 로그아웃된 채 같은 화면에 남는다.
   */
  const exitBySigningOut = useCallback(async () => {
    if (isExiting.current) return
    isExiting.current = true
    try {
      const confirmed = await showConfirm({
        title: t("signup.steps.exit.title"),
        description: t("signup.steps.exit.description"),
        confirmLabel: t("signup.steps.exit.confirm"),
        cancelLabel: t("signup.steps.exit.cancel"),
        destructive: true,
      })
      if (!confirmed) return
      await signOut("explicit")
      router.replace("/(auth)/login")
    } finally {
      isExiting.current = false
    }
  }, [signOut, t])

  const goBack = useCallback(() => {
    if (isSubmitting) return
    if (stepIndex > 0) {
      // 뒤로가기가 몰리는 질문 = 답을 잘못 이해했거나 앞 답을 고치고 싶은 질문.
      // 순번 퍼널(같은 이름 6회)이 상한 추정치인 이유의 **크기**가 이 수다.
      trackAnalyticsEvent("auth_signup_step_reverted", {
        step,
        step_index: stepIndex,
        mode: analyticsMode,
      })
      setStepError("")
      setSubmitError("")
      setDirection("backward")
      setStepIndex((prev) => prev - 1)
      return
    }

    /* 첫 스텝에서 뒤로 = 여기서 나간다. **나갈 곳이 두 가지다.**

       가드가 이 상태를 프로필 입력에 붙잡아 두는 경우(소셜 가입 도중 등)에는 앱
       쪽으로 돌아가 봐야 다음 판정이 곧바로 되돌려 놓는다. 그 상태의 문은 로그아웃
       하나뿐이라 확인을 받고 로그인 화면으로 보낸다.

       붙잡히지 않는 경우(이메일 가입 · gate 가 이미 넘어간 backfill)는 종전 그대로다.
       가입 진입점이라 스택이 비어 있을 수 있는데, 그때의 목적지는 라우트 그래프가 안다.

       여기에 `*_abandoned` 를 새로 짓지 않는다 — `exitSignup` 은 `useGoBack` 이고
       그 통로가 이미 `nav_back{from_screen:'signup_profile'}` 을 쏜다. 로그아웃 갈래는
       `auth_signed_out{reason:'explicit'}` 이 같은 자리를 센다. */
    if (exitRoute === "signOut") {
      void exitBySigningOut()
      return
    }
    exitSignup()
  }, [
    analyticsMode,
    exitBySigningOut,
    exitRoute,
    exitSignup,
    isSubmitting,
    step,
    stepIndex,
  ])

  return {
    step,
    stepIndex,
    stepCount: SIGNUP_STEP_IDS.length,
    direction,
    progress: getSignupStepProgress(stepIndex),
    isLastStep,
    isCompletionMode,
    /**
     * 지금 이 화면에서 나가려면 **로그아웃해야 하는가**. 화면이 두 가지에 쓴다:
     * 탈출 컨트롤의 접근성 이름(그 버튼이 하는 일이 "이전 단계" 가 아니다)과,
     * iOS 엣지 스와이프 차단(제스처는 `goBack` 을 안 지나고 네이티브가 바로 팝한다).
     */
    requiresSignOutToExit: stepIndex === 0 && exitRoute === "signOut",
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
    reportStepInputBlocked,
  }
}
