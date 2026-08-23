/**
 * 레시피 상세 재설계(2026-07-31)의 **판단 규칙**을 고정한다.
 *
 * ## 무엇을 고쳤길래 테스트가 필요한가
 *
 * 상세 화면은 `matched === false` 인 재료마다 회색 문장을 한 줄씩 깔았다. dev 카탈로그에서
 * 그 비율이 60~100% 라 목록이 두 배로 길어지고, 정작 **어느 줄이 다른지**는 안 보였다.
 * 더 나쁜 건 그 문장이 오늘 데이터에서 아무 숫자도 바꾸지 않는다는 것이다 —
 * 175/175 의 `provenance` 가 `reference_estimate` 이고, 그때 영양 수치는 재료를 더해서
 * 만든 값이 아니다. 서버도 같은 말을 한다(아래 픽스처의 `unmatchedIngredients: []`).
 *
 * 그래서 "표시할지 말지" 를 `ingredientUncertainty` 한 함수로 옮겼다. 이 스위트는 그
 * 함수가 **조용해야 할 때 조용하고, 말해야 할 때 말하는지**를 지킨다. 규칙이 슬쩍
 * 되돌아가면(예: provenance 를 안 보고 `matched` 만 보면) 첫 번째 블록이 깨진다.
 *
 * ## 근거를 어디에 뒀나 — 실측 응답 픽스처
 *
 * `INGREDIENTS_21` 은 2026-07-31 dev 백엔드의 `GET /api/v1/recipes/21` 응답에서 그대로
 * 옮긴 재료 배열이다(잡채덮밥 (저염), 10개 중 4개가 `matched:false`). 지어낸 값이 아니라
 * 결함을 실제로 만들어 냈던 데이터다. 네트워크는 타지 않는다 — 게이트가 백엔드 없이
 * 도는 jest 라, 실서버에 매달면 "결함이 돌아왔다" 와 "서버가 꺼졌다" 를 구분하지 못한다.
 */
import {
  displayTags,
  ingredientCoverage,
  ingredientUncertainty,
  preparedPercent,
  showsDescription,
  showsSaveCount,
  visibleReviews,
} from "@/src/features/recipe/components/detail/recipeDetailModel"
import type { BlockedAuthors } from "@/src/features/recipe/utils/blockedAuthors"
import type { RecipeIngredient } from "@/src/features/recipe/types/recipeV2"
import koRecipe from "../src/i18n/locales/ko/recipe.json"
import enRecipe from "../src/i18n/locales/en/recipe.json"

/** 실측: `GET /api/v1/recipes/21` 의 `result.ingredients` 전체. */
const INGREDIENTS_21: RecipeIngredient[] = [
  {
    ordinal: 1,
    name: "흑미흰밥",
    amountText: "70g",
    grams: 70,
    matched: false,
    reason: "not_in_catalog",
  },
  {
    ordinal: 2,
    name: "당면(건조)",
    amountText: "60g",
    grams: 60,
    matched: false,
    reason: "not_in_catalog",
  },
  {
    ordinal: 3,
    name: "파프리카",
    amountText: "60g",
    grams: 60,
    matched: true,
    reason: "matched",
  },
  {
    ordinal: 4,
    name: "당근",
    amountText: "25g",
    grams: 25,
    matched: true,
    reason: "matched",
  },
  {
    ordinal: 5,
    name: "양파",
    amountText: "25g",
    grams: 25,
    matched: true,
    reason: "matched",
  },
  {
    ordinal: 6,
    name: "표고버섯",
    amountText: "30g",
    grams: 30,
    matched: true,
    reason: "matched",
  },
  {
    ordinal: 7,
    name: "식용유",
    amountText: "15g",
    grams: 15,
    matched: false,
    reason: "not_in_catalog",
  },
  {
    ordinal: 8,
    name: "간장",
    amountText: "7g",
    grams: 7,
    matched: true,
    reason: "matched",
  },
  {
    ordinal: 9,
    name: "들기름",
    amountText: "2g",
    grams: 2,
    matched: true,
    reason: "matched",
  },
  {
    ordinal: 10,
    name: "다진마늘·파·참깨·물",
    amountText: "소량",
    grams: null,
    matched: false,
    reason: "unknown_amount",
  },
]

