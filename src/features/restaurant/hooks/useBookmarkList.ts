/**
 * `저장한 곳` 화면. 커서 목록이고, 캐시 키는 `useBookmark` 의 낙관 갱신 대상과 같다 —
 * 다른 화면에서 저장을 해제하면 여기서도 즉시 사라진다.
 */

import { useCallback, useMemo } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { normalizeLanguage } from "@/src/i18n"
import { restaurantService } from "@/src/services/data/restaurantService"

import type { BookmarkCardDto } from "../types"
import { restaurantKeys } from "./restaurantQueryKeys"

export interface UseBookmarkListResult {
  /**
   * **`RestaurantCardDto` 가 아니다.** 저장한 곳 응답은 더 얇고(`safety` 없음,
   * `bookmarkedAt` 있음) 모양이 다르다 — 예전에는 같은 타입으로 선언해 두어 카드가
   * 없는 필드를 읽고 있었다. 차이의 근거는 `BookmarkCardDto` 헤더에 있다.
   */
  items: BookmarkCardDto[]
  isLoading: boolean
  isRefetching: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  isError: boolean
  error: unknown
  loadMore: () => void
  refetch: () => void
}

export function useBookmarkList(enabled = true): UseBookmarkListResult {
  const { i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)

  const infinite = useInfiniteQuery({
    queryKey: restaurantKeys.bookmarks(language),
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => restaurantService.fetchBookmarks(pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  })

  const items = useMemo<BookmarkCardDto[]>(() => {
    const pages = infinite.data?.pages
    if (!pages) return []
    const seen = new Set<number>()
    const merged: BookmarkCardDto[] = []
    for (const page of pages) {
      for (const card of page.items) {
        if (seen.has(card.restaurantId)) continue
        seen.add(card.restaurantId)
        merged.push(card)
      }
    }
    return merged
  }, [infinite.data?.pages])

  const loadMore = useCallback(() => {
    if (infinite.hasNextPage && !infinite.isFetchingNextPage) {
      void infinite.fetchNextPage()
    }
  }, [infinite])

  return {
    items,
    isLoading: infinite.isLoading,
    isRefetching: infinite.isRefetching,
    isFetchingNextPage: infinite.isFetchingNextPage,
    hasNextPage: infinite.hasNextPage === true,
    isError: infinite.isError,
    error: infinite.error,
    loadMore,
    refetch: infinite.refetch,
  }
}
