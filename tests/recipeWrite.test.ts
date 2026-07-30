/* eslint-disable import/first --
 * apiClient 를 먼저 mock 해야 서비스가 실제 axios 인스턴스를 만들지 않는다.
 */
const apiPost = jest.fn()

jest.mock("../src/services/core/apiClient", () => ({
  api: {
    post: (...args: unknown[]) => apiPost(...args),
  },
}))

import {
  amountHintFor,
  isCompositeIngredient,
  parseAmountToGrams,
} from "../src/features/recipe/utils/recipeAmountText"
import {
  createEmptyRecipeWriteForm,
  evaluateRecipeWriteForm,
  hasAnyRecipeWriteContent,
  moveItem,
  resolveDropIndex,
  toCreateRecipeRequest,
  toPreviewIngredients,
  toPreviewRequest,
  type RecipeWriteFormState,
} from "../src/features/recipe/components/write/writeFormState"
import {
  barRatio,
  canRenderNutrition,
  formatNutrientAmount,
  pickHeadlineNutrient,
  groupUnmatched,
  unmatchedNames,
} from "../src/features/recipe/components/write/nutritionPreviewView"
import {
  buildNutrientBreakdown,
  percentOfRemaining,
  recipeWriteApiConfig,
  recipeWriteService,
} from "../src/features/recipe/services/recipeWriteService"
import {
  NUTRITION_PREVIEW_DEBOUNCE_MS,
  RECIPE_WRITE_LIMITS,
  type NutrientHeadline,
  type RecipeNutrition,
} from "../src/features/recipe/types/recipeWrite"
import {
  MISSING_COPY_KEY,
  RECIPE_EDIT_ENABLED,
  SUCCESS_UNMATCHED_COPY_KEY,
} from "../src/features/recipe/components/write/writeCopy"
import koRecipe from "../src/i18n/locales/ko/recipe.json"
import enRecipe from "../src/i18n/locales/en/recipe.json"

/** 폼을 부분만 채워서 만든다. id 는 `createEmptyRecipeWriteForm` 이 붙인 것을 쓴다. */
function form(
  overrides: Partial<RecipeWriteFormState> = {},
): RecipeWriteFormState {
  return { ...createEmptyRecipeWriteForm(), ...overrides }
}

function filledForm(): RecipeWriteFormState {
  return form({
    name: "저염 닭가슴살 가지덮밥",
    summary: "간단하게 먹기 좋은 가지덮밥이에요",
    category: "한식",
    ingredients: [
      { id: "i1", name: "닭가슴살", amountText: "100g" },
      { id: "i2", name: "가지", amountText: "150g" },
    ],
    steps: [{ id: "s1", text: "가지를 채 썰어 볶아요." }],
  })
}

