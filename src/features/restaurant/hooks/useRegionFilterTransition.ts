import { useCallback, useRef, useState } from "react"
import type { FilterState, LatLng, MapBounds } from "../types"

type Transition = {
  queryFilters: FilterState
  destination: LatLng | null
}

/** Keep the query's region and bounds from different camera positions apart. */
export function useRegionFilterTransition(filters: FilterState) {
  const [transition, setTransition] = useState<Transition | null>(null)
  const pendingRef = useRef<Transition | null>(null)
  const queryFilters = transition?.queryFilters ?? filters
  const queryFiltersRef = useRef(queryFilters)
  queryFiltersRef.current = queryFilters

  const begin = useCallback((destination: LatLng) => {
    const next = { queryFilters: queryFiltersRef.current, destination }
    pendingRef.current = next
    setTransition(next)
  }, [])

  const inspectViewport = useCallback(
    (
      center: LatLng,
      bounds: MapBounds,
      size: { width: number; height: number },
    ) => {
      const pending = pendingRef.current
      if (!pending) return "idle" as const
      const target = pending.destination
      // panTo rounds the center to screen pixels. A fixed degree epsilon can
      // never complete at some zoom levels (observed with the real Kakao SDK).
      // Accept only the two-pixel arrival area, scaled to this actual viewport.
      const latTolerance =
        size.height > 0
          ? (Math.abs(bounds.neLat - bounds.swLat) * 2) / size.height
          : 0
      const lngTolerance =
        size.width > 0
          ? (Math.abs(bounds.neLng - bounds.swLng) * 2) / size.width
          : 0
      if (
        target &&
        (!Number.isFinite(latTolerance) ||
          !Number.isFinite(lngTolerance) ||
          Math.abs(target.lat - center.lat) > Math.max(1e-7, latTolerance) ||
          Math.abs(target.lng - center.lng) > Math.max(1e-7, lngTolerance))
      ) {
        return "wait" as const
      }
      return "commit" as const
    },
    [],
  )

  const finish = useCallback(() => {
    pendingRef.current = null
    setTransition(null)
  }, [])

  // A drag or another explicit camera action takes ownership of the final
  // position. Still commit its next idle before releasing the new filters.
  const interrupt = useCallback(() => {
    if (!pendingRef.current) return
    const next = { ...pendingRef.current, destination: null }
    pendingRef.current = next
    setTransition(next)
  }, [])

  const destination = useCallback(
    () => pendingRef.current?.destination ?? null,
    [],
  )

  return {
    queryFilters,
    isPending: transition !== null,
    begin,
    inspectViewport,
    finish,
    interrupt,
    destination,
  }
}
