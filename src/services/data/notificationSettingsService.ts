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

/**
 * 물 알림 간격은 어디서 와도 1 이상의 정수여야 한다. 0 이나 음수가 통과하면
 * `notificationService.scheduleAll` 의 예약 루프가 끝나지 않는다.
 */
function toIntervalHours(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1
    ? value
    : DEFAULT_NOTIFICATION_SETTINGS.categories.waterReminder.intervalHours
}

function mergeWithDefaults(
  partial: NotificationSettingsPayload,
): NotificationSettings {
  const rawCategories: Partial<NotificationSettings["categories"]> =
    partial.categories ?? {}
  const waterReminder = {
    ...DEFAULT_NOTIFICATION_SETTINGS.categories.waterReminder,
    ...(rawCategories.waterReminder ?? partial.waterReminder),
  }
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    pushConsent:
      partial.pushConsent ?? DEFAULT_NOTIFICATION_SETTINGS.pushConsent,
    categories: {
      morningCheck: {
        ...DEFAULT_NOTIFICATION_SETTINGS.categories.morningCheck,
        ...(rawCategories.morningCheck ?? partial.morningCheck),
      },
      waterReminder: {
        ...waterReminder,
        intervalHours: toIntervalHours(waterReminder.intervalHours),
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
    // PATCH 응답이 곧 최신 전체 설정이다. 미리 GET 으로 읽어 임시값을 써 두면 요청이
    // 하나 늘고, PATCH 가 실패한 날에는 서버와 다른 값이 캐시에 남는다.
    const res = await api.patch("/user/notification-settings", { pushConsent })
    const raw = res.data.result ?? res.data.data
    const settings = mergeWithDefaults(raw)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    return settings
  },
}