function marksFor(
  provenance: "reference_estimate" | "computed_from_ingredients",
  adjustable: boolean,
) {
  return INGREDIENTS_21.map((item) =>
    ingredientUncertainty(item, { provenance, adjustable }),
  )
}

describe("ingredientUncertainty — 결과가 있을 때만 표시한다", () => {
  it("실측 응답(reference_estimate·조절 가능): 10줄 중 표시가 붙는 줄은 1줄뿐이다", () => {
    const marks = marksFor("reference_estimate", true)
    // 종전 규칙(`!matched` 면 무조건 표시)이었다면 4줄이었다. 그 회귀를 여기서 잡는다.
    expect(marks.filter((mark) => mark !== "none")).toHaveLength(1)
    // 그 1줄은 소량(`unknown_amount`) — 스테퍼를 눌러도 안 바뀌는, 눈앞에서 벌어지는 일.
    expect(marks[9]).toBe("not_scalable")
  })

  it("`식품표에 없다`는 reference_estimate 에서 아무 표시도 만들지 않는다", () => {
    const marks = marksFor("reference_estimate", true)
    expect(marks[0]).toBe("none") // 흑미흰밥 — not_in_catalog 인데 조용하다
    expect(marks[1]).toBe("none") // 당면(건조)
    expect(marks[6]).toBe("none") // 식용유
  })

  it("인분 조절이 없으면 `소량`도 조용하다 — 가리킬 컨트롤이 없다", () => {
    expect(marksFor("reference_estimate", false)[9]).toBe("none")
  })

  it("재료로 계산한 수치면 빠진 재료를 전부 말한다 — 그때는 숫자가 실제로 낮다", () => {
    const marks = marksFor("computed_from_ingredients", true)
    expect(marks.filter((mark) => mark === "not_counted")).toHaveLength(4)
    // 그램을 모르는 줄도 계산에서 빠졌으므로 `not_scalable` 이 아니라 `not_counted` 다.
    expect(marks[9]).toBe("not_counted")
  })

  it("매칭된 재료는 어떤 출처에서도 조용하다", () => {
    for (const provenance of [
      "reference_estimate",
      "computed_from_ingredients",
    ] as const) {
      expect(
        ingredientUncertainty(INGREDIENTS_21[2] as RecipeIngredient, {
          provenance,
          adjustable: true,
        }),
      ).toBe("none")
    }
  })
})

describe("ingredientCoverage — 수치와 재료의 관계를 한 번 말한다", () => {
  it("재료로 계산한 경우에만 개수를 센다", () => {
    expect(
      ingredientCoverage(INGREDIENTS_21, "computed_from_ingredients"),
    ).toEqual({
      kind: "counted",
      counted: 6,
      total: 10,
    })
  })

  it("그 외 출처는 `한 그릇 단위` 로 말한다 — 개수를 세면 거짓이 된다", () => {
    for (const provenance of [
      "reference_estimate",
      "author_supplied",
      "nutritionist_reviewed",
    ] as const) {
      expect(ingredientCoverage(INGREDIENTS_21, provenance)).toEqual({
        kind: "wholeDishEstimate",
      })
    }
  })
})

