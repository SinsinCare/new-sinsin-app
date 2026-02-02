import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { UserProfile, HealthRecord, FoodRecord, ChatConversation, ChatMessage, DailyHealthLog } from '../types'

// 컬렉션 이름
const COLLECTIONS = {
  USERS: 'user_profiles',
  HEALTH_RECORDS: 'health_records',
  FOOD_RECORDS: 'food_records',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  DAILY_LOGS: 'daily_health_logs',
} as const

// 날짜 변환 헬퍼
const toDate = (timestamp: Timestamp | Date): Date => {
  return timestamp instanceof Timestamp ? timestamp.toDate() : timestamp
}

export const firestoreService = {
  // === User Profile ===
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const docRef = doc(db, COLLECTIONS.USERS, userId)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    const data = docSnap.data()
    return {
      ...data,
      uid: docSnap.id,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as UserProfile
  },

  async setUserProfile(profile: UserProfile): Promise<void> {
    const docRef = doc(db, COLLECTIONS.USERS, profile.uid)
    await setDoc(docRef, {
      ...profile,
      createdAt: Timestamp.fromDate(profile.createdAt),
      updatedAt: Timestamp.fromDate(new Date()),
    })
  },

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.USERS, userId)
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    })
  },

  // === Health Records ===
  async getHealthRecords(userId: string, limitCount = 10): Promise<HealthRecord[]> {
    const q = query(
      collection(db, COLLECTIONS.HEALTH_RECORDS),
      where('userId', '==', userId),
      orderBy('recordDate', 'desc'),
      limit(limitCount)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      recordDate: toDate(doc.data().recordDate),
      createdAt: toDate(doc.data().createdAt),
    })) as HealthRecord[]
  },

  async addHealthRecord(record: Omit<HealthRecord, 'id'>): Promise<string> {
    const docRef = doc(collection(db, COLLECTIONS.HEALTH_RECORDS))
    await setDoc(docRef, {
      ...record,
      recordDate: Timestamp.fromDate(record.recordDate),
      createdAt: Timestamp.fromDate(new Date()),
    })
    return docRef.id
  },

  // === Food Records ===
  async getFoodRecords(userId: string, date: Date): Promise<FoodRecord[]> {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const q = query(
      collection(db, COLLECTIONS.FOOD_RECORDS),
      where('userId', '==', userId),
      where('recordDate', '>=', Timestamp.fromDate(startOfDay)),
      where('recordDate', '<=', Timestamp.fromDate(endOfDay)),
      orderBy('recordDate', 'asc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      recordDate: toDate(doc.data().recordDate),
    })) as FoodRecord[]
  },

  async addFoodRecord(record: Omit<FoodRecord, 'id'>): Promise<string> {
    const docRef = doc(collection(db, COLLECTIONS.FOOD_RECORDS))
    await setDoc(docRef, {
      ...record,
      recordDate: Timestamp.fromDate(record.recordDate),
    })
    return docRef.id
  },

  // === Chat Conversations ===
  async getConversations(userId: string): Promise<ChatConversation[]> {
    const q = query(
      collection(db, COLLECTIONS.CONVERSATIONS),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: toDate(doc.data().createdAt),
      updatedAt: toDate(doc.data().updatedAt),
    })) as ChatConversation[]
  },

  async createConversation(conversation: Omit<ChatConversation, 'id'>): Promise<string> {
    const docRef = doc(collection(db, COLLECTIONS.CONVERSATIONS))
    await setDoc(docRef, {
      ...conversation,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    })
    return docRef.id
  },

  // === Chat Messages ===
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const q = query(
      collection(db, COLLECTIONS.MESSAGES),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: toDate(doc.data().createdAt),
    })) as ChatMessage[]
  },

  async addMessage(message: Omit<ChatMessage, 'id'>): Promise<string> {
    const docRef = doc(collection(db, COLLECTIONS.MESSAGES))
    await setDoc(docRef, {
      ...message,
      createdAt: Timestamp.fromDate(new Date()),
    })
    return docRef.id
  },

  // === Daily Health Logs ===
  async getDailyLog(userId: string, date: Date): Promise<DailyHealthLog | null> {
    const dateStr = date.toISOString().split('T')[0]
    const docRef = doc(db, COLLECTIONS.DAILY_LOGS, `${userId}_${dateStr}`)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return {
      ...docSnap.data(),
      id: docSnap.id,
      date: toDate(docSnap.data().date),
    } as DailyHealthLog
  },

  async setDailyLog(log: Omit<DailyHealthLog, 'id'>): Promise<void> {
    const dateStr = log.date.toISOString().split('T')[0]
    const docRef = doc(db, COLLECTIONS.DAILY_LOGS, `${log.userId}_${dateStr}`)
    await setDoc(docRef, {
      ...log,
      date: Timestamp.fromDate(log.date),
    })
  },
}
