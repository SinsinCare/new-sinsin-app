/**
 * 보관함의 **실서버 경로** 검증.
 *
 * `tests/recipeArchive.test.ts` 는 모의 경로(`RECIPE_LIST_V2_MOCK=true`)를 본다.
 * 모의 payload 는 우리가 만든 것이라 계약을 이미 지키고 있어서, 그것만으로는
 * "서버가 계약을 어긴 응답을 줬을 때 앱이 막는가" 를 확인할 수 없다. 모의 스위치는
 * 모듈 로드 시점에 한 번 읽히므로(`RECIPE_LIST_V2_MOCK`) 두 경로를 한 파일에서
 * 볼 수 없다 — 그래서 파일을 나눴다.
 *
 * 여기서 막는 사고: 서버가 `provenance` 를 빠뜨리거나 `ckdGuide`·임상 태그를
 * 흘렸을 때 검수 전 추정치·임상 주장이 화면에 그대로 뜨는 것(계약 §1.1 / §1.2).
 */
/* eslint-disable import/first -- 모의 스위치를 모듈 로드 전에 꺼야 한다. */
const get = jest.fn()
jest.mock("../src/services/core/apiClient", () => ({ api: { get } }))

// 실서버 경로를 태운다(모의 스위치 off).
process.env.EXPO_PUBLIC_RECIPE_V2_MOCK = "false"

import { readFileSync } from "node:fs"
import path from "node:path"

import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query"

import { recipeArchiveService } from "../src/features/recipe/archive/recipeArchiveService"
import { resolveCardTags } from "../src/features/recipe/components/list/recipeCardFormat"

describe("실서버 경로 계약 준수", () => {
  beforeEach(() => get.mockReset())

  it("§1.1 provenance 가 없으면 nutrition 이 null 이 되어 그릴 수 없다", async () => {
    get.mockResolvedValue({
      data: {
        result: {
          items: [
            {
              id: 1,
              name: "provenance 없음",
              nutrition: { kcal: 100, sodiumMg: 999 },
            },
            {
              id: 2,
              name: "모르는 provenance",
              nutrition: { sodiumMg: 999, provenance: "vibes" },
            },
            {
              id: 3,
              name: "정상",
              nutrition: { sodiumMg: 999, provenance: "reference_estimate" },
            },
          ],
          nextCursor: null,
          hasMore: false,
          budget: { sodiumMg: 1500 },
        },
      },
    })
    const res = await recipeArchiveService.getSavedRecipes({})
    expect(res.items.map((i) => i.nutrition)).toEqual([
      null,
      null,
      expect.objectContaining({ provenance: "reference_estimate" }),
    ])
  })

  it("§1.1 ckdGuide/aiSummary 가 응답에 있어도 카드로 넘어오지 않는다", async () => {
    get.mockResolvedValue({
      data: {
        result: {
          items: [
            {
              id: 1,
              name: "a",
              ckdGuide: { CKD3: "먹어도 됩니다" },
              ckd_guide: { CKD4: "x" },
              aiSummary: { headline: "신장에 좋아요" },
              ai_summary: { headline: "y" },
              nutrition: { provenance: "reference_estimate" },
            },
          ],
          nextCursor: null,
          hasMore: false,
          budget: {},
        },
      },
    })
    const res = await recipeArchiveService.getRecentRecipes({})
    const serialized = JSON.stringify(res)
    expect(serialized).not.toMatch(/ckdGuide|ckd_guide|aiSummary|ai_summary/)
    expect(serialized).not.toContain("신장에 좋")
    expect(Object.keys(res.items[0]).sort()).toEqual([
      "authored",
      "category",
      "difficulty",
      "headline",
      "id",
      "name",
      "nutrition",
      "rating",
      "saveCount",
      "saved",
      "servings",
      "summary",
      "tags",
      "thumbnailUrl",
      "timeMin",
    ])
  })

  it("§1.2 서버가 임상 태그를 흘려도 카드 태그에서 걸러진다", async () => {
    get.mockResolvedValue({
      data: {
        result: {
          items: [
            {
              id: 1,
              name: "a",
              tags: ["저염식", "CKD3", "투석", "간편요리", "한그릇"],
              nutrition: { provenance: "reference_estimate" },
            },
          ],
          nextCursor: null,
          hasMore: false,
          budget: {},
        },
      },
    })
    const res = await recipeArchiveService.getSavedRecipes({})
    const shown = resolveCardTags(res.items[0].tags)
    expect(shown.shown).toEqual(["간편요리", "한그릇"])
    expect(shown.shown.join()).not.toMatch(/저염|CKD|투석/i)
  })

  it("§2 실서버 경로가 계약의 경로와 파라미터 이름을 그대로 쓴다", async () => {
    get.mockResolvedValue({
      data: { result: { items: [], nextCursor: null, hasMore: false } },
    })
    await recipeArchiveService.getSavedRecipes({ q: "김치", cursor: "c1" })
    expect(get).toHaveBeenCalledWith("/recipes/saved", {
      params: { limit: 20, cursor: "c1", q: "김치" },
    })
    await recipeArchiveService.getRecentRecipes({})
    expect(get).toHaveBeenLastCalledWith("/recipes/views/recent", {
      params: { limit: 20 },
    })
  })

  it("서버가 totalCount 를 안 주면 null 이다 (개수를 지어내지 않는다)", async () => {
    get.mockResolvedValue({
      data: {
        result: {
          items: [{ id: 1, name: "a" }],
          nextCursor: "x",
          hasMore: true,
          budget: {},
        },
      },
    })
    const res = await recipeArchiveService.getSavedRecipes({})
    expect(res.totalCount).toBeNull()
  })
})

