/**
 * 보관함 두 목록(저장한 레시피 · 최근 본 기록)의 공통 훅.
 *
 * 두 탭은 데이터 출처만 다르고 나머지(검색·필터·무한 스크롤·저장 낙관 갱신)가 전부
 * 같다. 훅을 하나로 두고 `useSavedRecipes` / `useRecentRecipes` 가 얇게 감싼다 —
 * 같은 코드를 두 벌 두면 한쪽만 고쳐지는 순간 두 탭이 다르게 동작한다.
 *
 * 저장 낙관 갱신의 규칙(계약 §2.1):
 *   1. `PUT` 은 절대 상태다. 토글이 아니라 목표 상태를 보낸다 → 연타·재시도에 안전.
 *   2. **반전 뒤 재조회하지 않는다.** invalidate 를 걸면 북마크가 꺼졌다 도로 켜진다.
 *      성공 응답의 saveCount 만 얹는다(재조회가 아니라 같은 요청의 결과다).
 *   3. 실패하면 저장해 둔 이전 캐시로 되돌리고 화면에 알린다.
 *   4. 저장 해제한 행을 목록에서 지우지 않는다(`patchSavedStateInPages` 주석 참고).
 *
 * 두 목록 캐시에 함께 얹는 이유: 같은 레시피가 두 탭에 동시에 있을 수 있다. 한쪽만
 * 갱신하면 탭을 옮겼을 때 북마크가 이전 상태로 보인다.
 */
import { useCallback, useMemo, useState } from "react"
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { normalizeLanguage } from "@/src/i18n"

import {
  toRecipeListQueryFilters,
  type RecipeFilterSelection,
} from "../components/list/recipeListFilterModel"
import {
  resolveResultCount,
  type ResultCount,
} from "../components/list/recipeListPresentation"
import { RECIPE_LIST_PAGE_SIZE } from "../services/recipeListV2Service"
import type {
  NutrientBudget,
  RecipeCard,
  RecipeListResponse,
} from "../types/recipeListV2"

import {
  flattenArchivePages,
  patchSavedStateInPages,
  recipeArchiveService,
  type ArchiveSource,
} from "./recipeArchiveService"

/** 두 목록 캐시의 공통 루트. 낙관 갱신이 이 접두어로 전부를 집는다. */
export const ARCHIVE_QUERY_ROOT = ["recipes", "archive"] as const

/**
 * 저장 상태를 바꾼 뒤 **반대쪽 목록**의 캐시를 무효화할 때 쓰는 접두어.
 * 키가 `[...ARCHIVE_QUERY_ROOT, source, …]` 라 출처까지만 주면 접두어로 잡힌다.
 */
export function archiveSourceQueryKey(source: ArchiveSource): readonly unknown[] {
  return [...ARCHIVE_QUERY_ROOT, source]
}

/** 저장 상태 변경이 영향을 주는 반대쪽 출처. */
function otherArchiveSource(source: ArchiveSource): ArchiveSource {
  return source === "saved" ? "recent" : "saved"
}

export interface UseRecipeArchiveListParams {
  source: ArchiveSource
  /** 확정된 검색어(화면에서 디바운스한 값). */
  q: string
  filter: RecipeFilterSelection
  /** 보이지 않는 탭까지 미리 받지 않도록 끌 수 있다. */
  enabled?: boolean
}

type ArchivePages = InfiniteData<RecipeListResponse, string | undefined>

/** 첫 페이지가 오기 전의 자리값. 0 이라 어떤 비율도 그려지지 않는다(§1.1). */
const PENDING_BUDGET: NutrientBudget = {
  sodiumMg: 0,
  potassiumMg: 0,
  phosphorusMg: 0,
  proteinG: null,
}

export interface UseRecipeArchiveListResult {
  recipes: RecipeCard[]
  budget: NutrientBudget
  /** 계약 §6.1 "결과 수를 먼저 보여준다". `kind` 가 문구를 고른다. */
  resultCount: ResultCount
  isLoading: boolean
  isError: boolean
  isRefetching: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  loadMore: () => void
  refresh: () => Promise<unknown>
  retry: () => void
  /** 절대 상태 지정(계약 §2.1). 낙관 갱신 후 실패하면 되돌린다. */
  setSaved: (recipeId: number, saved: boolean) => void
  /** 저장 요청이 실패했는가. 화면이 안내를 띄운 뒤 `clearSaveError()`. */
  saveFailed: boolean
  clearSaveError: () => void
}