describe("분량 표기 → 그램 (계약 §4.3)", () => {
  it.each([
    ["70g", 70],
    ["150 g", 150],
    ["15ml", 15],
    ["200ml", 200],
    ["1큰술", 15],
    ["2큰술", 30],
    ["1작은술", 5],
    ["1컵", 200],
  ])("계약 표: %s → %s", (text, grams) => {
    expect(parseAmountToGrams(text)).toBe(grams)
  })

  it.each(["1개", "2개", "소량", "약간", "1장", "2쪽", "1공기", "", "   "])(
    "환산하지 않는다: %s",
    (text) => {
      expect(parseAmountToGrams(text)).toBeNull()
    },
  )

  it("서버 이식본과 같은 확장 표기를 읽는다", () => {
    // cc = ml. 빼면 국물 요리의 물이 통째로 계산에서 빠진다.
    expect(parseAmountToGrams("200cc")).toBe(200)
    expect(parseAmountToGrams("1kg")).toBe(1000)
    expect(parseAmountToGrams("1l")).toBe(1000)
    expect(parseAmountToGrams("500mg")).toBe(0.5)
    // 분수 · 대분수 · 소수 · 유니코드 분수
    expect(parseAmountToGrams("1/2작은술")).toBe(2.5)
    expect(parseAmountToGrams("2/3컵")).toBeCloseTo(133.333, 3)
    expect(parseAmountToGrams("1 1/2컵")).toBe(300)
    expect(parseAmountToGrams("1.5큰술")).toBe(22.5)
    expect(parseAmountToGrams("½컵")).toBe(100)
    // 앞뒤에 말이 붙은 표기
    expect(parseAmountToGrams("약 50g")).toBe(50)
    expect(parseAmountToGrams("물 300cc")).toBe(300)
    expect(parseAmountToGrams("150g (껍질 제거)")).toBe(150)
    // 환산 불가 단위 뒤에 작성자가 직접 적은 그램이 있으면 그것을 읽는다.
    expect(parseAmountToGrams("1공기 (200g)")).toBe(200)
  })

  it("범위는 어느 쪽도 고르지 않는다", () => {
    expect(parseAmountToGrams("1~2g")).toBeNull()
    expect(parseAmountToGrams("2-3g")).toBeNull()
    // 범위처럼 보이는 괄호 안 조리 시간은 수량을 죽이지 않는다.
    expect(parseAmountToGrams("150g (30-40분 조림)")).toBe(150)
  })

  it("단위가 양쪽에 붙은 범위도 아래쪽을 고르지 않는다", () => {
    // `1~2g` 는 수량 앞을 보고 걸러진다. 이 꼴은 수량 **뒤**를 봐야 걸러진다 —
    // 뒤쪽 검사가 없으면 `1큰술~2큰술` 이 조용히 15g 이 되어, 최대 30g 짜리
    // 재료의 나트륨을 절반으로 말한다.
    expect(parseAmountToGrams("1g~2g")).toBeNull()
    expect(parseAmountToGrams("1큰술~2큰술")).toBeNull()
    expect(parseAmountToGrams("100g-200g")).toBeNull()
  })

  it("상한을 넘기면 깎지 않고 null 이다", () => {
    expect(parseAmountToGrams("101kg")).toBeNull()
    expect(parseAmountToGrams("0g")).toBeNull()
  })

  it("단위 뒤에 글자가 이어지면 다른 단어다", () => {
    expect(parseAmountToGrams("1gram")).toBeNull()
  })

  it("복합 재료를 알아본다 (계약 §4.4-2)", () => {
    expect(isCompositeIngredient("다진마늘·파·참깨")).toBe(true)
    expect(isCompositeIngredient("닭가슴살")).toBe(false)
  })
})

describe("줄마다 붙는 분량 힌트", () => {
  it("재료명이 비어 있으면 아무 말도 하지 않는다", () => {
    expect(amountHintFor("", "")).toBe("ok")
    expect(amountHintFor("  ", "1개")).toBe("ok")
  })

  it("분량이 비었으면 채우라고 하고, 못 읽는 표기면 다시 적으라고 한다", () => {
    expect(amountHintFor("가지", "")).toBe("missing")
    expect(amountHintFor("가지", "1개")).toBe("unmeasurable")
    expect(amountHintFor("가지", "150g")).toBe("ok")
  })
})

