export interface MorningCheckSettings {
  enabled: boolean
  hour: number // 0–23
}

export interface WaterReminderSettings {
  enabled: boolean
  intervalHours: number // 1 | 2 | 3 | 4
  startHour: number // 0–23
  endHour: number // 0–23
}

export interface MealReminderSettings {
  enabled: boolean
  breakfastHour: number
  lunchHour: number
  dinnerHour: number
}

export interface PushCategorySettings {
  enabled: boolean
}

export interface NotificationCategories {
  morningCheck: MorningCheckSettings
  waterReminder: WaterReminderSettings
  mealReminder: MealReminderSettings
  foodAnalysis: PushCategorySettings
  announcement: PushCategorySettings
  marketing: PushCategorySettings
}

export interface NotificationSettings {
  pushConsent: boolean
  nightPushConsent: boolean
  categories: NotificationCategories
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  pushConsent: false,
  nightPushConsent: false,
  categories: {
    morningCheck: {
      enabled: true,
      hour: 7,
    },
    waterReminder: {
      enabled: false,
      intervalHours: 2,
      startHour: 8,
      endHour: 22,
    },
    mealReminder: {
      enabled: false,
      breakfastHour: 8,
      lunchHour: 12,
      dinnerHour: 18,
    },
    foodAnalysis: {
      enabled: true,
    },
    announcement: {
      enabled: true,
    },
    marketing: {
      enabled: false,
    },
  },
}