describe("제목 블록에서 지운 것들", () => {
  it("카테고리와 같은 태그는 보이지 않는다 (실측: 175/175 가 이 모양이었다)", () => {
    expect(displayTags(["#저염식", "#CKD3", "#한식"], "한식")).toEqual([])
  })

  it("카테고리와 다른 태그는 그대로 남는다 — 지우는 게 아니라 중복만 뺀다", () => {
    expect(displayTags(["#한식", "#자취요리"], "한식")).toEqual(["#자취요리"])
  })

  it("임상 토큰은 여전히 걸린다", () => {
    expect(displayTags(["#저염", "#투석", "#간편"], "양식")).toEqual(["#간편"])
  })

  it("저장 수는 0 일 때 적지 않는다", () => {
    expect(showsSaveCount(0)).toBe(false)
    expect(showsSaveCount(1)).toBe(true)
  })

  it("검수 전 카탈로그의 설명은 본문 자리에 두지 않는다 (서버가 고정 문장을 준다)", () => {
    expect(showsDescription({ isCurated: true })).toBe(false)
    expect(showsDescription({ isCurated: false })).toBe(true)
  })
})

describe("preparedPercent", () => {
  it("재료가 0개면 0 이다 (0으로 나누지 않는다)", () => {
    expect(preparedPercent(0, 0)).toBe(0)
  })

  it("0~100 을 벗어나지 않는다", () => {
    expect(preparedPercent(3, 10)).toBe(30)
    expect(preparedPercent(99, 10)).toBe(100)
    expect(preparedPercent(-1, 10)).toBe(0)
  })
})

describe("i18n — 새 키가 ko/en 양쪽에 있다", () => {
  // 없으면 화면에 원시 키(`detail.ingredients.tag.notScalable`)가 그대로 찍힌다.
  const PATHS = [
    "detail.ingredients.tag.notScalable",
    "detail.ingredients.tag.notCounted",
    "detail.ingredients.coverage.counted",
    "detail.ingredients.coverage.wholeDish",
    "detail.ingredients.excludedLegend",
    "detail.ingredients.fixedAmount",
    "detail.ingredients.preparedLabel",
    "detail.ingredients.preparedCount",
    "detail.ingredients.servingsBasis",
    "detail.action.save",
    "detail.action.saved",
    "detail.action.share",
    "detail.meta.reviews",
  ]

  function at(bundle: unknown, path: string): unknown {
    return path
      .split(".")
      .reduce<unknown>(
        (node, key) =>
          node != null && typeof node === "object"
            ? (node as Record<string, unknown>)[key]
            : undefined,
        bundle,
      )
  }

  it.each(PATHS)("%s", (path) => {
    expect(typeof at(koRecipe, path)).toBe("string")
    expect(typeof at(enRecipe, path)).toBe("string")
  })

  it("`인분 고정` legend 와 줄 꼬리표가 같은 말을 쓴다 — 다르면 이어붙일 수 없다", () => {
    const tag = at(koRecipe, "detail.ingredients.tag.notScalable") as string
    const legend = at(koRecipe, "detail.ingredients.fixedAmount") as string
    expect(legend).toContain(tag)
  })

  it("`계산 제외` 도 마찬가지다", () => {
    const tag = at(koRecipe, "detail.ingredients.tag.notCounted") as string
    const legend = at(koRecipe, "detail.ingredients.excludedLegend") as string
    expect(legend).toContain(tag)
  })
})

/**
 * 차단한 사용자의 리뷰 숨기기 — 레시피 리뷰에만 없던 안전 경로.
 *
 * 커뮤니티 글·댓글(신고+차단)과 식당 후기(신고)는 이미 경로가 있었고 레시피 리뷰만
 * 없었다. 서버에 레시피 리뷰 신고 표가 아직 없어 **이미 있는 차단**을 먼저 붙였고,
 * 그 판정이 이 함수다.
 */
