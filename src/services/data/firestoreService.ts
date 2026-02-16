import type { IFirestoreService } from "../types/serviceTypes"

// 데이터 CRUD API가 아직 없으므로 항상 mock 사용
// 향후 데이터 API가 추가되면 교체 예정
let cachedService: IFirestoreService | null = null

function getFirestoreService(): IFirestoreService {
  if (cachedService) return cachedService

  const { mockFirestoreService } = require("./mock/mockFirestoreService") // eslint-disable-line @typescript-eslint/no-require-imports
  cachedService = mockFirestoreService

  return cachedService!
}

export const firestoreService: IFirestoreService = {
  getUserProfile: (userId) => getFirestoreService().getUserProfile(userId),
  setUserProfile: (profile) => getFirestoreService().setUserProfile(profile),
  updateUserProfile: (userId, updates) =>
    getFirestoreService().updateUserProfile(userId, updates),
  getHealthRecords: (userId, limitCount) =>
    getFirestoreService().getHealthRecords(userId, limitCount),
  addHealthRecord: (record) => getFirestoreService().addHealthRecord(record),
  getFoodRecords: (userId, date) =>
    getFirestoreService().getFoodRecords(userId, date),
  addFoodRecord: (record) => getFirestoreService().addFoodRecord(record),
  getConversations: (userId) => getFirestoreService().getConversations(userId),
  createConversation: (conv) => getFirestoreService().createConversation(conv),
  getMessages: (convId) => getFirestoreService().getMessages(convId),
  addMessage: (message) => getFirestoreService().addMessage(message),
  getDailyLog: (userId, date) =>
    getFirestoreService().getDailyLog(userId, date),
  setDailyLog: (log) => getFirestoreService().setDailyLog(log),
}