export function useRecipeArchiveList({
  source,
  q,
  filter,
  enabled = true,
}: UseRecipeArchiveListParams): UseRecipeArchiveListResult {
  const { i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
  const queryClient = useQueryClient()
  const [saveFailed, setSaveFailed] = useState(false)

  // 캐시 키는 **서버로 나가는 값**으로 만든다. 화면 키(`low-salt`)로 만들면 매핑이
  // 바뀔 때 캐시가 안 갈려 이전 결과가 그대로 보인다.
  const queryFilters = useMemo(() => toRecipeListQueryFilters(filter), [filter])
  const categoriesKey = useMemo(
    () => [...queryFilters.categories].sort().join("|"),
    [queryFilters.categories],
  )
  const tagsKey = useMemo(
    () => [...queryFilters.tags].sort().join("|"),
    [queryFilters.tags],
  )

  const query = useInfiniteQuery<
    RecipeListResponse,
    Error,
    ArchivePages,
    readonly unknown[],
    string | undefined
  >({
    queryKey: [
      ...ARCHIVE_QUERY_ROOT,
      source,
      language,
      q,
      categoriesKey,
      tagsKey,
    ],
    enabled,
    initialPageParam: undefined,
    queryFn: ({ pageParam }) => {
      const params = {
        limit: RECIPE_LIST_PAGE_SIZE,
        cursor: pageParam,
        q,
        filter,
      }
      return source === "saved"
        ? recipeArchiveService.getSavedRecipes(params)
        : recipeArchiveService.getRecentRecipes(params)
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  })

  // `?? []` 를 여기서 하지 않는다 — 매 렌더 새 배열이 되어 아래 useMemo 가 항상 다시 돈다.
  const pages = query.data?.pages
  const recipes = useMemo(() => flattenArchivePages(pages ?? []), [pages])
  const budget = pages?.[0]?.budget ?? PENDING_BUDGET
  const resultCount = useMemo(
    () =>
      resolveResultCount(
        pages?.[0]?.totalCount ?? null,
        recipes.length,
        query.hasNextPage,
      ),
    [pages, recipes.length, query.hasNextPage],
  )

  /** 두 목록의 모든 캐시에 같은 패치를 얹는다. */
  const patchAllArchiveCaches = useCallback(
    (recipeId: number, saved: boolean, saveCountFromServer?: number) => {
      queryClient.setQueriesData<ArchivePages>(
        { queryKey: ARCHIVE_QUERY_ROOT },
        (old) =>
          old
            ? {
                ...old,
                pages: patchSavedStateInPages(
                  old.pages,
                  recipeId,
                  saved,
                  saveCountFromServer,
                ),
              }
            : old,
      )
    },
    [queryClient],
  )

  const saveMutation = useMutation({
    mutationFn: ({ recipeId, saved }: { recipeId: number; saved: boolean }) =>
      recipeArchiveService.setRecipeSaved(recipeId, saved),
    onMutate: async ({ recipeId, saved }) => {
      // 진행 중인 목록 요청이 낡은 응답으로 낙관 갱신을 덮어쓰지 않게 먼저 취소한다.
      await queryClient.cancelQueries({ queryKey: ARCHIVE_QUERY_ROOT })
      const snapshot = queryClient.getQueriesData<ArchivePages>({
        queryKey: ARCHIVE_QUERY_ROOT,
      })
      patchAllArchiveCaches(recipeId, saved)
      return { snapshot }
    },
    onSuccess: (result, { recipeId }) => {
      // 재조회가 아니다 — 방금 보낸 PUT 의 응답을 얹는 것이다(계약 §2.1).
      patchAllArchiveCaches(recipeId, result.saved, result.saveCount)

      /**
       * **반대쪽 목록은 패치로 고칠 수 없다.** `patchAllArchiveCaches` 는 캐시에 이미
       * 있는 행의 플래그만 바꾼다. "최근 본 기록" 에서 저장을 누르면 저장 목록 캐시에는
       * 그 행이 아예 없어서 고칠 대상이 없고, 결과가 실측된 결함이었다 — 서버는
       * `saved:true`·`saveCount:1` 로 저장을 받았는데 "저장한 레시피" 탭은 계속
       * "저장한 레시피가 없어요" 였다.
       *
       * 행을 손으로 끼워 넣지 않는다. 이 목록은 키셋 페이지네이션이라 어느 페이지의
       * 몇 번째에 넣어야 하는지는 서버의 정렬(`created_at DESC`)만 아는 값이고,
       * 추측해서 넣으면 다음 페이지 요청이 그 행을 한 번 더 준다.
       *
       * **현재 보고 있는 출처는 무효화하지 않는다.** 저장 목록에서 해제한 행을 즉시
       * 지우지 않기로 한 결정(`RecipeArchiveScreen` 머리말)을 재조회가 되돌려서,
       * 손가락 아래에서 항목이 사라지고 되돌릴 방법도 없어진다.
       */
      void queryClient.invalidateQueries({
        queryKey: archiveSourceQueryKey(otherArchiveSource(source)),
      });
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, data)
      }
      setSaveFailed(true)
    },
  })

  /**
   * `saveMutation` 자체를 의존성에 두면 안 된다. `useMutation` 은 매 렌더 **새 객체**
   * (`{...result, mutate, mutateAsync}`)를 돌려주므로 `setSaved` 가 매 렌더 새 함수가
   * 되고, 그러면 화면의 `renderItem` 도 매 렌더 새 함수가 되어 **검색어 한 글자마다
   * 보이는 카드 전부가 다시 그려진다**(이미지까지). `mutate` 는 옵저버에 묶인
   * `useCallback(..., [observer])` 라 렌더 사이에 안정적이다
   * (`node_modules/@tanstack/react-query/build/modern/useMutation.js` 실측).
   */
  const mutate = saveMutation.mutate
  const setSaved = useCallback(
    (recipeId: number, saved: boolean) => {
      setSaveFailed(false)
      mutate({ recipeId, saved })
    },
    [mutate],
  )

  const { hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = query

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const refresh = useCallback(() => refetch(), [refetch])
  const retry = useCallback(() => {
    void refetch()
  }, [refetch])
  const clearSaveError = useCallback(() => setSaveFailed(false), [])

  return {
    recipes,
    budget,
    resultCount,
    isLoading: query.isLoading,
    isError: query.isError,
    isRefetching: query.isRefetching,
    hasNextPage,
    isFetchingNextPage,
    loadMore,
    refresh,
    retry,
    setSaved,
    saveFailed,
    clearSaveError,
  }
}
