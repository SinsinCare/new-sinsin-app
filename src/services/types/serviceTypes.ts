import type {
  UserProfile,
  HealthRecord,
  FoodRecord,
  ChatConversation,
  ChatMessage,
  DailyHealthLog,
} from "../../types"

// Firebase User와 MockUser 모두 호환되는 최소 인터페이스
export interface AppUser {
  uid: string
  email: string | null
  displayName: string | null
}

// 인증 서비스 인터페이스
export interface IAuthService {
  signInWithEmail(email: string, password: string): Promise<AppUser>
  signUpWithEmail(email: string, password: string): Promise<AppUser>
  signInWithGoogle(idToken: string): Promise<AppUser>
  signOut(): Promise<void>
  getCurrentUser(): AppUser | null
  onAuthStateChange(callback: (user: AppUser | null) => void): () => void
}

// Firestore 서비스 인터페이스
export interface IFirestoreService {
  getUserProfile(userId: string): Promise<UserProfile | null>
  setUserProfile(profile: UserProfile): Promise<void>
  updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>,
  ): Promise<void>
  getHealthRecords(userId: string, limitCount?: number): Promise<HealthRecord[]>
  addHealthRecord(record: Omit<HealthRecord, "id">): Promise<string>
  getFoodRecords(userId: string, date: Date): Promise<FoodRecord[]>
  addFoodRecord(record: Omit<FoodRecord, "id">): Promise<string>
  getConversations(userId: string): Promise<ChatConversation[]>
  createConversation(
    conversation: Omit<ChatConversation, "id">,
  ): Promise<string>
  getMessages(conversationId: string): Promise<ChatMessage[]>
  addMessage(message: Omit<ChatMessage, "id">): Promise<string>
  getDailyLog(userId: string, date: Date): Promise<DailyHealthLog | null>
  setDailyLog(log: Omit<DailyHealthLog, "id">): Promise<void>
}
