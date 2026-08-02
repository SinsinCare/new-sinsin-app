/**
 * 레시피 v2 상세 — 순수 계산부와 서비스 매핑 검증.
 *
 * 왜 이 세 덩어리인가:
 *  1. **인분 조절**: 계약이 요구하는 "인분을 바꾸면 영양도 같이 바뀐다" 가 배율 두 개로
 *     갈려 있어서(재료는 원문 기준, 영양은 1인분 기준) 여기서 틀리면 화면 두 곳이 어긋난다.
 *  2. **안전 규칙**: `provenance` 없는 응답, 리뷰 0건, `percentOfRemaining=null`,
 *     임상 태그. 넷 다 "조용히 그려지면" 사고가 되는 경로다.
 *  3. **모의 경로**: 서버가 붙기 전 화면이 보는 payload 가 계약 모양인지.
 */
/* eslint-disable import/first --
 * `apiClient` 는 expo-secure-store(ESM)를 끌고 와서 node 환경 jest 가 파싱하지 못한다.
 * 실제 axios 인스턴스 대신 메서드를 jest.fn 으로 세워 **와이어 경로**(모의 플래그를 끈
 * 상태)까지 검증한다 — 서버가 붙는 날 처음 돌아가는 코드가 그쪽이다.
 * 다른 서비스 테스트와 같은 방식이다.
 */
jest.mock("../src/services/core/apiClient", () => ({
  api: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}))

import fs from "fs"
import path from "path"
import {
  SERVINGS_MAX,
  SERVINGS_MIN,
  barFillRatio,
  clampServings,
  breakdownForDisplay,
  deriveBreakdown,
  distributionRows,
  filterClinicalTags,
  formatAverage,
  formatDuration,
  formatGrams,
  formatNutrientAmount,
  formatPercent,
  hasRatings,
  ingredientScale,
  isOverRemaining,
  isServingAdjustable,
  nutritionScale,
  orderBreakdown,
  parseRecipeId,
  resolveProvenance,
  scaleBreakdown,
  scaleIngredients,
  scaleNutrition,
  unmatchedCopyKey,
} from "@/src/features/recipe/components/detail/recipeDetailModel"
import {
  mapNutrition,
  mapRating,
  mapRecipeDetail,
  recipeDetailV2Service,
  recipeV2Mock,
  resetRecipeV2Mock,
} from "@/src/features/recipe/services/recipeDetailV2Service"
import { mockRecipeIds } from "@/src/features/recipe/services/recipeListV2MockCatalog"
import { api } from "@/src/services/core/apiClient"
import {
  NUTRIENT_KEYS,
  type RecipeNutritionProvenance,
  type NutrientHeadline,
  type RatingSummary,
  type RecipeIngredient,
  type RecipeNutrition,
} from "@/src/features/recipe/types/recipeV2"

/**
 * 이 파일이 상세를 물을 때 쓰는 id. **카탈로그가 실제로 내보내는 id** 다.
 *
 * 종전에는 리터럴 `7` 이었다. 모의 카탈로그(101~112)에도, dev DB(21~195)에도 없는
 * id 다. 모의 상세가 **어떤 id 로 물어도** 레시피를 만들어 줬기 때문에 그게 통과했고,
 * 그래서 이 파일은 "목록이 주는 id 로 상세가 열린다" 를 한 번도 확인한 적이 없었다.
 * 리터럴 대신 카탈로그에서 뽑아 오면 카탈로그가 바뀌어도 그 계약이 따라온다.
 */
const MOCK_ID = mockRecipeIds()[0]

const NUTRITION: RecipeNutrition = {
  kcal: 520,
  proteinG: 7,
  sodiumMg: 376,
  potassiumMg: 580,
  phosphorusMg: 218,
  provenance: "reference_estimate",
  unmatchedIngredients: ["당면(건조)"],
}

const INGREDIENTS: RecipeIngredient[] = [
  {
    ordinal: 1,
    name: "흑미흰밥",
    amountText: "70g",
    grams: 70,
    matched: true,
    reason: "matched",
  },
  {
    ordinal: 2,
    name: "저염 간장",
    amountText: "15ml",
    grams: 15,
    matched: true,
    reason: "matched",
  },
  {
    ordinal: 3,
    name: "다진마늘·파·참깨",
    amountText: "소량",
    grams: null,
    reason: "unknown_amount",
    matched: false,
  },
]

/** 로케일 파일을 그대로 읽는다. 키가 사라지면 여기서 먼저 깨진다. */
function readLocale(locale: "ko" | "en"): {
  detail: {
    ingredients: {
      excluded: string
      unknownAmount: string
      notInFoodTable: string
    }
  }
} {
  const file = path.join(
    __dirname,
    "..",
    "src",
    "i18n",
    "locales",
    locale,
    "recipe.json",
  )
  return JSON.parse(fs.readFileSync(file, "utf8"))
}

describe("경로 파라미터", () => {
  it("십진수만 받는다 — 0x10 이 16번 레시피를 열지 않는다", () => {
    expect(parseRecipeId("42")).toBe(42)
    expect(parseRecipeId(["42"])).toBe(42)
    expect(parseRecipeId("0x10")).toBeNull()
    expect(parseRecipeId("1e3")).toBeNull()
    expect(parseRecipeId(" 42")).toBeNull()
    expect(parseRecipeId("-1")).toBeNull()
    expect(parseRecipeId("0")).toBeNull()
    expect(parseRecipeId("1234567890")).toBeNull() // 10자리는 거른다
    expect(parseRecipeId(undefined)).toBeNull()
  })
})