describe("무엇이 남았는가 (시안 writing-16 의 결함)", () => {
  it("빈 폼은 필수 5개가 전부 남는다", () => {
    const result = evaluateRecipeWriteForm(form())
    expect(result.totalCount).toBe(5)
    expect(result.doneCount).toBe(0)
    expect(result.missing).toEqual([
      "name",
      "summary",
      "category",
      "ingredients",
      "steps",
    ])
    expect(result.canSubmit).toBe(false)
  })

  it("남은 것의 첫 항목이 버튼 위에 뜬다 — 순서는 화면 순서다", () => {
    const result = evaluateRecipeWriteForm(form({ name: "가지덮밥" }))
    expect(result.missing[0]).toBe("summary")
    expect(MISSING_COPY_KEY[result.missing[0]]).toBe(
      "recipeWrite.missing.summary",
    )
  })

  it("모든 필수 항목에 문구 열쇠가 있다", () => {
    for (const { id } of evaluateRecipeWriteForm(form()).requirements) {
      const key = MISSING_COPY_KEY[id].split(".").slice(1)
      const ko = key.reduce<Record<string, unknown> | string | undefined>(
        (node, part) =>
          typeof node === "object" && node !== null
            ? (node[part] as Record<string, unknown> | string | undefined)
            : undefined,
        koRecipe.recipeWrite as unknown as Record<string, unknown>,
      )
      expect(typeof ko).toBe("string")
    }
  })

  it("공백만 적은 것은 적은 것이 아니다", () => {
    const result = evaluateRecipeWriteForm(
      form({ name: "   ", summary: "\n", category: " " }),
    )
    expect(result.missing).toContain("name")
    expect(result.missing).toContain("summary")
    expect(result.missing).toContain("category")
  })

  it("다 채우면 등록할 수 있고 섹션 상태가 완료로 바뀐다", () => {
    const result = evaluateRecipeWriteForm(filledForm())
    expect(result.missing).toEqual([])
    expect(result.canSubmit).toBe(true)
    expect(result.sectionState).toEqual({
      basic: "done",
      classify: "done",
      ingredients: "done",
      steps: "done",
      description: "optional",
    })
  })

  it("사진이 올라가는 중이면 남은 것이 없어도 등록을 막는다", () => {
    const state = form({
      ...filledForm(),
      photos: [
        {
          id: "p1",
          localUri: "file://a.jpg",
          objectPath: null,
          status: "uploading",
        },
      ],
    })
    const result = evaluateRecipeWriteForm(state)
    expect(result.missing).toEqual([])
    expect(result.photosUploading).toBe(true)
    expect(result.canSubmit).toBe(false)
  })

  it("한 섹션에 남은 것이 하나라도 있으면 그 섹션은 미완이다", () => {
    const state = form({ ...filledForm(), summary: "" })
    expect(evaluateRecipeWriteForm(state).sectionState.basic).toBe("incomplete")
  })

  it("아무것도 안 적은 폼은 나가기 확인을 띄우지 않는다", () => {
    expect(hasAnyRecipeWriteContent(form())).toBe(false)
    expect(hasAnyRecipeWriteContent(form({ servings: 1 }))).toBe(false)
    expect(hasAnyRecipeWriteContent(form({ name: "가" }))).toBe(true)
    expect(hasAnyRecipeWriteContent(form({ stageTags: ["CKD 3기"] }))).toBe(
      true,
    )
  })
})

describe("미리보기 요청 만들기 (계약 §3.5)", () => {
  it("이름과 분량이 다 있는 줄만 보낸다", () => {
    const state = form({
      ingredients: [
        { id: "1", name: "닭가슴살", amountText: "100g" },
        { id: "2", name: "가지", amountText: "" },
        { id: "3", name: "", amountText: "15ml" },
        { id: "4", name: "  간장  ", amountText: "  15ml  " },
      ],
    })
    expect(toPreviewIngredients(state)).toEqual([
      { name: "닭가슴살", amountText: "100g" },
      { name: "간장", amountText: "15ml" },
    ])
  })

  it("보낼 재료가 없으면 요청 자체를 만들지 않는다", () => {
    expect(toPreviewRequest(form())).toBeNull()
    expect(
      toPreviewRequest(
        form({ ingredients: [{ id: "1", name: "가지", amountText: "" }] }),
      ),
    ).toBeNull()
  })

  it("계약 상한을 앱이 먼저 지킨다 — 50개 / 이름 100자 / 분량 40자", () => {
    const state = form({
      ingredients: Array.from({ length: 60 }, (_, i) => ({
        id: `i${i}`,
        name: "가".repeat(120),
        amountText: "1".repeat(50),
      })),
    })
    const ingredients = toPreviewIngredients(state)
    expect(ingredients).toHaveLength(RECIPE_WRITE_LIMITS.ingredientMax)
    expect(ingredients[0].name).toHaveLength(
      RECIPE_WRITE_LIMITS.ingredientNameMax,
    )
    expect(ingredients[0].amountText).toHaveLength(
      RECIPE_WRITE_LIMITS.ingredientAmountMax,
    )
  })

  it("인분이 요청에 그대로 들어간다 — 서버가 이 값으로 1인분을 만든다", () => {
    const state = form({
      servings: 4,
      ingredients: [{ id: "1", name: "가지", amountText: "150g" }],
    })
    expect(toPreviewRequest(state)?.servings).toBe(4)
  })

  it("디바운스는 계약이 못 박은 400ms 다", () => {
    expect(NUTRITION_PREVIEW_DEBOUNCE_MS).toBe(400)
  })
})

