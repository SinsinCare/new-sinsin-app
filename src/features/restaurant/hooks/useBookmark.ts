/**
 * 북마크 토글. **네 캐시를 동시에** 낙관 갱신한다.
 *
 * ## 왜 네 곳인가
 *
 * 같은 식당이 화면 네 군데에 동시에 존재한다 — 지도 마커, 시트/리스트 카드, 상세 헤더,
 * 저장한 곳 목록. 목록 훅에서만 토글하면 상세 화면의 하트는 안 바뀐다(`usePostDetail` 이
 * 상세와 목록 캐시를 함께 갱신하는 이유가 정확히 이것이다). 지도까지 있으니 여기서는
 * 네 곳이다. 한 곳을 빼먹으면 "저장했는데 지도 마커는 그대로" 인 화면이 남는다.
 *
 * ## 서버가 돌려준 값을 최종값으로 쓴다
 *
 * `mealrec.toggleBookmark` 는 요청한 상태를 그대로 저장하고 그대로 돌려줬다. 연타하면
 * 저장된 행과 응답이 어긋났다(문서화된 결함). 새 API 는 **저장 후 다시 읽은** 상태를
 * 준다. 그래서 `onSuccess` 에서 응답의 `bookmarked` 로 한 번 더 덮어쓴다 — 낙관값과
 * 서버값이 다르면 서버가 이긴다.
 *
 * ## 연타 방어
 *
 * 같은 식당에 대한 요청이 진행 중이면 두 번째 탭을 무시한다. 엔드포인트가 멱등이라
 * 데이터가 깨지지는 않지만, PUT→DELETE 가 뒤집혀 도착하면 최종 상태가 사용자의
 * 마지막 의도와 달라질 수 있다.
 */

import { useCallback, useRef } from "react"
import { showErrorToast } from "@/src/lib/toast"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { normalizeLanguage } from "@/src/i18n"
import { restaurantService } from "@/src/services/data/restaurantService"

import type {
  BookmarkToggleResponse,
  MapSearchResponse,
  RestaurantDetailDto,
} from "../types"
import {
  RESTAURANT_BOOKMARKS_KEY,
  RESTAURANT_LIST_KEY,
  RESTAURANT_MAP_KEY,
  restaurantKeys,
} from "./restaurantQueryKeys"

/**
 * 무한쿼리 캐시의 최소 모양.
 *
 * `RestaurantCardDto[]` 로 쓰지 않는다. 목록 캐시(`/search`)와 저장 목록 캐시
 * (`/bookmarks`)의 **항목 모양이 서로 다르고**(후자는 `safety` 가 없고 `bookmarkedAt` 이
 * 있다), 여기서 하는 일은 `restaurantId` 로 찾아 `bookmarked` 한 칸을 뒤집는 것뿐이다.
 * 카드 전체 모양을 요구하면 두 캐시 중 하나에는 거짓말을 하게 된다 — 그 거짓말이 이
 * 기능에서 이미 한 번 사고를 냈다. 낙관 갱신이 만지는 두 필드만 선언한다.
 */
interface BookmarkPatchable {
  restaurantId: number
  bookmarked: boolean
}

interface InfiniteCards {
  pages: { items: BookmarkPatchable[] }[]
  pageParams: unknown[]
}

interface ToggleVars {
  restaurantId: number
  /** **현재** 저장 상태. 이 값을 뒤집는다. */
  bookmarked: boolean
}

interface ToggleContext {
  map: [readonly unknown[], MapSearchResponse | undefined][]
  list: [readonly unknown[], InfiniteCards | undefined][]
  bookmarks: [readonly unknown[], InfiniteCards | undefined][]
  detail: RestaurantDetailDto | undefined
}

export interface UseBookmarkResult {
  /** 토글. 낙관 갱신이 즉시 반영되고, 실패하면 되돌린다. */
  toggleBookmark: (vars: ToggleVars) => void
  /**
   * 아무 식당의 토글이든 진행 중인가. 뮤테이션 상태이므로 렌더에 쓸 수 있다.
   *
   * 식당별 진행 여부(`isPendingFor`)는 **일부러 내보내지 않는다.** 그 값의 근거는
   * `inFlight` 라는 ref 인데, ref 를 바꿔도 리렌더가 돌지 않는다. `isPendingFor(id) ?
   * <Spinner/> : <Heart/>` 로 쓰면 스피너가 토글 시작에 나타나지도, 끝에 사라지지도
   * 않고 **직전 렌더의 값**이 그대로 남는다. 애초에 하트는 낙관 갱신으로 즉시 뒤집히므로
   * 식당별 로딩 표시가 필요하지도 않다. ref 는 이중 탭 가드로만 남긴다(그쪽은 명령형으로
   * 읽으므로 정확하다).
   */
  isPending: boolean
}