describe("인분 조절", () => {
  it("원본 인분을 모르면 조절 UI 를 열지 않는다", () => {
    expect(
      isServingAdjustable({ servings: null, ingredients: INGREDIENTS }),
    ).toBe(false)
    expect(isServingAdjustable({ servings: 0, ingredients: INGREDIENTS })).toBe(
      false,
    )
    expect(isServingAdjustable({ servings: 2, ingredients: INGREDIENTS })).toBe(
      true,
    )
  })

  it("비례시킬 수 있는 재료가 하나도 없으면 열지 않는다", () => {
    expect(
      isServingAdjustable({
        servings: 2,
        ingredients: [{ grams: null }],
      }),
    ).toBe(false)
  })

  it("스테퍼는 계약 범위(1~20) 밖으로 나가지 않는다", () => {
    expect(clampServings(0)).toBe(SERVINGS_MIN)
    expect(clampServings(-5)).toBe(SERVINGS_MIN)
    expect(clampServings(99)).toBe(SERVINGS_MAX)
    expect(clampServings(2.4)).toBe(2)
    expect(clampServings(Number.NaN)).toBe(SERVINGS_MIN)
  })

  it("재료 배율은 고른 인분 / 원본 인분이다", () => {
    expect(ingredientScale(2, 2)).toBe(1)
    expect(ingredientScale(2, 4)).toBe(2)
    expect(ingredientScale(2, 1)).toBe(0.5)
    // 원본 인분을 모르면 1 — 1인분이라고 가정하지 않는다.
    expect(ingredientScale(null, 4)).toBe(1)
  })

  it("영양 배율은 고른 인분이다(응답이 1인분 기준이므로)", () => {
    expect(nutritionScale(3)).toBe(3)
    expect(nutritionScale(0)).toBe(SERVINGS_MIN)
  })

  it("배율 1 에서는 원문 표기를 그대로 보인다 — 15ml 를 15g 로 바꿔 적지 않는다", () => {
    const scaled = scaleIngredients(INGREDIENTS, 1)
    expect(scaled.map((item) => item.displayAmount)).toEqual([
      "70g",
      "15ml",
      "소량",
    ])
  })

  it("배율이 바뀌면 grams 있는 재료만 움직인다", () => {
    const scaled = scaleIngredients(INGREDIENTS, 2)
    expect(scaled[0]).toMatchObject({
      scalable: true,
      scaledGrams: 140,
      displayAmount: "140g",
    })
    expect(scaled[1]).toMatchObject({ scaledGrams: 30, displayAmount: "30g" })
    // 소량은 조절 대상이 아니다 — 추정으로 채우지 않는다.
    expect(scaled[2]).toMatchObject({
      scalable: false,
      scaledGrams: null,
      displayAmount: "소량",
    })
  })

  it("나눠 떨어지지 않는 그램은 소수 한 자리까지만 남긴다", () => {
    expect(formatGrams(70 / 3)).toBe("23.3")
    expect(formatGrams(35)).toBe("35")
    expect(formatGrams(0)).toBe("0")
  })

  it("영양 수치와 비율이 같은 배율로 함께 움직인다", () => {
    const breakdown: NutrientHeadline[] = [
      { key: "sodium", amount: 376, unit: "mg", percentOfRemaining: 24 },
      { key: "protein", amount: 7, unit: "g", percentOfRemaining: null },
    ]
    const scaledNutrition = scaleNutrition(NUTRITION, 2)
    const scaledBreakdown = scaleBreakdown(breakdown, 2)

    expect(scaledNutrition.sodiumMg).toBe(752)
    expect(scaledNutrition.kcal).toBe(1040)
    // provenance 와 미매칭 목록은 배율과 무관하게 유지된다.
    expect(scaledNutrition.provenance).toBe("reference_estimate")
    expect(scaledNutrition.unmatchedIngredients).toEqual(["당면(건조)"])

    expect(scaledBreakdown[0]).toMatchObject({
      amount: 752,
      percentOfRemaining: 48,
    })
    // 계산할 수 없는 비율은 배율을 곱해도 null 이다(0 이 아니다).
    expect(scaledBreakdown[1].percentOfRemaining).toBeNull()
    expect(scaledBreakdown[1].amount).toBe(14)
  })
})