describe("작성 요청 만들기 (계약 §3.6)", () => {
  it("태그 3그룹 중 영양·병기만 tags 로 합치고 음식 종류는 category 다", () => {
    const state = form({
      ...filledForm(),
      nutritionTags: ["저염", "저인"],
      stageTags: ["CKD 3기"],
    })
    const request = toCreateRecipeRequest(state)
    expect(request.category).toBe("한식")
    expect(request.tags).toEqual(["저염", "저인", "CKD 3기"])
  })

  it("빈 선택 항목은 null 로 보낸다 — 빈 문자열을 저장하지 않는다", () => {
    const request = toCreateRecipeRequest(filledForm())
    expect(request.description).toBeNull()
    expect(request.timeMin).toBeNull()
    expect(request.difficulty).toBeNull()
  })

  it("한 줄 소개가 비면 빈 문자열이 아니라 null 이다", () => {
    // 계약 §3.1 은 `summary` 가 null 이면 카드가 **자리채우기 문구를 만들지 않는다**
    // 고 못 박았다. 빈 문자열로 저장하면 카드가 `summary !== null` 을 보고 빈 줄을
    // 그려서, 제목 아래에 이유 없는 공백이 남는다.
    expect(
      toCreateRecipeRequest({ ...filledForm(), summary: "" }).summary,
    ).toBeNull()
    expect(
      toCreateRecipeRequest({ ...filledForm(), summary: "   " }).summary,
    ).toBeNull()
  })

  it("인분은 계약 범위(1~20) 안으로 맞춰 보낸다", () => {
    const base = filledForm()
    // 서버가 전체 영양을 이 값으로 나눈다. 0 이 새면 400 이고 사용자는 이유를 모른다.
    expect(toCreateRecipeRequest({ ...base, servings: 0 }).servings).toBe(1)
    expect(toCreateRecipeRequest({ ...base, servings: 99 }).servings).toBe(20)
    expect(toCreateRecipeRequest({ ...base, servings: 4 }).servings).toBe(4)
    expect(toPreviewRequest({ ...base, servings: 0 })?.servings).toBe(1)
    expect(toPreviewRequest({ ...base, servings: 99 })?.servings).toBe(20)
  })

  it("조리 시간은 십진수만 받고 범위를 벗어나면 null 이다", () => {
    const base = filledForm()
    expect(toCreateRecipeRequest({ ...base, timeMinText: "35" }).timeMin).toBe(
      35,
    )
    expect(
      toCreateRecipeRequest({ ...base, timeMinText: "0" }).timeMin,
    ).toBeNull()
    expect(
      toCreateRecipeRequest({ ...base, timeMinText: "1441" }).timeMin,
    ).toBeNull()
    expect(
      toCreateRecipeRequest({ ...base, timeMinText: "0x10" }).timeMin,
    ).toBeNull()
  })

  it("올라간 사진만 보낸다 — 실패·진행 중인 것은 경로가 없다", () => {
    const request = toCreateRecipeRequest({
      ...filledForm(),
      photos: [
        {
          id: "1",
          localUri: "a",
          objectPath: "uploads/a.jpg",
          status: "ready",
        },
        { id: "2", localUri: "b", objectPath: null, status: "uploading" },
        { id: "3", localUri: "c", objectPath: null, status: "failed" },
      ],
    })
    expect(request.imageObjectPaths).toEqual(["uploads/a.jpg"])
  })

  it("빈 재료·빈 순서 줄은 보내지 않고 단계 사진은 아직 null 이다", () => {
    const request = toCreateRecipeRequest({
      ...filledForm(),
      ingredients: [
        { id: "1", name: "가지", amountText: "150g" },
        { id: "2", name: "", amountText: "" },
      ],
      steps: [
        { id: "1", text: "볶아요." },
        { id: "2", text: "   " },
      ],
    })
    expect(request.ingredients).toEqual([{ name: "가지", amountText: "150g" }])
    expect(request.steps).toEqual([{ text: "볶아요.", imageObjectPath: null }])
  })

  it("nutritionOverride 를 보내지 않는다 — 서버가 계산해서 저장한다", () => {
    expect(
      toCreateRecipeRequest(filledForm()).nutritionOverride,
    ).toBeUndefined()
  })
})

