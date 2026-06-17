import type { Router } from "expo-router"

type PushData = Record<string, unknown>

export function routeFromPushData(
  data: PushData | null | undefined,
  router: Router,
): boolean {
  const type = typeof data?.type === "string" ? data.type : undefined

  if (type === "food_analysis_complete") {
    router.push("/(tabs)/home")
    return true
  }

  if (type === "announcement") {
    const noticeId = data?.noticeId
    if (typeof noticeId === "string" || typeof noticeId === "number") {
      router.push({
        pathname: "/(settings)/announcement-detail",
        params: { id: String(noticeId) },
      })
    } else {
      router.push("/(settings)/announcements")
    }
    return true
  }

  router.push("/(tabs)/home")
  return false
}
