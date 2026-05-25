import { useEffect } from "react"
import { useAuthStore, useUserStore } from "../stores"
import { authService } from "../services/auth/authService"
import {
  signInWithGoogle as googleSignIn,
  signInWithApple as appleSignIn,
  signInWithKakao as kakaoSignIn,
  isUserCancelledError,
} from "../services/auth/socialAuthService"
import { tokenService } from "../services/core/tokenService"
import { logger } from "@/src/lib/logger"

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
    const restore = async () => {
      try {
        const result = await authService.restoreSession()
        if (result) {
          setUser(result.user)
          setAccountState(result.accountState)
        } else {
          setUser(null)
        }
      } catch {
        setUser(null)
      }
    }
    restore()
  }, [setUser, setAccountState])

  const signInWithEmail = async (email: string, password: string) => {
    const result = await authService.signInWithEmail(email, password)
    setUser(result.user)
    setAccountState(result.accountState)
    return result
  }

  const signInWithGoogle = async () => {
    logger.debug("[useAuth] signInWithGoogle")
    const socialResult = await googleSignIn()
    const result = await authService.signInWithSocial(
      socialResult.provider,
      socialResult.idToken,
      socialResult.email,
      socialResult.displayName,
    )
    logger.debug("[useAuth] Google 로그인 완료", result.accountState)
    setUser(result.user)
    setAccountState(result.accountState)
    return result
  }

  const signInWithApple = async () => {
    logger.debug("[useAuth] signInWithApple")
    const socialResult = await appleSignIn()
    const result = await authService.signInWithSocial(
      socialResult.provider,
      socialResult.idToken,
      socialResult.email,
      socialResult.displayName,
    )
    logger.debug("[useAuth] Apple 로그인 완료", result.accountState)
    setUser(result.user)
    setAccountState(result.accountState)
    return result
  }

  const signInWithKakao = async () => {
    logger.debug("[useAuth] signInWithKakao 시작")

    let socialResult
    try {
      socialResult = await kakaoSignIn()
      logger.debug("[useAuth] Kakao provider 확인", socialResult.provider)
    } catch (e) {
      logger.debug("[useAuth] kakaoSignIn 실패", e)
      throw e
    }

    let result
    try {
      result = await authService.signInWithSocial(
        socialResult.provider,
        socialResult.idToken,
        socialResult.email,
        socialResult.displayName,
      )
      logger.debug("[useAuth] Kakao 로그인 완료", result.accountState)
    } catch (e) {
      logger.debug("[useAuth] Kakao 서버 로그인 실패", e)
      throw e
    }

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
    signInWithEmail,
    signInWithGoogle,
    signInWithApple,
    signInWithKakao,
    isUserCancelledError,
    signOut,
  }
}
