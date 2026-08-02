/**
 * 필터 카탈로그. 핵심은 `dataBacked: false` 다 — 오늘 DB 에 `LOW_SUGAR` 0건,
 * `cuisine_type` 에 `SALAD`·`DESSERT` 0건이라 `저당`·`샐러드` 칩은 누르면 무조건 빈 목록이다.
 *
 * 그때 빈 상태를 `NETWORK_FAILURE`("오류") 로 뭉개면 사용자는 앱이 고장 난 줄 안다.
 * `hasUnbackedSelection()` 이 그 구분의 유일한 근거이므로, 어떤 칩이 그걸 켜는지를
 * 이름으로 못 박는다. 데이터가 채워져 `dataBacked: true` 로 바뀌는 날 이 테스트가 함께 바뀐다
 * — 조용히 바뀌지 않는 것이 목적이다.
 */

import enCommon from "../src/i18n/locales/en/common.json"
import koCommon from "../src/i18n/locales/ko/common.json"
import type {
  CuisineType,
  NutritionTag,
} from "../src/features/restaurant/types"
import {
  CUISINE_TYPES,
  DEFAULT_REVIEW_SORT,
  DEFAULT_SORT,
  NUTRITION_TAGS,
  RAIL_CUISINE_TYPES,
  REVIEW_KEYWORDS,
  REVIEW_SORT_OPTIONS,
  SORT_OPTIONS,
  cuisineTypeLabelKey,
  hasUnbackedSelection,
  nutritionTagLabelKey,
  sortLabelKey,
} from "../src/features/restaurant/data/filterCatalog"

const none = { nutritionTags: [], cuisineTypes: [] }

describe("오늘 0건인 칩 — `저당` 과 `샐러드`", () => {
  it("저당(LOW_SUGAR)은 근거 컬럼(sugar_g)이 없어 데이터가 없다", () => {
    const lowSugar = NUTRITION_TAGS.find((t) => t.value === "LOW_SUGAR")
    expect(lowSugar?.dataBacked).toBe(false)
    expect(koCommon.restaurant.nutritionTag.LOW_SUGAR).toBe("저당")
  })

  it("샐러드·디저트는 cuisine_type 에 없다", () => {
    expect(CUISINE_TYPES.find((c) => c.value === "SALAD")?.dataBacked).toBe(
      false,
    )
    expect(CUISINE_TYPES.find((c) => c.value === "DESSERT")?.dataBacked).toBe(
      false,
    )
    expect(koCommon.restaurant.cuisine.SALAD).toBe("샐러드")
  })

  it("칩을 지우지 않는다 — 목업의 축이고 데이터가 채워지면 살아난다", () => {
    expect(NUTRITION_TAGS.map((t) => t.value)).toEqual([
      "LOW_SUGAR",
      "LOW_PROTEIN",
      "LOW_SODIUM",
      "LOW_POTASSIUM",
      "LOW_PHOSPHORUS",
    ])
    expect(RAIL_CUISINE_TYPES.map((c) => c.value)).toContain("SALAD")
    expect(RAIL_CUISINE_TYPES.map((c) => c.value)).toContain("DESSERT")
  })

  it("실측된 5종만 dataBacked 다", () => {
    // DB 실측: KOREAN 189 · WESTERN 73 · CHINESE 45 · JAPANESE 41 · ETC 28.
    expect(
      CUISINE_TYPES.filter((c) => c.dataBacked)
        .map((c) => c.value)
        .sort(),
    ).toEqual(["CHINESE", "ETC", "JAPANESE", "KOREAN", "WESTERN"])
  })
})

describe("hasUnbackedSelection — 빈 상태 문구를 고르는 근거", () => {
  it("저당 하나만 골라도 켜진다", () => {
    expect(
      hasUnbackedSelection({ ...none, nutritionTags: ["LOW_SUGAR"] }),
    ).toBe(true)
  })

  it("샐러드 하나만 골라도 켜진다", () => {
    expect(hasUnbackedSelection({ ...none, cuisineTypes: ["SALAD"] })).toBe(
      true,
    )
  })

  it("디저트도 켜진다", () => {
    expect(hasUnbackedSelection({ ...none, cuisineTypes: ["DESSERT"] })).toBe(
      true,
    )
  })

  it("데이터가 있는 칩만 고르면 꺼진다 — 그때의 0건은 진짜 0건이다", () => {
    expect(
      hasUnbackedSelection({
        nutritionTags: ["LOW_SODIUM", "LOW_POTASSIUM", "LOW_PHOSPHORUS"],
        cuisineTypes: ["KOREAN", "JAPANESE", "CHINESE", "WESTERN", "ETC"],
      }),
    ).toBe(false)
  })

  it("아무 것도 안 골랐으면 꺼진다", () => {
    expect(hasUnbackedSelection(none)).toBe(false)
  })

  it("섞여 있으면 켜진다 — 한 축이라도 0건이면 결과가 0건이다", () => {
    expect(
      hasUnbackedSelection({
        nutritionTags: ["LOW_SODIUM", "LOW_SUGAR"],
        cuisineTypes: ["KOREAN"],
      }),
    ).toBe(true)
  })

  it("카탈로그에 없는 값은 켜지 않는다", () => {
    // 모르는 값을 "0건 확정" 으로 단정하면 서버가 새 값을 추가한 날 잘못된 안내를 한다.
    expect(
      hasUnbackedSelection({
        nutritionTags: ["LOW_FAT" as NutritionTag],
        cuisineTypes: ["FUSION" as CuisineType],
      }),
    ).toBe(false)
  })
})

