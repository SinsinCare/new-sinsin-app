/**
 * 레시피 작성 폼의 **순수 상태 계산**. RN 의존이 없어서 `tests/recipeWrite.test.ts` 가
 * 그대로 불러 검증한다.
 *
 * ## 왜 화면에서 떼어냈는가
 * 시안(`Home_Recipes_writing-16`)의 가장 큰 결함은 **등록 버튼이 꺼져 있는데 이유가
 * 화면에 없다**는 것이다. 이유를 보여주려면 "무엇이 남았는가" 를 값으로 들고 있어야
 * 하고, 그 값이 버튼의 활성 조건과 **같은 계산**에서 나와야 한다. 두 곳에서 따로
 * 계산하면 "남은 것이 없는데 버튼이 꺼져 있는" 상태가 생긴다 — 사용자가 빠져나갈 수
 * 없는 막다른 길이다. 그래서 `evaluateRecipeWriteForm` 하나가 둘 다 만든다.
 *
 * 절대 규칙: 여기서 i18n 을 부르지 않는다. 요구사항은 **id** 로만 말하고 문구는 화면이
 * 고른다(순수 함수로 테스트할 수 있게).
 */

import {
  RECIPE_WRITE_LIMITS,
  type CreateRecipeRequestV2,
  type NutritionPreviewIngredient,
  type NutritionPreviewRequest,
} from "@/src/features/recipe/types/recipeWrite"

/* ══════════════════════════ 폼 상태 ══════════════════════════ */

export interface IngredientRow {
  /** 목록 재정렬·삭제에 쓰는 안정 키. 인덱스를 키로 쓰면 삭제할 때 입력이 섞인다. */
  id: string
  name: string
  amountText: string
}

export interface StepRow {
  id: string
  text: string
}

/** 대표 사진 한 장. 고른 즉시 올려서 `objectPath` 를 받아 둔다(등록이 느려지지 않게). */
export interface PhotoRow {
  id: string
  localUri: string
  /** 업로드 완료 시 서버가 준 경로(`uploads/…`). 올리는 중이면 null. */
  objectPath: string | null
  status: "uploading" | "ready" | "failed"
}

export interface RecipeWriteFormState {
  name: string
  summary: string
  description: string
  /** 계약 §3.6 `category` — 단일 선택이다. 시안은 다중 선택처럼 보이지만 계약이 문자열 하나다. */
  category: string
  nutritionTags: string[]
  /** 계약 §1.2 로 화면 태그에서는 걸러지지만 **필터 질의로 쓰이므로** 작성 시엔 고른다. */
  stageTags: string[]
  timeMinText: string
  servings: number
  difficulty: string | null
  photos: PhotoRow[]
  ingredients: IngredientRow[]
  steps: StepRow[]
}

let rowSeq = 0
/** 렌더마다 새로 만들지 않도록 호출한 쪽이 상태에 보관한다. */
export function nextRowId(prefix: string): string {
  rowSeq += 1
  return `${prefix}-${rowSeq}`
}

export function emptyIngredientRow(): IngredientRow {
  return { id: nextRowId("ing"), name: "", amountText: "" }
}

export function emptyStepRow(): StepRow {
  return { id: nextRowId("step"), text: "" }
}

/**
 * 빈 폼. 재료·순서를 **한 줄씩 미리 놓는다** — 빈 목록 + "추가" 버튼만 있으면
 * 무엇을 적어야 하는지 한 번 더 눌러야 알 수 있다.
 *
 * `servings` 기본값은 1 이다. 2 로 두면 사용자가 손대지 않은 채 등록했을 때 서버가
 * 전체 영양을 2로 나눠 **1인분 나트륨을 절반으로 말한다.** 신장 환자에게 나트륨을
 * 낮게 말하는 쪽으로 기본값을 두지 않는다.
 */
export function createEmptyRecipeWriteForm(): RecipeWriteFormState {
  return {
    name: "",
    summary: "",
    description: "",
    category: "",
    nutritionTags: [],
    stageTags: [],
    timeMinText: "",
    servings: 1,
    difficulty: null,
    photos: [],
    ingredients: [emptyIngredientRow()],
    steps: [emptyStepRow()],
  }
}