describe("영양 표시 규칙", () => {
  it("provenance 가 없거나 계약 밖이면 수치를 그리지 않는다", () => {
    expect(resolveProvenance("reference_estimate")).toBe("reference_estimate")
    expect(resolveProvenance("nutritionist_reviewed")).toBe(
      "nutritionist_reviewed",
    )
    expect(resolveProvenance("estimated")).toBeNull()
    expect(resolveProvenance(undefined)).toBeNull()
    expect(resolveProvenance(null)).toBeNull()

    expect(mapNutrition({ sodiumMg: 376 })).toBeNull()
    expect(mapNutrition({ sodiumMg: 376, provenance: "guess" })).toBeNull()
    expect(
      mapNutrition({ sodiumMg: 376, provenance: "author_supplied" }),
    ).toMatchObject({ sodiumMg: 376, provenance: "author_supplied" })
  })

  it("비율을 모르면 막대를 그리지 않는다(0% 막대를 만들지 않는다)", () => {
    expect(barFillRatio(null)).toBeNull()
    expect(barFillRatio(Number.NaN)).toBeNull()
    expect(barFillRatio(24)).toBeCloseTo(0.24)
    // 넘겨도 막대는 가득 찬 것으로 잘린다.
    expect(barFillRatio(240)).toBe(1)
    expect(barFillRatio(-10)).toBe(0)
  })

  it("비율 표기는 계약 상한 999 에서 잘린다", () => {
    expect(formatPercent(23.6)).toBe(24)
    expect(formatPercent(4000)).toBe(999)
    expect(formatPercent(-3)).toBe(0)
  })

  it("남은 참고량 초과는 사실 진술로만 다룬다", () => {
    expect(isOverRemaining(101)).toBe(true)
    expect(isOverRemaining(100)).toBe(false)
    expect(isOverRemaining(null)).toBe(false)
  })

  it("mg 는 정수, g 는 소수 한 자리", () => {
    expect(formatNutrientAmount(376.4, "mg")).toBe("376")
    expect(formatNutrientAmount(7, "g")).toBe("7")
    expect(formatNutrientAmount(7.25, "g")).toBe("7.3")
  })

  it("breakdown 이 비면 절대값만 만들고 비율은 지어내지 않는다", () => {
    const derived = deriveBreakdown(NUTRITION)
    expect(derived.map((item) => item.key)).toEqual([...NUTRIENT_KEYS])
    expect(derived.every((item) => item.percentOfRemaining === null)).toBe(true)
    expect(derived[3]).toMatchObject({ key: "protein", amount: 7, unit: "g" })
  })

  it("서버가 breakdown 을 비워 보내도 네 줄이 사라지지 않는다", () => {
    /**
     * 계약 §3.3 은 4개를 전부 담으라고 정했지만, 빈 배열이 오면 영양 카드에 제목·출처
     * 배지·열량만 남고 나트륨·칼륨·인·단백질이 **조용히 사라진다**. 그 네 줄이 이 앱의
     * 존재 이유(§6.1)라서, 값이 있는데 안 그리는 쪽이 잘못이다.
     */
    const fallback = breakdownForDisplay([], NUTRITION)
    expect(fallback.map((item) => item.key)).toEqual([...NUTRIENT_KEYS])
    expect(fallback.map((item) => item.amount)).toEqual([376, 580, 218, 7])
    // 참고량을 모르므로 비율은 지어내지 않는다 — 막대 없이 수치만 나온다.
    expect(fallback.every((item) => item.percentOfRemaining === null)).toBe(
      true,
    )
  })

  it("provenance 를 확인할 수 없으면 폴백조차 만들지 않는다(§1.1)", () => {
    // 출처를 모르는 수치를 폴백으로 살려 내면 §1.1 을 우회하는 뒷문이 된다.
    expect(breakdownForDisplay([], null)).toEqual([])
  })

  it("서버가 breakdown 을 보내면 그것을 쓴다(폴백이 덮지 않는다)", () => {
    const given: NutrientHeadline[] = [
      { key: "sodium", amount: 999, unit: "mg", percentOfRemaining: 64 },
    ]
    const used = breakdownForDisplay(given, NUTRITION)
    expect(used).toEqual(given)
    // 비율이 살아 있어야 한다 — 폴백이 이기면 24% 가 null 이 된다.
    expect(used[0].percentOfRemaining).toBe(64)
  })

  it("표시 순서는 나트륨·칼륨·인·단백질로 고정한다", () => {
    const shuffled: NutrientHeadline[] = [
      { key: "protein", amount: 7, unit: "g", percentOfRemaining: null },
      { key: "phosphorus", amount: 218, unit: "mg", percentOfRemaining: 21 },
      { key: "sodium", amount: 376, unit: "mg", percentOfRemaining: 24 },
    ]
    expect(orderBreakdown(shuffled, NUTRIENT_KEYS).map((i) => i.key)).toEqual([
      "sodium",
      "phosphorus",
      "protein",
    ])
  })
})

describe("별점 · 리뷰", () => {
  const empty: RatingSummary = {
    average: null,
    count: 0,
    distribution: [0, 0, 0, 0, 0],
  }

  it("리뷰 0건이면 별점 영역을 그리지 않는다(0.0 을 만들지 않는다)", () => {
    expect(hasRatings(empty)).toBe(false)
    // count 가 있어도 average 가 없으면 그리지 않는다.
    expect(
      hasRatings({ average: null, count: 3, distribution: [0, 0, 1, 1, 1] }),
    ).toBe(false)
    expect(
      hasRatings({ average: 4.7, count: 3, distribution: [0, 0, 1, 1, 1] }),
    ).toBe(true)
  })

  it("서버가 count=0 인데 average 를 보내도 별점을 만들지 않는다", () => {
    expect(mapRating({ average: 0, count: 0, distribution: [] })).toEqual(empty)
    expect(
      mapRating({ average: 4.7, count: 3, distribution: [0, 0, 1, 1, 1] }),
    ).toEqual({ average: 4.7, count: 3, distribution: [0, 0, 1, 1, 1] })
  })

  it("분포 막대는 5점부터 내려오고 최다 구간 기준으로 길이를 잡는다", () => {
    const rows = distributionRows({
      average: 4.6,
      count: 10,
      distribution: [0, 1, 1, 2, 6],
    })
    expect(rows.map((row) => row.star)).toEqual([5, 4, 3, 2, 1])
    expect(rows[0]).toMatchObject({ amount: 6, ratio: 1 })
    expect(rows[1]).toMatchObject({ amount: 2 })
    expect(rows[1].ratio).toBeCloseTo(2 / 6)
    expect(rows[4]).toMatchObject({ amount: 0, ratio: 0 })
  })

  it("리뷰가 없으면 분포 비율이 전부 0 이다(0 나누기가 없다)", () => {
    expect(distributionRows(empty).every((row) => row.ratio === 0)).toBe(true)
  })

  it("평균은 소수 첫째 자리까지", () => {
    expect(formatAverage(4.65)).toBe("4.7")
    expect(formatAverage(5)).toBe("5.0")
  })
})

