/**
 * 레시피 홈(둘러보기 층)의 **순수 판단** — 어느 층을 그리고, 카테고리 필터를 어디서
 * 보여줄 것인가.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 왜 화면(`app/(tabs)/recipe.tsx`) 밖에 있나
 *
 * 시안의 원래 결함은 **필터가 3곳에 흩어져 있었다**는 것이다(상단 칩 · 카테고리 아이콘
 * 캐러셀 · 필터 시트). 어떤 게 적용 중인지 화면만 보고 알 수 없었고, 최악은 **걸어 둔
 * 필터를 볼 수도 뺄 수도 없는 상태**다. 그 재발을 막는 판단이 화면 컴포넌트 안의
 * `&&` 세 줄로 남아 있으면 jest 에서 볼 수 없다 — 화면은 tamagui·expo-router 를 끌고
 * 오므로 렌더 테스트가 불가능하다. 그래서 판단만 여기로 내렸고, 화면은 결과를 그린다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 세 층 (화면 머리말과 같은 이야기)
 *
 *   ① 고정부   제목 · 검색 · 적용된 필터 칩
 *   ② 둘러보기 카테고리 캐러셀 · 아침/점심/저녁 섹션
 *   ③ 카탈로그 목록 제목 · 정렬 · 사진 줄 목록
 */
import type {
  AppliedRecipeFilter,
  RecipeFilterSelection,
} from "./recipeListFilterModel"
import type {
  MealSlot,
  MealSlotState,
  SlotDecision,
} from "../../types/recipeHome"

export interface RecipeBrowseLayoutInput {
  /** 검색어가 확정됐거나 자동완성이 떠 있다 — 사용자가 "찾는 중" 이다. */
  isSearching: boolean
  /** 걸린 필터 개수(`countRecipeFilters`). 그룹을 가리지 않는다. */
  appliedFilterCount: number
}

export interface RecipeBrowseLayout {
  showCategoryCarousel: boolean
  showMealSections: boolean
}

/**
 * ②층을 그릴지 정한다.
 *
 * **섹션은 검색 중이거나 필터가 하나라도 걸리면 감춘다.** 근거는 서버다 —
 * `GET /recipes/home` 은 쿼리로 `locale` 하나만 받는다
 * (`sinsin-be-bun/src/domains/recipe/homeRoutes.ts` 실측: `categories` 파라미터가 없다).
 * 즉 **섹션을 그 카테고리로 좁힐 방법이 없다.** 좁히지 못한 섹션을 좁혀진 목록 위에
 * 남기면 "한식" 을 눌렀는데 위쪽 카드는 중식·양식이 그대로 있는 화면이 되고, 사용자는
 * 필터가 무엇에 걸렸는지 알 수 없다. (홈 API 에 카테고리가 생기면 이 판단을 다시 한다.)
 *
 * **캐러셀은 필터가 걸려 있어도 남는다.** 자기가 무엇을 눌렀는지 보고 다시 뺄 수 있어야
 * 한다. 감춰지는 것은 검색 중일 때뿐이고, 그때는 카테고리가 칩으로 나온다(아래 참고).
 */
export function resolveRecipeBrowseLayout(
  input: RecipeBrowseLayoutInput,
): RecipeBrowseLayout {
  return {
    showCategoryCarousel: !input.isSearching,
    showMealSections: !input.isSearching && input.appliedFilterCount === 0,
  }
}

/**
 * 적용 필터 칩 줄에 실제로 그릴 항목.
 *
 * 캐러셀이 보이는 동안 카테고리는 **캐러셀에서만** 보인다 — 칩으로도 그리면 같은 필터가
 * 한 화면에 두 번 나오고(시안의 결함) 어느 쪽이 진짜인지 알 수 없다. 캐러셀이 감춰지면
 * 카테고리도 칩으로 나온다. 안 그러면 걸어 둔 카테고리를 **보거나 뺄 방법이 없어진다.**
 *
 * 거르는 것은 화면 층에서만 한다 — `listAppliedRecipeFilters`(모델)는 그대로 쓴다.
 * 모델을 갈라 두 진실을 만들지 않는다.
 */
export function visibleAppliedRecipeFilters(
  applied: readonly AppliedRecipeFilter[],
  layout: Pick<RecipeBrowseLayout, "showCategoryCarousel">,
): AppliedRecipeFilter[] {
  return layout.showCategoryCarousel
    ? applied.filter((entry) => entry.group !== "category")
    : [...applied]
}

/** 걸린 카테고리 필터를 사용자가 **보고 뺄 수 있는 자리**. */
export type CategoryFilterAffordance = "carousel" | "chip"