describe("칩 레일 (지도 홈)", () => {
  it("목업 순서 6칩이고 세계음식은 레일에 없다", () => {
    expect(RAIL_CUISINE_TYPES.map((c) => c.value)).toEqual([
      "KOREAN",
      "CHINESE",
      "JAPANESE",
      "WESTERN",
      "SALAD",
      "DESSERT",
    ])
    // ETC 는 DB 에 28건이 있어 필터 시트에는 필요하지만 목업 레일에는 없다.
    expect(RAIL_CUISINE_TYPES.map((c) => c.value)).not.toContain("ETC")
    expect(CUISINE_TYPES.map((c) => c.value)).toContain("ETC")
  })

  it("레일은 카탈로그의 부분집합이다 (사본이 아니다)", () => {
    for (const item of RAIL_CUISINE_TYPES) {
      expect(CUISINE_TYPES).toContain(item)
    }
  })
})

describe("정렬", () => {
  it("목업 -25 그대로 6종, 첫 항목이 기본값이다", () => {
    expect(SORT_OPTIONS.map((s) => s.value)).toEqual([
      "RECOMMENDED",
      "RATING",
      "REVIEWS",
      "PRICE_HIGH",
      "PRICE_LOW",
      "DISTANCE",
    ])
    expect(DEFAULT_SORT).toBe(SORT_OPTIONS[0].value)
    expect(DEFAULT_SORT).toBe("RECOMMENDED")
  })

  it("거리순만 위치를 요구한다", () => {
    // 좌표가 없으면 서버가 거리를 계산하지 못해 정렬이 무의미해진다.
    expect(
      SORT_OPTIONS.filter((s) => s.requiresLocation).map((s) => s.value),
    ).toEqual(["DISTANCE"])
  })

  it("후기 정렬은 목업 -33 의 3종이다", () => {
    expect(REVIEW_SORT_OPTIONS.map((s) => s.value)).toEqual([
      "LATEST",
      "RATING",
      "REVISIT",
    ])
    expect(DEFAULT_REVIEW_SORT).toBe("LATEST")
  })
})

describe("후기 키워드", () => {
  it("목업의 5종이고 이모지는 i18n 문자열에 섞지 않는다", () => {
    expect(REVIEW_KEYWORDS.map((k) => k.value)).toEqual([
      "TASTE",
      "VALUE",
      "KIND",
      "MOOD",
      "PARKING",
    ])
    for (const keyword of REVIEW_KEYWORDS) {
      expect(keyword.emoji.length).toBeGreaterThan(0)
      // 번역해도 이모지는 같으므로 리소스에 넣지 않는다.
      expect(keyword.labelKey).not.toContain(keyword.emoji)
    }
  })
})

describe("라벨 키가 ko/en 둘 다에 실제로 있다", () => {
  it("영양 기준 칩은 서술형이 아닌 짧은 키를 쓴다", () => {
    for (const tag of NUTRITION_TAGS) {
      const key = nutritionTagLabelKey(tag.value)
      expect(key).toBe(`restaurant.nutritionTag.${tag.value}`)
      // 기존 `restaurant.filter.nutrients.*` 는 `"당류 적은 편"` 처럼 서술형이라 칩에 안 맞고
      // `lowProtein` 이 아예 없었다. 그 키를 다시 끌어오지 않는다.
      expect(key).not.toContain("filter.nutrients")
      expect(
        koCommon.restaurant.nutritionTag[
          tag.value as keyof typeof koCommon.restaurant.nutritionTag
        ],
      ).toBeDefined()
      expect(
        enCommon.restaurant.nutritionTag[
          tag.value as keyof typeof enCommon.restaurant.nutritionTag
        ],
      ).toBeDefined()
    }
  })

  it("음식 종류·정렬·후기정렬 키가 전부 있다", () => {
    for (const cuisine of CUISINE_TYPES) {
      const key = cuisineTypeLabelKey(cuisine.value)
      expect(key).toBe(`restaurant.cuisine.${cuisine.value}`)
      expect(
        koCommon.restaurant.cuisine[
          cuisine.value as keyof typeof koCommon.restaurant.cuisine
        ],
      ).toBeDefined()
      expect(
        enCommon.restaurant.cuisine[
          cuisine.value as keyof typeof enCommon.restaurant.cuisine
        ],
      ).toBeDefined()
    }
    for (const sort of SORT_OPTIONS) {
      expect(sortLabelKey(sort.value)).toBe(sort.labelKey)
      expect(
        koCommon.restaurant.sort[
          sort.value as keyof typeof koCommon.restaurant.sort
        ],
      ).toBeDefined()
    }
    for (const sort of REVIEW_SORT_OPTIONS) {
      expect(
        koCommon.restaurant.reviewSort[
          sort.value as keyof typeof koCommon.restaurant.reviewSort
        ],
      ).toBeDefined()
    }
  })

  it("카탈로그에 없는 값도 키 문자열을 만들어 준다 (화면이 터지지 않게)", () => {
    expect(nutritionTagLabelKey("LOW_FAT" as NutritionTag)).toBe(
      "restaurant.nutritionTag.LOW_FAT",
    )
    expect(cuisineTypeLabelKey("FUSION" as CuisineType)).toBe(
      "restaurant.cuisine.FUSION",
    )
  })
})