describe("순서 재정렬", () => {
  const list = ["a", "b", "c", "d"]

  it("옮긴다", () => {
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"])
    expect(moveItem(list, 3, 0)).toEqual(["d", "a", "b", "c"])
    expect(moveItem(list, 1, 1)).toEqual(list)
  })

  it("범위를 벗어나면 원본을 그대로 준다 — 조용히 뒤집지 않는다", () => {
    expect(moveItem(list, -1, 2)).toEqual(list)
    expect(moveItem(list, 0, 9)).toEqual(list)
    expect(moveItem([], 0, 0)).toEqual([])
  })

  it("행 높이가 다를 때도 중앙을 넘어간 순간 자리를 바꾼다", () => {
    const heights = [60, 100, 60, 60]
    // 아래로: 두 번째 행(100) 의 절반(50)을 넘겨야 1번 자리로 간다.
    expect(resolveDropIndex(heights, 0, 40)).toBe(0)
    expect(resolveDropIndex(heights, 0, 60)).toBe(1)
    expect(resolveDropIndex(heights, 0, 140)).toBe(2)
    // 위로
    expect(resolveDropIndex(heights, 2, -20)).toBe(2)
    expect(resolveDropIndex(heights, 2, -60)).toBe(1)
    expect(resolveDropIndex(heights, 2, -140)).toBe(0)
    // 마지막 자리까지 갈 수 있다.
    expect(resolveDropIndex(heights, 0, 400)).toBe(3)
  })

  it("측정값이 없으면 자리를 옮기지 않는다", () => {
    expect(resolveDropIndex([], 0, 500)).toBe(0)
  })
})

describe("영양 표시", () => {
  function headline(
    key: NutrientHeadline["key"],
    amount: number,
    percent: number | null,
    unit: "mg" | "g" = "mg",
  ): NutrientHeadline {
    return { key, amount, unit, percentOfRemaining: percent }
  }

  it("남은 양을 가장 많이 먹는 영양소를 한 줄로 고른다", () => {
    const picked = pickHeadlineNutrient([
      headline("sodium", 480, 31),
      headline("potassium", 580, 15),
      headline("phosphorus", 218, 44),
      headline("protein", 7, null, "g"),
    ])
    expect(picked?.key).toBe("phosphorus")
  })

  it("비율을 하나도 모르면 나트륨을 쓴다 — 비율 없이 절대값만 말한다", () => {
    const picked = pickHeadlineNutrient([
      headline("potassium", 580, null),
      headline("sodium", 480, null),
    ])
    expect(picked?.key).toBe("sodium")
    expect(picked?.percentOfRemaining).toBeNull()
  })

  it("지어낸 정밀도를 붙이지 않는다", () => {
    expect(formatNutrientAmount(headline("sodium", 479.83, 31))).toBe("479.8mg")
    expect(formatNutrientAmount(headline("sodium", 480, 31))).toBe("480mg")
    expect(formatNutrientAmount(headline("protein", 7, 20, "g"))).toBe("7g")
    // 반올림이 정수가 되면 `.0` 을 붙이지 않는다. 소수 첫째 자리로 **먼저 반올림**해야
    // 이 값이 정수인지 알 수 있다 — 셋째 자리로 반올림하고 toFixed(1) 로 자르면
    // 같은 값이 `480.0mg` 이 되어 측정한 값처럼 보인다.
    expect(formatNutrientAmount(headline("sodium", 479.96, 31))).toBe("480mg")
    expect(formatNutrientAmount(headline("protein", 6.998, 20, "g"))).toBe("7g")
  })

  it("막대는 100% 에서 멈추고 넘친 사실은 숫자가 말한다", () => {
    expect(barRatio(null)).toBe(0)
    expect(barRatio(0)).toBe(0)
    expect(barRatio(31)).toBeCloseTo(0.31)
    expect(barRatio(140)).toBe(1)
  })

  it("빠진 재료는 중복을 지우고 순서를 유지한다", () => {
    expect(
      unmatchedNames({ unmatchedIngredients: ["가지", " 가지 ", "", "양파"] }),
    ).toEqual(["가지", "양파"])
  })

  it("provenance 가 없으면 수치를 그리지 않는다 (계약 §1.1)", () => {
    const nutrition = {
      kcal: 650,
      proteinG: 7,
      sodiumMg: 480,
      potassiumMg: 580,
      phosphorusMg: 218,
      unmatchedIngredients: [],
    } as unknown as RecipeNutrition
    expect(canRenderNutrition(nutrition)).toBe(false)
    expect(
      canRenderNutrition({
        ...nutrition,
        provenance: "computed_from_ingredients",
      }),
    ).toBe(true)
    expect(canRenderNutrition(undefined)).toBe(false)
  })

  it("남은 양이 0 이하이거나 한도를 모르면 비율은 null 이다 (계약 §3.2)", () => {
    expect(percentOfRemaining(480, 1550)).toBe(31)
    expect(percentOfRemaining(480, 0)).toBeNull()
    expect(percentOfRemaining(480, -10)).toBeNull()
    expect(percentOfRemaining(480, null)).toBeNull()
    // 상한 999 로 자른다.
    expect(percentOfRemaining(48000, 100)).toBe(999)
  })

  it("4개 영양소 전부를 계약 순서대로 만들고 단위를 붙인다", () => {
    const breakdown = buildNutrientBreakdown(
      { sodiumMg: 480, potassiumMg: 580, phosphorusMg: 218, proteinG: 7 },
      { sodiumMg: 1550, potassiumMg: 1820, phosphorusMg: 640, proteinG: null },
    )
    expect(breakdown.map((item) => item.key)).toEqual([
      "sodium",
      "potassium",
      "phosphorus",
      "protein",
    ])
    expect(breakdown[3]).toEqual({
      key: "protein",
      amount: 7,
      unit: "g",
      percentOfRemaining: null,
    })
  })
})

