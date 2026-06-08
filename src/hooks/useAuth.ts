import { useEffect } from "react"
import { useAuthStore, useUserStore } from "../stores"
import { authService } from "../services/auth/authService"
import {
  signInWithSocialProvider as nativeSocialSignIn,
  isUserCancelledError,
} from "../services/auth/socialAuthService"
import { tokenService } from "../services/core/tokenService"
import { logger } from "@/src/lib/logger"
import type { SocialProvider } from "@/src/types"

const RESTORE_SESSION_TIMEOUT_MS = 5000
const SOCIAL_LOGIN_SUCCESS_TRANSITION_MS = 200

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs)
    }),
  ])
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function useAuth() {
  const {
    user,
    accountState,
    isLoading,
    isAuthenticated,
    setUser,
    setAccountState,
    reset: resetAuth,
  } = useAuthStore()
  const { reset: resetProfile } = useUserStore()

  useEffect(() => {
    let cancelled = false

    const restore = async () => {
      try {
        const result = await withTimeout(
          authService.restoreSession(),
          RESTORE_SESSION_TIMEOUT_MS,
        )
        if (cancelled) return
        if (result) {
          setUser(result.user)
          setAccountState(result.accountState)
        } else {
          setUser(null)
        }
      } catch {
        if (cancelled) return
        setUser(null)
      }
    }
    restore()

    return () => {
      cancelled = true
    }
  }, [setUser, setAccountState])

  const signInWithEmail = async (email: string, password: string) => {
    const result = await authService.signInWithEmail(email, password)
    setUser(result.user)
    setAccountState(result.accountState)
    return result
  }

  const signInWithSocialProvider = async (provider: SocialProvider) => {
    logger.debug("[useAuth] signInWithSocialProvider", provider)
    const socialResult = await nativeSocialSignIn(provider)
    const result = await authService.signInWithSocial(
      socialResult.provider,
      socialResult.idToken,
      socialResult.email,
      socialResult.displayName,
    )
    logger.debug("[useAuth] social login 완료", {
      provider,
      accountState: result.accountState,
    })
    await delay(SOCIAL_LOGIN_SUCCESS_TRANSITION_MS)
    setUser(result.user)
    setAccountState(result.accountState)
    return result
  }

  const signInWithGoogle = () => signInWithSocialProvider("google")
  const signInWithApple = () => signInWithSocialProvider("apple")
  const signInWithKakao = () => signInWithSocialProvider("kakao")

  const sendSocialLinkEmailCode = (socialLinkToken: string, email: string) =>
    authService.sendSocialLinkEmailCode(socialLinkToken, email)

  const verifySocialLinkEmailCode = async (
    socialLinkToken: string,
    email: string,
    code: string,
  ) => {
    const result = await authService.verifySocialLinkEmailCode(
      socialLinkToken,
      email,
      code,
    )
    await delay(SOCIAL_LOGIN_SUCCESS_TRANSITION_MS)
    setUser(result.user)
    setAccountState(result.accountState)
    return result
  }

  const cancelWithdrawal = async (cancelToken: string) => {
    const result = await authService.cancelWithdrawal(cancelToken)
    setUser(result.user)
    setAccountState(result.accountState)
    return result
  }

  const signOut = async () => {
    await authService.signOut()
    await tokenService.clearTokens()
    resetProfile()
    resetAuth()
  }

  return {
    user,
    accountState,
    isLoading,
    isAuthenticated,
    signInWithSocialProvider,
    signInWithEmail,
    signInWithGoogle,
    signInWithApple,
    signInWithKakao,
    sendSocialLinkEmailCode,
    verifySocialLinkEmailCode,
    cancelWithdrawal,
    isUserCancelledError,
    signOut,
  }
}
