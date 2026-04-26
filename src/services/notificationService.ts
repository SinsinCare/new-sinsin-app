import * as Notifications from "expo-notifications"
import { Platform } from "react-native"
import type { NotificationSettings } from "@/src/types/notification"

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export const notificationService = {
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "신신당부 알림",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "default",
      })
    }

    const { status: existing } = await Notifications.getPermissionsAsync()
    if (existing === "granted") return true

    const { status } = await Notifications.requestPermissionsAsync()
    return status === "granted"
  },

  async scheduleAll(settings: NotificationSettings): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync()

    const promises: Promise<string>[] = []

    if (settings.waterReminder.enabled) {
      const { intervalHours, startHour, endHour } = settings.waterReminder
      for (let h = startHour; h <= endHour; h += intervalHours) {
        promises.push(
          Notifications.scheduleNotificationAsync({
            identifier: `water-${h}`,
            content: {
              title: "💧 수분 섭취 시간이에요",
              body: "신장 건강을 위해 물을 마셔볼까요?",
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: h,
              minute: 0,
            },
          }),
        )
      }
    }

    if (settings.mealReminder.enabled) {
      const meals = [
        {
          id: "meal-breakfast",
          hour: settings.mealReminder.breakfastHour,
          title: "🍳 아침 식사 기록",
          body: "오늘 아침 식사를 기록해주세요.",
        },
        {
          id: "meal-lunch",
          hour: settings.mealReminder.lunchHour,
          title: "🍱 점심 식사 기록",
          body: "오늘 점심 식사를 기록해주세요.",
        },
        {
          id: "meal-dinner",
          hour: settings.mealReminder.dinnerHour,
          title: "🍽️ 저녁 식사 기록",
          body: "오늘 저녁 식사를 기록해주세요.",
        },
      ]
      for (const meal of meals) {
        promises.push(
          Notifications.scheduleNotificationAsync({
            identifier: meal.id,
            content: { title: meal.title, body: meal.body },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: meal.hour,
              minute: 0,
            },
          }),
        )
      }
    }

    await Promise.all(promises)
  },

  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync()
  },

  async sendFoodAnalysisComplete(foodName?: string): Promise<void> {
    const body = foodName
      ? `${foodName} 드셨네요! 식단 분석 결과를 확인해보세요.`
      : "식단 분석 결과를 확인해보세요!"
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🍽️ 식단 분석 완료",
        body,
        data: { type: "food_analysis_complete" },
      },
      trigger: null,
    })
  },
}