describe("visibleReviews", () => {
  /** `authorId` 가 신원, `authorNickName` 은 그때그때의 라벨이다. */
  const review = (
    id: number,
    authorId: number | null,
    authorNickName: string,
    mine = false,
  ) => ({
    id,
    authorId,
    authorNickName,
    mine,
    rating: 5,
    body: null,
    createdAt: "2026-07-31T00:00:00Z",
  })

  const blocks = (
    ids: number[] = [],
    unresolvedNames: string[] = [],
  ): BlockedAuthors => ({
    ids: new Set(ids),
    unresolvedNames: new Set(unresolvedNames),
  })

  it("차단 목록이 비면 원본 순서 그대로다", () => {
    const list = [review(1, 10, "가"), review(2, 20, "나")]
    expect(visibleReviews(list, blocks()).map((r) => r.id)).toEqual([1, 2])
  })

  it("사람으로 건 차단이면 그 사람의 리뷰만 빠진다", () => {
    const list = [review(1, 10, "가"), review(2, 20, "나"), review(3, 30, "다")]
    expect(visibleReviews(list, blocks([20])).map((r) => r.id)).toEqual([1, 3])
  })

  it("**개명해도 차단이 풀리지 않는다** — 닉네임 축이 무너지던 자리", () => {
    // 차단할 당시 라벨은 "나" 였는데 그 사람이 개명했다. id 는 그대로다.
    const list = [review(1, 10, "가"), review(2, 20, "완전히다른이름")]
    expect(visibleReviews(list, blocks([20])).map((r) => r.id)).toEqual([1])
  })

  it("**비워진 닉네임을 가져간 제3자는 가려지지 않는다** — 차단의 승계", () => {
    // 20번을 "나" 로 차단해 뒀는데, 20번이 개명해 비운 "나" 를 99번이 가져갔다.
    const list = [review(1, 99, "나"), review(2, 20, "옮긴이름")]
    expect(visibleReviews(list, blocks([20])).map((r) => r.id)).toEqual([1])
  })

  it("아직 사람으로 못 푼 차단은 이름으로 계속 걸린다 — 088 은 가시성을 넓히지 않는다", () => {
    const list = [review(1, 10, "가"), review(2, 20, "나")]
    expect(visibleReviews(list, blocks([], ["나"])).map((r) => r.id)).toEqual([1])
  })

  it("글쓴이를 모르면(authorId 없음) 접지 않는다 — 모르는 것을 숨기지 않는다", () => {
    // 탈퇴로 신원이 끊긴 리뷰(`authorId: null`)와 이 필드를 안 주던 옛 서버(`undefined`).
    const list = [
      review(1, null, ""),
      { ...review(2, null, "누구"), authorId: undefined },
      review(3, 20, "나"),
    ]
    expect(visibleReviews(list, blocks([20])).map((r) => r.id)).toEqual([1, 2])
  })

  it("**내 리뷰는 숨기지 않는다** — 내가 쓴 글이 사라지면 데이터가 사라진 것으로 읽힌다", () => {
    const list = [review(1, 20, "나", true), review(2, 20, "나")]
    expect(visibleReviews(list, blocks([20])).map((r) => r.id)).toEqual([1])
  })

  it("이름 축은 **정확히 일치**로만 건다 — 헐거우면 남의 리뷰를 가린다", () => {
    /*
      예전에는 트림+소문자로 비교했다. 그런데 `users.nick_name` 은 대소문자를 구별하는
      유니크라 `Nana` 와 `NANA` 는 **서로 다른 사람**이다. 헐겁게 비교하면 차단한 적 없는
      사람이 이 기기에서만 가려진다 — 088 이 없애려는 승계 결함과 같은 종류다.
      서버(`notBlocked`)도 정확히 일치로 거르므로, 여기서만 다르면 두 필터가 갈라진다.
    */
    const list = [review(1, null, " Nana "), review(2, null, "NANA"), review(3, null, "nana")]
    expect(visibleReviews(list, blocks([], ["nana"])).map((r) => r.id)).toEqual([1, 2])
  })

  it("원본 배열을 바꾸지 않는다", () => {
    const list = [review(1, 10, "가"), review(2, 20, "나")]
    visibleReviews(list, blocks([10]))
    expect(list).toHaveLength(2)
  })
})
