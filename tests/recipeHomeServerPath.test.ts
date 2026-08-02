/**
 * 홈의 **실서버 경로**. `tests/recipeHome.test.ts` 는 모의 경로와 순수 함수를 본다.
 * 모의 payload 는 우리가 만든 것이라 계약을 이미 지키고 있어서, 그것만으로는 "서버가
 * 계약을 어긴 응답을 줬을 때 앱이 막는가" 를 확인할 수 없다. 모의 스위치는 모듈 로드
 * 시점에 한 번 읽히므로(`RECIPE_LIST_V2_MOCK`) 파일을 나눈다
 * (`recipeArchiveServerPath.test.ts` 와 같은 이유·같은 방식).
 */
/* eslint-disable import/first -- 모의 스위치를 모듈 로드 전에 꺼야 한다. */
const get = jest.fn()
jest.mock("../src/services/core/apiClient", () => ({ api: { get } }))

process.env.EXPO_PUBLIC_RECIPE_V2_MOCK = "false"

import { recipeHomeService } from "../src/features/recipe/services/recipeHomeService"

const rawCard = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  name: `레시피 ${id}`,
  category: "한식",
  nutrition: { provenance: "reference_estimate", sodiumMg: 100 },
  ...extra,
})

describe("GET /recipes/home 실서버 경로", () => {
  beforeEach(() => get.mockReset())

  it("계약 §2 의 경로를 부르고 쿼리는 locale 하나다", async () => {
    get.mockResolvedValue({
      data: {
        result: {
          budget: { sodiumMg: 1500 },
          currentSlot: "LUNCH",
          sections: [
            { slot: "LUNCH", items: [rawCard(1)] },
            { slot: "DINNER", items: [] },
            { slot: "BREAKFAST", items: [] },
          ],
        },
      },
    })
    await recipeHomeService.getRecipeHome("en")

    expect(get).toHaveBeenCalledTimes(1)
    expect(get.mock.calls[0][0]).toBe("/recipes/home")
    /*
      서버 라우트(`sinsin-be-bun/src/domains/recipe/homeRoutes.ts`)가 `locale` 하나만
      받는다 — `categories`·`limit`·`sort`·`cursor` 가 없다. 앱이 다른 파라미터를 실어
      보내면 조용히 무시되고, 그것을 근거로 화면이 "섹션도 좁혀진다" 고 가정하게 된다
      (그 가정 때문에 필터를 걸면 섹션을 감춘다).
    */
    expect(get.mock.calls[0][1]).toEqual({ params: { locale: "en" } })
  })

  it("응답 본문을 `result` 아래에서 읽는다", async () => {
    get.mockResolvedValue({
      data: {
        result: {
          currentSlot: "DINNER",
          sections: [{ slot: "DINNER", items: [rawCard(7)] }],
        },
      },
    })
    const home = await recipeHomeService.getRecipeHome("ko")
    expect(home.currentSlot).toBe("DINNER")
    expect(home.sections[0].items.map((c) => c.id)).toEqual([7])
  })

  it("서버가 섹션을 하나만 줘도 화면은 3섹션을 받는다", async () => {
    get.mockResolvedValue({
      data: { result: { currentSlot: "LUNCH", sections: [] } },
    })
    const home = await recipeHomeService.getRecipeHome("ko")
    expect(home.sections.map((s) => s.slot)).toEqual([
      "LUNCH",
      "DINNER",
      "BREAKFAST",
    ])
  })

  it("§1.1 provenance 를 빠뜨리면 nutrition 이 null 이 되어 수치를 못 그린다", async () => {
    get.mockResolvedValue({
      data: {
        result: {
          currentSlot: "LUNCH",
          sections: [
            {
              slot: "LUNCH",
              items: [
                {
                  id: 1,
                  name: "provenance 없음",
                  nutrition: { sodiumMg: 999 },
                },
                {
                  id: 2,
                  name: "모르는 provenance",
                  nutrition: { sodiumMg: 999, provenance: "vibes" },
                },
                rawCard(3),
              ],
            },
          ],
        },
      },
    })
    const home = await recipeHomeService.getRecipeHome("ko")
    const nutritions = home.sections[0].items.map((item) => item.nutrition)
    expect(nutritions[0]).toBeNull()
    expect(nutritions[1]).toBeNull()
    expect(nutritions[2]).not.toBeNull()
  })

  it("응답이 통째로 이상해도 3섹션을 주고 던지지 않는다", async () => {
    for (const data of [null, {}, { result: null }, { result: "nope" }]) {
      get.mockResolvedValue({ data })
      const home = await recipeHomeService.getRecipeHome("ko")
      expect(home.sections).toHaveLength(3)
    }
  })
})
