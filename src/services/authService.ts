import type { IAuthService, AppUser } from './types/serviceTypes'
import { isMockMode } from '../config/appConfig'

function getRealAuthService(): IAuthService {
  // Lazy import - Mock 모드가 아닐 때만 Firebase 로드
  const {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut: firebaseSignOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithCredential,
  } = require('firebase/auth')
  const { auth } = require('./firebase')

  return {
    async signInWithEmail(email: string, password: string): Promise<AppUser> {
      const result = await signInWithEmailAndPassword(auth, email, password)
      return result.user
    },

    async signUpWithEmail(email: string, password: string): Promise<AppUser> {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      return result.user
    },

    async signInWithGoogle(idToken: string): Promise<AppUser> {
      const credential = GoogleAuthProvider.credential(idToken)
      const result = await signInWithCredential(auth, credential)
      return result.user
    },

    async signOut(): Promise<void> {
      await firebaseSignOut(auth)
    },

    getCurrentUser(): AppUser | null {
      return auth.currentUser
    },

    onAuthStateChange(callback: (user: AppUser | null) => void): () => void {
      return onAuthStateChanged(auth, callback)
    },
  }
}

let cachedService: IAuthService | null = null

function getAuthService(): IAuthService {
  if (cachedService) return cachedService

  if (isMockMode()) {
    const { mockAuthService } = require('./mock')
    cachedService = mockAuthService
  } else {
    cachedService = getRealAuthService()
  }

  return cachedService!
}

export const authService: IAuthService = {
  signInWithEmail: (email, password) => getAuthService().signInWithEmail(email, password),
  signUpWithEmail: (email, password) => getAuthService().signUpWithEmail(email, password),
  signInWithGoogle: (idToken) => getAuthService().signInWithGoogle(idToken),
  signOut: () => getAuthService().signOut(),
  getCurrentUser: () => getAuthService().getCurrentUser(),
  onAuthStateChange: (callback) => getAuthService().onAuthStateChange(callback),
}
