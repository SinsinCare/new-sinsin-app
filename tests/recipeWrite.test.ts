/* eslint-disable import/first --
 * apiClient 를 먼저 mock 해야 서비스가 실제 axios 인스턴스를 만들지 않는다.
 */
const apiPost = jest.fn()

jest.mock("../src/services/core/apiClient", () => ({
  api: {
    post: (...args: unknown[]) => apiPost(...args),
  },
}))

/*
  모의 경로는 플래그를 명시적으로 켠 **개발 빌드**에서만 산다(적지 않으면 서버 —
  서비스 머리말). 이 파일의 미리보기 계산 테스트는 그 경로를 보므로 모듈을 들여오기
  전에 플래그를 켜고, 식품표를 읽는 `loadMockIndex` 가 `__DEV__` 로 잠겨 있어
  (릴리스 번들에서 885KB 생성 파일을 떼어내는 자물쇠) jest 전역에도 그 값을 세운다.
  서버 경로 블록은 `recipeWriteApiConfig.useMock = false` 로 스스로 끈다.
*/
process.env.EXPO_PUBLIC_RECIPE_V2_MOCK = "true"
;(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true

import { deriveAuthorContextTags } from "../src/features/recipe/components/write/authorContextTags"
import { STAGE_TAGS } from "../src/features/recipe/data/recipeTags"
import {
  canEditFrom,
  recipeDetailToWriteForm,
} from "../src/features/recipe/components/write/writeFormState"
import {
  amountHintFor,
  isCompositeIngredient,
  parseAmountToGrams,
} from "../src/features/recipe/utils/recipeAmountText"
import {
  RECIPE_WRITE_REQUIREMENTS,
  createEmptyRecipeWriteForm,
  evaluateRecipeWriteForm,
  hasAnyRecipeWriteContent,
  joinIngredientAmount,
  moveItem,
  parseTimeMin,
  resolveDropIndex,
  staticOffsetFor,
  summarizeSteps,
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
      { id: "i1", name: "닭가슴살", amountText: "100g", countText: "" },
      { id: "i2", name: "가지", amountText: "150g", countText: "" },
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
    // `doneCount`/`totalCount` 로 세던 자리다. 화면이 그 수치를 안 그리게 된 뒤로
    // 읽는 곳이 테스트뿐이라 지웠다 — 남은 계약은 **무엇이 남았는지**와 그 순서다.
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
    for (const id of RECIPE_WRITE_REQUIREMENTS) {
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

  it("다 채우면 등록할 수 있다", () => {
    const result = evaluateRecipeWriteForm(filledForm())
    expect(result.missing).toEqual([])
    expect(result.canSubmit).toBe(true)
  })

  /*
    올리다 **실패한** 사진도 막는다. 실패한 사진은 `objectPath` 가 없어 전송에서 조용히
    걸러지는데, 사진은 한 장뿐이고 수정 API 가 없어 **사진 없는 레시피가 확정된다.**
    타일의 "지우기" 로 언제든 빠져나올 수 있으므로 사용자가 갇히지도 않는다.
  */
  it("사진 업로드가 실패한 채로는 등록을 막는다", () => {
    const state = form({
      ...filledForm(),
      photos: [
        {
          id: "p1",
          localUri: "file://a.jpg",
          objectPath: null,
          status: "failed",
        },
      ],
    })
    const result = evaluateRecipeWriteForm(state)
    expect(result.missing).toEqual([])
    expect(result.photosFailed).toBe(true)
    expect(result.canSubmit).toBe(false)
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

  /*
    예전에는 이 자리에서 **섹션 상태**(`sectionState.basic === "incomplete"`)를 봤다.
    화면이 아코디언이던 시절 접힌 머리글이 그 값을 그렸기 때문이다. 평면 스크롤이
    되면서 머리글이 사라졌고 섹션 개념 자체가 코드에서 없어졌다 — 지금 남은 신호는
    등록 버튼 위 한 줄뿐이라, **그 한 줄이 무엇을 말하는지**를 대신 못 박는다.
  */
  it("한 가지라도 안 적었으면 등록이 막히고, 버튼 위에 그 항목이 뜬다", () => {
    const state = form({ ...filledForm(), summary: "" })
    const result = evaluateRecipeWriteForm(state)
    expect(result.canSubmit).toBe(false)
    // `missing[0]` 이 곧 `WriteSubmitBar` 의 상태 줄이다(같은 계산에서 나온다).
    expect(result.missing).toEqual(["summary"])
  })

  it("아무것도 안 적은 폼은 나가기 확인을 띄우지 않는다", () => {
    expect(hasAnyRecipeWriteContent(form())).toBe(false)
    expect(hasAnyRecipeWriteContent(form({ servings: 1 }))).toBe(false)
    expect(hasAnyRecipeWriteContent(form({ name: "가" }))).toBe(true)
    expect(hasAnyRecipeWriteContent(form({ stageTags: ["CKD3"] }))).toBe(true)
  })
})

describe("조리 시간 — 범위 밖을 '안 적음' 과 구분한다 (P2-19)", () => {
  /*
    예전 `parseTimeMin` 은 `number | null` 이었고 범위 밖도 `null` 이었다. 칸이
    4자리를 받으니 `9999` 는 손가락으로 칠 수 있는데, 그 상태로 등록하면 **아무 말
    없이** 조리 시간만 빠진 레시피가 올라갔다(서버는 같은 값을 400 으로 거절한다).
    아래 경계표가 그 뭉개짐이 돌아오지 못하게 막는다.
  */
  it("빈 칸은 '안 적음' 이다 — 선택 항목이라 오류가 아니다", () => {
    expect(parseTimeMin("")).toBeNull()
    expect(parseTimeMin("   ")).toBeNull()
  })

  it.each([
    ["1", 1],
    ["35", 35],
    ["1440", 1440],
  ])("경계 안쪽은 값을 그대로 준다: %s", (text, value) => {
    expect(parseTimeMin(text)).toEqual({ ok: true, value })
  })

  it.each(["0", "1441", "9999", "99999"])(
    "경계 밖은 null 이 아니라 이유가 붙는다: %s",
    (text) => {
      expect(parseTimeMin(text)).toEqual({ ok: false, reason: "out_of_range" })
    },
  )

  it("숫자가 아닌 글자는 '안 적음' 이다 — 범위 오류로 부르지 않는다", () => {
    // 칸이 `[^0-9]` 를 지우고 받으므로 폼에는 들어올 수 없는 값이다. 그래도
    // 범위 오류로 말하면 "1~1440 사이로 적어 주세요" 가 뜨는데, 사용자는 애초에
    // 숫자를 적은 적이 없다.
    expect(parseTimeMin("0x10")).toBeNull()
    expect(parseTimeMin("35분")).toBeNull()
  })

  it("범위 밖이면 등록을 막는다 — 수정 경로가 없어서 되돌릴 수 없다", () => {
    // `RECIPE_EDIT_ENABLED === false`. 값이 빠진 채로 올라가면 영영 못 고친다.
    const bad = evaluateRecipeWriteForm({
      ...filledForm(),
      timeMinText: "9999",
    })
    expect(bad.missing).toEqual([])
    expect(bad.timeMinOutOfRange).toBe(true)
    expect(bad.canSubmit).toBe(false)
  })

  it("빈 칸·정상 범위는 등록을 막지 않는다", () => {
    for (const timeMinText of ["", "1", "1440"]) {
      const result = evaluateRecipeWriteForm({ ...filledForm(), timeMinText })
      expect(result.timeMinOutOfRange).toBe(false)
      expect(result.canSubmit).toBe(true)
    }
  })
})

describe("미리보기 요청 만들기 (계약 §3.5)", () => {
  it("이름과 분량이 다 있는 줄만 보낸다", () => {
    const state = form({
      ingredients: [
        { id: "1", name: "닭가슴살", amountText: "100g", countText: "" },
        { id: "2", name: "가지", amountText: "", countText: "" },
        { id: "3", name: "", amountText: "15ml", countText: "" },
        { id: "4", name: "  간장  ", amountText: "  15ml  ", countText: "" },
      ],
    })
    expect(toPreviewIngredients(state)).toEqual([
      { name: "닭가슴살", amountText: "100g" },
      { name: "간장", amountText: "15ml" },
    ])
  })

  it("단위 칸이 비고 수량 칸만 있는 줄도 보낸다", () => {
    // 서버가 `1개` 를 못 읽는 것은 사실이고, 그 사실은 `unmatchedIngredients` 로
    // 돌아와야 한다. 앱이 미리 삼키면 사용자는 그 재료가 빠진 줄도 모른다.
    const state = form({
      ingredients: [
        { id: "1", name: "가지", amountText: "", countText: "1개" },
      ],
    })
    expect(toPreviewIngredients(state)).toEqual([
      { name: "가지", amountText: "1개" },
    ])
  })

  it("보낼 재료가 없으면 요청 자체를 만들지 않는다", () => {
    expect(toPreviewRequest(form())).toBeNull()
    expect(
      toPreviewRequest(
        form({
          ingredients: [
            { id: "1", name: "가지", amountText: "", countText: "" },
          ],
        }),
      ),
    ).toBeNull()
  })

  it("계약 상한을 앱이 먼저 지킨다 — 50개 / 이름 100자 / 분량 40자", () => {
    const state = form({
      ingredients: Array.from({ length: 60 }, (_, i) => ({
        id: `i${i}`,
        name: "가".repeat(120),
        amountText: "1".repeat(50),
        countText: "",
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
      ingredients: [
        { id: "1", name: "가지", amountText: "150g", countText: "" },
      ],
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
      stageTags: ["CKD3"],
    })
    const request = toCreateRecipeRequest(state)
    expect(request.category).toBe("한식")
    expect(request.tags).toEqual(["저염", "저인", "CKD3"])
  })

  it("빈 선택 항목은 null 로 보낸다 — 빈 문자열을 저장하지 않는다", () => {
    const request = toCreateRecipeRequest(filledForm())
    expect(request.description).toBeNull()
    expect(request.timeMin).toBeNull()
  })

  it("난이도는 아예 보내지 않는다 — 폼에서 사라진 항목이다", () => {
    // 와이어 타입(`CreateRecipeRequestV2.difficulty`)에는 남아 있지만 작성 폼은 더는
    // 채우지 않는다. `null` 을 보내면 "작성자가 난이도를 비웠다" 는 뜻이 되므로,
    // 아예 키를 만들지 않는 쪽이 정직하다.
    expect(toCreateRecipeRequest(filledForm()).difficulty).toBeUndefined()
    expect("difficulty" in toCreateRecipeRequest(filledForm())).toBe(false)
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

  it("조리 시간은 십진수만 싣고 범위 밖은 null 로 보낸다", () => {
    const base = filledForm()
    expect(toCreateRecipeRequest({ ...base, timeMinText: "35" }).timeMin).toBe(
      35,
    )
    // 범위 밖은 `canSubmit` 이 이미 막지만(위 describe), 이 함수만 부르는 경로가
    // 생겼을 때 `9999` 를 그대로 실으면 서버가 400 을 낸다 — 와이어에는 null 이다.
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
        { id: "1", name: "가지", amountText: "150g", countText: "1개" },
        { id: "2", name: "", amountText: "", countText: "" },
      ],
      steps: [
        { id: "1", text: "볶아요." },
        { id: "2", text: "   " },
      ],
    })
    expect(request.ingredients).toEqual([
      { name: "가지", amountText: "150g 1개" },
    ])
    expect(request.steps).toEqual([{ text: "볶아요.", imageObjectPath: null }])
  })

  it("nutritionOverride 를 보내지 않는다 — 서버가 계산해서 저장한다", () => {
    expect(
      toCreateRecipeRequest(filledForm()).nutritionOverride,
    ).toBeUndefined()
  })
})

describe("재료 세 칸 → 서버 한 칸 (SPEC §6.5)", () => {
  it("그램이 실린 칸이 항상 앞이다", () => {
    // 순서가 뒤집히면 서버 파서가 `1개` 를 먼저 읽고 환산을 포기해서, 100g 이라고
    // 분명히 적은 재료가 나트륨 합산에서 통째로 빠진다.
    expect(joinIngredientAmount("100g", "1개")).toBe("100g 1개")
    expect(parseAmountToGrams(joinIngredientAmount("100g", "1개"))).toBe(100)
  })

  it("한 칸만 있으면 그 칸만 남는다", () => {
    expect(joinIngredientAmount("150g", "")).toBe("150g")
    expect(joinIngredientAmount("", "1큰술")).toBe("1큰술")
  })

  it("둘 다 비었거나 공백뿐이면 빈 문자열이다", () => {
    expect(joinIngredientAmount("", "")).toBe("")
    expect(joinIngredientAmount("   ", "\t\n")).toBe("")
  })

  it("칸마다 앞뒤 공백을 털어 낸다 — 앞 공백은 파서 정규식을 흔든다", () => {
    expect(joinIngredientAmount("  100g  ", "  2개  ")).toBe("100g 2개")
    expect(joinIngredientAmount("   ", "  2개  ")).toBe("2개")
  })

  it("수량 칸만 채운 줄은 서버가 못 읽는다 — 그것이 의도다", () => {
    // 앱이 억지로 환산하면 그 추측이 그대로 나트륨 수치가 된다.
    expect(parseAmountToGrams(joinIngredientAmount("", "1큰술반"))).toBeNull()
  })

  it("합산 상한 40 을 넘으면 단어 경계에서 자른다", () => {
    const long = joinIngredientAmount("1".repeat(38), "큰술")
    // 38 + 1 + 2 = 41 → 40 에서 자르면 `큰` 하나가 남는다. 토막난 단어는 버린다.
    expect(long).toBe("1".repeat(38))
    expect(long.length).toBeLessThanOrEqual(
      RECIPE_WRITE_LIMITS.ingredientAmountMax,
    )
  })

  it("첫 토막 하나가 이미 상한보다 길면 버릴 단어가 없어 그대로 자른다", () => {
    const cut = joinIngredientAmount("1".repeat(50), "")
    expect(cut).toHaveLength(RECIPE_WRITE_LIMITS.ingredientAmountMax)
  })

  it("경계가 마침 공백에 떨어지면 앞 단어가 온전히 남는다", () => {
    // 40 + 공백 + 뒤 → slice(0,40) 이 이미 단어 하나로 끝난다.
    const cut = joinIngredientAmount("1".repeat(40), "2개")
    expect(cut).toBe("1".repeat(40))
  })

  it("칸별 상한 둘을 더해도 합산 상한을 넘지 않는다", () => {
    expect(
      RECIPE_WRITE_LIMITS.ingredientUnitMax +
        1 +
        RECIPE_WRITE_LIMITS.ingredientCountMax,
    ).toBeLessThanOrEqual(RECIPE_WRITE_LIMITS.ingredientAmountMax)
  })

  it("칸을 꽉 채워도 잘리지 않는다 — 손으로 친 글자는 사라지지 않는다", () => {
    const joined = joinIngredientAmount(
      "가".repeat(RECIPE_WRITE_LIMITS.ingredientUnitMax),
      "나".repeat(RECIPE_WRITE_LIMITS.ingredientCountMax),
    )
    expect(joined).toHaveLength(RECIPE_WRITE_LIMITS.ingredientAmountMax)
  })
})

describe("조리 순서 요약 (SPEC §6.6)", () => {
  it("아무것도 없으면 0단계이고 미리보기가 없다", () => {
    expect(summarizeSteps([])).toEqual({ count: 0, firstText: null })
    expect(summarizeSteps([{ id: "s1", text: "" }])).toEqual({
      count: 0,
      firstText: null,
    })
    expect(summarizeSteps([{ id: "s1", text: "   " }])).toEqual({
      count: 0,
      firstText: null,
    })
  })

  it("한 단계면 그 단계가 미리보기다 — 앞뒤 공백은 턴다", () => {
    expect(summarizeSteps([{ id: "s1", text: "  가지를 볶아요.  " }])).toEqual({
      count: 1,
      firstText: "가지를 볶아요.",
    })
  })

  it("여러 단계면 개수를 세고 첫 단계만 미리 보인다", () => {
    expect(
      summarizeSteps([
        { id: "s1", text: "가지를 썬다." },
        { id: "s2", text: "볶는다." },
        { id: "s3", text: "밥에 얹는다." },
      ]),
    ).toEqual({ count: 3, firstText: "가지를 썬다." })
  })

  it("중간에 빈 줄이 섞이면 세지 않는다", () => {
    // 지우려고 글자만 비워 둔 줄을 세면, 시트를 열기 전까지 그 거짓을 확인할 수 없다.
    expect(
      summarizeSteps([
        { id: "s1", text: "썬다." },
        { id: "s2", text: "  " },
        { id: "s3", text: "볶는다." },
      ]),
    ).toEqual({ count: 2, firstText: "썬다." })
  })

  it("첫 줄이 비었으면 채워진 첫 줄을 미리 보인다", () => {
    expect(
      summarizeSteps([
        { id: "s1", text: "" },
        { id: "s2", text: "볶는다." },
      ]),
    ).toEqual({ count: 1, firstText: "볶는다." })
  })

  it("한국어를 만들지 않는다 — 문구는 화면이 i18n 으로 고른다", () => {
    const summary = summarizeSteps([{ id: "s1", text: "볶는다." }])
    expect(Object.keys(summary).sort()).toEqual(["count", "firstText"])
    expect(typeof summary.count).toBe("number")
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

/* ══════════════════════ 작성자 신장 상태 → 태그 ══════════════════════ */

describe("작성자 상태에서 태그를 뽑는다 — 고르게 하지 않는다", () => {
  /**
   * 서버로 나갈 값만 꺼낸다. 어휘·순서를 볼 때 쓴다.
   * 화면 문구 열쇠는 아래 별도 케이스에서 본다 — 두 축이 섞이면 실패가 어느 쪽
   * 때문인지 읽히지 않는다.
   */
  const valuesOf = (context: Parameters<typeof deriveAuthorContextTags>[0]) =>
    deriveAuthorContextTags(context).map((tag) => tag.value)

  /** ko 로케일에서 점 표기 열쇠를 따라간다. 없으면 `undefined`. */
  const leafAt = (bundle: unknown, key: string): unknown =>
    key
      .split(".")
      .reduce<unknown>(
        (node, part) =>
          node !== null && typeof node === "object"
            ? (node as Record<string, unknown>)[part]
            : undefined,
        bundle,
      )

  it("병기를 태그로 옮긴다 (3a·3b 는 같은 검색 칸이다)", () => {
    const at = (ckdStage: string) => valuesOf({ ckdStage, isDialysis: false })
    expect(at("STAGE_3A")).toEqual(["CKD3"])
    expect(at("STAGE_3B")).toEqual(["CKD3"])
    expect(at("STAGE_4")).toEqual(["CKD4"])
    expect(at("STAGE_5")).toEqual(["CKD5"])
  })

  it("숫자만 저장된 낡은 행도 읽는다 (`3` 은 엄격한 쪽인 3b 다)", () => {
    // `ckd_stage` 컬럼에는 enum 도 CHECK 도 없어서 숫자만 든 행이 실제로 있다.
    expect(valuesOf({ ckdStage: "4", isDialysis: false })).toEqual(["CKD4"])
    expect(valuesOf({ ckdStage: "3", isDialysis: false })).toEqual(["CKD3"])
  })

  it("CKD 1·2기는 태그를 만들지 않는다 — 어휘에도 없고 식이제한도 없다", () => {
    expect(
      deriveAuthorContextTags({ ckdStage: "STAGE_1", isDialysis: false }),
    ).toEqual([])
    expect(
      deriveAuthorContextTags({ ckdStage: "STAGE_2", isDialysis: false }),
    ).toEqual([])
  })

  it("모르는 병기는 지어내지 않는다", () => {
    expect(
      deriveAuthorContextTags({ ckdStage: null, isDialysis: false }),
    ).toEqual([])
    expect(
      deriveAuthorContextTags({ ckdStage: "", isDialysis: false }),
    ).toEqual([])
    expect(
      deriveAuthorContextTags({ ckdStage: "몰라요", isDialysis: false }),
    ).toEqual([])
    expect(deriveAuthorContextTags(null)).toEqual([])
    expect(deriveAuthorContextTags(undefined)).toEqual([])
  })

  it("투석은 병기와 다른 축이다 — 병기 컬럼이 DIALYSIS 여도 답이 나온다", () => {
    // 투석을 켜면 서버의 `ckd_stage` 가 `"DIALYSIS"` 로 들어간다(`toServerStage`).
    // 그러면 병기 축은 아무 말도 못 하므로 투석 축이 대신 답해야 한다.
    expect(valuesOf({ ckdStage: "DIALYSIS", isDialysis: true })).toEqual([
      "투석환자",
    ])
  })

  /*
    카탈로그 175건이 `#CKD3`·`#투석환자` 로 저장돼 있다(개발 DB 실측 2026-08-21).
    앱이 다른 표기를 쓰면 병기로 거르는 화면에서 두 집단이 영영 안 만난다 —
    태그 질의가 부분일치라 `%CKD3%` 는 `CKD 3기` 를 못 잡는다.
  */
  it("병기 태그가 카탈로그 정본 표기와 같다", () => {
    const values = valuesOf({ ckdStage: "STAGE_4", isDialysis: false })
    expect(values).toEqual(["CKD4"])
    // 공백도 `기` 도 붙지 않는다. 붙는 순간 `%CKD4%` 검색에서 빠진다.
    for (const value of values) {
      expect(value).not.toMatch(/\s|기$/u)
    }
  })

  it("투석 태그는 서버 정본(`투석환자`)과 같은 문자열이다", () => {
    /*
      `TAG_KO_BY_INPUT["dialysis"] = "투석환자"` 라서 카탈로그는 `투석환자` 로
      저장돼 있다. 앱만 `투석` 을 보내면 `%투석환자%` 필터에서 통째로 빠진다.
      반대 방향은 부분일치(`tags contains`)라 손해가 없다 — `투석` 으로 걸러도
      `투석환자` 가 걸린다. 이 단언이 그 정렬을 붙잡는다.
    */
    expect(valuesOf({ ckdStage: null, isDialysis: true })).toEqual(["투석환자"])
    expect("투석환자").toContain("투석")
  })

  it("동반 질환을 좁은 쪽에서 넓은 쪽으로 옮긴다", () => {
    expect(
      valuesOf({
        ckdStage: "STAGE_4",
        isDialysis: false,
        comorbidities: ["DIABETES", "HYPERTENSION"],
      }),
    ).toEqual(["CKD4", "당뇨 동반", "고혈압 동반"])
  })

  /*
    **이 테스트가 없어서 버그가 살아 있었다.** 표가 `DIABETIC_KIDNEY_DISEASE`(진단 원인
    어휘)로 잠겨 있었는데 함수는 `comorbidities`(동반 질환 어휘)만 읽어서, 당뇨를 등록한
    사람에게 `당뇨 동반` 이 한 번도 안 붙었다. 픽스처도 같은 잘못된 키를 쓰고 있어
    전부 초록이었다 — 그래서 **두 축을 각각** 못 박는다.
  */
  it("동반 질환 축(DIABETES)에서 당뇨가 붙는다", () => {
    expect(
      valuesOf({
        ckdStage: null,
        isDialysis: false,
        comorbidities: ["DIABETES"],
      }),
    ).toEqual(["당뇨 동반"])
  })

  it("진단 원인 축(DIABETIC_KIDNEY_DISEASE)에서도 붙는다 — 좁은 것에서 넓은 것으로", () => {
    expect(
      valuesOf({
        ckdStage: null,
        isDialysis: false,
        diagnosisCauses: ["DIABETIC_KIDNEY_DISEASE"],
      }),
    ).toEqual(["당뇨 동반"])
  })

  it("두 축이 같은 사실을 말하면 태그는 하나다", () => {
    expect(
      valuesOf({
        ckdStage: null,
        isDialysis: false,
        comorbidities: ["DIABETES"],
        diagnosisCauses: ["DIABETIC_KIDNEY_DISEASE"],
      }),
    ).toEqual(["당뇨 동반"])
  })

  it("모르는 동반 질환 키는 버린다", () => {
    expect(
      deriveAuthorContextTags({
        ckdStage: null,
        isDialysis: false,
        comorbidities: ["SOMETHING_NEW", ""],
      }),
    ).toEqual([])
  })

  it("화면에는 한국어가 아니라 문구 열쇠를 준다", () => {
    /*
      값을 그대로 화면에 이어 붙이던 때, en 로케일에서
      `Written for my own needs (CKD 5기 · 당뇨 동반)` 이 나왔다. 값은 서버 검색
      어휘라 번역할 수 없으므로, 화면이 쓸 열쇠를 따로 준다.
    */
    expect(
      deriveAuthorContextTags({
        ckdStage: "STAGE_5",
        isDialysis: true,
        comorbidities: ["DIABETES", "HYPERTENSION"],
      }),
    ).toEqual([
      { value: "투석환자", labelKey: "category.stage.dialysis" },
      { value: "CKD5", labelKey: "category.stage.ckd5" },
      { value: "당뇨 동반", labelKey: "category.stage.diabetes" },
      { value: "고혈압 동반", labelKey: "category.stage.hypertension" },
    ])
  })

  it("나오는 값은 정본 어휘 안이고, 문구 열쇠는 ko·en 둘 다에 있다", () => {
    /*
      예전에는 `STAGE_5` 하나만 훑어서 3a·3b·4기 칸의 오타를 못 잡았다. 병기 표의
      네 칸을 전부 지나가게 한다.

      투석과 병기를 같이 켠 것은 실제 프로필 모양이 아니라(투석이면 `ckd_stage` 가
      `"DIALYSIS"` 다) **한 번에 표를 최대로 훑기 위한** 조합이다.
    */
    const stageKeys = ["STAGE_3A", "STAGE_3B", "STAGE_4", "STAGE_5"]
    for (const ckdStage of stageKeys) {
      const every = deriveAuthorContextTags({
        ckdStage,
        isDialysis: true,
        comorbidities: ["DIABETES", "HYPERTENSION"],
      })
      expect(every).toHaveLength(4)
      for (const tag of every) {
        expect(STAGE_TAGS as readonly string[]).toContain(tag.value)
        // 열쇠만 맞고 문구가 없으면 화면에 열쇠가 그대로 뜬다. 양쪽 로케일을 본다.
        expect(typeof leafAt(koRecipe, tag.labelKey)).toBe("string")
        expect(typeof leafAt(enRecipe, tag.labelKey)).toBe("string")
      }
    }
  })

  it("순서가 고정이다 — 같은 사람에게 매번 같은 문장이 보여야 한다", () => {
    const tags = valuesOf({
      ckdStage: "STAGE_5",
      isDialysis: true,
      comorbidities: ["HYPERTENSION", "DIABETES"],
    })
    expect(tags).toEqual(["투석환자", "CKD5", "당뇨 동반", "고혈압 동반"])
  })
})

describe("드래그 중 비켜나는 거리 — 잡은 행이 지나간 만큼만", () => {
  const H = 60

  it("드래그가 아니면 아무도 안 움직인다", () => {
    expect(staticOffsetFor(0, null, null, H)).toBe(0)
    expect(staticOffsetFor(0, 1, null, H)).toBe(0)
    expect(staticOffsetFor(0, null, 1, H)).toBe(0)
  })

  it("잡은 행 자신은 0 이다 — 손가락을 따라가는 값이 따로 있다", () => {
    expect(staticOffsetFor(2, 2, 0, H)).toBe(0)
  })

  it("아래로 끌면 사이에 낀 행들이 위로 올라온다", () => {
    // 0번을 2번 자리로: 1·2번이 한 칸씩 위로(-H), 3번은 그대로.
    expect(staticOffsetFor(1, 0, 2, H)).toBe(-H)
    expect(staticOffsetFor(2, 0, 2, H)).toBe(-H)
    expect(staticOffsetFor(3, 0, 2, H)).toBe(0)
  })

  it("위로 끌면 사이에 낀 행들이 아래로 내려간다", () => {
    // 3번을 1번 자리로: 1·2번이 한 칸씩 아래로(+H), 0번은 그대로.
    expect(staticOffsetFor(1, 3, 1, H)).toBe(H)
    expect(staticOffsetFor(2, 3, 1, H)).toBe(H)
    expect(staticOffsetFor(0, 3, 1, H)).toBe(0)
  })

  it("제자리에 놓으면 아무도 안 움직인다", () => {
    for (const i of [0, 1, 2, 3]) expect(staticOffsetFor(i, 1, 1, H)).toBe(0)
  })

  it("높이를 아직 못 쟀으면(0) 움직임도 0 이다", () => {
    /*
      `-draggedHeight` 라 값이 `-0` 으로 나온다. `toBe` 는 `Object.is` 라
      `-0` 과 `0` 을 다르게 보지만, 이 값이 가는 곳은 `translateY` 하나뿐이고
      거기서 둘은 같은 그림이다. 그래서 **수치가 같은가**를 묻는다.
    */
    expect(staticOffsetFor(1, 0, 2, 0) === 0).toBe(true)
  })
})

/**
 * **수정 왕복** — 상세 → 폼 → 요청이 값을 잃지 않는가.
 *
 * 수정은 전체 교체라 폼이 못 담은 값은 저장하는 순간 조용히 사라진다. 실제로
 * 구현 중에 두 번 그럴 뻔했고(태그·사진), 둘 다 **서버 응답에 값이 없어서** 생긴
 * 일이라 앱 코드만 보면 안 보인다. 그래서 왕복 자체를 테스트로 붙든다.
 */
describe("recipeDetailToWriteForm — 수정 왕복", () => {
  const detail = {
    name: "저염 된장국",
    summary: "간을 줄인 된장국",
    description: "설명",
    category: "한식",
    timeMin: 20,
    servings: 2,
    heroImageObjectPath: "uploads/recipe/abc.jpg",
    authoredTags: ["저염", "CKD3", "한식"],
    ingredients: [
      { name: "두부", amountText: "70g" },
      { name: "대파", amountText: "1대" },
    ],
    steps: [{ text: "물을 끓인다" }, { text: "된장을 푼다" }],
  }

  test("임상 태그가 살아 돌아온다", () => {
    // `detail.tags` 로 채웠다면 여기가 전부 빈 배열이 된다.
    const form = recipeDetailToWriteForm(detail)
    expect(form.nutritionTags).toEqual(["저염"])
    expect(form.stageTags).toEqual(["CKD3"])
  })

  test("사진은 경로로 실린다 — 글자만 고쳐도 남는다", () => {
    const form = recipeDetailToWriteForm(detail)
    expect(form.photos).toHaveLength(1)
    expect(form.photos[0]?.objectPath).toBe("uploads/recipe/abc.jpg")
    // 올릴 것이 없으므로 곧장 ready 다. uploading 이면 등록 버튼이 막힌다.
    expect(form.photos[0]?.status).toBe("ready")
  })

  test("폼을 그대로 다시 보내면 값이 보존된다", () => {
    const request = toCreateRecipeRequest(recipeDetailToWriteForm(detail))
    expect(request.name).toBe("저염 된장국")
    expect(request.category).toBe("한식")
    expect(request.timeMin).toBe(20)
    expect(request.servings).toBe(2)
    expect(request.imageObjectPaths).toEqual(["uploads/recipe/abc.jpg"])
    // 재료 수량은 단위 칸에 통째로 들어가므로 합칠 때 원문 그대로 나온다.
    expect(request.ingredients).toEqual([
      { name: "두부", amountText: "70g" },
      { name: "대파", amountText: "1대" },
    ])
    expect(request.steps.map((row) => row.text)).toEqual([
      "물을 끓인다",
      "된장을 푼다",
    ])
    // 태그는 영양 + 병기가 합쳐져 나간다.
    expect(request.tags).toEqual(expect.arrayContaining(["저염", "CKD3"]))
  })

  test("사진이 없으면 빈 목록이다", () => {
    const form = recipeDetailToWriteForm({
      ...detail,
      heroImageObjectPath: null,
    })
    expect(form.photos).toEqual([])
  })

  test("서버가 인분을 안 주면 1이다", () => {
    // 2 로 두면 서버가 전체 영양을 2로 나눠 1인분 나트륨을 절반으로 말한다.
    expect(
      recipeDetailToWriteForm({ ...detail, servings: null }).servings,
    ).toBe(1)
  })

  test("빈 재료·순서는 한 줄씩 미리 놓는다", () => {
    const form = recipeDetailToWriteForm({
      ...detail,
      ingredients: [],
      steps: [],
    })
    expect(form.ingredients).toHaveLength(1)
    expect(form.steps).toHaveLength(1)
    expect(form.ingredients[0]?.name).toBe("")
  })
})

describe("canEditFrom — 모르면 열지 않는다", () => {
  test("내 것이고 원본 태그가 오면 연다", () => {
    expect(canEditFrom({ authored: true, authoredTags: ["저염"] })).toBe(true)
    // 태그를 하나도 안 고른 내 레시피. 빈 배열은 "없다"이지 "모른다"가 아니다.
    expect(canEditFrom({ authored: true, authoredTags: [] })).toBe(true)
  })

  test("남의 것이면 안 연다", () => {
    expect(canEditFrom({ authored: false, authoredTags: null })).toBe(false)
  })

  /**
   * 서버가 `authored: true` 인데 원본 태그를 안 준 경우 — 계약이 어긋난 것이다.
   * 그대로 열면 태그를 지운 적 없는 사용자의 태그가 저장하는 순간 지워진다.
   */
  test("내 것이라는데 원본 태그가 없으면 안 연다", () => {
    expect(canEditFrom({ authored: true, authoredTags: null })).toBe(false)
  })
})