/* ══════════════════════════ 무엇이 남았는가 ══════════════════════════ */

/**
 * 필수 5개. 순서가 곧 화면에 뜨는 순서다 — 위쪽 섹션의 빈 칸을 먼저 말한다.
 *
 * `summary` 는 계약 §3.6 에서 선택 항목이지만 앱에서는 필수로 둔다: 목록 카드가
 * `summary` 를 1줄로 그리고 없으면 **자리채우기 문구를 만들지 않기로**(계약 §3.1)
 * 했으므로, 없는 채로 올라간 레시피는 카드가 비어 보인다.
 */
export const RECIPE_WRITE_REQUIREMENTS = [
  "name",
  "summary",
  "category",
  "ingredients",
  "steps",
] as const

export type RecipeWriteRequirementId =
  (typeof RECIPE_WRITE_REQUIREMENTS)[number]

export type RecipeWriteSectionId =
  | "basic"
  | "classify"
  | "ingredients"
  | "steps"
  | "description"

export const RECIPE_WRITE_SECTIONS = [
  "basic",
  "classify",
  "ingredients",
  "steps",
  "description",
] as const

const REQUIREMENT_SECTION: Record<
  RecipeWriteRequirementId,
  RecipeWriteSectionId
> = {
  name: "basic",
  summary: "basic",
  category: "classify",
  ingredients: "ingredients",
  steps: "steps",
}

/** 재료 한 줄이 "적은 것" 인가. 이름이 있으면 센다(분량은 영양 계산에만 필요하다). */
export function isFilledIngredient(row: IngredientRow): boolean {
  return row.name.trim().length > 0
}

export function isFilledStep(row: StepRow): boolean {
  return row.text.trim().length > 0
}

export interface RecipeWriteEvaluation {
  requirements: { id: RecipeWriteRequirementId; done: boolean }[]
  /** 아직 안 된 것. 첫 항목이 버튼 위에 뜨는 그 한 줄이다. */
  missing: RecipeWriteRequirementId[]
  doneCount: number
  totalCount: number
  /** 섹션 머리에 붙는 상태. `optional` 은 필수가 없는 섹션(설명)이다. */
  sectionState: Record<RecipeWriteSectionId, "done" | "incomplete" | "optional">
  /** 사진이 아직 올라가는 중인가. 남은 요구사항이 없어도 이때는 등록을 막는다. */
  photosUploading: boolean
  canSubmit: boolean
}

export function evaluateRecipeWriteForm(
  state: RecipeWriteFormState,
): RecipeWriteEvaluation {
  const done: Record<RecipeWriteRequirementId, boolean> = {
    name: state.name.trim().length > 0,
    summary: state.summary.trim().length > 0,
    category: state.category.trim().length > 0,
    ingredients: state.ingredients.some(isFilledIngredient),
    steps: state.steps.some(isFilledStep),
  }

  const requirements = RECIPE_WRITE_REQUIREMENTS.map((id) => ({
    id,
    done: done[id],
  }))
  const missing = requirements.filter((r) => !r.done).map((r) => r.id)

  const sectionState: RecipeWriteEvaluation["sectionState"] = {
    basic: "optional",
    classify: "optional",
    ingredients: "optional",
    steps: "optional",
    description: "optional",
  }
  for (const id of RECIPE_WRITE_REQUIREMENTS) {
    const section = REQUIREMENT_SECTION[id]
    if (!done[id]) sectionState[section] = "incomplete"
    else if (sectionState[section] === "optional")
      sectionState[section] = "done"
  }

  const photosUploading = state.photos.some((p) => p.status === "uploading")

  return {
    requirements,
    missing,
    doneCount: requirements.length - missing.length,
    totalCount: requirements.length,
    sectionState,
    photosUploading,
    canSubmit: missing.length === 0 && !photosUploading,
  }
}

/* ══════════════════════════ 목록 편집 ══════════════════════════ */

