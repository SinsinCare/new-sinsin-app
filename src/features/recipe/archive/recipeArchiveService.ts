/**
 * 보관함(저장한 레시피 · 최근 본 기록) 서비스 계층 —
 * 계약 §2 `GET /recipes/saved`, `GET /recipes/views/recent`, `PUT /recipes/{id}/save`.
 *
 * **재사용 원칙.** 목록 담당이 이미 만든 것을 다시 만들지 않는다:
 *   - 타입          → `../types/recipeListV2`
 *   - 응답 정규화    → `recipeListV2Service.normalizeRecipeListResponse`
 *                     (계약 §1.1 의 관문: provenance 가 없으면 nutrition 을 null 로
 *                      만들어 **그릴 수 없게** 한다. 여기서 다시 판단하면 두 화면이
 *                      다른 기준으로 수치를 그린다.)
 *   - 모의 카탈로그  → `recipeListV2MockCatalog.queryMockRecipeList`
 *                     (보관함에 목록 화면과 **같은 레시피**가 나와야 화면을 오갈 때
 *                      말이 맞는다. 모의 데이터를 따로 두면 저장한 레시피가 목록에
 *                      없는 레시피가 된다.)
 *   - 필터 모델      → `../components/list/recipeListFilterModel`
 *                     (계약 §6.1 "필터는 한 곳". 보관함이 자기 필터 모델을 따로
 *                      가지면 같은 칩이 두 화면에서 다른 값을 서버로 보낸다.)
 *   - `PUT …/save`  → `recipeDetailV2Service.setSaved`
 *                     (같은 엔드포인트를 두 번 구현하면 한쪽만 절대 상태로 남는다.)
 *
 * 이 파일에만 있는 것은 (a) 보관함 두 엔드포인트 호출, (b) 모의 모드에서 "저장한 것만/
 * 최근 본 순" 을 만드는 얇은 층, (c) 무한 목록의 낙관 갱신 순수 함수다.
 * 순수 함수로 뽑아 둔 이유: 이 저장소의 jest 는 `testEnvironment: node` 라 RN 을
 * 렌더할 수 없다. 화면의 판단을 함수로 꺼내야 검증할 수 있다.
 */
import { api } from "@/src/services/core/apiClient"

import {
  toRecipeListQueryFilters,
  type RecipeFilterSelection,
} from "../components/list/recipeListFilterModel"
import { recipeDetailV2Service } from "../services/recipeDetailV2Service"
import {
  MOCK_LIST_MAX_LIMIT,
  queryMockRecipeList,
} from "../services/recipeListV2MockCatalog"
import {
  RECIPE_LIST_PAGE_SIZE,
  RECIPE_LIST_V2_MOCK,
  normalizeRecipeListResponse,
} from "../services/recipeListV2Service"
import type { RecipeCard, RecipeListResponse } from "../types/recipeListV2"
import type { RecipeSaveStateResponse } from "../types/recipeV2"

export type ArchiveSource = "saved" | "recent"

/** 보관함 커서 접두어. 목록 화면 커서(`list:`)와 섞이면 조용히 엉뚱한 페이지를 준다. */
const ARCHIVE_CURSOR_PREFIX = "archive:"

/** 모의 카탈로그를 전부 읽을 때의 안전 상한. 무한 루프를 만들지 않는다. */
const MOCK_DRAIN_MAX_PAGES = 20

export interface ArchiveListParams {
  limit?: number
  cursor?: string
  /** 확정된 검색어. 계약 §3.1 은 `q` 다(v1 의 `search` 가 아니다). */
  q?: string
  filter?: RecipeFilterSelection
}

/**
 * 계약 §3.1 과 같은 이름으로 조립한다.
 *
 * **계약에 빠진 것:** §2 는 `/recipes/saved` · `/recipes/views/recent` 의 쿼리
 * 파라미터를 적지 않았다. 시안(`Home_Recipes_Saved.png`)에는 두 탭 위에 검색창과
 * 필터가 있으니 파라미터가 필요하다. 목록(`/recipes`)과 같은 이름을 쓴다고 가정했고
 * 보고서에 계약 갱신 요청으로 적었다. 로드된 페이지만 앱에서 거르는 방법은 쓰지
 * 않았다 — 다음 페이지에 있는 결과가 빠져 "검색해도 결과가 안 바뀐다"(§6.1 이 고치라던
 * 결함)가 다른 모양으로 돌아온다.
 */
