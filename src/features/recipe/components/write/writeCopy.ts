/**
 * 작성 화면의 문구 열쇠 표. **여기 말고 다른 곳에서 한국어를 적지 않는다.**
 *
 * 값을 리터럴 유니온으로 두는 이유: `t()` 는 `i18next.d.ts` 로 키를 타입 검사한다.
 * `as const` 가 없으면 `string` 이 되어 오타가 컴파일을 통과한다.
 *
 * 태그 라벨은 **이미 있는 키를 재사용한다**(여기서 쓰는 것은 `category.food.*` ·
 * `category.nutrition.*` 둘이다). 같은 말을 두 번 번역해 두면 한쪽만 고쳐질 때
 * 화면 안에서 같은 태그가 다르게 불린다.
 *
 * 작성 갈래가 쓰는 나머지 두 무리는 여기 없다 — `category.stage.*` 는
 * `authorContextTags.ts`, `curated.difficulty.*` 는 상세·카탈로그 카드 쪽이 붙들고 있다
 * (아래 두 잔량 주석 참고). 열쇠 표는 그 값을 **만드는 파일 옆**에 둔다.
 */

import {
  CUISINE_TAGS,
  NUTRITION_TAGS,
} from "@/src/features/recipe/data/recipeTags"
import type { RecipeWriteRequirementId } from "./writeFormState"
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
 * 없다 — 서버에 수정 경로가 없어서 `app/(write)/recipe/edit/[id].tsx` 도 "수정은 아직
 * 없어요" 만 띄운다(그 파일은 상세 화면과 URL 이 겹쳐 `edit/` 아래로 옮겨졌다).
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

/*
  `SECTION_TITLE_KEY` · `SECTION_STATE_KEY` 가 여기 있었다. 아코디언 머리글의 제목과
  상태("다 적었어요")를 가리키던 표인데, 화면이 평면 스크롤이 되면서 머리글 자체가
  없어졌다. 두 표를 읽는 곳이 하나도 남지 않아 지웠다(`recipeWrite.section.*` ·
  `recipeWrite.sectionState.*` 로케일 키도 같이 지웠다).
*/

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

/*
  `STAGE_LABEL_KEY` 와 `STAGE_TAG_OPTIONS`(신장질환 병기 칩 다섯 개)가 여기 있었다.
  그 줄은 이제 칩 레일이 아니라 프로필에서 파생되는 한 줄 진술이다
  (`authorContextTags.ts` 머리말). 고르는 목록이 없어졌으므로 이 파일의 라벨 표는
  없앴다.

  **`category.stage.*` 로케일 키는 살아 있다.** 한때 같이 지웠지만, 파생된 태그도
  화면에 문구로 그려져야 해서(en 로케일 문장 한가운데 한국어가 박히던 결함) 되살렸다.
  지금 그 열쇠를 붙들고 있는 유니온은 여기가 아니라
  `authorContextTags.ts::AuthorContextTag.labelKey` 다 — **만드는 쪽 옆에 둔다**는
  같은 규칙이라, 이 파일의 `WriteChipOption` 에는 도로 넣지 않는다.
*/

export const CATEGORY_OPTIONS: WriteChipOption[] = CUISINE_TAGS.map(
  (value) => ({
    value,
    labelKey: CUISINE_LABEL_KEY[value],
  }),
)

export const NUTRITION_TAG_OPTIONS: WriteChipOption[] = NUTRITION_TAGS.map(
  (value) => ({ value, labelKey: NUTRITION_LABEL_KEY[value] }),
)

/*
  `DIFFICULTY_OPTIONS`(쉬움·보통·어려움)가 여기 있었다. 작성 화면에서 난이도를 뺐고
  (시안에 없고, 상세의 메타 한 줄에만 쓰이는 자유 문자열이다) 다른 호출부가 없어 지웠다.

  목록만 지우고 `WriteChipOption.labelKey` 유니온에는 `curated.difficulty.*` 세 줄이
  남아 있었는데, **그 값을 만드는 곳이 하나도 없어** 유니온에서도 뺐다. 죽은 갈래를
  남겨 두면 "작성 칩이 난이도도 그릴 수 있다" 는 잘못된 신호가 된다.

  **`curated.difficulty.*` 로케일 키는 살아 있다** — 카탈로그 레시피 카드
  (`CuratedRecipeCard`)와 상세의 `RecipeTitleBlock` 이 서버가 준 난이도를 그릴 때 쓴다.
*/
