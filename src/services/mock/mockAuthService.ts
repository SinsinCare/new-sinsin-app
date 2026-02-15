import type { IAuthService, AppUser } from "../types/serviceTypes"
import { MockUser, DEFAULT_MOCK_USER } from "./mockUser"
import { appConfig } from "../../config/appConfig"

const mockUsers = new Map<
  string,
  { email: string; password: string; user: MockUser }
>([
  [
    "test@sinsin.dev",
    { email: "test@sinsin.dev", password: "test1234", user: DEFAULT_MOCK_USER },
  ],
])

let currentUser: MockUser | null = appConfig.mockNoUser
  ? null
  : DEFAULT_MOCK_USER
let authStateListeners: ((user: AppUser | null) => void)[] = []

function notifyListeners(user: AppUser | null) {
  authStateListeners.forEach((callback) => callback(user))
}

export const mockAuthService: IAuthService = {
  async signInWithEmail(email: string, password: string): Promise<AppUser> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const userData = mockUsers.get(email)
    if (!userData || userData.password !== password) {
      throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.")
    }
    currentUser = userData.user
    notifyListeners(currentUser)
    return currentUser
  },

  async signUpWithEmail(email: string, password: string): Promise<AppUser> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    if (mockUsers.has(email)) {
      throw new Error("이미 등록된 이메일입니다.")
    }
    const newUser = new MockUser(`mock-user-${Date.now()}`, email, null)
    mockUsers.set(email, { email, password, user: newUser })
    currentUser = newUser
    notifyListeners(currentUser)
    return currentUser
  },

  async signInWithGoogle(_idToken: string): Promise<AppUser> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    currentUser = DEFAULT_MOCK_USER
    notifyListeners(currentUser)
    return currentUser
  },

  async signOut(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    currentUser = null
    notifyListeners(null)
  },

  getCurrentUser(): AppUser | null {
    return currentUser
  },

  onAuthStateChange(callback: (user: AppUser | null) => void): () => void {
    authStateListeners.push(callback)
    setTimeout(() => callback(currentUser), 0)
    return () => {
      authStateListeners = authStateListeners.filter((cb) => cb !== callback)
    }
  },
}