/**
 * 새로고침 실패의 실제 모양. 화면이 `isError` 로 오류를 그리지만 FlatList 의
 * `ListEmptyComponent` 는 목록이 **빌 때만** 그려진다. 그래서 "데이터가 있는 채로
 * 실패" 가 가능한지가 화면 설계를 가른다 — 실측해서 못 박아 둔다. react-query 가
 * 이 동작을 바꾸면 이 테스트가 먼저 알려 준다.
 */
describe("새로고침 실패의 상태 조합 (react-query 실측)", () => {
  it("데이터가 있는 채로 refetch 가 실패하면 isError 와 data 가 동시에 참이다", async () => {
    let call = 0
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    const observer = new InfiniteQueryObserver(client, {
      queryKey: ["archive-refresh-shape"],
      initialPageParam: 0,
      queryFn: () => {
        call += 1
        if (call === 1) return Promise.resolve({ items: [1, 2, 3] })
        return Promise.reject(new Error("network down"))
      },
      getNextPageParam: () => undefined,
    } as never)

    const unsubscribe = observer.subscribe(() => undefined)
    await observer.refetch()
    await observer.refetch().catch(() => undefined)
    const result = observer.getCurrentResult()
    unsubscribe()
    client.clear()

    expect(result.isError).toBe(true)
    // 목록이 비지 않았다 → ListEmptyComponent 가 안 그려진다 → 화면에 따로 말해야 한다.
    expect(result.data).not.toBeUndefined()
  })
})

/**
 * 화면 배선 검사(정적).
 *
 * 이 저장소의 jest 는 `testEnvironment: "node"` 이고 RN 렌더러가 없어서
 * `RecipeArchiveScreen` 을 그려 볼 수 없다. 그래도 **조용히 틀리는** 배선 두 개는
 * 막아야 한다. 소스를 읽는 방식이라 이름을 바꾸면 이 테스트를 같이 고쳐야 한다 —
 * 그 비용을 감수하는 이유는 두 결함이 화면에서 아무 소리 없이 일어나기 때문이다.
 */