/**
 * 걸린 카테고리 필터가 드러나는 자리 목록. **항상 정확히 하나여야 한다.**
 *
 *  - 0개 = 걸어 둔 필터를 볼 수도 뺄 수도 없다(최악. 결과가 왜 이런지 알 수 없다).
 *  - 2개 = 같은 필터가 한 화면에 두 번 — 시안의 "필터가 3곳에 흩어져 있다" 가 그것이다.
 *
 * 그 불변식을 조합 전부에 대해 검사할 수 있도록 자리 목록을 값으로 돌려준다.
 * 걸린 카테고리가 없으면 빈 배열이다(드러낼 것이 없다).
 */
export function categoryFilterAffordances(input: {
  selection: RecipeFilterSelection
  applied: readonly AppliedRecipeFilter[]
  layout: RecipeBrowseLayout
}): CategoryFilterAffordance[] {
  const hasCategory = (input.selection.category?.length ?? 0) > 0
  if (!hasCategory) return []
  const surfaces: CategoryFilterAffordance[] = []
  if (input.layout.showCategoryCarousel) surfaces.push("carousel")
  const visible = visibleAppliedRecipeFilters(input.applied, input.layout)
  if (visible.some((entry) => entry.group === "category")) surfaces.push("chip")
  return surfaces
}

// ---------------------------------------------------------------------------
// 섹션 문안
// ---------------------------------------------------------------------------

/**
 * 섹션 본문에 무엇이 오는가. **`"hidden"` 이 없는 것이 이 타입의 요점이다** —
 * 섹션은 어떤 상태에서도 사라지지 않는다.
 *
 * 계약 §2 가 빈 섹션까지 보내는 이유는 "사용자가 섹션이 왜 사라졌는지 짐작할 수 없다"
 * 다. 앱이 빈 섹션을 감추면 서버가 보낸 이유가 무의미해진다. 그리고 빈 섹션은 이론이
 * 아니라 **실제로 보이는 화면**이다 — 벤치 DB 의 recipe 는 0건이고, `POST /recipes` 로
 * 만든 레시피는 `meal_slots` 가 `{}` 여서 어느 섹션에도 걸리지 않는다.
 *
 * 첫 조회 중에도 제목을 그리고 카드 자리만 비운다(`"loading"`) — 0 높이로 두면 카드가
 * 도착하는 순간 아래 목록이 통째로 밀려 사용자가 읽던 줄을 잃는다.
 */
export type MealSectionBody = "loading" | "empty" | "cards"

export function resolveMealSectionBody(input: {
  isLoading: boolean
  itemCount: number
}): MealSectionBody {
  if (input.isLoading) return "loading"
  return input.itemCount <= 0 ? "empty" : "cards"
}

export interface SplitTitle {
  before: string
  /** 브랜드색으로 칠할 낱말. 제목 안에서 못 찾으면 빈 문자열이다. */
  match: string
  after: string
}

/**
 * 제목 문장에서 강조할 낱말 하나를 잘라 낸다.
 *
 * 왜 문장을 쪼개는가: 시안이 "오늘의 **아침** 추천메뉴" 처럼 문장 **안의 한 낱말**만
 * 칠했다. 제목을 세 조각으로 미리 나눠 i18n 키를 늘리면(`title.before`/`.after`) 번역자가
 * 어순을 못 바꾼다 — 영어는 "Breakfast picks for today" 로 낱말 자리가 달라진다.
 * 그래서 `title` 과 `highlight` 두 키만 받고 **찾아서** 쪼갠다.
 *
 * 못 찾으면 통째로 `before` 에 넣는다 — 강조가 사라질 뿐 제목은 온전히 보인다.
 * 첫 번째 등장만 칠한다(두 번 칠하면 어느 쪽이 시간대인지 알 수 없다).
 */
export function splitTitleHighlight(
  title: string,
  highlight: string,
): SplitTitle {
  if (!highlight) return { before: title, match: "", after: "" }
  const at = title.indexOf(highlight)
  if (at < 0) return { before: title, match: "", after: "" }
  return {
    before: title.slice(0, at),
    match: highlight,
    after: title.slice(at + highlight.length),
  }
}

/**
 * 섹션이 실제로 읽는 i18n 키.
 *
 * **템플릿 문자열로 조립하지 않는다.** `home.section.${leaf}.title` 로 만들면 타입이
 * `string` 으로 넓어져 `t()` 의 키 유니온 검사를 통째로 빠져나간다 — 없는 키를 넣어도
 * 컴파일되고, 화면에는 키 이름이 그대로 찍힌다. 리터럴로 적어 두면 **tsc 가 세 슬롯의
 * 아홉 키가 실제로 리소스에 있는지 확인**하고, 로케일 검사는 그 위에서 ko·en 양쪽에
 * 값이 있는지 본다.
 *
 * 슬롯 낱말은 `MEAL_SLOT_I18N`(서버 값 → 키 조각)과 같아야 한다 — 그 일치는 테스트가
 * 못 박는다(`recipeHome.test.ts`).
 */
