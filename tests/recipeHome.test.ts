/**
 * 레시피 홈(오늘의 아침·점심·저녁) — 계약 §2 `GET /api/v1/recipes/home`.
 *
 * ## 여기서 막는 사고
 *
 *  1. **앱이 섹션을 다시 정렬하는 것.** 계약 §2 는 순서를 서버 시계로 정한다 —
 *     기기 시계가 틀리면 섹션 순서가 사람마다 달라지기 때문이다. 앱에 회전 함수가
 *     있으니(`orderFromCurrentSlot`) 누군가 화면에서 그걸 부르기 쉽다. 서버가 준
 *     순서와 `currentSlot` 이 어긋난 응답으로 **서버 순서가 이긴다**는 것을 못 박는다.
 *  2. **빈 섹션이 사라지는 것.** 계약 §2 가 빈 섹션까지 보내는 이유는 "사용자가 섹션이
 *     왜 사라졌는지 짐작할 수 없다" 다. 앱이 지우면 그 이유가 무의미해진다.
 *     빈 섹션은 실제로 보이는 화면이다 — 벤치 DB 의 recipe 는 0건이고, `POST /recipes`
 *     로 만든 레시피는 `meal_slots` 가 `{}` 여서 어느 섹션에도 걸리지 않는다.
 *  3. **저장 상태가 섹션 카드에 반영되지 않는 것.** 상세에서 저장하면 목록·보관함
 *     캐시가 갱신되는데(`useRecipeDetailV2::patchLists`), 그 순회는 `old.pages` 가
 *     배열인 캐시만 만진다. 홈 캐시가 그 모양이 아니면 **조용히 아무 일도 일어나지
 *     않는다**(그 결함이 이미 한 번 실측됐다). 그래서 모양과 접두 일치를 둘 다 본다.
 */
/* eslint-disable import/first -- apiClient 는 모듈 로드 시 실제 axios 인스턴스를 만든다. */
jest.mock("../src/services/core/apiClient", () => ({ api: { get: jest.fn() } }))

import fs from "node:fs"
import path from "node:path"

import { QueryClient } from "@tanstack/react-query"

import { patchSavedStateInPages } from "../src/features/recipe/archive/recipeArchiveService"
import {
  mealSectionCopyKeys,
  RECIPE_HOME_EMPTY_COPY_KEY,
  RECIPE_HOME_LIST_TITLE_KEY,
  resolveMealSectionBody,
  splitTitleHighlight,
} from "../src/features/recipe/components/list/recipeHomePresentation"
import {
  recipeHomeQueryKey,
  RECIPE_HOME_QUERY_ROOT,
} from "../src/features/recipe/hooks/useRecipeHome"
import {
  buildMockRecipeHome,
  mockCurrentMealSlot,
  normalizeRecipeHomeResponse,
} from "../src/features/recipe/services/recipeHomeService"
import {
  isMealSlot,
  MEAL_SLOTS,
  MEAL_SLOT_I18N,
  orderFromCurrentSlot,
  toRecipeHomeCache,
} from "../src/features/recipe/types/recipeHome"
import type { RecipeListResponse } from "../src/features/recipe/types/recipeListV2"

const rawCard = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  name: `레시피 ${id}`,
  category: "한식",
  nutrition: { provenance: "reference_estimate", sodiumMg: 100 },
  rating: { average: 4.2, count: 3 },
  ...extra,
})

describe("슬롯 값과 회전", () => {
  it("서버 값만 슬롯으로 인정한다", () => {
    expect(isMealSlot("BREAKFAST")).toBe(true)
    expect(isMealSlot("lunch")).toBe(false)
    expect(isMealSlot("SNACK")).toBe(false)
    expect(isMealSlot(null)).toBe(false)
    expect(isMealSlot(0)).toBe(false)
  })

  it("currentSlot 이 항상 첫 번째이고 세 슬롯이 중복 없이 나온다", () => {
    expect(orderFromCurrentSlot("BREAKFAST")).toEqual([
      "BREAKFAST",
      "LUNCH",
      "DINNER",
    ])
    expect(orderFromCurrentSlot("LUNCH")).toEqual([
      "LUNCH",
      "DINNER",
      "BREAKFAST",
    ])
    expect(orderFromCurrentSlot("DINNER")).toEqual([
      "DINNER",
      "BREAKFAST",
      "LUNCH",
    ])
    for (const slot of MEAL_SLOTS) {
      expect(new Set(orderFromCurrentSlot(slot)).size).toBe(3)
    }
  })
})