/**
 * `from` 을 `to` 로 옮긴다. 범위를 벗어나면 **원본을 그대로** 돌려준다 —
 * 드래그가 화면 밖으로 나갔을 때 목록이 조용히 뒤집히면 사용자가 되돌릴 수 없다.
 */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to) return [...list]
  if (from < 0 || from >= list.length) return [...list]
  if (to < 0 || to >= list.length) return [...list]
  const next = [...list]
  const [moved] = next.splice(from, 1)
  if (moved === undefined) return [...list]
  next.splice(to, 0, moved)
  return next
}

/**
 * 드래그 중 손가락이 어느 자리에 놓였는가. 행 높이가 줄마다 다르므로(여러 줄 입력)
 * 측정한 높이를 누적해서 판정한다.
 *
 * `heights[i]` 는 i 번째 행의 실제 높이(간격 포함). `translateY` 는 잡은 행이
 * 원래 자리에서 움직인 거리다. **행 중앙이 넘어간 순간** 자리를 바꾼다 — 경계를
 * 행의 끝으로 두면 마지막 자리로 못 간다.
 */
export function resolveDropIndex(
  heights: readonly number[],
  fromIndex: number,
  translateY: number,
): number {
  if (heights.length === 0) return 0
  let index = fromIndex
  if (translateY > 0) {
    let travelled = 0
    for (let i = fromIndex + 1; i < heights.length; i += 1) {
      travelled += heights[i] ?? 0
      if (translateY > travelled - (heights[i] ?? 0) / 2) index = i
      else break
    }
  } else if (translateY < 0) {
    let travelled = 0
    for (let i = fromIndex - 1; i >= 0; i -= 1) {
      travelled += heights[i] ?? 0
      if (-translateY > travelled - (heights[i] ?? 0) / 2) index = i
      else break
    }
  }
  return index
}

/* ══════════════════════════ 요청 만들기 ══════════════════════════ */

