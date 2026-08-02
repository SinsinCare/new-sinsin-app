/**
 * 레시피 홈(오늘의 아침·점심·저녁) 훅 — 계약 §2.
 *
 * ## 쿼리 키를 `["recipes-v2", "home", locale]` 로 둔 이유
 *
 * 지시는 "기존 루트 상수와 충돌하지 않게 새로 만들되, 저장 상태가 섹션 카드에도 반영되게
 * 캐시 패치 대상에 넣어라" 였다. 두 요구를 **한 키로** 만족시킨다:
 *
 *  - 충돌하지 않는다. 목록 키는 `["recipes-v2", language, q, categories, tags, sort]` 로
 *    2번째 칸이 로케일이다. 홈은 그 자리에 `"home"` 이 박혀 있어 어떤 목록 키와도 같아질
 *    수 없고(로케일은 `ko`/`en` 뿐), 서로의 캐시를 덮지 않는다.
 *  - 저장 상태가 따라온다. `useRecipeDetailV2.ts` 의 `patchLists` 는 `["recipes-v2"]`
 *    **접두 일치**로 캐시를 훑어 `patchSavedStateInPages(old.pages, …)` 를 얹는다.
 *    그래서 이 훅의 캐시는 섹션 배열을 `pages` 로 들고 있고(→ `types/recipeHome.ts` 의
 *    `RecipeHomeCache` 주석), 상세에서 저장한 절대값이 섹션 카드에도 그대로 반영된다.
 *    `patchLists` 는 `Array.isArray(old.pages)` 가 아니면 손대지 않으므로 이 모양이
 *    아니면 **조용히 아무 일도 일어나지 않는다** — 그 결함이 이미 한 번 실측됐다.
 *
 * `useRecipeDetailV2.ts` 에 홈 루트를 더하는 쪽이 더 직설적이지만 그 파일은 이 갈래의
 * 소유가 아니다. 효과가 같고 고치는 파일이 내 것뿐인 쪽을 택했다(보고에 적었다).
 *
 * ## 왜 `useQuery` 인가
 * 홈에는 커서가 없다(서버 라우트가 `cursor`·`limit`·`sort` 를 받지 않는다). 더 보려면
 * 목록 API 의 `?mealSlot=` 로 이어 가는 것이 계약이다.
 */
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { normalizeLanguage, type Language } from "@/src/i18n"

import { recipeHomeService } from "../services/recipeHomeService"
import type {
  MealSlot,
  RecipeHomeCache,
  RecipeHomeSection,
  SlotDecision,
} from "../types/recipeHome"
import { toRecipeHomeCache } from "../types/recipeHome"
import type { NutrientBudget } from "../types/recipeListV2"

/** 목록 캐시와 같은 루트를 공유한다 — 위 주석의 두 번째 이유가 그것이다. */
export const RECIPE_HOME_QUERY_ROOT = ["recipes-v2", "home"] as const

export function recipeHomeQueryKey(locale: Language) {
  return [...RECIPE_HOME_QUERY_ROOT, locale] as const
}

export interface UseRecipeHomeResult {
  /** 서버가 준 **순서 그대로**. 화면이 시계를 보고 다시 정렬하지 않는다(계약 §2). */
  sections: readonly RecipeHomeSection[]
  /** 서버가 정한 지금의 끼니. 표시용이 아니라 "첫 섹션이 왜 이것인가" 의 근거다. */
  currentSlot: MealSlot | null
  /**
   * 그 근거를 **문장으로 그릴 수 있는 값**. 서버가 시계만 보지 않으므로(오늘 기록한
   * 끼니는 건너뛴다) 이유를 말하지 않으면 사용자는 순서가 왜 이런지 알 수 없다.
   */
  slotDecision: SlotDecision | null
  budget: NutrientBudget | null
  isLoading: boolean
  isError: boolean
  refetch: () => Promise<unknown>
}

export function useRecipeHome(): UseRecipeHomeResult {
  const { i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)

  const query = useQuery<RecipeHomeCache>({
    queryKey: recipeHomeQueryKey(language),
    queryFn: async () =>
      toRecipeHomeCache(await recipeHomeService.getRecipeHome(language)),
  })

  const sections = useMemo<readonly RecipeHomeSection[]>(
    // `pages` 라는 이름은 캐시 안에서 끝난다 — 화면은 `sections` 만 안다.
    () => query.data?.pages ?? [],
    [query.data],
  )

  return {
    sections,
    currentSlot: query.data?.currentSlot ?? null,
    slotDecision: query.data?.slotDecision ?? null,
    budget: query.data?.budget ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}