describe("섹션 순서는 서버 응답 순서다 (앱이 시계로 재정렬하지 않는다)", () => {
  it("서버가 준 순서를 그대로 쓴다", () => {
    const result = normalizeRecipeHomeResponse({
      budget: { sodiumMg: 1000, potassiumMg: 2000, phosphorusMg: 800 },
      currentSlot: "DINNER",
      sections: [
        { slot: "DINNER", items: [rawCard(1)] },
        { slot: "BREAKFAST", items: [] },
        { slot: "LUNCH", items: [rawCard(2)] },
      ],
    })
    expect(result.sections.map((s) => s.slot)).toEqual([
      "DINNER",
      "BREAKFAST",
      "LUNCH",
    ])
  })

  it("서버 순서가 currentSlot 회전과 어긋나도 **서버 순서가 이긴다**", () => {
    // 이것이 "앱이 재정렬하지 않는다" 의 핵심 검사다. 회전 함수로 다시 정렬하면
    // 아래 기대값이 [BREAKFAST, LUNCH, DINNER] 로 바뀐다.
    const result = normalizeRecipeHomeResponse({
      currentSlot: "BREAKFAST",
      sections: [
        { slot: "DINNER", items: [rawCard(1)] },
        { slot: "LUNCH", items: [rawCard(2)] },
        { slot: "BREAKFAST", items: [rawCard(3)] },
      ],
    })
    expect(result.sections.map((s) => s.slot)).toEqual([
      "DINNER",
      "LUNCH",
      "BREAKFAST",
    ])
    expect(result.currentSlot).toBe("BREAKFAST")
  })

  it("화면이 섹션 배열을 손대지 않고 그린다 (소스 확인)", () => {
    // 렌더 테스트가 불가능한 화면이라 소스로 못 박는다. `sort`/`orderFromCurrentSlot`
    // 이 화면에 들어오면 섹션 순서가 기기 시계에 좌우된다.
    const screen = fs.readFileSync(
      path.join(__dirname, "..", "app", "(tabs)", "recipe.tsx"),
      "utf8",
    )
    expect(screen).toContain("homeSections.map((section) =>")
    expect(screen).not.toMatch(/homeSections[\s\S]{0,40}\.sort\(/u)
    expect(screen).not.toContain("orderFromCurrentSlot")
  })
})

describe("빈 섹션도 온다 — 감추지 않는다", () => {
  it("세 섹션이 전부 비어도 3개를 준다", () => {
    const result = normalizeRecipeHomeResponse({
      currentSlot: "LUNCH",
      sections: [
        { slot: "LUNCH", items: [] },
        { slot: "DINNER", items: [] },
        { slot: "BREAKFAST", items: [] },
      ],
    })
    expect(result.sections).toHaveLength(3)
    expect(result.sections.every((s) => s.items.length === 0)).toBe(true)
  })

  it("서버가 섹션을 빠뜨려도 3개를 채운다 (빈 섹션으로 끼워 넣는다)", () => {
    const result = normalizeRecipeHomeResponse({
      currentSlot: "DINNER",
      sections: [{ slot: "DINNER", items: [rawCard(1)] }],
    })
    expect(result.sections.map((s) => s.slot)).toEqual([
      "DINNER",
      "BREAKFAST",
      "LUNCH",
    ])
    expect(result.sections[1].items).toEqual([])
  })

  it("응답이 통째로 망가져도 섹션 3개를 준다 (화면이 죽지 않는다)", () => {
    for (const raw of [null, undefined, 0, "nope", [], {}]) {
      const result = normalizeRecipeHomeResponse(raw)
      expect(result.sections).toHaveLength(3)
      expect(isMealSlot(result.currentSlot)).toBe(true)
    }
  })

  it("모르는 슬롯은 버리고 같은 슬롯이 두 번 오면 첫 번째만 쓴다", () => {
    const result = normalizeRecipeHomeResponse({
      currentSlot: "LUNCH",
      sections: [
        { slot: "SNACK", items: [rawCard(9)] },
        { slot: "LUNCH", items: [rawCard(1)] },
        { slot: "LUNCH", items: [rawCard(2)] },
      ],
    })
    expect(result.sections).toHaveLength(3)
    expect(result.sections[0].items.map((c) => c.id)).toEqual([1])
  })

  it("섹션 본문 판정에 '감춘다' 가 없다 — 비어 있으면 문장이 온다", () => {
    // `MealSectionBody` 에 `"hidden"` 이 없는 것이 계약 §2 의 이유("사용자가 섹션이 왜
    // 사라졌는지 짐작할 수 없다")가 화면에서 실현되는 지점이다.
    expect(resolveMealSectionBody({ isLoading: false, itemCount: 0 })).toBe(
      "empty",
    )
    expect(resolveMealSectionBody({ isLoading: false, itemCount: 3 })).toBe(
      "cards",
    )
    // 첫 조회 중에도 제목을 그리고 카드 자리만 비운다(섹션이 나중에 튀어나오지 않게).
    expect(resolveMealSectionBody({ isLoading: true, itemCount: 0 })).toBe(
      "loading",
    )
    expect(resolveMealSectionBody({ isLoading: true, itemCount: 5 })).toBe(
      "loading",
    )
  })

  it("섹션 컴포넌트가 그 판정을 쓰고 빈 본문에 문장을 그린다 (소스 확인)", () => {
    const section = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "src",
        "features",
        "recipe",
        "components",
        "list",
        "RecipeMealSection.tsx",
      ),
      "utf8",
    )
    expect(section).toContain("resolveMealSectionBody({")
    expect(section).toContain('body === "empty"')
    expect(section).toContain("t(RECIPE_HOME_EMPTY_COPY_KEY)")
    // 어디서도 섹션을 통째로 접지 않는다.
    expect(section).not.toMatch(/return null/u)
    // 제목은 빈 섹션에서도 그린다 — 제목까지 사라지면 섹션이 없어진 것과 같다.
    expect(section.indexOf("parts.before")).toBeLessThan(
      section.indexOf('body === "empty"'),
    )
  })

  it("빈 섹션 문구와 그 문구가 가리키는 목록 제목이 같은 화면에 있다", () => {
    // `section.empty` 가 "아래 전체 레시피에서 찾아보세요" 로 끝난다 — `home.listTitle`
    // 이 섹션 **아래**에 실제로 있어야 그 문장이 참이다.
    const screen = fs.readFileSync(
      path.join(__dirname, "..", "app", "(tabs)", "recipe.tsx"),
      "utf8",
    )
    expect(screen).toContain("RECIPE_HOME_LIST_TITLE_KEY")
    expect(RECIPE_HOME_LIST_TITLE_KEY).toBe("home.listTitle")
    expect(RECIPE_HOME_EMPTY_COPY_KEY).toBe("home.section.empty")
  })
})