function clamp(text: string, max: number): string {
  const trimmed = text.trim()
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

/**
 * 미리보기에 보낼 재료. 계약 §3.5 의 상한(50개 / 이름 100자 / 분량 40자)을 앱이 먼저 지킨다.
 *
 * **분량이 빈 줄은 보내지 않는다.** 서버는 그 줄을 `unmatchedIngredients` 로 올리고
 * 화면은 "무게를 몰라 빠졌어요" 를 띄우는데, 아직 분량을 적지 않은 줄에 그 문구가
 * 뜨면 표기가 잘못됐다는 오해를 만든다. 그 줄에는 화면이 "분량을 적으면 반영돼요" 를
 * 인라인으로 붙인다(`amountHintFor`).
 */
export function toPreviewIngredients(
  state: RecipeWriteFormState,
): NutritionPreviewIngredient[] {
  return state.ingredients
    .filter((row) => isFilledIngredient(row) && row.amountText.trim() !== "")
    .slice(0, RECIPE_WRITE_LIMITS.ingredientMax)
    .map((row) => ({
      name: clamp(row.name, RECIPE_WRITE_LIMITS.ingredientNameMax),
      amountText: clamp(
        row.amountText,
        RECIPE_WRITE_LIMITS.ingredientAmountMax,
      ),
    }))
}

/**
 * 인분을 계약 §3.6 범위(1~20) 안으로 맞춘다.
 *
 * `ServingsStepper` 가 이미 경계에서 버튼을 끄지만, 상한을 아는 곳이 화면 하나뿐이면
 * **초기값을 주입하는 경로가 붙는 순간** 조용히 범위를 벗어난다(수정 화면이 그렇게
 * 붙는다). 그리고 이 값은 서버가 전체 영양을 나누는 **분모**다 — 0 이 새면 서버가
 * 400 을 주거나(사용자는 이유를 모른다) 나누기가 터진다.
 */
export function clampServings(value: number): number {
  if (!Number.isFinite(value)) return RECIPE_WRITE_LIMITS.servingsMin
  const rounded = Math.round(value)
  if (rounded < RECIPE_WRITE_LIMITS.servingsMin)
    return RECIPE_WRITE_LIMITS.servingsMin
  if (rounded > RECIPE_WRITE_LIMITS.servingsMax)
    return RECIPE_WRITE_LIMITS.servingsMax
  return rounded
}

/** 보낼 재료가 없으면 null — 훅이 이걸 보고 호출 자체를 하지 않는다. */
export function toPreviewRequest(
  state: RecipeWriteFormState,
): NutritionPreviewRequest | null {
  const ingredients = toPreviewIngredients(state)
  if (ingredients.length === 0) return null
  return { servings: clampServings(state.servings), ingredients }
}

function parseTimeMin(text: string): number | null {
  const trimmed = text.trim()
  if (!/^\d{1,4}$/u.test(trimmed)) return null
  const value = Number(trimmed)
  if (value < RECIPE_WRITE_LIMITS.timeMinMin) return null
  if (value > RECIPE_WRITE_LIMITS.timeMinMax) return null
  return value
}

/**
 * 폼 → `POST /recipes` 본문(계약 §3.6).
 *
 * `nutritionOverride` 는 **보내지 않는다.** 서버가 재료로 계산해서
 * `provenance = "computed_from_ingredients"` 로 저장하게 둔다. 앱이 화면에 보이던
 * 미리보기 수치를 되돌려 보내면 그건 작성자가 보정한 값(`author_supplied`)으로
 * 기록되는데, 작성자는 아무 것도 보정하지 않았다.
 */
export function toCreateRecipeRequest(
  state: RecipeWriteFormState,
): CreateRecipeRequestV2 {
  const tags = [...state.nutritionTags, ...state.stageTags]
    .map((tag) => clamp(tag, RECIPE_WRITE_LIMITS.tagLength))
    .filter((tag) => tag.length > 0)
    .slice(0, RECIPE_WRITE_LIMITS.tagMax)

  const description = clamp(
    state.description,
    RECIPE_WRITE_LIMITS.descriptionMax,
  )
  const imageObjectPaths = state.photos
    .map((photo) => photo.objectPath)
    .filter((path): path is string => typeof path === "string" && path !== "")
    .slice(0, RECIPE_WRITE_LIMITS.imageMax)

  return {
    name: clamp(state.name, RECIPE_WRITE_LIMITS.nameMax),
    summary: clamp(state.summary, RECIPE_WRITE_LIMITS.summaryMax) || null,
    description: description.length > 0 ? description : null,
    category: clamp(state.category, RECIPE_WRITE_LIMITS.categoryMax),
    tags,
    timeMin: parseTimeMin(state.timeMinText),
    servings: clampServings(state.servings),
    difficulty: state.difficulty,
    imageObjectPaths,
    ingredients: state.ingredients
      .filter(isFilledIngredient)
      .slice(0, RECIPE_WRITE_LIMITS.ingredientMax)
      .map((row) => ({
        name: clamp(row.name, RECIPE_WRITE_LIMITS.ingredientNameMax),
        amountText: clamp(
          row.amountText,
          RECIPE_WRITE_LIMITS.ingredientAmountMax,
        ),
      })),
    steps: state.steps
      .filter(isFilledStep)
      .slice(0, RECIPE_WRITE_LIMITS.stepMax)
      .map((row) => ({
        text: clamp(row.text, RECIPE_WRITE_LIMITS.stepTextMax),
        imageObjectPath: null,
      })),
  }
}

/** 폼에 뭐라도 적었는가 — 나가기 확인을 띄울지 판단한다. */
export function hasAnyRecipeWriteContent(state: RecipeWriteFormState): boolean {
  return (
    state.name.trim() !== "" ||
    state.summary.trim() !== "" ||
    state.description.trim() !== "" ||
    state.category !== "" ||
    state.nutritionTags.length > 0 ||
    state.stageTags.length > 0 ||
    state.timeMinText.trim() !== "" ||
    state.difficulty !== null ||
    state.photos.length > 0 ||
    state.ingredients.some(isFilledIngredient) ||
    state.steps.some(isFilledStep)
  )
}
