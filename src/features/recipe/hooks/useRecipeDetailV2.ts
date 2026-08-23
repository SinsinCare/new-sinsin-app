/**
 * 레시피 v2 상세 화면의 서버 상태. 계약 §2·§6.4 를 지킨다.
 *
 * ─── 낙관 갱신 규칙 (§6.4) ─────────────────────────────────────────────────
 * 저장·리뷰는 **절대 상태 PUT** 이다. 그래서:
 *   1. 낙관 갱신 후 **재조회하지 않는다.** 커뮤니티 좋아요에서 실측된 결함이 그것이다 —
 *      토글 반전 뒤 재조회하면 하트가 꺼졌다 도로 켜진다. 대신 응답의 절대값을 캐시에 쓴다.
 *   2. 실패하면 직전 스냅숏으로 되돌린다. 연타·재시도는 같은 상태를 두 번 보내는 것이라 안전하다.
 *
 * ─── 조회 기록 ─────────────────────────────────────────────────────────
 * `POST /recipes/{id}/views` 는 사용자가 요청한 동작이 아니다. 그래서 레시피당 한 번만
 * 보내고, 실패해도 화면은 아무 말도 하지 않는다(토스트를 띄우면 사용자가 뭘 잘못한 줄 안다).
 */
import { useCallback, useEffect, useRef } from "react"
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { normalizeLanguage, type Language } from "@/src/i18n"
import { patchSavedStateInPages } from "../archive/recipeArchiveService"
import {
  ARCHIVE_QUERY_ROOT,
  archiveSourceQueryKey,
} from "../archive/useRecipeArchiveList"
import { recipeDetailV2Service } from "../services/recipeDetailV2Service"
import type {
  RatingSummary,
  RecipeDetailView,
  ReviewListResponse,
  ReviewSort,
  UpsertMyReviewRequest,
} from "../types/recipeV2"
/**
 * 목록·아카이브 캐시에 실제로 들어 있는 모양은 `types/recipeListV2.ts` 다(내 `types/recipeV2.ts`
 * 의 `RecipeListResponse` 가 아니다). 두 파일이 계약 §3.1 을 각자 옮겨 놓아서 갈라져 있다 —
 * 실측 차이 둘: 목록 쪽 `RecipeCard.nutrition` 이 `| null` 이고, `RecipeListResponse` 에
 * 계약에 없는 `totalCount` 가 있다. 캐시를 만지는 코드는 **캐시를 만든 쪽의 타입**을 써야
 * 하므로 여기서만 그쪽을 들여온다. (§3.1 타입 중복은 보고에 적었다.)
 */
import type { RecipeListResponse as ListPageResponse } from "../types/recipeListV2"
/**
 * 목록 캐시의 루트 키. 상세에서 저장을 켜고 뒤로 나갔을 때 카드의 북마크가 옛 값이면
 * 커뮤니티 좋아요에서 났던 것과 같은 모양의 결함이다(§6.4). 그래서 저장 응답의 **절대값**을
 * 상세·목록·아카이브 세 캐시에 **쓴다** — 무효화(재조회)가 아니다. 재조회로 처리하면
 * 응답이 오는 사이 북마크가 꺼졌다 도로 켜진다.
 *
 * 이제 두 뿌리 다 **각 레인이 내보낸 상수를 import** 한다(목록 `RECIPE_LIST_QUERY_ROOT`,
 * 아카이브 `ARCHIVE_QUERY_ROOT`). 예전에는 목록 쪽만 여기 `["recipes-v2"]` 로 베껴
 * 두었고, 목록 레인이 키를 바꾸면 tsc 도 테스트도 아무 말 없이 **저장 반영만 조용히
 * 죽었다** — `tests/recipeDetailV2.test.ts` 가 두 소스의 문자열을 대조하는 검사를 들고
 * 있던 이유가 그것이다. 이제 컴파일 시점에 묶인다.
 */
