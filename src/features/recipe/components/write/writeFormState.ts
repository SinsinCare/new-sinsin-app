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

/**
 * 재료 한 줄. 화면은 **세 칸**(재료명 · 단위 · 수량)이지만 서버가 받는 것은
 * `{name, amountText}` **두 칸**이다(계약 §3.3). 합치는 규칙은
 * `joinIngredientAmount` 하나가 안다.
 *
 * `amountText` 를 `unitText` 로 개명하지 않았다. 이 문자열 위에 파서 테스트가
 * 여덟 개 서 있고, 개명하면 그 여덟이 전부 흔들리면서 **정말 깨졌는지 이름만
 * 바뀌었는지** 구분할 수 없게 된다. 이름값보다 회귀 감지가 비싸다.
 */
export interface IngredientRow {
  /** 목록 재정렬·삭제에 쓰는 안정 키. 인덱스를 키로 쓰면 삭제할 때 입력이 섞인다. */
  id: string
  name: string
  /** 가운데 **단위** 칸. 그램이 실리는 쪽이라 합칠 때 **항상 앞**에 온다. */
  amountText: string
  /** 오른쪽 **수량/개수** 칸(`1개`, `2쪽`). 서버 파서가 못 읽는 표기가 주로 여기 온다. */
  countText: string
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
  return { id: nextRowId("ing"), name: "", amountText: "", countText: "" }
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
    photos: [],
    ingredients: [emptyIngredientRow()],
    steps: [emptyStepRow()],
  }
}

/* ══════════════════════════ 조리 시간 ══════════════════════════ */

/**
 * `timeMinText` 를 읽은 결과. **세 갈래**인 이유가 이 타입의 전부다.
 *
 * 예전에는 `number | null` 이었다. 그러면 **안 적었다**(선택 항목이라 정상)와
 * **적었는데 범위를 벗어났다**가 같은 `null` 로 뭉개진다. 칸은 4자리를 받으므로
 * `9999` 는 손가락으로 칠 수 있고, 그때 사용자는 분명히 적었는데 아무 말 없이
 * 등록되고 **조리 시간만 사라진 레시피**가 남는다. 서버는 같은 값을 400 으로
 * 거절한다 — 앱만 조용히 삼키고 있었다.
 *
 * `null` 을 "안 적음" 자리에 그대로 둔 이유: 호출부 대부분이 `?.` 한 번으로
 * 끝나고, 빈 칸은 실제로 **없는 값**이지 실패가 아니다.
 */
export type TimeMinParse =
  | { ok: true; value: number }
  | { ok: false; reason: "out_of_range" }
  | null

/**
 * 순수 함수다 — i18n 도 화면도 모른다. 문구(`recipeWrite.field.timeMinRange`)는
 * 이 결과를 받은 화면이 고른다.
 *
 * ## 자릿수 상한(`\d{1,4}`)을 뺀 이유
 * 예전 정규식은 5자리 이상을 아예 안 읽고 `null` 로 떨어뜨렸다. 그건 방금 없앤
 * **조용한 삼킴**과 같은 것이다(칸의 `maxLength=4` 는 붙여넣기까지 막지만, 수정
 * 화면처럼 값을 주입하는 경로가 붙으면 그 보장이 사라진다). 숫자로 읽히면 범위로
 * 판정한다 — 자릿수는 범위가 할 일을 대신하지 않는다.
 *
 * 숫자가 아닌 글자는 `null`(안 적음)이다. 칸이 `[^0-9]` 를 지우고 받으므로 폼
 * 상태에는 애초에 들어올 수 없고, "0x10 을 조리 시간으로 적었다" 고 말할 근거도
 * 없다. 범위 오류로 부르면 안 한 말을 사용자에게 씌운다.
 *
 * 경계는 계약 §3.6 의 `timeMinMin`/`timeMinMax`(1~1440) 그대로다. 여기서 새로
 * 고른 수치가 아니다.
 */
