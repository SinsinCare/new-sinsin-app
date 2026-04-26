import AsyncStorage from "@react-native-async-storage/async-storage"
import { api } from "../core/apiClient"
import type { NotificationSettings } from "@/src/types/notification"
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/src/types/notification"

const STORAGE_KEY = "@sinsin/notification-settings"

function mergeWithDefaults(partial: Partial<NotificationSettings>): NotificationSettings {
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...partial,
    morningCheck: { ...DEFAULT_NOTIFICATION_SETTINGS.morningCheck, ...partial.morningCheck },
    waterReminder: { ...DEFAULT_NOTIFICATION_SETTINGS.waterReminder, ...partial.waterReminder },
    mealReminder: { ...DEFAULT_NOTIFICATION_SETTINGS.mealReminder, ...partial.mealReminder },
  }
}

export const notificationSettingsService = {
  async get(): Promise<NotificationSettings> {
    try {
      const res = await api.get("/user/notification-settings")
      const raw = res.data.result ?? res.data.data
      const settings = mergeWithDefaults(raw)
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      return settings
    } catch {
      // 서버 미구현 또는 네트워크 오류 시 로컬 캐시 사용
      const cached = await AsyncStorage.getItem(STORAGE_KEY)
      if (cached) return mergeWithDefaults(JSON.parse(cached))
      return DEFAULT_NOTIFICATION_SETTINGS
    }
  },

  async update(settings: NotificationSettings): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    try {
      await api.put("/user/notification-settings", settings)
    } catch {
      // 로컬 저장은 완료됐으므로 서버 실패는 무시
    }
  },
}