const MEAL_SECTION_COPY = {
  BREAKFAST: {
    title: "home.section.breakfast.title",
    subtitle: "home.section.breakfast.subtitle",
    highlight: "home.section.breakfast.highlight",
  },
  LUNCH: {
    title: "home.section.lunch.title",
    subtitle: "home.section.lunch.subtitle",
    highlight: "home.section.lunch.highlight",
  },
  DINNER: {
    title: "home.section.dinner.title",
    subtitle: "home.section.dinner.subtitle",
    highlight: "home.section.dinner.highlight",
  },
} as const satisfies Record<
  MealSlot,
  { title: string; subtitle: string; highlight: string }
>

export function mealSectionCopyKeys(slot: MealSlot) {
  return MEAL_SECTION_COPY[slot]
}

/** 빈 섹션이 **왜 비었는지** 말하는 문구. 섹션을 감추는 대신 이 문장을 그린다(계약 §2). */
export const RECIPE_HOME_EMPTY_COPY_KEY = "home.section.empty" as const

// ---------------------------------------------------------------------------
// 왜 이 순서인가 — 한 줄로
// ---------------------------------------------------------------------------

/**
 * 끝난 끼니의 배지 문구. **없으면 `null`** — 아직 안 먹은 끼니에는 아무것도 안 붙는다.
 *
 * 배지를 다는 이유: 섹션이 뒤로 밀린 것을 사용자가 **보고 납득할 수 있어야** 한다.
 * 순서만 바뀌고 아무 표시가 없으면 "왜 아침이 맨 아래로 갔지" 가 남는다.
 *
 * 키를 리터럴로 적는 이유는 `MEAL_SECTION_COPY` 와 같다 — 템플릿으로 조립하면 타입이
 * `string` 으로 넓어져 없는 키를 넣어도 컴파일된다.
 */
const SLOT_STATE_BADGE = {
  OPEN: null,
  RECORDED: "home.slotState.recorded",
  SKIPPED: "home.slotState.skipped",
} as const satisfies Record<MealSlotState, string | null>

/**
 * 반환 타입을 `string | null` 로 **적지 않는다.** 적는 순간 `t()` 의 키 유니온 검사를
 * 통째로 빠져나가고, 없는 키를 넣어도 컴파일되어 화면에 키 이름이 그대로 찍힌다
 * (`MEAL_SECTION_COPY` 주석과 같은 이야기다). 추론에 맡겨 리터럴 유니온을 유지한다.
 */
export function mealSlotStateBadgeKey(state: MealSlotState) {
  return SLOT_STATE_BADGE[state]
}

/**
 * "왜 이 끼니부터 보여 주는가" 한 줄. **시계 그대로일 때는 `null` 이다** — 아무 일도
 * 일어나지 않았는데 설명을 붙이면 화면이 시끄러워지고, 정말 설명이 필요한 날의 문장이
 * 평소와 구분되지 않는다(밀도를 늘리지 않는다).
 *
 * `AFTER_RECORD` · `AFTER_SKIP` 의 문장은 **원인이 된 끼니**(= `clockSlot`)를 말한다.
 * 도착한 끼니를 말하면("점심부터 보여드려요") 사용자는 왜인지 여전히 모른다.
 */
const SLOT_REASON_COPY = {
  AFTER_RECORD: "home.reason.afterRecord",
  AFTER_SKIP: "home.reason.afterSkip",
  NEXT_DAY: "home.reason.nextDay",
} as const

export interface SlotReasonCopy {
  /**
   * i18n 키. `{{meal}}` 자리에 원인 끼니의 낱말이 들어간다.
   * 타입이 리터럴 유니온이라 `t()` 가 실제로 있는 키인지 검사한다(위 주석과 같은 이유).
   */
  key: (typeof SLOT_REASON_COPY)[keyof typeof SLOT_REASON_COPY]
  /** `{{meal}}` 에 넣을 슬롯. 없으면 치환할 것이 없다. */
  mealSlot: MealSlot | null
}

export function resolveSlotReasonCopy(
  decision: SlotDecision | null,
): SlotReasonCopy | null {
  if (!decision) return null
  switch (decision.reason) {
    case "CLOCK":
      return null
    case "AFTER_RECORD":
      return {
        key: SLOT_REASON_COPY.AFTER_RECORD,
        mealSlot: decision.clockSlot,
      }
    case "AFTER_SKIP":
      return { key: SLOT_REASON_COPY.AFTER_SKIP, mealSlot: decision.clockSlot }
    case "NEXT_DAY":
      return { key: SLOT_REASON_COPY.NEXT_DAY, mealSlot: null }
  }
}

/**
 * ③층 제목. `section.empty` 문구가 "아래 전체 레시피에서 찾아보세요" 로 끝나므로
 * **이 제목이 섹션들 아래에 실제로 있어야** 그 문장이 참이 된다.
 */
export const RECIPE_HOME_LIST_TITLE_KEY = "home.listTitle" as const