export function buildArchiveQueryParams(
  params: ArchiveListParams,
): Record<string, string | number> {
  const query: Record<string, string | number> = {
    limit: params.limit ?? RECIPE_LIST_PAGE_SIZE,
  }
  if (params.cursor) query.cursor = params.cursor
  const q = params.q?.trim()
  if (q) query.q = q
  if (params.filter) {
    const { categories, tags } = toRecipeListQueryFilters(params.filter)
    if (categories.length > 0) query.categories = categories.join(",")
    if (tags.length > 0) query.tags = tags.join(",")
  }
  return query
}

// ---------------------------------------------------------------------------
// 낙관 갱신 (계약 §2.1)
// ---------------------------------------------------------------------------

/**
 * `PUT` 은 **절대 상태**라 멱등이다. 그래서 같은 값이 두 번 와도 저장 수를 두 번 세지
 * 않는다. 커뮤니티 좋아요에서 실측된 결함(20라운드 전부 `bothTrue`)이 토글이었기 때문에
 * 생겼고, 여기서 값이 바뀔 때만 세는 규칙이 그 재발을 막는다.
 */
export function nextSaveCount(
  current: number,
  was: boolean,
  now: boolean,
): number {
  if (was === now) return current
  return now ? current + 1 : Math.max(0, current - 1)
}

/**
 * 무한 목록의 모든 페이지에서 그 레시피의 저장 상태만 바꾼 새 페이지 배열.
 *
 * **저장 해제해도 행을 지우지 않는다.** 지우면 (a) 손가락 아래에서 목록이 튀어 옆
 * 카드를 잘못 누르고, (b) 되돌릴 방법이 사라진다(계약 §6.4 "되돌리기"). 회색 북마크로
 * 남겨 두면 한 번 더 눌러 바로 되돌릴 수 있고, 다음 새로고침에서 자연히 빠진다.
 *
 * `saveCountFromServer` 가 있으면 그 값을 그대로 쓴다 — 재조회가 아니라 방금 보낸
 * PUT 의 응답이다(§2.1 은 재조회를 금지하지만 같은 요청의 결과를 반영하는 것은 다르다).
 */
export function patchSavedStateInPages(
  pages: readonly RecipeListResponse[],
  recipeId: number,
  saved: boolean,
  saveCountFromServer?: number,
): RecipeListResponse[] {
  return pages.map((page) => {
    if (!page.items.some((item) => item.id === recipeId)) return page
    return {
      ...page,
      items: page.items.map((item) =>
        item.id === recipeId
          ? {
              ...item,
              saved,
              saveCount:
                saveCountFromServer ??
                nextSaveCount(item.saveCount, item.saved, saved),
            }
          : item,
      ),
    }
  })
}

/** 로드된 페이지를 한 배열로 편다. 서버가 준 순서를 앱에서 다시 정렬하지 않는다. */
export function flattenArchivePages(
  pages: readonly RecipeListResponse[],
): RecipeCard[] {
  return pages.flatMap((page) => page.items)
}

// ---------------------------------------------------------------------------
// 모의 모드
// ---------------------------------------------------------------------------

/**
 * 모의 모드에서 이 세션의 저장 토글을 기억한다.
 *
 * 목록 모의 카탈로그(`recipeListV2MockCatalog`)와 상세 모의 상태
 * (`recipeDetailV2Service` 내부 `mockState`)는 서로를 모른다. 오버레이가 없으면
 * 보관함에서 저장을 풀고 새로고침하면 다시 저장된 것으로 돌아와, **낙관 갱신이
 * 되돌아간 것처럼** 보인다 — 계약 §2.1 이 없애려던 바로 그 증상이다.
 * 실제 서버 모드에서는 이 표를 절대 읽지 않는다.
 */
const mockSavedOverlay = new Map<number, boolean>()

function effectiveMockSaved(card: RecipeCard): boolean {
  return mockSavedOverlay.get(card.id) ?? card.saved
}

/** 모의 카탈로그를 끝까지 읽는다. `queryMockRecipeList` 는 동기 순수 함수다. */
function drainMockCatalog(params: ArchiveListParams): RecipeCard[] {
  const { categories, tags } = params.filter
    ? toRecipeListQueryFilters(params.filter)
    : { categories: [], tags: [] }

  const collected: RecipeCard[] = []
  let cursor: string | undefined
  for (let page = 0; page < MOCK_DRAIN_MAX_PAGES; page += 1) {
    const response = queryMockRecipeList({
      limit: MOCK_LIST_MAX_LIMIT,
      cursor,
      q: params.q,
      categories,
      tags,
      // 보관함 정렬은 저장 시각·조회 시각이라 목록 정렬 5종과 축이 다르다.
      // 모의에서는 최신순으로 받고 아래에서 출처별로 다시 세운다.
      sort: "recent",
    })
    collected.push(...response.items)
    if (!response.hasMore || !response.nextCursor) break
    cursor = response.nextCursor
  }
  return collected
}

