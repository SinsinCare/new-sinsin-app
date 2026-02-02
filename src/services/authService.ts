import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
  User,
} from 'firebase/auth'
import { auth } from './firebase'

export const authService = {
  // 이메일/비밀번호 로그인
  async signInWithEmail(email: string, password: string): Promise<User> {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  },

  // 이메일/비밀번호 회원가입
  async signUpWithEmail(email: string, password: string): Promise<User> {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    return result.user
  },

  // Google 로그인 (idToken 필요)
  async signInWithGoogle(idToken: string): Promise<User> {
    const credential = GoogleAuthProvider.credential(idToken)
    const result = await signInWithCredential(auth, credential)
    return result.user
  },

  // 로그아웃
  async signOut(): Promise<void> {
    await firebaseSignOut(auth)
  },

  // 현재 사용자
  getCurrentUser(): User | null {
    return auth.currentUser
  },

  // 인증 상태 변경 리스너
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback)
  },
}
