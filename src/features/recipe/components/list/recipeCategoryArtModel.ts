/**
 * 카테고리 ↔ 일러스트 **매핑의 정본**, 그리고 캐러셀이 그릴 항목의 계산.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 왜 `.tsx` 에서 빼냈나
 *
 * 이 표와 판정 함수들은 원래 `RecipeCategoryArt.tsx` / `RecipeCategoryCarousel.tsx`
 * 안에 있었다. 두 파일은 `react-native`·`tamagui`·`*.svg` 를 들여오므로 jest(node)에서
 * 통째로 파싱되지 않고, 검증하려면 테스트마다 렌더 의존을 목으로 세워야 했다. 목을
 * 세운 테스트는 컴포넌트가 import 를 하나 바꾸는 순간 같이 죽는다 — 그래서 이
 * 저장소의 관용구대로(`recipeCardFormat.ts`·`recipeListFilterModel.ts`·
 * `recipeDetailModel.ts`) **판정만 렌더 의존 없는 모듈로 내렸다.**
 *
 * 남은 것은 `RecipeCategoryArt.tsx` 의 `key → SVG 컴포넌트` 한 줄짜리 표뿐이고, 그
 * 표는 `Record<RecipeCategoryArtKey, …>` 로 **완전성을 타입이 강제한다**(키를 하나
 * 더하면 아이콘을 안 붙인 채로는 컴파일되지 않는다).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 표가 여기 한 곳인 이유
 *
 * 카드(`RecipePhotoCard`)와 캐러셀(`RecipeCategoryCarousel`)이 같은 표를 본다. 두 곳에
 * 적으면 아이콘을 하나 바꿀 때 카드의 그림과 캐러셀의 그림이 조용히 달라진다.
 * `한식 → korean` 같은 매핑을 호출부가 다시 적는 것도 같은 사고다(아카이브 훅 주석에
 * 이미 기록됐다) — 그래서 되돌리는 길(`recipeCategoryOptionKeyForQueryValue`)까지
 * 여기서 내보낸다.
 */
import {
  RECIPE_FILTER_GROUP_VIEWS,
  type RecipeFilterLabelKey,
  type RecipeFilterOption,
} from "./recipeListFilterModel"

/**
 * 일러스트가 있는 카테고리 키. `recipeListFilterModel` 의 카테고리 옵션 `key` 와 **같은
 * 값**이다(캐러셀이 이 키로 필터 모델과 조인한다) — 여기서 새 키를 지어내면 안 된다.
 */
export const RECIPE_CATEGORY_ART_KEYS = [
  "korean",
  "chinese",
  "japanese",
  "western",
  "salad",
  "dessert",
  "beverage",
] as const

export type RecipeCategoryArtKey = (typeof RECIPE_CATEGORY_ART_KEYS)[number]

export interface RecipeCategoryMatchEntry {
  key: RecipeCategoryArtKey
  /**
   * 이 카테고리로 도착할 수 있는 **모든 표기**(소문자로 비교한다).
   *
   * 서버가 `category` 를 로케일에 맞춰 번역해서 보낸다
   * (`sinsin-be-bun/src/domains/recipe/locale.ts::categoryForLocale`). 그래서 한
   * 카테고리에 대해 최소 세 가지 문자열이 도착할 수 있고, 셋을 다 적어 둬야 영어 앱에서
   * 그림이 빈칸이 되지 않는다:
   *
   *  - DB 원본(한국어): `한식`
   *  - 서버 영문 표(`locale.generated.ts::CATEGORY_EN`): `Korean`
   *  - 앱 i18n 라벨(`en/recipe.json::category.food`): 샐러드·디저트·음료는 서버가
   *    단수(`Salad`/`Dessert`/`Beverage`), 앱 라벨은 복수(`Salads`/`Desserts`/`Drinks`)로
   *    **서로 다르다.** 둘 다 넣어 둔다.
   *
   * 옵션 키 자체(`korean`)도 넣는다 — 화면 키를 그대로 넘기는 호출부가 생겨도 깨지지 않는다.
   *
   * 값을 늘릴 때는 **서버 표를 먼저 확인하고** 늘린다(추측한 영문 표기를 넣으면
   * 매칭되는 척하면서 아무 일도 하지 않는다).
   */
  match: readonly string[]
}

export const RECIPE_CATEGORY_MATCH: readonly RecipeCategoryMatchEntry[] = [
  { key: "korean", match: ["한식", "korean"] },
  { key: "chinese", match: ["중식", "chinese"] },
  { key: "japanese", match: ["일식", "japanese"] },
  // `american.svg` 가 양식 아이콘이다(파일명은 자산 쪽 이름, 필터 모델의 키는 `western`).
  // 두 표기가 다 도착할 수 있어 둘 다 받는다.
  { key: "western", match: ["양식", "western", "american"] },
  { key: "salad", match: ["샐러드", "salad", "salads"] },
  { key: "dessert", match: ["디저트", "dessert", "desserts"] },
  { key: "beverage", match: ["음료", "beverage", "drink", "drinks"] },
]

/**
 * 카테고리 문자열 → 일러스트 키. **못 찾으면 `null`** 이고, 그때 화면은 중립 도형을 그린다.
 *
 * 못 찾는 경우가 실제로 있다: `CATEGORY_EN` 에는 `밥`·`면`·`반찬`·`국`·`간식`·`기타`·
 * `직접 작성` 같은 값도 있고, 서버는 번역이 없는 한글 카테고리를 `Other` 로 바꿔 보낸다.
 * 이 값들에 억지로 그림을 붙이지 않는다 — `밥` 에 한식 그림을 붙이는 순간 "한식으로
 * 분류됐다" 는, 데이터에 없는 주장이 된다.
 */
