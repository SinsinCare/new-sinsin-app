export interface WaterReminderSettings {
  enabled: boolean
  intervalHours: number // 1 | 2 | 3 | 4
  startHour: number     // 0–23
  endHour: number       // 0–23
}

export interface MealReminderSettings {
  enabled: boolean
  breakfastHour: number
  lunchHour: number
  dinnerHour: number
}

export interface NotificationSettings {
  waterReminder: WaterReminderSettings
  mealReminder: MealReminderSettings
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
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
}
