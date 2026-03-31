import { useEffect } from "react"
import { useAuthStore, useUserStore } from "../stores"
import { authService } from "../services/auth/authService"
import {
  signInWithGoogle as googleSignIn,
  signInWithApple as appleSignIn,
  isUserCancelledError,
} from "../services/auth/socialAuthService"
import { tokenService } from "../services/core/tokenService"

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
    console.log("[useAuth] signInWithGoogle 호출")
    const socialResult = await googleSignIn()
    console.log("[useAuth] Google 인증 성공, 백엔드 호출 시작")
    const result = await authService.signInWithSocial(
      socialResult.provider,
      socialResult.idToken,
      socialResult.email,
      socialResult.displayName,
    )
    console.log("[useAuth] Google 로그인 완료 - accountState:", result.accountState)
    setUser(result.user)
    setAccountState(result.accountState)
    return result
  }

  const signInWithApple = async () => {
    console.log("[useAuth] signInWithApple 호출")
    const socialResult = await appleSignIn()
    console.log("[useAuth] Apple 인증 성공, 백엔드 호출 시작")
    const result = await authService.signInWithSocial(
      socialResult.provider,
      socialResult.idToken,
      socialResult.email,
      socialResult.displayName,
    )
    console.log("[useAuth] Apple 로그인 완료 - accountState:", result.accountState)
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
    isUserCancelledError,
    signOut,
  }
}