describe("빠진 재료를 이유별로 나눈다", () => {
  /**
   * 실측된 결함이다. 이 카드는 `unmatchedIngredients`(**이름만** 있는 배열)를 읽어서
   * 모든 미매칭 재료에 "“{name}” 은 무게를 몰라 계산에서 빠졌어요" 를 붙였다.
   *
   * 그런데 미매칭에는 두 종류가 있다:
   *   - `참기름 소량`  → 무게를 모른다. 식품표에는 **있다.** `"5g"` 으로 적으면 계산된다.
   *   - `흰쌀밥 210g` → 무게는 **안다.** 그 이름을 식품표에서 못 찾았다.
   *
   * 뒤쪽에 "무게를 몰라" 라고 말하면 사용자는 이미 맞게 적은 무게를 다시 적으며
   * 헛수고한다. 그래서 `perIngredient[].reason` 으로 나눈다.
   */
  const row = (
    name: string,
    grams: number | null,
    reason: "matched" | "unknown_amount" | "not_in_catalog",
  ) => ({ name, grams, matched: reason === "matched", reason })

  it("무게를 모르는 것과 이름을 못 찾은 것을 가른다", () => {
    const groups = groupUnmatched([
      row("간장", 15, "matched"),
      row("참기름", null, "unknown_amount"),
      row("흰쌀밥", 210, "not_in_catalog"),
      row("달걀", null, "unknown_amount"),
    ])
    expect(groups.unknownAmount).toEqual(["참기름", "달걀"])
    expect(groups.notInCatalog).toEqual(["흰쌀밥"])
  })

  it("계산에 들어간 재료는 어느 쪽에도 없다", () => {
    const groups = groupUnmatched([row("간장", 15, "matched")])
    expect(groups.unknownAmount).toEqual([])
    expect(groups.notInCatalog).toEqual([])
  })

  it("같은 이름을 두 줄에 적어도 한 번만 말한다", () => {
    const groups = groupUnmatched([
      row("참기름", null, "unknown_amount"),
      row(" 참기름 ", null, "unknown_amount"),
    ])
    expect(groups.unknownAmount).toEqual(["참기름"])
  })

  it("두 문구가 서로 다른 사실을 말한다", () => {
    const ko = koRecipe.recipeWrite.nutrition
    const en = enRecipe.recipeWrite.nutrition
    expect(ko.unmatchedItem).not.toBe(ko.unmatchedNotFound)
    expect(en.unmatchedItem).not.toBe(en.unmatchedNotFound)
    // 이름을 못 찾은 쪽은 무게 이야기를 하지 않아야 한다.
    expect(ko.unmatchedNotFound).not.toMatch(/무게|g”|150/)
    expect(en.unmatchedNotFound.toLowerCase()).not.toMatch(/weight|gram/)
  })

  it("모의 경로도 그램이 없으면 matched 를 false 로 준다", async () => {
    // 모의는 `matched: food !== undefined` 였다 — 이름이 표에 있으면 0 을 더하면서
    // "찾았다" 고 말했고, 실서버와 반대였다.
    const preview = await recipeWriteService.previewNutrition({
      servings: 1,
      ingredients: [{ name: "양파", amountText: "소량" }],
    })
    const [only] = preview.perIngredient
    expect(only?.matched).toBe(false)
    expect(only?.reason).toBe("unknown_amount")
  })
})

