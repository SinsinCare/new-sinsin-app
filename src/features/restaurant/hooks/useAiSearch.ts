/** A proposal belongs to one visible input and one request, never to the sheet. */
import { useCallback, useEffect, useRef, useState } from "react"

import { restaurantService } from "@/src/services/data/restaurantService"
import type { AiSearchResult, LatLng, MapBounds } from "../types"

export interface UseAiSearchResult {
  result: AiSearchResult | null
  isPending: boolean
  isError: boolean
  error: unknown
  isFallback: boolean
  search: () => Promise<AiSearchResult | null>
  reset: () => void
}

type SearchState = {
  query: string
  status: "pending" | "success" | "error"
  result: AiSearchResult | null
  error: unknown
}

type SearchRequest = { query: string; controller: AbortController }

export function useAiSearch(context: {
  query: string
  enabled: boolean
  viewport?: MapBounds | null
  userLocation?: LatLng | null
}): UseAiSearchResult {
  const { query, enabled, viewport, userLocation } = context
  const trimmed = query.trim()
  const [state, setState] = useState<SearchState | null>(null)
  const activeRef = useRef<SearchRequest | null>(null)

  const cancel = useCallback(() => {
    const previous = activeRef.current
    activeRef.current = null
    previous?.controller.abort()
  }, [])

  const reset = useCallback(() => {
    cancel()
    setState(null)
  }, [cancel])

  useEffect(() => {
    reset()
    // Cleanup only cancels: a late promise must not update an unmounted screen.
    return cancel
  }, [trimmed, enabled, reset, cancel])

  const search = useCallback(async () => {
    if (!enabled || !trimmed) return null
    // A double tap before React commits must not start a second model request.
    if (activeRef.current?.query === trimmed) return null
    cancel()
    const request = { query: trimmed, controller: new AbortController() }
    activeRef.current = request
    setState({ query: trimmed, status: "pending", result: null, error: null })
    try {
      const result = await restaurantService.aiSearch(
        {
          query: trimmed,
          viewport: viewport ?? null,
          userLat: userLocation?.lat ?? null,
          userLng: userLocation?.lng ?? null,
        },
        request.controller.signal,
      )
      // Cancellation is cooperative; still reject a late success from transports
      // that delivered a response after the abort or after another search began.
      if (activeRef.current !== request) return null
      activeRef.current = null
      setState({ query: trimmed, status: "success", result, error: null })
      return result
    } catch (error) {
      if (activeRef.current !== request) return null
      activeRef.current = null
      setState({ query: trimmed, status: "error", result: null, error })
      return null
    }
  }, [enabled, trimmed, viewport, userLocation, cancel])

  // Hide old proposals in the same render as the changed input, before effects
  // abort their requests. This also gates the sheet's apply button.
  const current = enabled && state?.query === trimmed ? state : null
  return {
    result: current?.result ?? null,
    isPending: current?.status === "pending",
    isError: current?.status === "error",
    error: current?.error ?? null,
    isFallback: current?.result?.fallback === true,
    search,
    reset,
  }
}
