/**
 * 사진 탭 / 사진 전체보기. 카테고리 칩 + 커서 페이지네이션.
 *
 * ## 카운트는 서버가 준다
 *
 * 목업의 `전체 999+ / 메뉴판 240 / 영양정보 201` 칩은 **받아온 사진 수로 만들 수 없다**.
 * 첫 페이지만 받은 상태에서 그 숫자를 세면 "메뉴판 20" 이 된다. 그래서 응답의
 * `categoryCounts` 를 쓴다. `999+` 표기 규칙도 여기서 한 번만 정한다.
 */

import { useCallback, useMemo } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { normalizeLanguage } from "@/src/i18n"
import { restaurantService } from "@/src/services/data/restaurantService"

import type { PhotoCategory, PhotoCategoryCounts, PhotoDto } from "../types"
import { restaurantKeys } from "./restaurantQueryKeys"

/**
 * 목업 -15 의 칩 순서. `ALL` 은 서버 열거형이 아니라 화면의 기본값이다.
 *
 * **`OWNER` 가 빠져 있었다.** 서버는 그 카테고리로 내려 주고 라벨(`대표사진`)도 있는데
 * 이 배열에만 없어서, 실측 **876장·86곳**이 칩으로 도달 불가였다. 증상은 조용하다 —
 * `전체 31 / 후기 1` 처럼 합이 안 맞는 칩 줄이 뜨고, 나머지 30장을 고를 방법이 없다.
 * 0건 카테고리는 어차피 `PhotoTab` 이 걸러 내므로 여기 넣는 것이 안전하다.
 */
export const PHOTO_CATEGORY_CHIPS: readonly (PhotoCategory | "ALL")[] = [
  "ALL",
  "OWNER",
  "MENUBOARD",
  "NUTRITION",
  "MENU",
  "REVIEW",
] as const

/** 목업의 `999+`. 이 수 이상은 정확한 값을 말하지 않는다. */
const COUNT_CAP = 999

/** `1413` → `"999+"`, `240` → `"240"`. 카운트 칩 라벨 전용. */
export function formatPhotoCount(count: number): string {
  return count > COUNT_CAP ? `${COUNT_CAP}+` : String(count)
}

export const PHOTO_PAGE_SIZE = 30

export interface UseRestaurantPhotosResult {
  photos: PhotoDto[]
  categoryCounts: PhotoCategoryCounts
  /**
   * 필터 없이 센 전체 사진 수. `categoryCounts` 에 `all` 키가 **없어서** 별도로 있다
   * (예전 화면이 `categoryCounts.all` 을 읽어 `전체` 칩이 `undefined` 를 그렸다).
   */
  totalCount: number
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  /**
   * 다음 쪽만 실패했다(첫 쪽은 이미 있다). `isError` 와 갈라 두는 이유는
   * 훅 안 주석에 있다 — 하나로 두면 다음 쪽 실패가 읽던 내용을 지운다.
   */
  nextPageFailed: boolean
  isError: boolean
  error: unknown
  loadMore: () => void
  refetch: () => void
}

export function useRestaurantPhotos(
  restaurantId: number | null,
  category: PhotoCategory | "ALL" = "ALL",
): UseRestaurantPhotosResult {
  const { i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)

  const infinite = useInfiniteQuery({
    queryKey: restaurantKeys.photos(language, restaurantId ?? 0, category),
    enabled: restaurantId !== null,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      restaurantService.fetchPhotos(
        restaurantId as number,
        { category, cursor: pageParam, limit: PHOTO_PAGE_SIZE },
        signal,
      ),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  })

  const pages = infinite.data?.pages

  const photos = useMemo<PhotoDto[]>(() => {
    if (!pages) return []
    const seen = new Set<number>()
    const merged: PhotoDto[] = []
    for (const page of pages) {
      for (const photo of page.items) {
        if (seen.has(photo.photoId)) continue
        seen.add(photo.photoId)
        merged.push(photo)
      }
    }
    return merged
  }, [pages])

  const loadMore = useCallback(() => {
    if (infinite.hasNextPage && !infinite.isFetchingNextPage) {
      void infinite.fetchNextPage()
    }
  }, [infinite])

  return {
    photos,
    // 집계는 첫 페이지 값만 쓴다 — 모든 페이지에 같은 값이 실려 오고, 마지막 페이지에서
    // 읽으면 스크롤할 때마다 칩 라벨이 다시 그려진다.
    categoryCounts: pages?.[0]?.categoryCounts ?? {},
    totalCount: pages?.[0]?.total ?? 0,
    isLoading: infinite.isLoading,
    isFetchingNextPage: infinite.isFetchingNextPage,
    hasNextPage: infinite.hasNextPage === true,
    /*
      **의미를 좁힌다.** query-core 는 이미 받아 둔 데이터가 있어도 실패한 fetch 마다
      `status:"error"` 로 가는데, 호출부는 이 값을 보고 화면을 통째로 지운다. 그러면
      다음 쪽 하나가 실패했을 때 읽고 있던 것까지 사라진다 — 자동 로딩을 켜면 요청이
      잦아져 상시화되는 결함이다.

      이름을 안 바꾸는 것은 호출부를 안 건드리기 위해서고, 저장소 관례와도 맞는다
      (`RestaurantDetailScreen` 은 이미 `isError && !detail` 로 쓴다).
    */
    isError: infinite.isError && infinite.data === undefined,
    /** 다음 쪽만 실패했다. 읽던 내용은 그대로 두고 재시도 손잡이만 붙인다. */
    nextPageFailed: infinite.isFetchNextPageError,
    error: infinite.error,
    loadMore,
    refetch: infinite.refetch,
  }
}
