import type { SearchSuggestionDto } from "../types"

export type RestaurantRecentSearch =
  | { kind: "query"; label: string }
  | { kind: "region"; label: string; lat: number; lng: number; key?: string }
  | { kind: "restaurant"; label: string; restaurantId: number }

export const MAX_RESTAURANT_RECENT_SEARCHES = 10

function validCoordinates(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    Math.abs(lat) <= 90 &&
    typeof lng === "number" &&
    Number.isFinite(lng) &&
    Math.abs(lng) <= 180
  )
}

/** Persist the selected destination, not only the text displayed in the row. */
export function restaurantRecentFromSuggestion(
  item: SearchSuggestionDto,
): RestaurantRecentSearch {
  const label = item.label.trim()
  if (item.type === "REGION" && validCoordinates(item.lat, item.lng)) {
    return {
      kind: "region",
      label,
      lat: item.lat!,
      lng: item.lng!,
      ...(item.key ? { key: item.key } : {}),
    }
  }
  if (
    item.type === "RESTAURANT" &&
    Number.isSafeInteger(item.restaurantId) &&
    item.restaurantId! > 0
  ) {
    return { kind: "restaurant", label, restaurantId: item.restaurantId! }
  }
  return { kind: "query", label }
}

export function restaurantRecentKey(entry: RestaurantRecentSearch): string {
  if (entry.kind === "restaurant") return `restaurant:${entry.restaurantId}`
  if (entry.kind === "region") return `region:${entry.lat},${entry.lng}`
  return `query:${entry.label}`
}

export function prependRestaurantRecent(
  entries: readonly RestaurantRecentSearch[],
  entry: RestaurantRecentSearch,
): RestaurantRecentSearch[] {
  const label = entry.label.trim()
  if (!label) return [...entries]
  const next = { ...entry, label }
  const key = restaurantRecentKey(next)
  // The latest selection owns the intent when a typed query and a destination
  // share a label. Renamed places still deduplicate by their stable destination.
  return [
    next,
    ...entries.filter(
      (previous) =>
        previous.label !== label && restaurantRecentKey(previous) !== key,
    ),
  ].slice(0, MAX_RESTAURANT_RECENT_SEARCHES)
}

function parseEntry(value: unknown): RestaurantRecentSearch | null {
  if (typeof value === "string") {
    const label = value.trim()
    return label ? { kind: "query", label } : null
  }
  if (!value || typeof value !== "object") return null
  const entry = value as Record<string, unknown>
  if (typeof entry.label !== "string" || !entry.label.trim()) return null
  const label = entry.label.trim()
  if (entry.kind === "query") return { kind: "query", label }
  if (entry.kind === "region" && validCoordinates(entry.lat, entry.lng)) {
    return {
      kind: "region",
      label,
      lat: entry.lat as number,
      lng: entry.lng as number,
      ...(typeof entry.key === "string" && entry.key ? { key: entry.key } : {}),
    }
  }
  if (
    entry.kind === "restaurant" &&
    typeof entry.restaurantId === "number" &&
    Number.isSafeInteger(entry.restaurantId) &&
    entry.restaurantId > 0
  ) {
    return { kind: "restaurant", label, restaurantId: entry.restaurantId }
  }
  // Broken destinations must not silently become a different search action.
  return null
}

export function parseRestaurantRecent(
  raw: string | null,
): RestaurantRecentSearch[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    const source = Array.isArray(value)
      ? value // v1 stored string[]. Keep those searches readable and replayable.
      : value &&
          typeof value === "object" &&
          "version" in value &&
          value.version === 2 &&
          "entries" in value &&
          Array.isArray(value.entries)
        ? value.entries
        : []
    return source.reduceRight<RestaurantRecentSearch[]>((entries, value) => {
      const entry = parseEntry(value)
      return entry ? prependRestaurantRecent(entries, entry) : entries
    }, [])
  } catch {
    return []
  }
}

export function serializeRestaurantRecent(
  entries: RestaurantRecentSearch[],
): string {
  return JSON.stringify({ version: 2, entries })
}

export function replayRestaurantRecent(
  entry: RestaurantRecentSearch,
  actions: {
    onSubmitQuery: (query: string) => void
    onSelectRegion: (suggestion: SearchSuggestionDto) => void
    onSelectRestaurant: (restaurantId: number) => void
  },
): void {
  if (entry.kind === "region") {
    actions.onSelectRegion({
      type: "REGION",
      label: entry.label,
      lat: entry.lat,
      lng: entry.lng,
      ...(entry.key ? { key: entry.key } : {}),
    })
  } else if (entry.kind === "restaurant") {
    actions.onSelectRestaurant(entry.restaurantId)
  } else {
    actions.onSubmitQuery(entry.label)
  }
}
