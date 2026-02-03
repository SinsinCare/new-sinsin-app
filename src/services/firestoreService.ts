import type { UserProfile, HealthRecord, FoodRecord, ChatConversation, ChatMessage, DailyHealthLog } from '../types'
import type { IFirestoreService } from './types/serviceTypes'
import { isMockMode } from '../config/appConfig'

// 컬렉션 이름
const COLLECTIONS = {
  USERS: 'user_profiles',
  HEALTH_RECORDS: 'health_records',
  FOOD_RECORDS: 'food_records',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  DAILY_LOGS: 'daily_health_logs',
} as const

function getRealFirestoreService(): IFirestoreService {
  // Lazy import - Mock 모드가 아닐 때만 Firebase 로드
  const {
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
  } = require('firebase/firestore')
  const { db } = require('./firebase')

  // 날짜 변환 헬퍼
  const toDate = (timestamp: any): Date => {
    return timestamp?.toDate ? timestamp.toDate() : timestamp
  }

  return {
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

    async getHealthRecords(userId: string, limitCount = 10): Promise<HealthRecord[]> {
      const q = query(
        collection(db, COLLECTIONS.HEALTH_RECORDS),
        where('userId', '==', userId),
        orderBy('recordDate', 'desc'),
        limit(limitCount)
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map((d: any) => ({
        ...d.data(),
        id: d.id,
        recordDate: toDate(d.data().recordDate),
        createdAt: toDate(d.data().createdAt),
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
      return snapshot.docs.map((d: any) => ({
        ...d.data(),
        id: d.id,
        recordDate: toDate(d.data().recordDate),
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

    async getConversations(userId: string): Promise<ChatConversation[]> {
      const q = query(
        collection(db, COLLECTIONS.CONVERSATIONS),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map((d: any) => ({
        ...d.data(),
        id: d.id,
        createdAt: toDate(d.data().createdAt),
        updatedAt: toDate(d.data().updatedAt),
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

    async getMessages(conversationId: string): Promise<ChatMessage[]> {
      const q = query(
        collection(db, COLLECTIONS.MESSAGES),
        where('conversationId', '==', conversationId),
        orderBy('createdAt', 'asc')
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map((d: any) => ({
        ...d.data(),
        id: d.id,
        createdAt: toDate(d.data().createdAt),
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
}

let cachedService: IFirestoreService | null = null

function getFirestoreService(): IFirestoreService {
  if (cachedService) return cachedService

  if (isMockMode()) {
    const { mockFirestoreService } = require('./mock')
    cachedService = mockFirestoreService
  } else {
    cachedService = getRealFirestoreService()
  }

  return cachedService!
}

export const firestoreService: IFirestoreService = {
  getUserProfile: (userId) => getFirestoreService().getUserProfile(userId),
  setUserProfile: (profile) => getFirestoreService().setUserProfile(profile),
  updateUserProfile: (userId, updates) => getFirestoreService().updateUserProfile(userId, updates),
  getHealthRecords: (userId, limitCount) => getFirestoreService().getHealthRecords(userId, limitCount),
  addHealthRecord: (record) => getFirestoreService().addHealthRecord(record),
  getFoodRecords: (userId, date) => getFirestoreService().getFoodRecords(userId, date),
  addFoodRecord: (record) => getFirestoreService().addFoodRecord(record),
  getConversations: (userId) => getFirestoreService().getConversations(userId),
  createConversation: (conv) => getFirestoreService().createConversation(conv),
  getMessages: (convId) => getFirestoreService().getMessages(convId),
  addMessage: (message) => getFirestoreService().addMessage(message),
  getDailyLog: (userId, date) => getFirestoreService().getDailyLog(userId, date),
  setDailyLog: (log) => getFirestoreService().setDailyLog(log),
}
