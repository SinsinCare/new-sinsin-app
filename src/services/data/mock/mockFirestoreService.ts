import type { IFirestoreService } from "../../types/serviceTypes"
import type {
  UserProfile,
  HealthRecord,
  FoodRecord,
  DailyHealthLog,
} from "../../../types"
import {
  MOCK_USER_PROFILE,
  MOCK_HEALTH_RECORDS,
  MOCK_FOOD_RECORDS,
  MOCK_DAILY_LOG,
} from "./mockData"

const userProfiles = new Map<string, UserProfile>([
  [MOCK_USER_PROFILE.uid, MOCK_USER_PROFILE],
])
const healthRecords = new Map<string, HealthRecord>(
  MOCK_HEALTH_RECORDS.map((r) => [r.id, r]),
)
const foodRecords = new Map<string, FoodRecord>(
  MOCK_FOOD_RECORDS.map((r) => [r.id, r]),
)
const dailyLogs = new Map<string, DailyHealthLog>([
  [MOCK_DAILY_LOG.id, MOCK_DAILY_LOG],
])

let idCounter = 1000
const generateId = (prefix: string) => `${prefix}-${++idCounter}`
const delay = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms))

export const mockFirestoreService: IFirestoreService = {
  async getUserProfile(userId: string) {
    await delay()
    return userProfiles.get(userId) || null
  },

  async setUserProfile(profile: UserProfile) {
    await delay()
    userProfiles.set(profile.uid, { ...profile, updatedAt: new Date() })
  },

  async updateUserProfile(userId: string, updates: Partial<UserProfile>) {
    await delay()
    const existing = userProfiles.get(userId)
    if (existing) {
      userProfiles.set(userId, {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      })
    }
  },

  async getHealthRecords(userId: string, limitCount = 10) {
    await delay()
    return Array.from(healthRecords.values())
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.recordDate.getTime() - a.recordDate.getTime())
      .slice(0, limitCount)
  },

  async addHealthRecord(record: Omit<HealthRecord, "id">) {
    await delay()
    const id = generateId("hr")
    healthRecords.set(id, { ...record, id } as HealthRecord)
    return id
  },

  async getFoodRecords(userId: string, date: Date) {
    await delay()
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)
    return Array.from(foodRecords.values()).filter(
      (r) =>
        r.userId === userId &&
        r.recordDate >= startOfDay &&
        r.recordDate <= endOfDay,
    )
  },

  async addFoodRecord(record: Omit<FoodRecord, "id">) {
    await delay()
    const id = generateId("fr")
    foodRecords.set(id, { ...record, id } as FoodRecord)
    return id
  },

  async getDailyLog(userId: string, date: Date) {
    await delay()
    const dateStr = date.toISOString().split("T")[0]
    return dailyLogs.get(`${userId}_${dateStr}`) || null
  },

  async setDailyLog(log: Omit<DailyHealthLog, "id">) {
    await delay()
    const dateStr = log.date.toISOString().split("T")[0]
    const id = `${log.userId}_${dateStr}`
    dailyLogs.set(id, { ...log, id } as DailyHealthLog)
  },
}