export function resolveRecipeCategoryArtKey(
  category: string | null | undefined,
): RecipeCategoryArtKey | null {
  const needle = String(category ?? "")
    .trim()
    .toLowerCase()
  if (needle === "") return null
  return (
    RECIPE_CATEGORY_MATCH.find((entry) => entry.match.includes(needle))?.key ??
    null
  )
}

/**
 * 카탈로그에 **실제로 행이 있는** 카테고리의 옵션 키 — 캐러셀이 그리는 항목.
 *
 * 실측(2026-07, 개발 DB `select category, count(*) from recipe group by 1`):
 * 한식 67 · 양식 36 · 일식 23 · 중식 23 · 디저트 14 · 샐러드 12 = **175**(카탈로그 전체).
 * `음료`·`기타` 는 **0건**이라 뺀다 — 그리면 눌러도 0건인 죽은 버튼이 되고 사용자는
 * "내 조건에 맞는 게 없구나" 로 잘못 읽는다. 시안의 일곱 번째 `기타` 가 그것이었다.
 *
 * 값이 아니라 **키**를 적는다: 서버 표기(`한식`)의 정본은 필터 모델이라 두 번 적지 않는다.
 * 카탈로그에 음료·기타 행이 생기면 이 배열에 키만 더하면 된다(고칠 곳은 여기 한 곳).
 */
export const RECIPE_CATEGORY_KEYS_WITH_ROWS: readonly RecipeCategoryArtKey[] = [
  "korean", // 한식 67
  "chinese", // 중식 23
  "japanese", // 일식 23
  "western", // 양식 36
  "salad", // 샐러드 12
  "dessert", // 디저트 14
]

export interface RecipeCategoryCarouselItemModel {
  /** 필터 모델의 옵션 키. 화면 안에서만 쓴다. */
  key: RecipeCategoryArtKey
  /** 서버로 나가는 카테고리 표기(`한식`). `onToggle` 이 넘기는 값이다. */
  queryValue: string
  /**
   * 필터 모델의 라벨 키 그대로. `string` 으로 넓히지 않는 이유: i18n 타입이 키를
   * 유니온으로 검사하므로 넓히면 `t()` 가 컴파일되지 않고, 넓힌 채 통과시키려면
   * 캐스트를 넣어야 하는데 그러면 존재하지 않는 키를 넣어도 조용히 통과한다.
   */
  labelKey: RecipeFilterLabelKey
}

/** 필터 모델의 카테고리 옵션(선언 순서 그대로). */
function categoryOptions(): readonly RecipeFilterOption[] {
  return (
    RECIPE_FILTER_GROUP_VIEWS.find((group) => group.key === "category")
      ?.options ?? []
  )
}

/**
 * 캐러셀이 그리는 항목 — 필터 모델(순서·`queryValue`·라벨) ⨯ 일러스트 표(키)의 조인.
 *
 * ■ 순서를 이 파일이 정하지 않는다
 *
 * 건수 순(한식 67 → 양식 36 → 중식 23 → …)도 후보였다. 가로 스크롤이라 뒤쪽은 화면
 * 밖이니 큰 카탈로그를 앞에 두자는 논리였다. **버렸다** — 같은 여섯 칩이 같은 화면에
 * 두 번 나오기 때문이다(캐러셀 + 필터 버튼에서 열리는 `RecipeFilterSheet`). 두 곳의
 * 순서가 다르면 사용자는 같은 목록을 두 번 읽어야 하고, 기록된 원칙이 "결과를 예측할
 * 수 있게" 인데 그 반대가 된다. 그래서 `RECIPE_FILTER_GROUPS` 의 선언 순서를 필터해
 * 파생시킨다 — 표가 하나라 어긋날 수가 없다(시안 순서·`FoodCategoryBar` 순서도 같다).
 *
 * 일러스트 표에 없는 옵션은 **빠진다.** 아이콘 자리에 빈칸을 그리는 것보다 항목을 안
 * 그리는 편이 낫고, 실제로는 여섯 키 모두 표에 있어 아무것도 빠지지 않는다(빠지기
 * 시작하면 두 표가 어긋났다는 신호다).
 */
export function buildRecipeCategoryCarouselItems(): readonly RecipeCategoryCarouselItemModel[] {
  const items: RecipeCategoryCarouselItemModel[] = []
  for (const option of categoryOptions()) {
    const key = RECIPE_CATEGORY_KEYS_WITH_ROWS.find(
      (candidate) => candidate === option.key,
    )
    if (key === undefined) continue
    if (!RECIPE_CATEGORY_MATCH.some((entry) => entry.key === key)) continue
    items.push({
      key,
      queryValue: option.queryValue,
      labelKey: option.labelKey,
    })
  }
  return items
}

/**
 * `onToggle` 이 넘긴 서버 표기를 필터 모델의 옵션 키로 되돌린다.
 *
 * 호출부는 보통 `toggleRecipeFilter(selection, "category", optionKey)` 로 상태를
 * 바꾸는데 그 함수는 **키**를 받는다. 이 함수가 없으면 호출부가 `한식 → korean` 표를
 * 직접 적게 되고, 그게 바로 머리말이 막으려는 두 번째 진실이다.
 *
 * 모르는 값이면 `null` — 조용히 다른 카테고리로 떨어뜨리지 않는다.
 */
export function recipeCategoryOptionKeyForQueryValue(
  queryValue: string,
): string | null {
  const needle = queryValue.trim()
  return (
    categoryOptions().find((option) => option.queryValue === needle)?.key ??
    null
  )
}