describe("매칭 안 된 재료의 문구는 영양 출처에 따라 갈린다", () => {
  /**
   * 실측으로 발견한 결함이다. 큐레이션 레시피(`reference_estimate`)의 상세에서
   * 흑미흰밥·당면·식용유에 **"영양 계산에서 빠진 재료예요"** 가 붙어 있었다.
   *
   * 그 문구는 거짓이다. `reference_estimate` 는 원본이 준 추정값을 그대로 쓴 것이고
   * **재료로 계산하지 않았다** — 빠진 것이 없다. 같은 문구를 쓰면 "이 재료가 빠져서
   * 나트륨이 낮게 나왔다" 로 읽히는데, 실제로는 통째로 다른 출처의 값이다.
   * 신장 환자가 나트륨 수치를 보고 판단하는 화면에서 그 오해는 그냥 두면 안 된다.
   *
   * `computed_from_ingredients` 일 때만 "계산에서 빠졌다" 가 사실이다.
   */
  const KO = readLocale("ko")
  const EN = readLocale("en")

  it("두 문구가 서로 다른 사실을 말한다", () => {
    const ko = KO.detail.ingredients
    const en = EN.detail.ingredients
    expect(ko.excluded).toBeTruthy()
    expect(ko.notInFoodTable).toBeTruthy()
    // 같은 문구면 분기의 의미가 없다.
    expect(ko.excluded).not.toBe(ko.notInFoodTable)
    expect(en.excluded).not.toBe(en.notInFoodTable)
    // 계산하지 않은 경우의 문구는 "계산" 을 언급하지 않아야 한다.
    expect(ko.notInFoodTable).not.toMatch(/계산/)
    expect(en.notInFoodTable.toLowerCase()).not.toMatch(/calculat/)
  })

  it("세 문구가 서로 다른 사실을 말한다", () => {
    const ko = KO.detail.ingredients
    const en = EN.detail.ingredients
    expect(
      new Set([ko.excluded, ko.unknownAmount, ko.notInFoodTable]).size,
    ).toBe(3)
    expect(
      new Set([en.excluded, en.unknownAmount, en.notInFoodTable]).size,
    ).toBe(3)
    // 분량을 모르는 경우에 "식품표에 없다" 고 말하지 않아야 한다 — 실제로 있을 수 있다.
    expect(ko.unknownAmount).not.toMatch(/식품표/)
    expect(en.unknownAmount.toLowerCase()).not.toMatch(/reference table/)
  })

  it("상세 화면의 문구는 지시하지 않는다 — 독자가 못 하는 일이다", () => {
    // 큐레이션 레시피를 읽는 사람은 그 레시피를 고칠 수 없다. "150g 처럼 적어 주세요" 는
    // 작성 화면에만 있어야 하고, 여기 있으면 할 수 없는 일을 시키는 셈이다.
    for (const copy of [
      KO.detail.ingredients.unknownAmount,
      KO.detail.ingredients.excluded,
      KO.detail.ingredients.notInFoodTable,
    ]) {
      expect(copy).not.toMatch(/적어|적으면|입력|해 주세요|하세요/)
    }
  })

  it("분량을 몰라 못 센 재료에는 출처와 무관하게 '분량' 문구를 쓴다", () => {
    // `참기름 소량` 이 실측 사례다. 식품표에 그 이름 그대로 있는데도 매칭되지 않는다.
    for (const provenance of [
      "computed_from_ingredients",
      "reference_estimate",
      "author_supplied",
      "nutritionist_reviewed",
    ] as const) {
      expect(
        unmatchedCopyKey(
          "unknown_amount",
          provenance === "computed_from_ingredients",
        ),
      ).toBe("detail.ingredients.unknownAmount")
    }
  })

  it("식품표에서 못 찾은 재료는 계산으로 만든 수치일 때만 '계산에서 빠졌다' 다", () => {
    expect(unmatchedCopyKey("not_in_catalog", true)).toBe(
      "detail.ingredients.excluded",
    )
    expect(unmatchedCopyKey("not_in_catalog", false)).toBe(
      "detail.ingredients.notInFoodTable",
    )
  })

  it("서버가 reason 을 안 주면 not_in_catalog 로 떨어지지 않는다", () => {
    // 기본값을 `not_in_catalog` 로 두는 것이 곧 고친 거짓말이다. 그램이 없으면
    // 매칭을 시도했을 수 없으므로 `unknown_amount` 가 사실이다.
    const [withoutGrams] = mapRecipeDetail(
      {
        id: 1,
        ingredients: [
          { ordinal: 1, name: "참기름", amountText: "소량", matched: false },
        ],
      },
      "ko",
    ).ingredients
    expect(withoutGrams?.reason).toBe("unknown_amount")
  })
})

