/**
 * 레시피 v2 목록 훅. 기존 `useInfiniteRecipes` 를 대체하지만 **지우지 않는다** —
 * 다른 화면(홈 추천 등)이 아직 v1 카드 타입을 읽는다.
 *
 * v1 과 다른 점:
 *  - 계약 §3.1 의 `sort` 5종과 `budget` 을 다룬다(v1 은 정렬이 없었다).
 *  - 카테고리·태그 매핑이 훅 안이 아니라 필터 모델(`recipeListFilterModel`)에 있다.
 *  - 응답에 `totalCount` 가 있으면 "검색 결과 N개" 를 정확히 말하고, 없으면
 *    "N개 이상" 으로 내려간다(§6.1 "결과 수를 먼저 보여준다" 를 거짓말 없이 지키는 법).
 */
import { useCallback, useMemo } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { normalizeLanguage } from "@/src/i18n"

import {
  type RecipeFilterSelection,
  toRecipeListQueryFilters,
} from "../components/list/recipeListFilterModel"
import { resolveResultCount } from "../components/list/recipeListPresentation"
import {
  RECIPE_LIST_PAGE_SIZE,
  recipeListV2Service,
} from "../services/recipeListV2Service"
import type {
  NutrientBudget,
  RecipeCard,
  RecipeSortKey,
} from "../types/recipeListV2"

export interface UseRecipeListV2Params {
  /** 확정된 검색어. 입력 중(초안)이 아니라 확정된 것만 목록을 바꾼다. */
  query: string
  filters: RecipeFilterSelection
  sort: RecipeSortKey
}

export function useRecipeListV2({
  query,
  filters,
  sort,
}: UseRecipeListV2Params) {
  const { i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
  const { categories, tags } = useMemo(
    () => toRecipeListQueryFilters(filters),
    [filters],
  )
  const trimmedQuery = query.trim()

  const infinite = useInfiniteQuery({
    // 로케일이 키에 들어간다 — 언어를 바꾸면 표시용 카테고리·난이도가 달라진다.
    queryKey: [
      "recipes-v2",
      language,
      trimmedQuery,
      categories.join(","),
      tags.join(","),
      sort,
    ],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      recipeListV2Service.getRecipeList({
        limit: RECIPE_LIST_PAGE_SIZE,
        cursor: pageParam,
        q: trimmedQuery,
        categories,
        tags,
        sort,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  })

  const pages = infinite.data?.pages

  const items = useMemo<RecipeCard[]>(() => {
    if (!pages) return []
    const seen = new Set<number>()
    const merged: RecipeCard[] = []
    for (const page of pages) {
      for (const card of page.items) {
        // 커서 페이지네이션에서 경계 항목이 두 번 오면 FlatList 가 key 중복으로 경고한다.
        if (seen.has(card.id)) continue
        seen.add(card.id)
        merged.push(card)
      }
    }
    return merged
  }, [pages])

  /** 마지막 페이지의 참고량을 쓴다 — 사용자가 그 사이에 식사를 기록했으면 최신값이다. */
  const budget = useMemo<NutrientBudget | null>(() => {
    if (!pages?.length) return null
    return pages[pages.length - 1].budget
  }, [pages])

  const resultCount = useMemo(
    () =>
      resolveResultCount(
        pages?.[0]?.totalCount ?? null,
        items.length,
        infinite.hasNextPage === true,
      ),
    [pages, items.length, infinite.hasNextPage],
  )

  const loadMore = useCallback(() => {
    if (infinite.hasNextPage && !infinite.isFetchingNextPage) {
      void infinite.fetchNextPage()
    }
  }, [infinite])

  return {
    items,
    budget,
    resultCount,
    isLoading: infinite.isLoading,
    isError: infinite.isError,
    error: infinite.error,
    isRefetching: infinite.isRefetching,
    isFetchingNextPage: infinite.isFetchingNextPage,
    hasNextPage: infinite.hasNextPage === true,
    loadMore,
    refetch: infinite.refetch,
  }
}