describe("서비스 — 실서버 경로", () => {
  const previousUseMock = recipeWriteApiConfig.useMock

  beforeEach(() => {
    apiPost.mockReset()
    recipeWriteApiConfig.useMock = false
  })

  afterAll(() => {
    recipeWriteApiConfig.useMock = previousUseMock
  })

  it("미리보기는 계약 경로로 본문을 그대로 보내고 봉투의 result 를 푼다", async () => {
    apiPost.mockResolvedValue({
      data: { isSuccess: true, result: { nutrition: { provenance: "x" } } },
    })
    const request = {
      servings: 2,
      ingredients: [{ name: "닭가슴살", amountText: "100g" }],
    }
    const result = await recipeWriteService.previewNutrition(request)
    expect(apiPost).toHaveBeenCalledWith("/recipes/nutrition/preview", request)
    expect(result).toEqual({ nutrition: { provenance: "x" } })
  })

  it("작성은 POST /recipes 로 보낸다", async () => {
    apiPost.mockResolvedValue({ data: { result: { id: 7, name: "가지덮밥" } } })
    const created = await recipeWriteService.createRecipe(
      toCreateRecipeRequest(filledForm()),
    )
    expect(apiPost).toHaveBeenCalledTimes(1)
    expect(apiPost.mock.calls[0][0]).toBe("/recipes")
    expect(created.id).toBe(7)
  })
})

describe("서비스 — 모의 경로(서버가 붙기 전)", () => {
  const previousUseMock = recipeWriteApiConfig.useMock

  beforeAll(() => {
    recipeWriteApiConfig.useMock = true
  })

  afterAll(() => {
    recipeWriteApiConfig.useMock = previousUseMock
  })

  it("고정 payload 가 아니라 입력에 반응한다 — 재료를 늘리면 나트륨이 늘어난다", async () => {
    const one = await recipeWriteService.previewNutrition({
      servings: 1,
      ingredients: [{ name: "간장", amountText: "15ml" }],
    })
    const two = await recipeWriteService.previewNutrition({
      servings: 1,
      ingredients: [{ name: "간장", amountText: "30ml" }],
    })
    expect(one.nutrition.sodiumMg).toBeGreaterThan(0)
    expect(two.nutrition.sodiumMg).toBeCloseTo(one.nutrition.sodiumMg * 2, 0)
  })

  it("계약 §3.5 응답 모양을 지키고 provenance 를 빠뜨리지 않는다", async () => {
    const result = await recipeWriteService.previewNutrition({
      servings: 2,
      ingredients: [
        { name: "간장", amountText: "15ml" },
        { name: "존재하지않는재료XYZ", amountText: "100g" },
        { name: "가지", amountText: "1개" },
      ],
    })
    expect(Object.keys(result).sort()).toEqual([
      "budget",
      "nutrientBreakdown",
      "nutrition",
      "perIngredient",
    ])
    expect(result.nutrition.provenance).toBe("computed_from_ingredients")
    expect(result.nutrientBreakdown).toHaveLength(4)
    expect(result.perIngredient).toHaveLength(3)
    // 무게를 모르는 것과 표에 없는 것 둘 다 빠진다.
    expect(result.nutrition.unmatchedIngredients).toEqual([
      "존재하지않는재료XYZ",
      "가지",
    ])
    // `1개` 는 그램을 못 읽으므로 grams 가 null 이다(추정으로 채우지 않는다).
    expect(result.perIngredient[2].grams).toBeNull()
  })

  it("servings 로 나눈 1인분을 준다", async () => {
    const single = await recipeWriteService.previewNutrition({
      servings: 1,
      ingredients: [{ name: "간장", amountText: "30ml" }],
    })
    const double = await recipeWriteService.previewNutrition({
      servings: 2,
      ingredients: [{ name: "간장", amountText: "30ml" }],
    })
    expect(double.nutrition.sodiumMg).toBeCloseTo(
      single.nutrition.sodiumMg / 2,
      0,
    )
    // perIngredient 는 레시피 전체 기준이라 인분과 무관하다.
    expect(double.perIngredient[0].sodiumMg).toBeCloseTo(
      single.perIngredient[0].sodiumMg,
      3,
    )
  })
})

