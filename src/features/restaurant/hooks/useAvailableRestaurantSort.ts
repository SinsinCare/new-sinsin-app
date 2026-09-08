import { useEffect } from "react"
import type { SortOption } from "../types"

/** Sort can change through AI/search while location availability stays unchanged. */
export function useAvailableRestaurantSort(
  sort: SortOption,
  hasLocation: boolean,
  sanitize: (hasLocation: boolean) => void,
) {
  useEffect(() => {
    if (sort === "DISTANCE" && !hasLocation) sanitize(false)
  }, [sort, hasLocation, sanitize])
}