describe("타이머 표기", () => {
  it("m:ss 로 적고 음수·소수를 흘리지 않는다", () => {
    expect(formatDuration(120)).toBe("2:00")
    expect(formatDuration(90)).toBe("1:30")
    expect(formatDuration(45)).toBe("0:45")
    expect(formatDuration(3600)).toBe("60:00")
    expect(formatDuration(-5)).toBe("0:00")
    expect(formatDuration(59.9)).toBe("0:59")
  })
})

describe("임상 태그 (계약 §1.2)", () => {
  it("검수 전 카탈로그에 임상 딱지를 붙이지 않는다", () => {
    expect(
      filterClinicalTags([
        "저염식",
        "CKD3",
        "한그릇",
        "저단백",
        "low-sodium",
        "Kidney Friendly",
        "채소",
        "#저칼륨",
        "당뇨",
        "고혈압",
        "투석",
        "콩팥",
      ]),
    ).toEqual(["한그릇", "채소"])
  })

  it("임상 토큰이 없는 태그는 건드리지 않는다", () => {
    expect(filterClinicalTags(["한식", "간단"])).toEqual(["한식", "간단"])
  })
})

describe("응답 매핑이 계약을 어긴 payload 를 흘리지 않는다", () => {
  it("provenance 가 빠진 상세는 수치 없이 온다(화면이 '표시할 수 없어요' 를 그린다)", () => {
    const detail = mapRecipeDetail(
      {
        id: 3,
        name: "테스트",
        nutrition: { sodiumMg: 999, kcal: 100 },
        rating: { average: 4.2, count: 0, distribution: [] },
      },
      "ko",
    )
    expect(detail.nutrition).toBeNull()
    expect(detail.rating.average).toBeNull()
    expect(detail.ingredients).toEqual([])
    expect(detail.steps).toEqual([])
    // localeInfo 를 빠뜨린 응답은 "완전 번역" 으로 가정한다 — 요청 로케일을 그대로 쓴다.
    expect(detail.localeInfo).toEqual({
      requested: "ko",
      contentLocale: "ko",
      fullyTranslated: true,
    })
  })

  it("ordinal 이 전부 0 이어도 행이 서로 구별된다", () => {
    const detail = mapRecipeDetail(
      {
        id: 3,
        ingredients: [
          { ordinal: 0, name: "쌀", amountText: "100g", grams: 100 },
          { ordinal: 0, name: "소금", amountText: "약간", grams: null },
        ],
        steps: [{ ordinal: 0, text: "볶는다" }],
      },
      "ko",
    )
    expect(detail.ingredients.map((item) => item.ordinal)).toEqual([1, 2])
    expect(detail.steps[0].ordinal).toBe(1)
    // matched 를 빠뜨린 응답은 "계산에 들어갔다" 고 가정하지 않는다.
    expect(detail.ingredients.every((item) => item.matched === false)).toBe(
      true,
    )
  })
})