describe("카드 정규화 — 계약 §1 이 홈에서 따로 새지 않는다", () => {
  it("provenance 없는 카드는 nutrition 이 null 이 되어 수치를 그릴 수 없다", () => {
    const result = normalizeRecipeHomeResponse({
      currentSlot: "LUNCH",
      sections: [
        {
          slot: "LUNCH",
          items: [{ id: 5, name: "출처 없음", nutrition: { sodiumMg: 900 } }],
        },
      ],
    })
    expect(result.sections[0].items[0].nutrition).toBeNull()
  })

  it("리뷰 0건이면 평균을 만들지 않는다 (별점을 그리지 않게)", () => {
    const result = normalizeRecipeHomeResponse({
      currentSlot: "LUNCH",
      sections: [
        {
          slot: "LUNCH",
          items: [
            { id: 3, name: "리뷰 없음", rating: { average: 4, count: 0 } },
          ],
        },
      ],
    })
    expect(result.sections[0].items[0].rating.average).toBeNull()
  })

  it("망가진 카드만 떨어지고 나머지는 살아남는다", () => {
    const result = normalizeRecipeHomeResponse({
      currentSlot: "LUNCH",
      sections: [
        { slot: "LUNCH", items: [{ name: "id 없음" }, rawCard(7), { id: 8 }] },
      ],
    })
    expect(result.sections[0].items.map((c) => c.id)).toEqual([7])
  })

  it("items 가 10개를 넘으면 자른다 (계약 §2 상한)", () => {
    const result = normalizeRecipeHomeResponse({
      currentSlot: "LUNCH",
      sections: [
        {
          slot: "LUNCH",
          items: Array.from({ length: 14 }, (_, i) => rawCard(i + 1)),
        },
      ],
    })
    expect(result.sections[0].items).toHaveLength(10)
  })
})

