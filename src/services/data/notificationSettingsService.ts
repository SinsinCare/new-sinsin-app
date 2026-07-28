import AsyncStorage from "@react-native-async-storage/async-storage"
import { api } from "../core/apiClient"
import type { NotificationSettings } from "@/src/types/notification"
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/src/types/notification"

const STORAGE_KEY = "@sinsin/notification-settings"

type NotificationSettingsPayload = Partial<NotificationSettings> & {
  morningCheck?: Partial<NotificationSettings["categories"]["morningCheck"]>
  waterReminder?: Partial<NotificationSettings["categories"]["waterReminder"]>
  mealReminder?: Partial<NotificationSettings["categories"]["mealReminder"]>
}

function mergeWithDefaults(
  partial: NotificationSettingsPayload,
): NotificationSettings {
  const rawCategories: Partial<NotificationSettings["categories"]> =
    partial.categories ?? {}
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    pushConsent:
      partial.pushConsent ?? DEFAULT_NOTIFICATION_SETTINGS.pushConsent,
    nightPushConsent:
      partial.nightPushConsent ??
      DEFAULT_NOTIFICATION_SETTINGS.nightPushConsent,
    categories: {
      morningCheck: {
        ...DEFAULT_NOTIFICATION_SETTINGS.categories.morningCheck,
        ...(rawCategories.morningCheck ?? partial.morningCheck),
      },
      waterReminder: {
        ...DEFAULT_NOTIFICATION_SETTINGS.categories.waterReminder,
        ...(rawCategories.waterReminder ?? partial.waterReminder),
      },
      mealReminder: {
        ...DEFAULT_NOTIFICATION_SETTINGS.categories.mealReminder,
        ...(rawCategories.mealReminder ?? partial.mealReminder),
      },
      foodAnalysis: {
        ...DEFAULT_NOTIFICATION_SETTINGS.categories.foodAnalysis,
        ...rawCategories.foodAnalysis,
      },
      announcement: {
        ...DEFAULT_NOTIFICATION_SETTINGS.categories.announcement,
        ...rawCategories.announcement,
      },
      marketing: {
        ...DEFAULT_NOTIFICATION_SETTINGS.categories.marketing,
        ...rawCategories.marketing,
      },
    },
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

  async setPushConsent(pushConsent: boolean): Promise<NotificationSettings> {
    const current = await this.get()
    const next = { ...current, pushConsent }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    const res = await api.patch("/user/notification-settings", { pushConsent })
    const raw = res.data.result ?? res.data.data
    const settings = mergeWithDefaults(raw)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    return settings
  },

  async setNightPushConsent(
    nightPushConsent: boolean,
  ): Promise<NotificationSettings> {
    const current = await this.get()
    const next = { ...current, nightPushConsent }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    const res = await api.patch("/user/notification-settings", {
      nightPushConsent,
    })
    const raw = res.data.result ?? res.data.data
    const settings = mergeWithDefaults(raw)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    return settings
  },
}