describe("모의 경로 (서버 v2 가 붙기 전)", () => {
  const previousLatency = recipeV2Mock.latencyMs

  beforeAll(() => {
    recipeV2Mock.latencyMs = 0
  })

  afterAll(() => {
    recipeV2Mock.latencyMs = previousLatency
  })

  beforeEach(() => {
    resetRecipeV2Mock()
  })

  it("상세는 계약 §3.3 모양으로 온다", async () => {
    const detail = await recipeDetailV2Service.getRecipeDetail(MOCK_ID, "ko")
    expect(detail.id).toBe(MOCK_ID)
    expect(detail.nutrition).not.toBeNull()
    expect(detail.nutrition?.provenance).toBe("reference_estimate")
    expect(detail.nutrientBreakdown.map((item) => item.key)).toEqual([
      ...NUTRIENT_KEYS,
    ])
    // 체중 기록이 없는 사용자 경로: 단백질만 null 이고 나머지는 그대로 온다.
    expect(detail.budget.proteinG).toBeNull()
    expect(detail.budget.sodiumMg).toBeGreaterThan(0)
    expect(
      detail.nutrientBreakdown.find((item) => item.key === "protein")
        ?.percentOfRemaining,
    ).toBeNull()
    expect(detail.ingredients.some((item) => item.grams == null)).toBe(true)
    expect(detail.steps.some((step) => step.timerSeconds != null)).toBe(true)
    expect(detail.localeInfo.fullyTranslated).toBe(true)
  })

  it("영문 요청은 번역 공백을 숨기지 않는다", async () => {
    const detail = await recipeDetailV2Service.getRecipeDetail(MOCK_ID, "en")
    expect(detail.localeInfo.requested).toBe("en")
    expect(detail.localeInfo.contentLocale).toBe("ko")
    expect(detail.localeInfo.fullyTranslated).toBe(false)
  })

  it("저장은 절대 상태이고 두 번 보내도 같은 결과다(멱등)", async () => {
    const first = await recipeDetailV2Service.setSaved(MOCK_ID, true)
    const second = await recipeDetailV2Service.setSaved(MOCK_ID, true)
    expect(first).toEqual(second)
    expect(first.saved).toBe(true)

    const off = await recipeDetailV2Service.setSaved(MOCK_ID, false)
    expect(off.saved).toBe(false)
    expect(off.saveCount).toBe(first.saveCount - 1)
  })

  it("내 리뷰 쓰기는 갱신이고 집계가 따라온다", async () => {
    const created = await recipeDetailV2Service.upsertMyReview(MOCK_ID, {
      rating: 5,
      body: "좋았어요",
    })
    expect(created.review.rating).toBe(5)
    const countAfterCreate = created.summary.count

    const updated = await recipeDetailV2Service.upsertMyReview(MOCK_ID, {
      rating: 3,
      body: null,
    })
    expect(updated.review.rating).toBe(3)
    expect(updated.review.body).toBeNull()
    // 갱신이므로 개수가 늘지 않는다.
    expect(updated.summary.count).toBe(countAfterCreate)

    const deleted = await recipeDetailV2Service.deleteMyReview(MOCK_ID)
    expect(deleted.summary.count).toBe(countAfterCreate - 1)
    // 없는 리뷰를 또 지워도 200 이다(멱등).
    const again = await recipeDetailV2Service.deleteMyReview(MOCK_ID)
    expect(again.summary.count).toBe(deleted.summary.count)
  })

  it("리뷰 목록은 커서로 이어지고 마지막 페이지에서 멈춘다", async () => {
    const first = await recipeDetailV2Service.getReviews(MOCK_ID, { limit: 2 })
    expect(first.items).toHaveLength(2)
    expect(first.hasMore).toBe(true)
    expect(first.nextCursor).not.toBeNull()

    const second = await recipeDetailV2Service.getReviews(MOCK_ID, {
      limit: 2,
      cursor: first.nextCursor ?? undefined,
    })
    expect(second.items).toHaveLength(2)
    expect(second.hasMore).toBe(false)
    // 같은 리뷰가 두 페이지에 겹치지 않는다.
    const ids = [...first.items, ...second.items].map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

/**
 * 와이어 경로 — `recipeV2Mock.enabled = false` 일 때 실제로 무엇을 부르고 무엇을 읽는가.
 *
 * 왜 따로 검증하는가: 서버가 붙는 날 처음 돌아가는 코드가 이쪽이고, 모의 경로 테스트는
 * 이 코드를 한 줄도 실행하지 않는다(실측 커버리지: 이 블록을 넣기 전 서비스의 와이어
 * 분기와 `mapReviewList` 가 전부 미실행이었다). 여기서 못 박는 것 셋:
 *   1. 봉투(`{result}`)를 벗겨서 읽는다 — `result` 를 빠뜨리면 화면이 빈 값을 그린다.
 *   2. 저장·리뷰는 **PUT + 절대 상태**다(§2.1). 토글 POST 로 바뀌면 여기서 깨진다.
 *   3. `provenance` 가 계약 밖이면 와이어 경로에서도 `nutrition` 이 null 이다(§1.1).
 *      모의 경로만 막아도 실제 서버 응답이 그대로 그려지면 아무 의미가 없다.
 */
describe("와이어 경로 (서버가 붙은 뒤)", () => {
  const mockApi = api as unknown as {
    get: jest.Mock
    put: jest.Mock
    post: jest.Mock
    delete: jest.Mock
  }
  const previousEnabled = recipeV2Mock.enabled

  beforeAll(() => {
    recipeV2Mock.enabled = false
  })

  afterAll(() => {
    recipeV2Mock.enabled = previousEnabled
  })

  beforeEach(() => {
    mockApi.get.mockReset()
    mockApi.put.mockReset()
    mockApi.post.mockReset()
    mockApi.delete.mockReset()
  })

  it("상세는 봉투의 result 를 읽고 locale 을 실어 보낸다", async () => {
    mockApi.get.mockResolvedValue({
      data: {
        isSuccess: true,
        code: "OK",
        result: {
          id: MOCK_ID,
          name: "잡채덮밥",
          nutrition: {
            sodiumMg: 376,
            provenance: "computed_from_ingredients",
            unmatchedIngredients: ["당면(건조)"],
          },
          rating: { average: 4.7, count: 3, distribution: [0, 0, 1, 1, 1] },
          localeInfo: {
            requested: "en",
            contentLocale: "ko",
            fullyTranslated: false,
          },
        },
      },
    })

    const detail = await recipeDetailV2Service.getRecipeDetail(MOCK_ID, "en")

    expect(mockApi.get).toHaveBeenCalledWith(`/recipes/${MOCK_ID}`, {
      params: { locale: "en" },
    })
    expect(detail.id).toBe(MOCK_ID)
    expect(detail.nutrition?.provenance).toBe("computed_from_ingredients")
    expect(detail.nutrition?.sodiumMg).toBe(376)
    expect(detail.rating.average).toBe(4.7)
    expect(detail.localeInfo.fullyTranslated).toBe(false)
  })

  it("봉투에 result 가 없으면 빈 값으로 내려앉되 수치는 그리지 않는다", async () => {
    mockApi.get.mockResolvedValue({ data: { isSuccess: true } })
    const detail = await recipeDetailV2Service.getRecipeDetail(MOCK_ID, "ko")
    // 계약 위반 응답이므로 수치는 null 이다 — 0 을 만들지 않는다(§1.1).
    expect(detail.nutrition).toBeNull()
    expect(detail.rating).toEqual({
      average: null,
      count: 0,
      distribution: [0, 0, 0, 0, 0],
    })
    expect(detail.ingredients).toEqual([])
    expect(detail.steps).toEqual([])
  })

  it("서버가 계약 밖 provenance 를 보내도 와이어 경로에서 수치가 막힌다", async () => {
    mockApi.get.mockResolvedValue({
      data: {
        result: {
          id: 7,
          // v1 잔재. 계약 §3.2 의 네 값이 아니다.
          nutrition: { sodiumMg: 2400, provenance: "estimated" },
        },
      },
    })
    const detail = await recipeDetailV2Service.getRecipeDetail(MOCK_ID, "ko")
    expect(detail.nutrition).toBeNull()
  })

  it("저장은 PUT 이고 본문이 절대 상태다(토글 POST 가 아니다)", async () => {
    mockApi.put.mockResolvedValue({
      data: { result: { saved: true, saveCount: 1229 } },
    })
    const result = await recipeDetailV2Service.setSaved(MOCK_ID, true)

    expect(mockApi.put).toHaveBeenCalledWith(`/recipes/${MOCK_ID}/save`, {
      saved: true,
    })
    expect(mockApi.post).not.toHaveBeenCalled()
    expect(result).toEqual({ saved: true, saveCount: 1229 })

    // 같은 상태를 두 번 보내는 것이 안전해야 한다 — 본문이 매번 같아야 멱등이다.
    await recipeDetailV2Service.setSaved(MOCK_ID, true)
    expect(mockApi.put.mock.calls[0]).toEqual(mockApi.put.mock.calls[1])
  })

  it("조회 기록은 POST 이고 본문을 만들지 않는다", async () => {
    mockApi.post.mockResolvedValue({ data: {} })
    await recipeDetailV2Service.recordView(MOCK_ID)
    expect(mockApi.post).toHaveBeenCalledWith(`/recipes/${MOCK_ID}/views`)
  })

  it("리뷰 목록은 limit·sort 를 싣고 커서가 없으면 커서를 보내지 않는다", async () => {
    mockApi.get.mockResolvedValue({
      data: {
        result: {
          items: [
            {
              id: 9001,
              authorNickName: "잔잔한하루",
              rating: 5,
              body: "간을 반으로 줄여도 맛있었어요.",
              createdAt: "2026-07-24T02:11:00.000Z",
              mine: true,
            },
            // 본문 없는 별점만 리뷰도 계약이 허용한다(§3.4).
            { id: 9002, authorNickName: "물한잔", rating: 4, createdAt: "" },
          ],
          nextCursor: "20",
          hasMore: true,
          summary: { average: 4.5, count: 2, distribution: [0, 0, 0, 1, 1] },
        },
      },
    })

    const page = await recipeDetailV2Service.getReviews(MOCK_ID)
    expect(mockApi.get).toHaveBeenCalledWith(`/recipes/${MOCK_ID}/reviews`, {
      params: { limit: 20, sort: "recent" },
    })
    /**
     * 키 집합을 따로 못 박는다. `toHaveBeenCalledWith` 는 비엄격 비교라
     * `{limit, sort, cursor: undefined}` 도 통과시킨다 — 실측으로 확인했다.
     * 커서 키를 무조건 만들면 `String(cursor)` 로 바뀌는 순간 `"undefined"` 가
     * 첫 페이지 커서로 서버에 날아간다.
     */
    expect(Object.keys(mockApi.get.mock.calls[0][1].params).sort()).toEqual([
      "limit",
      "sort",
    ])
    expect(page.items[0].mine).toBe(true)
    // `mine` 을 빠뜨린 응답을 "내 리뷰" 로 읽지 않는다 — 남의 리뷰에 삭제 버튼이 붙는다.
    expect(page.items[1].mine).toBe(false)
    expect(page.items[1].body).toBeNull()
    expect(page.nextCursor).toBe("20")
    expect(page.hasMore).toBe(true)
    expect(page.summary.average).toBe(4.5)
  })

  it("커서·정렬을 주면 그대로 실어 보낸다", async () => {
    mockApi.get.mockResolvedValue({ data: { result: { items: [] } } })
    await recipeDetailV2Service.getReviews(MOCK_ID, {
      limit: 5,
      cursor: "20",
      sort: "helpful",
    })
    expect(mockApi.get).toHaveBeenCalledWith(`/recipes/${MOCK_ID}/reviews`, {
      params: { limit: 5, sort: "helpful", cursor: "20" },
    })
  })

  it("리뷰 목록이 비면 별점을 0.0 으로 만들지 않는다", async () => {
    mockApi.get.mockResolvedValue({ data: { result: { items: [] } } })
    const page = await recipeDetailV2Service.getReviews(MOCK_ID)
    expect(page.items).toEqual([])
    expect(page.hasMore).toBe(false)
    expect(page.nextCursor).toBeNull()
    expect(page.summary.average).toBeNull()
    expect(page.summary.count).toBe(0)
  })

  it("내 리뷰 쓰기는 PUT 이고 본문을 그대로 보낸다", async () => {
    mockApi.put.mockResolvedValue({
      data: {
        result: {
          review: {
            rating: 4,
            body: "좋아요",
            createdAt: "2026-07-29T00:00:00.000Z",
            updatedAt: "2026-07-30T00:00:00.000Z",
          },
          summary: { average: 4.3, count: 3, distribution: [0, 0, 1, 1, 1] },
        },
      },
    })
    const result = await recipeDetailV2Service.upsertMyReview(MOCK_ID, {
      rating: 4,
      body: "좋아요",
    })
    expect(mockApi.put).toHaveBeenCalledWith(
      `/recipes/${MOCK_ID}/reviews/mine`,
      {
        rating: 4,
        body: "좋아요",
      },
    )
    expect(result.review.rating).toBe(4)
    expect(result.review.updatedAt).toBe("2026-07-30T00:00:00.000Z")
    expect(result.summary.count).toBe(3)
  })

  it("서버가 review 를 빠뜨려도 보낸 별점을 잃지 않는다", async () => {
    mockApi.put.mockResolvedValue({
      data: { result: { summary: { average: 5, count: 1, distribution: [] } } },
    })
    const result = await recipeDetailV2Service.upsertMyReview(MOCK_ID, {
      rating: 5,
    })
    // 사용자가 방금 고른 별점이다 — 화면에서 사라지면 다시 눌러야 한다.
    expect(result.review.rating).toBe(5)
    expect(result.review.body).toBeNull()
  })

  it("내 리뷰 삭제는 DELETE 이고 집계만 읽는다", async () => {
    mockApi.delete.mockResolvedValue({
      data: {
        result: {
          summary: { average: 4.7, count: 3, distribution: [0, 0, 1, 1, 1] },
        },
      },
    })
    const result = await recipeDetailV2Service.deleteMyReview(MOCK_ID)
    expect(mockApi.delete).toHaveBeenCalledWith(
      `/recipes/${MOCK_ID}/reviews/mine`,
    )
    expect(result.summary.count).toBe(3)
  })

  it("응답에 ckdGuide·aiSummary 가 있어도 화면 모양에 새어 들지 않는다(§1.1)", async () => {
    mockApi.get.mockResolvedValue({
      data: {
        result: {
          id: 7,
          name: "잡채덮밥",
          nutrition: { sodiumMg: 376, provenance: "reference_estimate" },
          // 서버가 v1 필드를 아직 지우지 않은 상태를 재현한다.
          ckdGuide: { ckd3: "칼륨을 줄이세요", dialysis: "인 결합제 복용" },
          aiSummary: "신장에 좋은 한 그릇",
          ckdFriendliness: "good",
        },
      },
    })
    const detail = await recipeDetailV2Service.getRecipeDetail(MOCK_ID, "ko")
    const serialized = JSON.stringify(detail)
    expect(serialized).not.toContain("ckdGuide")
    expect(serialized).not.toContain("aiSummary")
    expect(serialized).not.toContain("ckdFriendliness")
    expect(serialized).not.toContain("칼륨을 줄이세요")
    expect(serialized).not.toContain("신장에 좋은")
  })
})

/**
 * 목록 캐시 키의 문자열 결합. 상세에서 저장을 켜면 목록·아카이브 카드의 북마크도 같이
 * 바뀌어야 한다(§6.4). 아카이브는 `ARCHIVE_QUERY_ROOT` 를 import 해서 **컴파일 시점에**
 * 묶여 있지만, 목록(`useRecipeListV2.ts`)은 키를 인라인 배열로 쓰므로 문자열이 두 곳에
 * 있다. 목록 레인이 키를 바꾸면 tsc 도 테스트도 아무 말을 하지 않고 **저장 반영만 조용히
 * 죽는다** — 정확히 커뮤니티 좋아요에서 났던 결함의 모양이다. 그래서 원본을 읽어 못 박는다.
 */
describe("목록 캐시 키가 상세의 저장 반영과 붙어 있는가", () => {
  it("목록 훅의 queryKey 첫 원소가 상세 훅이 쓰는 루트와 같다", () => {
    const listSource = fs.readFileSync(
      path.join(__dirname, "../src/features/recipe/hooks/useRecipeListV2.ts"),
      "utf8",
    )
    const detailHookSource = fs.readFileSync(
      path.join(__dirname, "../src/features/recipe/hooks/useRecipeDetailV2.ts"),
      "utf8",
    )

    // 목록 훅의 `queryKey: [` 바로 다음 문자열 리터럴을 뽑는다.
    const listRoot = listSource.match(
      /queryKey:\s*\[\s*(?:\/\/[^\n]*\n\s*)*"([^"]+)"/,
    )
    expect(listRoot).not.toBeNull()

    const detailRoot = detailHookSource.match(
      /const LIST_QUERY_ROOT = \[\s*"([^"]+)"/,
    )
    expect(detailRoot).not.toBeNull()

    expect(detailRoot?.[1]).toBe(listRoot?.[1])
    // 값이 실제로 무엇인지도 남긴다 — 둘이 같이 틀리는 것을 막는다.
    expect(listRoot?.[1]).toBe("recipes-v2")
  })

  it("아카이브 루트는 import 로 묶여 있어 문자열이 두 곳에 없다", () => {
    const detailHookSource = fs.readFileSync(
      path.join(__dirname, "../src/features/recipe/hooks/useRecipeDetailV2.ts"),
      "utf8",
    )
    /**
     * import 문의 **줄바꿈 형태**를 못 박지 않는다. 여기에 이름을 하나 더 들여오면
     * (실제로 `archiveSourceQueryKey` 를 더했다) prettier 가 여러 줄로 펼치고, 그러면
     * 지켜야 할 규칙은 그대로인데 테스트만 깨진다. 검사할 것은 "그 모듈에서 들여왔다" 다.
     */
    const importBlock = new RegExp(
      String.raw`import \{[\s\S]*?ARCHIVE_QUERY_ROOT[\s\S]*?\} from "\.\./archive/useRecipeArchiveList"`,
      "u",
    )
    expect(detailHookSource).toMatch(importBlock)
    // 주석을 지우고 본다 — 머리말에서 키를 설명하는 것은 중복이 아니다.
    const code = detailHookSource
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")
    // 아카이브 키를 코드에서 문자열로 다시 적어 두면 조용한 사고가 하나 더 생긴다.
    expect(code).not.toContain('"archive"')
    expect(code).toContain("ARCHIVE_QUERY_ROOT")
  })
})
