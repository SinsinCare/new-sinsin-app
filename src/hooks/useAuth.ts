import { useEffect } from "react"
import { useAuthStore, useUserStore } from "../stores"
import { authService } from "../services/auth/authService"
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
    signOut,
  }
}
