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
    console.log("[useAuth] ─── signInWithKakao 시작 ───")

    console.log("[useAuth] Step 1: kakaoSignIn() 호출")
    let socialResult
    try {
      socialResult = await kakaoSignIn()
      console.log("[useAuth] Step 1 완료: provider =", socialResult.provider)
      console.log("[useAuth]   idToken(accessToken) 앞 8자:", socialResult.idToken?.slice(0, 8) + "…")
    } catch (e) {
      console.error("[useAuth] Step 1 실패: kakaoSignIn() 예외", e)
      throw e
    }

    console.log("[useAuth] Step 2: authService.signInWithSocial() 호출")
    let result
    try {
      result = await authService.signInWithSocial(
        socialResult.provider,
        socialResult.idToken,
        socialResult.email,
        socialResult.displayName,
      )
      console.log("[useAuth] Step 2 완료: accountState =", result.accountState)
    } catch (e) {
      console.error("[useAuth] Step 2 실패: signInWithSocial() 예외", e)
      throw e
    }

    console.log("[useAuth] Step 3: setUser / setAccountState 호출")
    setUser(result.user)
    setAccountState(result.accountState)
    console.log("[useAuth] ─── signInWithKakao 완료 ───")
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
