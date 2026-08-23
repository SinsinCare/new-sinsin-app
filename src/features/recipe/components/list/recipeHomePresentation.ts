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
 *   ① 고정부   제목 · 검색 · 카테고리 레일 · 적용된 필터 칩
 *   ② 둘러보기 아침/점심/저녁 섹션
 *   ③ 카탈로그 목록 제목 · 정렬 · 사진 줄 목록
 *
 * 레일은 2026-08-21 에 ②에서 ①로 올라갔다(커뮤니티 탭과 같은 문법 — 검색 위, 카테고리
 * 아래, 둘 다 고정). **`showCategoryCarousel` 의 의미는 그대로다** — "그릴 것인가" 이지
 * "어느 층에 있는가" 가 아니다. 여기서 층을 말하기 시작하면 판정이 화면 구조를 알게
 * 되고, 다음에 자리를 옮길 때 두 곳을 고쳐야 한다.
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
 * 이 섹션이 **어느 날**의 끼니를 말하는가.
 *
 * 세 끼가 다 끝난 뒤에는 서버가 `currentSlot` 을 **내일** 아침으로 보낸다
 * (`SlotDecision.isNextDay` — 그 필드 주석이 "제목이 '오늘의' 를 쓸지 가른다" 고 이미
 * 적어 두었다). 그런데 슬롯 하나에 제목이 하나뿐이던 동안에는 그 날을 말할 방법이 없어,
 * 화면이 **내일 아침 카드를 "오늘의 아침 레시피" 라는 제목 아래** 그리고 있었다.
 * 날을 값으로 만들어 제목이 그 값을 따라가게 한다.
 */
export type MealSectionDay = "TODAY" | "NEXT_DAY"

/**
 * 이 섹션의 날. **넘어간 그 슬롯 하나만** 내일이다.
 *
 * 나머지 두 섹션은 오늘의 끼니고 `기록함`·`건너뜀` 배지가 붙는다 — 그 배지는 **오늘의**
 * 사실이므로 세 제목을 다 "내일" 로 바꾸면 제목과 배지가 서로 다른 날을 말하게 된다
 * (지금 없애는 모순을 자리만 옮기는 셈이다).
 */
export function resolveMealSectionDay(
  slot: MealSlot,
  decision: SlotDecision | null,
): MealSectionDay {
  if (decision === null || !decision.isNextDay) return "TODAY"
  return decision.slot === slot ? "NEXT_DAY" : "TODAY"
}

/**
 * 섹션이 실제로 읽는 i18n 키.
 *
 * **템플릿 문자열로 조립하지 않는다.** `home.section.${leaf}.title` 로 만들면 타입이
 * `string` 으로 넓어져 `t()` 의 키 유니온 검사를 통째로 빠져나간다 — 없는 키를 넣어도
 * 컴파일되고, 화면에는 키 이름이 그대로 찍힌다. 리터럴로 적어 두면 **tsc 가 세 슬롯의
 * 열두 키가 실제로 리소스에 있는지 확인**하고, 로케일 검사는 그 위에서 ko·en 양쪽에
 * 값이 있는지 본다.
 *
 * 날이 하나 늘면서 제목만 **날 → 키의 작은 표**가 됐다. `` `…title${suffix}` `` 로
 * 이어 붙이는 순간 위의 검사가 통째로 꺼지므로, 두 키를 둘 다 리터럴로 적고 `MealSectionDay`
 * 를 색인으로 쓴다 — 그러면 날이 하나 더 늘 때 **어느 슬롯의 어느 키가 빠졌는지 tsc 가
 * 말해 준다.** 부제목·강조어는 날과 무관하다(요리 성격과 끼니 낱말은 어제도 내일도 같다).
 *
 * 슬롯 낱말은 `MEAL_SLOT_I18N`(서버 값 → 키 조각)과 같아야 한다 — 그 일치는 테스트가
 * 못 박는다(`recipeHome.test.ts`).
 */
const MEAL_SECTION_COPY = {
  BREAKFAST: {
    title: {
      TODAY: "home.section.breakfast.title",
      NEXT_DAY: "home.section.breakfast.titleNextDay",
    },
    subtitle: "home.section.breakfast.subtitle",
    highlight: "home.section.breakfast.highlight",
  },
  LUNCH: {
    title: {
      TODAY: "home.section.lunch.title",
      NEXT_DAY: "home.section.lunch.titleNextDay",
    },
    subtitle: "home.section.lunch.subtitle",
    highlight: "home.section.lunch.highlight",
  },
  DINNER: {
    title: {
      TODAY: "home.section.dinner.title",
      NEXT_DAY: "home.section.dinner.titleNextDay",
    },
    subtitle: "home.section.dinner.subtitle",
    highlight: "home.section.dinner.highlight",
  },
} as const satisfies Record<
  MealSlot,
  {
    title: Record<MealSectionDay, string>
    subtitle: string
    highlight: string
  }
>

/**
 * 날을 **인자로 받는다.** 기본값을 주면(예: `day = "TODAY"`) 넘겨야 할 자리에서 빠뜨려도
 * 컴파일되고, 그때 나오는 화면이 바로 이번에 고친 결함이다 — 조용히 오늘이라고 말한다.
 */
export function mealSectionCopyKeys(slot: MealSlot, day: MealSectionDay) {
  const copy = MEAL_SECTION_COPY[slot]
  return {
    title: copy.title[day],
    subtitle: copy.subtitle,
    highlight: copy.highlight,
  }
}