function parseArchiveCursor(cursor: string | undefined): number {
  if (!cursor || !cursor.startsWith(ARCHIVE_CURSOR_PREFIX)) return 0
  const raw = cursor.slice(ARCHIVE_CURSOR_PREFIX.length)
  // 십진수만 받는다. `Number("0x10") === 16` 이라 정규식으로 먼저 거른다.
  if (!/^\d{1,6}$/u.test(raw)) return 0
  return Number(raw)
}

/**
 * 커서 페이지네이션(모의). 오프셋 커서라 서버의 키셋과 모양만 같다 —
 * 앱 쪽 코드는 "커서를 그대로 다시 보낸다" 만 지키므로 서버가 붙어도 안 바뀐다.
 */
export function paginateArchive(
  items: readonly RecipeCard[],
  cursor: string | undefined,
  limit: number,
  budget: RecipeListResponse["budget"],
): RecipeListResponse {
  const offset = parseArchiveCursor(cursor)
  const page = items.slice(offset, offset + limit)
  const nextOffset = offset + page.length
  const hasMore = nextOffset < items.length
  return {
    items: [...page],
    nextCursor: hasMore ? `${ARCHIVE_CURSOR_PREFIX}${nextOffset}` : null,
    hasMore,
    budget,
    // 모의는 전체를 알고 있으므로 정확한 개수를 준다. 서버가 안 주면 앱이
    // "N개 이상" 으로 내려간다(`recipeListPresentation.resolveResultCount`).
    totalCount: items.length,
  }
}

function mockArchivePage(
  source: ArchiveSource,
  params: ArchiveListParams,
): RecipeListResponse {
  const all = drainMockCatalog(params)
  const withOverlay = all.map((card) => ({
    ...card,
    saved: effectiveMockSaved(card),
  }))

  const items =
    source === "saved"
      ? // 저장 목록은 저장한 것만. 서버는 `ix_recipe_save_user (user_id, created_at desc)`
        // 로 저장 시각 내림차순을 준다 — 모의에는 저장 시각이 없어 최신순을 대신 쓴다.
        withOverlay.filter((card) => card.saved)
      : // 최근 본 기록은 저장 여부와 무관하게 쌓인다. 서버가 레시피당 한 행만 두므로
        // (계약 §5 `ON CONFLICT DO UPDATE`) 중복 제거를 앱에서 하지 않는다.
        withOverlay

  const budget = queryMockRecipeList({ limit: 1 }).budget
  return paginateArchive(
    items,
    params.cursor,
    params.limit ?? RECIPE_LIST_PAGE_SIZE,
    budget,
  )
}

// ---------------------------------------------------------------------------
// 서비스
// ---------------------------------------------------------------------------

export const recipeArchiveService = {
  /** 계약 §2 `GET /recipes/saved`. */
  async getSavedRecipes(
    params: ArchiveListParams,
  ): Promise<RecipeListResponse> {
    if (RECIPE_LIST_V2_MOCK) return mockArchivePage("saved", params)
    const { data } = await api.get("/recipes/saved", {
      params: buildArchiveQueryParams(params),
    })
    return normalizeRecipeListResponse(
      (data as { result?: unknown } | null)?.result,
    )
  },

  /** 계약 §2 `GET /recipes/views/recent`. */
  async getRecentRecipes(
    params: ArchiveListParams,
  ): Promise<RecipeListResponse> {
    if (RECIPE_LIST_V2_MOCK) return mockArchivePage("recent", params)
    const { data } = await api.get("/recipes/views/recent", {
      params: buildArchiveQueryParams(params),
    })
    return normalizeRecipeListResponse(
      (data as { result?: unknown } | null)?.result,
    )
  },

  /**
   * 계약 §2.1 `PUT /recipes/{id}/save` — 절대 상태. 상세 담당의 구현을 그대로 쓴다.
   * 모의 모드에서는 결과를 오버레이에 기록해 두 탭과 상세가 같은 값을 본다.
   */
  async setRecipeSaved(
    recipeId: number,
    saved: boolean,
  ): Promise<RecipeSaveStateResponse> {
    const result = await recipeDetailV2Service.setSaved(recipeId, saved)
    if (RECIPE_LIST_V2_MOCK) mockSavedOverlay.set(recipeId, result.saved)
    return result
  },
}

/** 테스트가 모의 오버레이를 초기화한다. 화면은 쓰지 않는다. */
export function __resetArchiveMockState(): void {
  mockSavedOverlay.clear()
}
