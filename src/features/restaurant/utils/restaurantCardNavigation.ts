import type { AnalyticsRestaurantEntrySource } from "@/src/features/analytics"

export type RestaurantCardTarget =
  | { type: "home" }
  | { type: "menu" }
  | { type: "photos"; urls: readonly string[]; index: number }

/** Preserve the specific action across map, search results and saved places. */
export function restaurantCardDestination(
  restaurantId: number,
  from: AnalyticsRestaurantEntrySource,
  target: RestaurantCardTarget = { type: "home" },
) {
  if (target.type === "photos" && target.urls.length > 0) {
    return {
      pathname: "/restaurant/[id]/photos" as const,
      params: {
        id: restaurantId,
        index: Number.isInteger(target.index)
          ? Math.max(0, Math.min(target.index, target.urls.length - 1))
          : 0,
        // Use the exact displayed set: server photo ordering can differ from previews.
        photos: JSON.stringify(
          target.urls.map((url) => ({ url, category: "OWNER" })),
        ),
      },
    }
  }
  return {
    pathname: "/restaurant/[id]" as const,
    params: {
      id: restaurantId,
      from,
      ...(target.type === "menu" ? { tab: "menu" } : {}),
    },
  }
}