describe("없는 기능을 문구로 약속하지 않는다", () => {
  /**
   * 계약 §2 의 엔드포인트 표에 `PUT /recipes/{id}` 가 없다. `app/(write)/recipe/[id].tsx`
   * 는 그래서 "수정은 아직 없어요" 만 띄운다. 그런데 등록 성공 알림이 "나중에 분량을
   * 고쳐 적으면 다시 계산돼요" 라고 말하면, 무게를 못 읽은 재료가 있는 작성자는 그
   * 말을 믿고 수정 화면으로 갔다가 막힌다.
   *
   * 수정 엔드포인트가 생기면 `RECIPE_EDIT_ENABLED` 를 true 로 바꿔라 — 이 테스트가
   * 그때 자동으로 반대쪽(약속하는 문구를 써야 한다)을 검사한다.
   */
  it("수정이 없는 동안에는 '고쳐 적으면 다시 계산돼요' 를 쓰지 않는다", () => {
    // 계약 §2 에 `PUT /recipes/{id}` 가 생기면 **이 한 줄을 지운다.** 상수만 뒤집어서
    // 문구가 약속을 되찾는 것을 막는 잠금이다 — 서버가 정말 받는지 확인하고 지워라.
    expect(RECIPE_EDIT_ENABLED).toBe(false)
    expect(SUCCESS_UNMATCHED_COPY_KEY).toBe(
      RECIPE_EDIT_ENABLED
        ? "recipeWrite.result.successUnmatchedEditable"
        : "recipeWrite.result.successUnmatched",
    )
    // 실제로 쓰이는 문구를 집어서 본다 — 열쇠 이름이 아니라 문구가 약속을 한다.
    const leaf = SUCCESS_UNMATCHED_COPY_KEY.split(".").slice(-1)[0]
    const ko = (
      koRecipe.recipeWrite.result as unknown as Record<string, string>
    )[leaf]
    const en = (
      enRecipe.recipeWrite.result as unknown as Record<string, string>
    )[leaf]
    expect(typeof ko).toBe("string")
    expect(typeof en).toBe("string")
    if (RECIPE_EDIT_ENABLED) {
      expect(ko).toContain("고쳐")
    } else {
      expect(ko).not.toContain("고쳐 적으면")
      expect(en).not.toMatch(/fix the amounts later/iu)
    }
  })

  it("수정이 생겼을 때 쓸 문구가 양쪽 로케일에 준비돼 있다", () => {
    // 상수만 뒤집으면 되게 해 둔다 — 문구를 그때 새로 쓰게 하면 한쪽 로케일이 빠진다.
    expect(typeof koRecipe.recipeWrite.result.successUnmatchedEditable).toBe(
      "string",
    )
    expect(typeof enRecipe.recipeWrite.result.successUnmatchedEditable).toBe(
      "string",
    )
  })
})

describe("i18n", () => {
  it("작성 화면 문구가 ko·en 둘 다 같은 열쇠를 갖는다", () => {
    const leaves = (value: unknown, prefix = ""): string[] =>
      value && typeof value === "object" && !Array.isArray(value)
        ? Object.entries(value).flatMap(([key, child]) =>
            leaves(child, prefix ? `${prefix}.${key}` : key),
          )
        : [prefix]
    const ko = leaves(koRecipe.recipeWrite).sort()
    const en = leaves(enRecipe.recipeWrite).sort()
    expect(en).toEqual(ko)
    expect(ko.length).toBeGreaterThan(50)
  })
})
