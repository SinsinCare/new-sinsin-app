/**
 * 작성 화면의 문구 열쇠 표. **여기 말고 다른 곳에서 한국어를 적지 않는다.**
 *
 * 값을 리터럴 유니온으로 두는 이유: `t()` 는 `i18next.d.ts` 로 키를 타입 검사한다.
 * `as const` 가 없으면 `string` 이 되어 오타가 컴파일을 통과한다.
 *
 * 태그·난이도 라벨은 **이미 있는 키를 재사용한다**(`category.food.*`,
 * `category.nutrition.*`, `category.stage.*`, `curated.difficulty.*`). 같은 말을
 * 두 번 번역해 두면 한쪽만 고쳐질 때 화면 안에서 같은 태그가 다르게 불린다.
 */

import {
  CUISINE_TAGS,
  NUTRITION_TAGS,
  STAGE_TAGS,
} from "@/src/features/recipe/data/recipeTags"
import type {
  RecipeWriteRequirementId,
  RecipeWriteSectionId,
} from "./writeFormState"
import type { NutrientKey } from "@/src/features/recipe/types/recipeWrite"

export const MISSING_COPY_KEY = {
  name: "recipeWrite.missing.name",
  summary: "recipeWrite.missing.summary",
  category: "recipeWrite.missing.category",
  ingredients: "recipeWrite.missing.ingredients",
  steps: "recipeWrite.missing.steps",
} as const satisfies Record<RecipeWriteRequirementId, string>

/**
 * 올린 레시피를 **고칠 수 있는가.** 계약 §2 의 엔드포인트 표에 `PUT /recipes/{id}` 가
 * 없다 — 서버에 수정 경로가 없어서 `app/(write)/recipe/[id].tsx` 도 "수정은 아직
 * 없어요" 만 띄운다.
 *
 * 이 상수가 없을 때 실제로 벌어진 일: 등록 성공 알림이 "나중에 분량을 고쳐 적으면
 * 다시 계산돼요" 라고 말했다. 무게를 못 읽은 재료가 있는 작성자는 그 말을 믿고 수정
 * 화면으로 갔다가 "수정은 아직 없어요" 를 만난다. 시안 writing-16 의 막다른 길
 * (버튼이 꺼졌는데 이유가 없다)과 같은 종류의 결함이다 — 앱이 할 수 없는 일을 말했다.
 *
 * 서버에 수정이 생기면 **이 상수만 true** 로 바꾼다. 문구는 이미 양쪽 로케일에 있다.
 */
export const RECIPE_EDIT_ENABLED = false

/** 등록은 됐지만 일부 재료가 계산에서 빠졌을 때. 수정 가능 여부에 따라 문구가 다르다. */
export const SUCCESS_UNMATCHED_COPY_KEY = RECIPE_EDIT_ENABLED
  ? "recipeWrite.result.successUnmatchedEditable"
  : "recipeWrite.result.successUnmatched"

export const SECTION_TITLE_KEY = {
  basic: "recipeWrite.section.basic",
  classify: "recipeWrite.section.classify",
  ingredients: "recipeWrite.section.ingredients",
  steps: "recipeWrite.section.steps",
  description: "recipeWrite.section.description",
} as const satisfies Record<RecipeWriteSectionId, string>

export const SECTION_STATE_KEY = {
  done: "recipeWrite.sectionState.done",
  incomplete: "recipeWrite.sectionState.incomplete",
  optional: "recipeWrite.sectionState.optional",
} as const

/** 영양소 이름은 상세 화면과 같은 키를 쓴다. */
export const NUTRIENT_NAME_KEY = {
  sodium: "curated.sodium",
  potassium: "curated.potassium",
  phosphorus: "curated.phosphorus",
  protein: "curated.protein",
} as const satisfies Record<NutrientKey, string>

export const PROVENANCE_KEY = {
  reference_estimate: "recipeWrite.nutrition.provenance.reference_estimate",
  computed_from_ingredients:
    "recipeWrite.nutrition.provenance.computed_from_ingredients",
  author_supplied: "recipeWrite.nutrition.provenance.author_supplied",
  nutritionist_reviewed:
    "recipeWrite.nutrition.provenance.nutritionist_reviewed",
} as const

/** 칩 하나 = 서버에 보낼 값 + 화면에 쓸 문구 열쇠. 값은 한국어 정본이다(v1 과 같은 값). */
export interface WriteChipOption {
  value: string
  labelKey:
    | "category.food.korean"
    | "category.food.chinese"
    | "category.food.japanese"
    | "category.food.western"
    | "category.food.salad"
    | "category.food.dessert"
    | "category.food.drink"
    | "category.nutrition.low-salt"
    | "category.nutrition.low-protein"
    | "category.nutrition.low-potassium"
    | "category.nutrition.low-phosphorus"
    | "category.nutrition.high-calorie"
    | "category.stage.ckd3"
    | "category.stage.ckd4"
    | "category.stage.ckd5"
    | "category.stage.diabetes"
    | "category.stage.hypertension"
    | "curated.difficulty.easy"
    | "curated.difficulty.medium"
    | "curated.difficulty.hard"
}

const CUISINE_LABEL_KEY = {
  한식: "category.food.korean",
  중식: "category.food.chinese",
  일식: "category.food.japanese",
  양식: "category.food.western",
  샐러드: "category.food.salad",
  디저트: "category.food.dessert",
  음료: "category.food.drink",
} as const

const NUTRITION_LABEL_KEY = {
  저염: "category.nutrition.low-salt",
  저단백: "category.nutrition.low-protein",
  저칼륨: "category.nutrition.low-potassium",
  저인: "category.nutrition.low-phosphorus",
  고열량: "category.nutrition.high-calorie",
} as const

const STAGE_LABEL_KEY = {
  "CKD 3기": "category.stage.ckd3",
  "CKD 4기": "category.stage.ckd4",
  "CKD 5기": "category.stage.ckd5",
  "당뇨 동반": "category.stage.diabetes",
  "고혈압 동반": "category.stage.hypertension",
} as const

export const CATEGORY_OPTIONS: WriteChipOption[] = CUISINE_TAGS.map(
  (value) => ({
    value,
    labelKey: CUISINE_LABEL_KEY[value],
  }),
)

export const NUTRITION_TAG_OPTIONS: WriteChipOption[] = NUTRITION_TAGS.map(
  (value) => ({ value, labelKey: NUTRITION_LABEL_KEY[value] }),
)

export const STAGE_TAG_OPTIONS: WriteChipOption[] = STAGE_TAGS.map((value) => ({
  value,
  labelKey: STAGE_LABEL_KEY[value],
}))

/** 난이도 값은 한국어 정본(`쉬움`/`보통`/`어려움`)이고 화면 문구만 로케일을 따른다. */
export const DIFFICULTY_OPTIONS: WriteChipOption[] = [
  { value: "쉬움", labelKey: "curated.difficulty.easy" },
  { value: "보통", labelKey: "curated.difficulty.medium" },
  { value: "어려움", labelKey: "curated.difficulty.hard" },
]