describe("모의 서버 — 서버가 붙기 전 화면이 타는 경로", () => {
  it("KST 경계(11시/16시)를 계약 그대로 가른다", () => {
    const atKst = (hour: number, minute = 0) =>
      new Date(Date.UTC(2026, 6, 30, hour - 9, minute))
    expect(mockCurrentMealSlot(atKst(0))).toBe("BREAKFAST")
    expect(mockCurrentMealSlot(atKst(10, 59))).toBe("BREAKFAST")
    expect(mockCurrentMealSlot(atKst(11))).toBe("LUNCH")
    expect(mockCurrentMealSlot(atKst(15, 59))).toBe("LUNCH")
    expect(mockCurrentMealSlot(atKst(16))).toBe("DINNER")
    expect(mockCurrentMealSlot(atKst(23, 59))).toBe("DINNER")
  })

  it("컨테이너 시간대와 무관하게 KST 로 읽는다", () => {
    // UTC 01:00 = KST 10:00 → 아침. `process.env.TZ` 를 봤다면 다른 답이 나온다.
    expect(mockCurrentMealSlot(new Date("2026-07-30T01:00:00Z"))).toBe(
      "BREAKFAST",
    )
    expect(mockCurrentMealSlot(new Date("2026-07-30T08:00:00Z"))).toBe("DINNER")
  })

  it("항상 3섹션이고 순서가 시계에 따라 회전한다", () => {
    const morning = buildMockRecipeHome(new Date("2026-07-30T00:00:00Z"))
    expect(morning.currentSlot).toBe("BREAKFAST")
    expect(morning.sections.map((s) => s.slot)).toEqual([
      "BREAKFAST",
      "LUNCH",
      "DINNER",
    ])
    const evening = buildMockRecipeHome(new Date("2026-07-30T10:00:00Z"))
    expect(evening.sections.map((s) => s.slot)).toEqual([
      "DINNER",
      "BREAKFAST",
      "LUNCH",
    ])
  })

  it("디저트는 어느 섹션에도 없다 (간식은 한 끼가 아니다 — 071 규칙)", () => {
    const home = buildMockRecipeHome(new Date("2026-07-30T03:00:00Z"))
    const ids = home.sections.flatMap((s) => s.items.map((c) => c.id))
    expect(ids).not.toContain(110) // 사과 조림 = category 디저트
  })

  it("두 섹션에 걸치는 레시피는 **같은 카드**로 나온다 (두 번 조립하지 않는다)", () => {
    const home = buildMockRecipeHome(new Date("2026-07-30T03:00:00Z"))
    const bySlot = new Map(home.sections.map((s) => [s.slot, s.items]))
    const lunch = bySlot.get("LUNCH")?.find((c) => c.id === 112)
    const dinner = bySlot.get("DINNER")?.find((c) => c.id === 112)
    expect(lunch).toBeDefined()
    expect(dinner).toBeDefined()
    expect(lunch).toBe(dinner)
  })

  it("섹션 안이 남은 참고량 적합도 순이고 모르는 것은 뒤로 간다", () => {
    const home = buildMockRecipeHome(new Date("2026-07-30T03:00:00Z"))
    for (const section of home.sections) {
      const percents = section.items.map(
        (c) => c.headline?.percentOfRemaining ?? null,
      )
      const known = percents.filter((p): p is number => p != null)
      expect([...known].sort((a, b) => a - b)).toEqual(known)
      const firstNull = percents.indexOf(null)
      if (firstNull >= 0) {
        expect(percents.slice(firstNull).every((p) => p == null)).toBe(true)
      }
      expect(section.items.length).toBeLessThanOrEqual(10)
    }
  })
})