describe("보관함 화면 배선 (소스 정적 검사)", () => {
  const source = readFileSync(
    path.join(
      __dirname,
      "../src/features/recipe/archive/RecipeArchiveScreen.tsx",
    ),
    "utf8",
  )

  it("검색창의 X 는 검색어만 지운다 — 필터 칩을 말없이 지우지 않는다 (계약 §6.1)", () => {
    // 라벨이 "검색어 지우기"(feed.clearSearch)인 버튼이 필터까지 지우면, 칩을 3개
    // 걸어 둔 사용자가 X 를 눌렀을 때 칩이 사라진 이유를 알 수 없다. 필터를 빼는
    // 곳은 칩과 "전체 해제" 하나뿐이어야 한다.
    expect(source).toContain("onClear={clearSearchOnly}")
    expect(source).not.toContain("onClear={clearNarrowing}")

    const body = source.slice(
      source.indexOf("const clearSearchOnly"),
      source.indexOf("const clearNarrowing"),
    )
    expect(body).toContain('setQuery("")')
    expect(body).not.toContain("setFilters")
  })

  it("이미 받아 둔 목록이 있는 채로 실패하면 그 사실을 말한다", () => {
    // 위 실측대로 isError 와 data 가 동시에 참일 수 있다. 그때 ListEmptyComponent
    // 는 안 그려지므로 별도 안내가 없으면 화면이 아무 말도 하지 않는다.
    expect(source).toContain("active.isError && active.recipes.length > 0")
    expect(source).toContain("archive.refreshFailedNote")
  })

  it("목록 화면과 **같은 줄 카드**를 쓴다 — 보관함 전용 카드를 만들지 않는다", () => {
    // 2026-07-31 이전의 실제 상태: 목록은 `RecipePhotoCard`(72pt 타일 + 96pt 고정 줄),
    // 보관함은 옛 `RecipeListCard`. 같은 레시피가 한 앱에서 두 모양으로 보였고,
    // 사진이 없는 카탈로그(175/175 `thumbnailUrl` = null)에서 옛 카드는 이미지 자리를
    // 통째로 접어 **글자만 쌓인 목록**이 됐다.
    expect(source).toContain("<RecipePhotoCard")
    expect(source).toContain('variant="row"')
    // 머리말이 옛 카드 이름을 **기록으로** 언급하므로 그리는 자리만 본다.
    expect(source).not.toContain("<RecipeListCard")
  })

  it("좌우 여백이 목록 화면과 같은 격자에서 온다 (숫자를 다시 고르지 않는다)", () => {
    // 예전에는 `LAYOUT.screenX`(20)였고 목록은 `GUTTER`(16)였다 — 두 화면을 오갈 때
    // 왼쪽 시작선이 4pt 튀었다. 줄 사이 헤어라인의 들여쓰기도 격자에서 가져온다.
    expect(source).toContain("GUTTER")
    expect(source).toContain("RECIPE_ROW_TEXT_INDENT")
    expect(source).not.toContain("LAYOUT.screenX")
  })

  it("저장 토글이 카드 안에 있다 — 카드 밖 별도 줄을 다시 만들지 않는다", () => {
    // 카드마다 붙던 `저장 해제` 글자 줄은 (a) 줄 높이를 카드마다 바꾸고
    // (b) 같은 동작의 문법을 목록 화면과 다르게 만들었다.
    expect(source).toContain("onToggleSave={handleToggleSave}")
    expect(source).not.toContain("archive.unsaveAction")
  })

  it("빈 화면·실패의 문구 판단이 화면 밖 순수 모듈에 있다", () => {
    // JSX 안의 삼중 삼항식이면 어떤 조합에서 무슨 말을 하는지 검증할 수 없다
    // (node 환경 jest 는 이 화면을 그리지 못한다). 판단은 archiveEmptyState.ts 에 있고
    // 그 순서(실패 → 좁힘 → 빈 보관함)를 tests/recipeArchive.test.ts 가 못 박는다.
    expect(source).toContain("resolveArchiveEmpty")
  })
})
