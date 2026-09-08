import { centerFor } from "../data/regionCatalog"
import type { FilterState } from "../types"

type RegionSelection = Pick<FilterState, "regionGroups" | "regionSidos">

/** Both explicit filters and AI filters must move out of the previous bbox. */
export function regionFilterDestination(
  previous: RegionSelection,
  next: RegionSelection,
) {
  const keys = (selection: RegionSelection) =>
    [...new Set([...selection.regionGroups, ...selection.regionSidos])]
      .sort()
      .join(",")
  if (keys(previous) === keys(next)) return null
  // Prefer the more specific district, preserving the user's selection order.
  for (const key of [...next.regionGroups, ...next.regionSidos]) {
    const destination = centerFor(key)
    if (destination) return destination
  }
  return null
}
