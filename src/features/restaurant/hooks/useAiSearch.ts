/**
 * AI 검색. 자연어("칼륨 낮고 국물 없는 한식") → 구조화 필터.
 *
 * ## 실패가 없다 — 그래서 실패를 숨기지도 않는다
 *
 * 서버는 LLM 이 죽거나 키가 없어도 200 을 주고 `fallback: true` 로 표시한다
 * (`generateJson` 은 `GEMINI_API_KEY` 가 없으면 `null` 을 돌려주므로 서버가 키워드 매칭으로
 * 내려간다). 그래서 이 훅에 "AI 실패" 에러 상태는 사실상 없고, 대신 `isFallback` 이 있다.
 * 화면은 그때 "AI 없이 검색어로 찾았어요" 를 말한다 — 조용히 일반 검색을 해 놓고
 * AI 가 한 것처럼 보이게 하지 않는다.
 *
 * ## 못 옮긴 말을 말해 준다
 *
 * `unmatchedTerms` 는 필터로 변환하지 못한 표현이다. 이걸 감추면 사용자는 자기가 말한
 * 조건이 반영됐다고 믿고 결과를 오해한다.
 *
 * ## 결과를 자동으로 적용하지 않는다
 *
 * `mutateAsync` 가 필터를 돌려주기만 하고, 실제 적용은 화면이 한다. 모델이 만든 필터가
 * 사용자가 애써 고른 필터를 말없이 덮어쓰면 그건 앱이 멋대로 움직인 것이다.
 */

import { useCallback, useState } from "react"
import { useMutation } from "@tanstack/react-query"

import { restaurantService } from "@/src/services/data/restaurantService"

import type { AiSearchResult, LatLng, MapBounds } from "../types"

export interface UseAiSearchResult {
  /** 마지막 결과. 새 질의를 시작하면 유지된다(깜빡임 방지) — 성공 시 교체된다. */
  result: AiSearchResult | null
  isPending: boolean
  isError: boolean
  error: unknown
  /** LLM 없이 키워드 매칭으로 만든 결과인가. */
  isFallback: boolean
  search: (query: string) => Promise<AiSearchResult | null>
  reset: () => void
}

export function useAiSearch(context: {
  viewport?: MapBounds | null
  userLocation?: LatLng | null
}): UseAiSearchResult {
  const [result, setResult] = useState<AiSearchResult | null>(null)

  const mutation = useMutation({
    mutationFn: (query: string) =>
      restaurantService.aiSearch({
        query,
        viewport: context.viewport
          ? {
              swLat: context.viewport.swLat,
              swLng: context.viewport.swLng,
              neLat: context.viewport.neLat,
              neLng: context.viewport.neLng,
            }
          : null,
        userLat: context.userLocation?.lat ?? null,
        userLng: context.userLocation?.lng ?? null,
      }),
    onSuccess: setResult,
  })

  const search = useCallback(
    async (query: string) => {
      const trimmed = query.trim()
      if (!trimmed) return null
      try {
        return await mutation.mutateAsync(trimmed)
      } catch {
        // 통신 자체가 끊긴 경우다(서버는 200 을 주므로 여기까지 오면 네트워크 문제).
        // 화면은 `isError` 로 재시도를 안내한다.
        return null
      }
    },
    [mutation],
  )

  const reset = useCallback(() => {
    setResult(null)
    mutation.reset()
  }, [mutation])

  return {
    result,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isFallback: result?.fallback === true,
    search,
    reset,
  }
}