import { RECIPE_LIST_QUERY_ROOT as LIST_QUERY_ROOT } from "./useRecipeListV2"

const REVIEW_PAGE_SIZE = 20

/** 무한 목록 캐시의 모양(`useInfiniteQuery` 의 `InfiniteData`). */
interface InfiniteListCache {
  pages: ListPageResponse[]
  pageParams: unknown[]
}

export const recipeV2Keys = {
  /** 상세·리뷰의 뿌리. 목록/홈의 `recipes-v2`(복수) 와 **다른 문자열**이다. */
  root: ["recipe-v2"] as const,
  detail: (locale: Language, recipeId: number) =>
    ["recipe-v2", "detail", locale, recipeId] as const,
  reviews: (recipeId: number, sort: ReviewSort) =>
    ["recipe-v2", "reviews", recipeId, sort] as const,
}

export function useRecipeLocale(): Language {
  const { i18n } = useTranslation()
  return normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
}

export function useRecipeDetailV2(recipeId: number | null) {
  const locale = useRecipeLocale()
  const viewedRef = useRef<number | null>(null)

  const query = useQuery({
    queryKey: recipeV2Keys.detail(locale, recipeId ?? -1),
    queryFn: () => recipeDetailV2Service.getRecipeDetail(recipeId!, locale),
    enabled: recipeId != null,
  })

  useEffect(() => {
    if (recipeId == null || !query.isSuccess) return
    if (viewedRef.current === recipeId) return
    viewedRef.current = recipeId
    void recipeDetailV2Service.recordView(recipeId).catch(() => {
      // 조회 기록 실패는 사용자에게 알리지 않는다. 다음 진입에서 다시 시도된다.
    })
  }, [query.isSuccess, recipeId])

  return query
}

/** 저장 상태 — 절대 지정. `saved` 를 그대로 보낸다(토글이 아니다). */
export function useRecipeSave(recipeId: number | null) {
  const locale = useRecipeLocale()
  const queryClient = useQueryClient()
  const key = recipeV2Keys.detail(locale, recipeId ?? -1)

  const patchDetail = useCallback(
    (patch: (old: RecipeDetailView) => RecipeDetailView) => {
      queryClient.setQueryData<RecipeDetailView>(key, (old) =>
        old ? patch(old) : old,
      )
    },
    [key, queryClient],
  )

  /**
   * 목록·아카이브 캐시에 같은 패치를 얹는다. **로드된 페이지가 있는 캐시만** 바뀌고
   * 없으면 `old` 를 그대로 돌려주므로, 두 레인이 아직 안 붙어 있어도 안전하다.
   */
  const patchLists = useCallback(
    (targetId: number, saved: boolean, saveCountFromServer?: number) => {
      for (const root of [LIST_QUERY_ROOT, ARCHIVE_QUERY_ROOT]) {
        queryClient.setQueriesData<InfiniteListCache>(
          { queryKey: root },
          (old) =>
            old && Array.isArray(old.pages)
              ? {
                  ...old,
                  pages: patchSavedStateInPages(
                    old.pages,
                    targetId,
                    saved,
                    saveCountFromServer,
                  ),
                }
              : old,
        )
      }
    },
    [queryClient],
  )

  return useMutation({
    mutationFn: (saved: boolean) =>
      recipeDetailV2Service.setSaved(recipeId!, saved),
    onMutate: async (saved) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<RecipeDetailView>(key)
      // 목록 스냅숏도 같이 잡는다 — 실패하면 상세만 되돌리고 목록이 남으면 두 화면이 어긋난다.
      const previousLists = [LIST_QUERY_ROOT, ARCHIVE_QUERY_ROOT].flatMap(
        (root) =>
          queryClient.getQueriesData<InfiniteListCache>({ queryKey: root }),
      )
      patchDetail((old) => ({
        ...old,
        saved,
        // 카운트는 서버 응답으로 덮인다. 낙관 표시가 한 칸 어긋나 보이지 않게만 맞춘다.
        saveCount: Math.max(0, old.saveCount + (saved ? 1 : -1)),
      }))
      if (recipeId != null) patchLists(recipeId, saved)
      return { previous, previousLists }
    },
    onSuccess: (result) => {
      // 절대 상태 응답을 그대로 쓴다 — 재조회하지 않는다(§6.4).
      patchDetail((old) => ({
        ...old,
        saved: result.saved,
        saveCount: result.saveCount,
      }))
      if (recipeId != null) patchLists(recipeId, result.saved, result.saveCount)

      /**
       * **저장 목록은 패치로 고칠 수 없다.** `patchLists` 는 캐시에 이미 있는 행의
       * 플래그만 바꾼다. 상세에서 처음 저장하면 저장 목록 캐시에는 그 행이 없어서 고칠
       * 대상이 없고, 보관함은 계속 "저장한 레시피가 없어요" 로 남는다(아카이브 훅에서
       * 실측된 것과 같은 결함이다).
       *
       * 행을 손으로 끼워 넣지 않는다 — 키셋 페이지네이션이라 위치는 서버의 정렬만
       * 아는 값이고, 추측해서 넣으면 다음 페이지가 그 행을 한 번 더 준다.
       *
       * 무효화 대상은 저장 목록뿐이다. "최근 본 기록" 은 위 `patchLists` 가 플래그를
       * 이미 맞췄고, 이 레시피는 지금 열어 봤으므로 그 목록에서 빠지거나 들어오지 않는다.
       */
      void queryClient.invalidateQueries({
        queryKey: archiveSourceQueryKey("saved"),
      })
    },
    onError: (_error, _saved, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      for (const [listKey, data] of context?.previousLists ?? []) {
        queryClient.setQueryData(listKey, data)
      }
    },
  })
}

