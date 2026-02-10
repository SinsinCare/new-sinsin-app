import { useEffect } from "react"
import { useAuthStore, useUserStore } from "../stores"
import { authService } from "../services/authService"
import { firestoreService } from "../services/firestoreService"

export function useAuth() {
  const { user, isLoading, isAuthenticated, setUser, setLoading } =
    useAuthStore()
  const { setProfile, reset: resetProfile } = useUserStore()

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        // 사용자 프로필 로드
        const profile = await firestoreService.getUserProfile(firebaseUser.uid)
        setProfile(profile)
      } else {
        resetProfile()
      }
    })

    return () => unsubscribe()
  }, [setUser, setProfile, resetProfile])

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true)
    try {
      const user = await authService.signInWithEmail(email, password)
      return user
    } finally {
      setLoading(false)
    }
  }

  const signUpWithEmail = async (email: string, password: string) => {
    setLoading(true)
    try {
      const user = await authService.signUpWithEmail(email, password)
      return user
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await authService.signOut()
    resetProfile()
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  }
}