export function useBookmark(): UseBookmarkResult {
  const { t, i18n } = useTranslation("common")
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
  const queryClient = useQueryClient()
  const inFlight = useRef<Set<number>>(new Set())

  /** 네 캐시에 같은 패치를 적용한다. 한 함수로 묶어 두어야 한 곳을 빠뜨릴 수 없다. */
  const applyPatch = useCallback(
    (restaurantId: number, bookmarked: boolean) => {
      // 1) 지도 마커
      queryClient.setQueriesData<MapSearchResponse>(
        { queryKey: RESTAURANT_MAP_KEY },
        (old) => {
          if (!old) return old
          if (!old.markers.some((m) => m.restaurantId === restaurantId)) {
            return old
          }
          return {
            ...old,
            markers: old.markers.map((m) =>
              m.restaurantId === restaurantId ? { ...m, bookmarked } : m,
            ),
          }
        },
      )

      // 2) 목록 카드
      queryClient.setQueriesData<InfiniteCards>(
        { queryKey: RESTAURANT_LIST_KEY },
        (old) => patchCards(old, restaurantId, bookmarked),
      )

      // 3) 저장한 곳 — 해제하면 목록에서 사라져야 한다. 추가는 카드 원본이 없어
      //    낙관적으로 만들 수 없으므로 `onSettled` 의 무효화가 채운다.
      queryClient.setQueriesData<InfiniteCards>(
        { queryKey: RESTAURANT_BOOKMARKS_KEY },
        (old) => {
          if (!old) return old
          if (bookmarked) return patchCards(old, restaurantId, true)
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((i) => i.restaurantId !== restaurantId),
            })),
          }
        },
      )

      // 4) 상세
      queryClient.setQueryData<RestaurantDetailDto>(
        restaurantKeys.detail(language, restaurantId),
        (old) => (old ? { ...old, bookmarked } : old),
      )
    },
    [queryClient, language],
  )

  const mutation = useMutation<
    BookmarkToggleResponse,
    unknown,
    ToggleVars,
    ToggleContext
  >({
    mutationFn: ({ restaurantId, bookmarked }) =>
      bookmarked
        ? restaurantService.removeBookmark(restaurantId)
        : restaurantService.addBookmark(restaurantId),

    onMutate: async ({ restaurantId, bookmarked }) => {
      inFlight.current.add(restaurantId)
      // 진행 중 재조회가 낙관값을 덮어쓰지 못하게 먼저 끊는다.
      await queryClient.cancelQueries({ queryKey: RESTAURANT_MAP_KEY })
      await queryClient.cancelQueries({ queryKey: RESTAURANT_LIST_KEY })
      await queryClient.cancelQueries({ queryKey: RESTAURANT_BOOKMARKS_KEY })
      await queryClient.cancelQueries({
        queryKey: restaurantKeys.detail(language, restaurantId),
      })

      const context: ToggleContext = {
        map: queryClient.getQueriesData<MapSearchResponse>({
          queryKey: RESTAURANT_MAP_KEY,
        }),
        list: queryClient.getQueriesData<InfiniteCards>({
          queryKey: RESTAURANT_LIST_KEY,
        }),
        bookmarks: queryClient.getQueriesData<InfiniteCards>({
          queryKey: RESTAURANT_BOOKMARKS_KEY,
        }),
        detail: queryClient.getQueryData<RestaurantDetailDto>(
          restaurantKeys.detail(language, restaurantId),
        ),
      }

      applyPatch(restaurantId, !bookmarked)
      return context
    },

    onError: (_error, { restaurantId }, context) => {
      if (!context) return
      // 스냅샷을 그대로 되돌린다. 부분 롤백은 화면 간 불일치를 남긴다.
      for (const [key, value] of context.map) {
        queryClient.setQueryData(key, value)
      }
      for (const [key, value] of context.list) {
        queryClient.setQueryData(key, value)
      }
      for (const [key, value] of context.bookmarks) {
        queryClient.setQueryData(key, value)
      }
      queryClient.setQueryData(
        restaurantKeys.detail(language, restaurantId),
        context.detail,
      )
      /*
        **되돌린 사실을 말한다.** 낙관 갱신이 조용히 원복되면, 사용자 눈에는 북마크가
        켜졌다가 저절로 꺼진 것으로 보인다 — 누른 것이 안 먹혔는지 앱이 이상한 건지
        구분할 방법이 없다. 저장 실패는 다시 누르면 되는 종류라 토스트 한 줄이면 된다.
      */
      showErrorToast(t("restaurant.error.bookmarkFailed"))
    },

    onSuccess: (result) => {
      // 서버가 다시 읽은 최종 상태로 한 번 더 맞춘다. 낙관값과 다르면 서버가 이긴다.
      applyPatch(result.restaurantId, result.bookmarked)
    },

    onSettled: (_data, _error, { restaurantId }) => {
      inFlight.current.delete(restaurantId)
      // 저장 목록은 낙관적으로 카드를 만들 수 없으므로 서버에서 다시 받는다.
      void queryClient.invalidateQueries({ queryKey: RESTAURANT_BOOKMARKS_KEY })
    },
  })

  const toggleBookmark = useCallback(
    (vars: ToggleVars) => {
      if (inFlight.current.has(vars.restaurantId)) return
      mutation.mutate(vars)
    },
    [mutation],
  )

  return { toggleBookmark, isPending: mutation.isPending }
}

function patchCards(
  old: InfiniteCards | undefined,
  restaurantId: number,
  bookmarked: boolean,
): InfiniteCards | undefined {
  if (!old) return old
  // 대상이 없는 캐시는 새 객체를 만들지 않는다 — 무의미한 리렌더를 줄인다.
  const touched = old.pages.some((page) =>
    page.items.some((i) => i.restaurantId === restaurantId),
  )
  if (!touched) return old
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.restaurantId === restaurantId ? { ...item, bookmarked } : item,
      ),
    })),
  }
}