export function useRecipeReviews(
  recipeId: number | null,
  sort: ReviewSort = "recent",
) {
  return useInfiniteQuery({
    queryKey: recipeV2Keys.reviews(recipeId ?? -1, sort),
    enabled: recipeId != null,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      recipeDetailV2Service.getReviews(recipeId!, {
        limit: REVIEW_PAGE_SIZE,
        cursor: pageParam,
        sort,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  })
}

/** 내 리뷰 쓰기·지우기. 둘 다 멱등이라 재시도가 안전하다(§3.4). */
export function useMyReview(recipeId: number | null, sort: ReviewSort) {
  const locale = useRecipeLocale()
  const queryClient = useQueryClient()
  const detailKey = recipeV2Keys.detail(locale, recipeId ?? -1)
  const reviewsKey = recipeV2Keys.reviews(recipeId ?? -1, sort)

  const applySummary = useCallback(
    (summary: RatingSummary, myReview: RecipeDetailView["myReview"]) => {
      queryClient.setQueryData<RecipeDetailView>(detailKey, (old) =>
        old ? { ...old, rating: summary, myReview } : old,
      )
      // 목록은 서버가 정한 순서를 따라야 한다(내 리뷰가 어디에 끼는지 앱이 정하지 않는다).
      void queryClient.invalidateQueries({ queryKey: reviewsKey })
    },
    [detailKey, queryClient, reviewsKey],
  )

  const upsert = useMutation({
    mutationFn: (request: UpsertMyReviewRequest) =>
      recipeDetailV2Service.upsertMyReview(recipeId!, request),
    onSuccess: (result) => applySummary(result.summary, result.review),
  })

  const remove = useMutation({
    mutationFn: () => recipeDetailV2Service.deleteMyReview(recipeId!),
    onSuccess: (result) => applySummary(result.summary, null),
  })

  return { upsert, remove }
}

/** 리뷰 페이지들을 한 배열로. 화면이 페이지 경계를 알 필요가 없다. */
export function flattenReviewPages(
  pages: readonly ReviewListResponse[] | undefined,
) {
  return pages?.flatMap((page) => page.items) ?? []
}
