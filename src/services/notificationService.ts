import * as Notifications from "expo-notifications"
import Constants from "expo-constants"
import { Platform } from "react-native"
import type { NotificationSettings } from "@/src/types/notification"
import { api } from "@/src/services/core/apiClient"
import { isFoodAnalysisRequestHandled } from "@/src/features/home/services/foodAnalysisRequestState"

function shouldShowForegroundNotification(
  notification: Notifications.Notification,
): boolean {
  const data = notification.request.content.data
  const requestId =
    typeof data?.requestId === "string" ? data.requestId : undefined
  if (
    data?.type === "food_analysis_complete" &&
    requestId &&
    isFoodAnalysisRequestHandled(requestId)
  ) {
    return false
  }
  return true
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const shouldShow = shouldShowForegroundNotification(notification)
    return {
      shouldShowAlert: shouldShow,
      shouldPlaySound: shouldShow,
      shouldSetBadge: false,
      shouldShowBanner: shouldShow,
      shouldShowList: shouldShow,
    }
  },
})

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return
  await Notifications.setNotificationChannelAsync("default", {
    name: "신신당부 알림",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
  })
}

function getExpoProjectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId
  )
}

export const notificationService = {
  async requestPermissions(): Promise<boolean> {
    await ensureAndroidChannel()

    const { status: existing } = await Notifications.getPermissionsAsync()
    if (existing === "granted") return true

    const { status } = await Notifications.requestPermissionsAsync()
    return status === "granted"
  },

  async hasPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync()
    return status === "granted"
  },

  async registerPushToken(): Promise<string> {
    await ensureAndroidChannel()
    const projectId = getExpoProjectId()
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )
    const platform = Platform.OS === "ios" ? "ios" : "android"
    await api.post("/user/push-token", {
      expoPushToken: token.data,
      platform,
    })
    return token.data
  },

  async unregisterPushToken(): Promise<void> {
    try {
      const projectId = getExpoProjectId()
      const token = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      )
      await api.delete("/user/push-token", {
        data: { expoPushToken: token.data },
      })
    } catch {
      // 토큰 조회/삭제 실패가 마스터 동의 OFF 저장을 막으면 안 된다.
    }
  },

  async scheduleAll(settings: NotificationSettings): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync()

    const promises: Promise<string>[] = []
    const { morningCheck, waterReminder, mealReminder } = settings.categories

    if (morningCheck.enabled) {
      promises.push(
        Notifications.scheduleNotificationAsync({
          identifier: "morning-check",
          content: {
            title: "🐔 굿모닝",
            body: "첫 소변 후 물 마시기 전 👆 혈압 ☑ 체중 체크✔ 기록해주세요!",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: morningCheck.hour,
            minute: 0,
          },
        }),
      )
    }

    if (waterReminder.enabled) {
      const { intervalHours, startHour, endHour } = waterReminder
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

    if (mealReminder.enabled) {
      const meals = [
        {
          id: "meal-breakfast",
          hour: mealReminder.breakfastHour,
          title: "🍳 아침 식사 기록",
          body: "오늘 아침 식사를 기록해주세요.",
        },
        {
          id: "meal-lunch",
          hour: mealReminder.lunchHour,
          title: "🍱 점심 식사 기록",
          body: "오늘 점심 식사를 기록해주세요.",
        },
        {
          id: "meal-dinner",
          hour: mealReminder.dinnerHour,
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

  async sendFoodAnalysisComplete(
    foodName?: string,
    requestId?: string,
  ): Promise<void> {
    const body = foodName
      ? `${foodName} 드셨네요! 식단 분석 결과를 확인해보세요.`
      : "식단 분석 결과를 확인해보세요!"
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🍽️ 식단 분석 완료",
        body,
        data: {
          type: "food_analysis_complete",
          ...(requestId ? { requestId } : {}),
        },
      },
      trigger: null,
    })
  },
}