/**
 * 끼니 낱말 하나(`아침`)의 키 — 제목의 강조어와 **같은 키**다. 이유 문장이 쓸 낱말을 위해
 * 두 번째 번역 키를 만들면 두 곳이 조용히 갈라진다.
 *
 * 날을 묻지 않는다: 그 낱말은 두 제목 모두에 그대로 들어 있다("오늘의 **아침** 레시피" ·
 * "**내일 아침** 레시피"). 그 성질은 테스트가 두 날 모두에 대해 본다.
 */
export function mealSlotWordKey(slot: MealSlot) {
  return MEAL_SECTION_COPY[slot].highlight
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
 * 섹션에 실제로 붙는 배지. **내일을 말하는 섹션에는 붙지 않는다.**
 *
 * `state` 는 **오늘** 그 끼니를 기록했는가·건너뛰었는가다(계약 §2). 하루가 넘어가면 그
 * 슬롯의 섹션은 내일 것을 말하게 되는데, 거기에 오늘의 `기록함` 을 붙이면 제목과 배지가
 * 서로 다른 날을 말한다 — 방금 없앤 모순을 자리만 옮기는 셈이다. 내일 아침은 아직
 * 기록될 수 없으므로 **붙일 배지가 없는 것이 맞다**(모르는 것을 지어내지 않는다).
 *
 * 부수 효과 하나가 오히려 옳다: 배지가 없으면 제목이 브랜드색을 되찾는다. 그 색은
 * "지금 고를 끼니" 의 것이고, 넘어간 날의 첫 섹션이 정확히 그것이다.
 *
 * 반환 타입을 적지 않는 이유는 위 두 함수와 같다(리터럴 유니온을 유지한다).
 */
export function resolveMealSectionBadgeKey(input: {
  state: MealSlotState
  day: MealSectionDay
}) {
  return input.day === "NEXT_DAY" ? null : mealSlotStateBadgeKey(input.state)
}

/**
 * "왜 이 끼니부터 보여 주는가" 한 줄. **제목이 아직 말하지 않은 것이 남았을 때만 있다.**
 *
 * `CLOCK` 이 `null` 인 이유는 처음부터 같다 — 아무 일도 일어나지 않았는데 설명을 붙이면
 * 화면이 시끄러워지고, 정말 설명이 필요한 날의 문장이 평소와 구분되지 않는다.
 *
 * **`NEXT_DAY` 도 `null` 이다.** 여기에는 "오늘 끼니를 다 기록했어요. 내일 아침부터
 * 보여드려요" 가 있었는데, 바로 두 줄 아래 제목이 "오늘의 아침 레시피" 라 **한 화면이
 * 서로 다른 날을 말했다.** 넘어간 날은 이제 제목이 직접 말하므로(`MealSectionDay`)
 * 이 줄은 같은 말의 두 번째 사본이 된다. 게다가 앞 절은 사실이 아닐 수 있었다 — 전진만
 * 하므로 저녁만 기록해도 하루가 넘어가고, 그때 점심은 기록되지 않은 채 남는다
 * ("다 기록했어요" 가 거짓이 된다). 어느 끼니가 어떻게 끝났는지는 섹션마다 붙는
 * 배지(`SLOT_STATE_BADGE`)가 끼니별로 정확히 말한다.
 *
 * `AFTER_RECORD` · `AFTER_SKIP` 은 **남는다.** 이 둘이 말하는 것은 **원인**이고
 * (= `clockSlot`, 방금 기록·건너뛴 끼니) 그 원인은 제목에 없다 — 제목은 도착한 끼니만
 * 말한다. 도착한 끼니를 말하면("점심부터 보여드려요") 사용자는 왜인지 여전히 모른다.
 * 배지가 같은 사실을 들고 있긴 하지만 그 배지는 **맨 아래로 밀린 섹션**에 있어, 순서가
 * 시계와 어긋나 보이는 그 자리(화면 첫 화면)에서는 읽을 수 없다.
 */
const SLOT_REASON_COPY = {
  AFTER_RECORD: "home.reason.afterRecord",
  AFTER_SKIP: "home.reason.afterSkip",
} as const

export interface SlotReasonCopy {
  /**
   * i18n 키. `{{meal}}` 자리에 원인 끼니의 낱말이 들어간다.
   * 타입이 리터럴 유니온이라 `t()` 가 실제로 있는 키인지 검사한다(위 주석과 같은 이유).
   */
  key: (typeof SLOT_REASON_COPY)[keyof typeof SLOT_REASON_COPY]
  /**
   * `{{meal}}` 에 넣을 슬롯. **없는 경우가 없다** — 남은 두 문장은 둘 다 원인 끼니를
   * 말한다. `null` 을 허용해 두면 화면에 "을 기록해서…" 로 시작하는 빈 갈래가 남는다.
   */
  mealSlot: MealSlot
}

export function resolveSlotReasonCopy(
  decision: SlotDecision | null,
): SlotReasonCopy | null {
  if (!decision) return null
  switch (decision.reason) {
    case "CLOCK":
    case "NEXT_DAY":
      return null
    case "AFTER_RECORD":
      return {
        key: SLOT_REASON_COPY.AFTER_RECORD,
        mealSlot: decision.clockSlot,
      }
    case "AFTER_SKIP":
      return { key: SLOT_REASON_COPY.AFTER_SKIP, mealSlot: decision.clockSlot }
  }
}

/**
 * ③층 제목. `section.empty` 문구가 "아래 전체 레시피에서 찾아보세요" 로 끝나므로
 * **이 제목이 섹션들 아래에 실제로 있어야** 그 문장이 참이 된다.
 */
export const RECIPE_HOME_LIST_TITLE_KEY = "home.listTitle" as const