export function parseTimeMin(text: string): TimeMinParse {
  const trimmed = text.trim()
  if (trimmed === "") return null
  if (!/^\d+$/u.test(trimmed)) return null
  const value = Number(trimmed)
  if (
    value < RECIPE_WRITE_LIMITS.timeMinMin ||
    value > RECIPE_WRITE_LIMITS.timeMinMax
  ) {
    return { ok: false, reason: "out_of_range" }
  }
  return { ok: true, value }
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

/*
  섹션 식별자(`RecipeWriteSectionId`)·섹션 목록·요구사항↔섹션 표가 여기 있었다.
  화면이 아코디언이던 시절, 접힌 머리글에 "다 적었어요 / 남았어요" 를 띄우려고
  요구사항을 섹션 단위로 굴린 것이다. 화면이 평면 스크롤이 되면서 접힌 머리글이
  사라졌고, 그 셋을 읽는 곳이 하나도 남지 않았다 — 그래서 지웠다.
  남은 것은 `missing[0]`(등록 버튼 위 한 줄) 하나뿐이고, 그건 섹션을 몰라도 된다.
*/

/** 재료 한 줄이 "적은 것" 인가. 이름이 있으면 센다(분량은 영양 계산에만 필요하다). */
export function isFilledIngredient(row: IngredientRow): boolean {
  return row.name.trim().length > 0
}

export function isFilledStep(row: StepRow): boolean {
  return row.text.trim().length > 0
}

/*
  `requirements`(전체 항목 × done) · `doneCount` · `totalCount` 가 여기 있었다.
  헤더에 `필수 n/5` 진행 표시를 그리던 값인데, 그 표시가 사라진 뒤로 **프로덕션에서
  읽는 곳이 0개**였다(테스트만 봤다). 세어 두면 언젠가 쓰겠지 하고 남겨 두면,
  화면에 없는 수치를 계속 맞다고 검증하게 된다 — 그래서 지웠다.
  남은 신호는 `missing[0]`(등록 버튼 위 한 줄) 하나뿐이고 화면도 그것만 읽는다.
*/
export interface RecipeWriteEvaluation {
  /** 아직 안 된 것. 첫 항목이 버튼 위에 뜨는 그 한 줄이다. */
  missing: RecipeWriteRequirementId[]
  /** 사진이 아직 올라가는 중인가. 남은 요구사항이 없어도 이때는 등록을 막는다. */
  photosUploading: boolean
  /**
   * 사진 한 장이라도 **올리다 실패한 채** 남아 있는가.
   *
   * `uploading` 만 막고 `failed` 를 흘려보내면, 실패한 사진은 `objectPath` 가 없어
   * `toCreateRecipeRequest` 에서 조용히 걸러지고 **사진 없는 레시피가 확정된다.**
   * 사진은 한 장뿐이고(`imageMax: 1`) 사용자 레시피에는 다른 이미지 출처가 없으며
   * 수정 API 도 없다 — 되돌릴 방법이 하나도 없는 손실이다.
   *
   * 갇히지 않는다: 실패 타일에는 **다시 올리기와 지우기**가 둘 다 있다. 지우면 바로
   * 등록할 수 있다. "못 올렸어요" 를 띄워 놓고 등록 버튼이 "이제 등록할 수 있어요" 라고
   * 말하는 것이 이 화면에서 가장 하면 안 되는 종류의 거짓말이다.
   */
  photosFailed: boolean
  /**
   * 조리 시간을 **적었는데 1~1440 밖**인가. 빈 칸은 여기서 `false` 다(선택 항목이다).
   *
   * `missing` 에 못 넣는다: 그 배열은 **필수 5개**의 id 만 담고 문구 표
   * (`writeCopy.MISSING_COPY_KEY`)와 1:1 로 묶여 있다. "선택 항목인데 틀리게 적었다"
   * 는 "필수인데 안 적었다" 와 다른 말이라 같은 통에 담으면 둘 다 흐려진다.
   */
  timeMinOutOfRange: boolean
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

  const missing = RECIPE_WRITE_REQUIREMENTS.filter((id) => !done[id])

  const photosUploading = state.photos.some((p) => p.status === "uploading")
  const photosFailed = state.photos.some((p) => p.status === "failed")
  const timeMinOutOfRange = parseTimeMin(state.timeMinText)?.ok === false

  return {
    missing,
    photosUploading,
    photosFailed,
    timeMinOutOfRange,
    /*
      범위 밖 조리 시간으로도 등록을 막는다. 조리 시간은 선택 항목이지만 여기서
      막지 않으면 `toCreateRecipeRequest` 가 그 값을 `null` 로 보내고 등록은
      **성공**한다 — 사용자가 적은 숫자만 사라진 채로. 그리고 이 앱에는 레시피
      수정 경로가 없어서(`writeCopy.RECIPE_EDIT_ENABLED === false`, 서버 계약 §2 에
      `PUT /recipes/{id}` 가 없다) 그렇게 올라간 레시피는 **영영 못 고친다.**
      되돌릴 수 없는 쪽으로 조용히 흘려보내지 않는다.

      ⚠ 이 줄은 화면의 상태 문구와 짝이다. `RecipeWriteScreen` 이
      `timeMinOutOfRange` 를 상태 줄에 반영하지 않으면 "등록할 수 있어요" 라고
      적힌 채 버튼만 꺼진 막다른 길이 된다 — 이 파일 머리말이 말하는 바로 그
      결함이다. 화면을 되돌릴 거면 이 조건도 같이 되돌려야 한다.
    */
    canSubmit:
      missing.length === 0 &&
      !photosUploading &&
      !photosFailed &&
      !timeMinOutOfRange,
  }
}

/* ══════════════════════════ 목록 편집 ══════════════════════════ */

/**
 * 드래그 중, **잡히지 않은** 행이 비켜나는 거리.
 *
 * 잡은 행이 지나간 만큼만 반대로 움직인다 — 비워지는 자리의 크기는 언제나 잡은 행의
 * 높이이기 때문이다. 위로 끌면 사이에 낀 행들이 아래로(+), 아래로 끌면 위로(-) 밀린다.
 *
 * 드래그가 아닐 때(`fromIndex`/`dropIndex` 가 null)와 잡은 행 자신은 0 이다 —
 * 잡은 행은 손가락을 따라가는 별도 값(`drag.value`)으로 그린다.
 *
 * `.tsx` 안에 있던 것을 여기로 내렸다. 이 레포는 렌더 테스트가 불가능해서
 * (`jest.config.ts:3` — testEnvironment: node, react-native 는 스텁) 컴포넌트 파일 안의
 * 순수 함수는 영원히 검증되지 않는다. 재정렬 산수는 눈으로 보고 맞다고 하기 어려운
 * 종류라 테스트가 붙는 자리에 있어야 한다.
 */
export function staticOffsetFor(
  index: number,
  fromIndex: number | null,
  dropIndex: number | null,
  draggedHeight: number,
): number {
  if (fromIndex === null || dropIndex === null) return 0
  if (index === fromIndex) return 0
  if (fromIndex < dropIndex && index > fromIndex && index <= dropIndex) {
    return -draggedHeight
  }
  if (dropIndex < fromIndex && index >= dropIndex && index < fromIndex) {
    return draggedHeight
  }
  return 0
}

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

/* ══════════════════ 세 칸을 서버 두 칸으로 · 순서 요약 ══════════════════ */

/**
 * 재료 행의 **단위 칸 + 수량 칸**을 서버가 받는 `amountText` 한 줄로 합친다.
 *
 * ## 왜 그램이 실린 칸이 앞인가
 * 서버 파서(`parseAmountToGrams` 의 이식본)는 문자열에서 **처음 만나는 수치+단위**를
 * 읽고 멈춘다. `"1개 100g"` 으로 합치면 앞의 `1개` 를 보고 환산을 포기해서, 사용자가
 * 100g 을 분명히 적었는데도 그 재료가 영양 합산에서 통째로 빠진다. 신장 환자에게
 * 나트륨을 **낮게** 말하는 방향의 사고다. 그래서 순서는 취향이 아니라 안전 규칙이다.
 *
 * ## 빈 칸을 버리는 이유
 * `"" + "1큰술"` → `"1큰술"` 이 되어야 파서가 정직하게 못 읽고 `unmatchedIngredients`
 * 로 빠진다. 자리를 지키느라 `" 1큰술"` 같은 앞 공백을 남기면 파서 정규식이 흔들린다.
 *
 * ## 상한을 여기서 한 번 더 자르는 이유
 * 칸마다 `maxLength`(20/19)가 걸려 있어 손으로 친 값은 40 을 넘을 수 없다. 그래도
 * 자르는 건 **붙여넣기와 주입 경로** 때문이다 — 수정 화면이 붙으면 서버 값이 그대로
 * 폼에 들어온다. 자를 때는 **단어 경계**를 지킨다: `"100g 1큰술반"` 을 글자 수로만
 * 자르면 `"100g 1큰술"` 같은 **말이 되는 거짓말**이 남아, 잘렸다는 사실이 보이지
 * 않는다. 토막난 단어를 통째로 버리면 앞의 그램은 살고 뒤는 없는 것이 된다.
 */
export function joinIngredientAmount(
  amountText: string,
  countText: string,
): string {
  const joined = [amountText, countText]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(" ")

  const max = RECIPE_WRITE_LIMITS.ingredientAmountMax
  if (joined.length <= max) return joined

  const head = joined.slice(0, max)
  // 경계가 마침 공백 앞에서 끝났으면 이미 단어가 온전하다.
  if (/\s/u.test(joined.charAt(max))) return head.trimEnd()
  const lastSpace = head.lastIndexOf(" ")
  // 첫 토막 하나가 이미 상한보다 길다 — 버릴 단어가 없으니 그대로 자른다.
  return lastSpace <= 0 ? head : head.slice(0, lastSpace)
}

/**
 * 접힌 `조리 순서` 필드가 그릴 값. 시트를 닫아 놓은 채로도 **무엇을 적었는지**가
 * 보여야 한다 — "조리 순서가 입력되었습니다" 류의 요약은 시트를 열어 보기 전까지
 * 아무것도 알려주지 않아서, 시트를 지웠던 원래 이유를 그대로 되살린다.
 *
 * **여기서 문구를 만들지 않는다.** 한국어는 화면이 i18n 으로 고른다(`{{count}}`
 * 보간). 이 함수가 문장을 만들면 순수 테스트가 로케일에 묶인다.
 *
 * 빈 줄은 세지 않는다. 사용자가 2번 단계를 지우려고 글자만 지워 둔 상태에서
 * "3단계" 라고 말하면 시트를 열기 전까지 그 거짓을 확인할 방법이 없다.
 */
export function summarizeSteps(steps: readonly StepRow[]): {
  count: number
  firstText: string | null
} {
  const filled = steps.filter(isFilledStep)
  const first = filled[0]
  return {
    count: filled.length,
    firstText: first === undefined ? null : first.text.trim(),
  }
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
 *
 * "분량이 비었다" 의 판정은 **합친 뒤**에 한다. 단위 칸만 비고 수량 칸에 `1개` 가
 * 있는 줄은 보낼 값이 있는 줄이다 — 서버가 못 읽더라도 그건 `unmatchedIngredients`
 * 로 정직하게 돌아와야 하고, 앱이 미리 삼키면 그 사실 자체가 사라진다.
 */
export function toPreviewIngredients(
  state: RecipeWriteFormState,
): NutritionPreviewIngredient[] {
  return state.ingredients
    .map((row) => ({
      row,
      amountText: joinIngredientAmount(row.amountText, row.countText),
    }))
    .filter(
      ({ row, amountText }) => isFilledIngredient(row) && amountText !== "",
    )
    .slice(0, RECIPE_WRITE_LIMITS.ingredientMax)
    .map(({ row, amountText }) => ({
      name: clamp(row.name, RECIPE_WRITE_LIMITS.ingredientNameMax),
      amountText,
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
  const timeMin = parseTimeMin(state.timeMinText)
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
    /*
      범위 밖이면 `null` 이다. 등록은 `canSubmit` 이 이미 막고 있어서 여기까지
      오지 않지만, 이 함수만 부르는 경로(미리보기·테스트·앞으로의 수정 화면)가
      있으므로 값을 정한다: `9999` 를 그대로 실으면 서버가 400 을 내고 사용자는
      이유를 못 본다.
    */
    timeMin: timeMin?.ok === true ? timeMin.value : null,
    servings: clampServings(state.servings),
    imageObjectPaths,
    ingredients: state.ingredients
      .filter(isFilledIngredient)
      .slice(0, RECIPE_WRITE_LIMITS.ingredientMax)
      .map((row) => ({
        name: clamp(row.name, RECIPE_WRITE_LIMITS.ingredientNameMax),
        amountText: joinIngredientAmount(row.amountText, row.countText),
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
    state.photos.length > 0 ||
    state.ingredients.some(isFilledIngredient) ||
    state.steps.some(isFilledStep)
  )
}