describe("저장 상태가 섹션 카드에도 반영된다", () => {
  it("캐시가 섹션을 `pages` 로 들고 있다 (patchLists 가 순회할 수 있는 모양)", () => {
    const cache = toRecipeHomeCache(
      normalizeRecipeHomeResponse({
        currentSlot: "LUNCH",
        sections: [{ slot: "LUNCH", items: [rawCard(1)] }],
      }),
    )
    expect(Array.isArray(cache.pages)).toBe(true)
    expect(cache.pages).toHaveLength(3)
    expect(Array.isArray(cache.pages[0].items)).toBe(true)
  })

  it("patchSavedStateInPages 를 통과하면 카드의 saved·saveCount 가 갱신되고 슬롯이 보존된다", () => {
    const cache = toRecipeHomeCache(
      normalizeRecipeHomeResponse({
        currentSlot: "LUNCH",
        sections: [
          {
            slot: "LUNCH",
            items: [rawCard(42, { saved: false, saveCount: 7 })],
          },
        ],
      }),
    )
    const patched = patchSavedStateInPages(
      cache.pages as unknown as RecipeListResponse[],
      42,
      true,
      8,
    )
    const section = patched[0] as unknown as { slot: string; items: unknown[] }
    // 슬롯이 스프레드로 보존된다는 가정이 이 검증의 요점이다 — 사라지면 섹션 제목이 없어진다.
    expect(section.slot).toBe("LUNCH")
    const card = section.items[0] as { saved: boolean; saveCount: number }
    expect(card.saved).toBe(true)
    expect(card.saveCount).toBe(8)
  })

  it("홈 쿼리 키가 상세의 패치 루트에 **접두 일치**한다", () => {
    // 실제 순회와 같은 방법으로 확인한다 — 키만 눈으로 비교하면 react-query 의
    // 부분 일치 규칙에 대한 가정이 검증되지 않는다.
    const client = new QueryClient()
    const key = recipeHomeQueryKey("ko")
    client.setQueryData(key, {
      budget: null,
      currentSlot: "LUNCH",
      pages: [
        {
          slot: "LUNCH",
          items: [{ id: 42, saved: false, saveCount: 7 }],
        },
      ],
    })
    // `useRecipeDetailV2::patchLists` 와 같은 호출.
    client.setQueriesData<{ pages: unknown[] }>(
      { queryKey: ["recipes-v2"] },
      (old) =>
        old && Array.isArray(old.pages)
          ? {
              ...old,
              pages: patchSavedStateInPages(
                old.pages as unknown as RecipeListResponse[],
                42,
                true,
                8,
              ),
            }
          : old,
    )
    const after = client.getQueryData(key) as {
      pages: { items: { saved: boolean; saveCount: number }[] }[]
    }
    expect(after.pages[0].items[0]).toEqual({
      id: 42,
      saved: true,
      saveCount: 8,
    })
    client.clear()
  })

  it("상세의 패치 루트가 여전히 `recipes-v2` 다 (바뀌면 위 일치가 조용히 깨진다)", () => {
    const detail = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "src",
        "features",
        "recipe",
        "hooks",
        "useRecipeDetailV2.ts",
      ),
      "utf8",
    )
    expect(detail).toContain('const LIST_QUERY_ROOT = ["recipes-v2"] as const')
    expect(RECIPE_HOME_QUERY_ROOT[0]).toBe("recipes-v2")
    // 홈 키의 2번째 칸은 `"home"`, 목록 키의 2번째 칸은 로케일(ko/en)이라 겹칠 수 없다.
    expect(RECIPE_HOME_QUERY_ROOT[1]).toBe("home")
    expect(recipeHomeQueryKey("en")).toEqual(["recipes-v2", "home", "en"])
  })
})

describe("섹션 문안 조립", () => {
  it("i18n 키가 MEAL_SLOT_I18N 의 슬롯 낱말과 일치한다", () => {
    // 키를 리터럴로 적어 두었으므로(tsc 가 존재를 검사한다) 슬롯 낱말과 어긋날 수 있다.
    for (const slot of MEAL_SLOTS) {
      const leaf = MEAL_SLOT_I18N[slot]
      const keys = mealSectionCopyKeys(slot)
      expect(keys.title).toBe(`home.section.${leaf}.title`)
      expect(keys.subtitle).toBe(`home.section.${leaf}.subtitle`)
      expect(keys.highlight).toBe(`home.section.${leaf}.highlight`)
    }
  })

  it("세 슬롯의 키가 서로 다르다 — 두 섹션이 같은 문구를 읽지 않는다", () => {
    const titles = MEAL_SLOTS.map((slot) => mealSectionCopyKeys(slot).title)
    expect(new Set(titles).size).toBe(3)
  })

  it("제목 안의 낱말 하나만 잘라 낸다", () => {
    expect(splitTitleHighlight("오늘의 아침 레시피", "아침")).toEqual({
      before: "오늘의 ",
      match: "아침",
      after: " 레시피",
    })
    expect(splitTitleHighlight("Breakfast picks", "Breakfast")).toEqual({
      before: "",
      match: "Breakfast",
      after: " picks",
    })
  })

  it("못 찾으면 제목이 통째로 남는다 (강조만 사라진다)", () => {
    expect(splitTitleHighlight("오늘의 레시피", "아침")).toEqual({
      before: "오늘의 레시피",
      match: "",
      after: "",
    })
    expect(splitTitleHighlight("오늘의 아침 레시피", "")).toEqual({
      before: "오늘의 아침 레시피",
      match: "",
      after: "",
    })
  })

  it("두 번 나오면 첫 번째만 칠한다", () => {
    expect(splitTitleHighlight("아침, 아침", "아침")).toEqual({
      before: "",
      match: "아침",
      after: ", 아침",
    })
  })

  it("조각을 이어 붙이면 항상 원래 제목이다 (글자가 사라지지 않는다)", () => {
    for (const [title, highlight] of [
      ["오늘의 아침 레시피", "아침"],
      ["Today’s dinner recipes", "dinner"],
      ["없는 낱말", "아침"],
      ["", "아침"],
    ] as const) {
      const parts = splitTitleHighlight(title, highlight)
      expect(parts.before + parts.match + parts.after).toBe(title)
    }
  })
})
