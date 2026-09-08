import { useRevalidateOnReturn } from "@/src/shared/refresh"
/**
 * 메뉴 탭 데이터. 이 화면이 기능의 핵심이다 — 메뉴 단위 안전도 트리아지.
 *
 * ## 응답을 유저 간에 공유하지 않는다
 *
 * `safetyLevel` 은 요청 시각에 **그 사용자의** 기준(`effectiveLimits`)으로 계산된다.
 * 이 응답을 전역 캐시나 서버 캐시로 승격하면 한 환자의 배지가 다른 환자에게 새고,
 * 그건 임상적으로 위험한 종류의 버그다. react-query 캐시는 프로세스 안에 있고
 * 로그아웃 시 `clearClientSession` 이 정리하므로 여기서는 안전하다.
 *
 * ## 정렬: 위험한 것을 먼저 보여 주지 않는다
 *
 * 목업은 메뉴판 순서(대표 메뉴 먼저)를 따른다. 안전도로 재정렬하면 "제한" 이 위로 몰려
 * 사용자가 그 식당을 못 갈 곳으로 오해한다. 서버 순서를 그대로 쓰고, 대표 메뉴만 위로 올린다.
 */

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { normalizeLanguage } from "@/src/i18n"
import { restaurantService } from "@/src/services/data/restaurantService"

import type { MenuItemDto, SafetySummaryDto } from "../types"
import { restaurantKeys } from "./restaurantQueryKeys"

export interface UseRestaurantMenusResult {
  menus: MenuItemDto[]
  /** 목업 홈 탭의 "메뉴 3개" 미리보기용. */
  previewMenus: MenuItemDto[]
  safetySummary: SafetySummaryDto | null
  /** 프로필이 없어 전부 `UNKNOWN` 이다 → 배지 대신 프로필 설정 유도를 띄운다. */
  profileMissing: boolean
  /**
   * 하나라도 추정값이 있는가. 오늘 DB 는 100% `ESTIMATED` 이므로 사실상 항상 `true` 다.
   * 그래도 상수로 박지 않는다 — 검수 데이터가 들어오면 문구가 저절로 바뀌어야 한다.
   */
  hasEstimated: boolean
  /**
   * 서버 상한(300)에 닿아 목록이 잘렸다.
   *
   * 노출하지 않으면 화면이 절단을 알 방법이 없다 — 계약 §6 의 "조용한 절단 금지" 는
   * 지도뿐 아니라 메뉴에도 걸린다. 메뉴가 300개인 식당은 아직 없지만, 생기는 날
   * 사용자가 "이 집엔 이 메뉴가 없네" 로 잘못 읽는 것이 이 값을 빼먹은 대가다.
   */
  truncated: boolean
  isLoading: boolean
  isRefreshing: boolean
  isError: boolean
  error: unknown
  refetch: () => void
}

/** 홈 탭 미리보기에 노출할 메뉴 수. 목업 §4.2. */
const PREVIEW_COUNT = 3

export function useRestaurantMenus(
  restaurantId: number | null,
): UseRestaurantMenusResult {
  const { i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)

  useRevalidateOnReturn({
    queryKeys: [restaurantKeys.menus(language, restaurantId ?? 0)],
    enabled: restaurantId !== null,
  })

  const query = useQuery({
    queryKey: restaurantKeys.menus(language, restaurantId ?? 0),
    enabled: restaurantId !== null,
    // Personal portions include today's intake; refresh whenever the detail is reopened.
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: () => restaurantService.fetchMenus(restaurantId as number),
  })

  // `?? []` 를 useMemo 로 감싼다 — 그냥 쓰면 매 렌더 새 배열이라 아래 useMemo 가 항상 다시 돈다.
  const menus = useMemo(() => query.data?.menus ?? [], [query.data?.menus])

  const previewMenus = useMemo(() => {
    // 대표 메뉴(`isSignature`)를 앞으로. 그 외는 서버 순서를 유지한다.
    const signature = menus.filter((m) => m.isSignature)
    const rest = menus.filter((m) => !m.isSignature)
    return [...signature, ...rest].slice(0, PREVIEW_COUNT)
  }, [menus])

  return {
    menus,
    previewMenus,
    safetySummary: query.data?.safetySummary ?? null,
    profileMissing: query.data?.profileMissing ?? false,
    hasEstimated: menus.some((m) => m.confidence === "ESTIMATED"),
    truncated: query.data?.truncated ?? false,
    isLoading: query.isLoading,
    isRefreshing: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
