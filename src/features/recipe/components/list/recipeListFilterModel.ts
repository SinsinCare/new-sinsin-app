/**
 * 필터 상태 모델 — **한 곳**.
 *
 * 시안은 같은 필터를 세 군데(상단 칩 · 카테고리 아이콘 캐러셀 · 필터 시트)에서
 * 조작했고, 그래서 무엇이 적용 중인지 화면만 보고 알 수 없었다. v2 는 선택 상태를
 * 이 모델 하나에 두고 (a) 시트는 **고르는 곳**, (b) 상단 칩은 **적용된 것을 보여주고
 * 빼는 곳** 으로 역할을 나눈다. 두 화면 요소가 같은 객체를 읽으므로 어긋날 수 없다.
 *
 * 서버로 보내는 값(`queryValue`)과 화면 라벨(`labelKey`)을 한 표에 묶어 둔 이유:
 * 예전에는 훅 안에 `CATEGORY_MAP` / `TAG_MAP` 이 따로 있어서 칩을 추가할 때 두 곳을
 * 고쳐야 했고, 라벨만 추가하면 서버에 영어 키가 그대로 나갔다.
 *
 * 순수 함수만 둔다(RN 의존 없음) — jest(node)에서 그대로 검증한다.
 */

/**
 * 계약 §1.2: 임상 토큰은 화면 태그에서 지우지만 **필터로는 쓴다**
 * ("사용자가 '저염' 을 골라 거르는 것은 주장이 아니라 질의다").
 *
 * `queryValue` 는 계약 §3.1 의 예시(`categories=한식,밥&tags=저염`) 표기를 따른다.
 * 시안의 "신장질환 병기(CKD 1~5기)" 그룹은 **넣지 않았다** — 이유는 보고에 적었다.
 */
export const RECIPE_FILTER_GROUPS = [
  {
    key: "category",
    titleKey: "filter.food",
    options: [
      { key: "korean", queryValue: "한식", labelKey: "category.food.korean" },
      { key: "chinese", queryValue: "중식", labelKey: "category.food.chinese" },
      {
        key: "japanese",
        queryValue: "일식",
        labelKey: "category.food.japanese",
      },
      { key: "western", queryValue: "양식", labelKey: "category.food.western" },
      { key: "salad", queryValue: "샐러드", labelKey: "category.food.salad" },
      {
        key: "dessert",
        queryValue: "디저트",
        labelKey: "category.food.dessert",
      },
      {
        key: "beverage",
        queryValue: "음료",
        labelKey: "category.food.beverage",
      },
    ],
  },
  {
    key: "nutrition",
    titleKey: "filter.nutrition",
    options: [
      {
        key: "low-salt",
        queryValue: "저염",
        labelKey: "category.nutrition.low-salt",
      },
      {
        key: "low-protein",
        queryValue: "저단백",
        labelKey: "category.nutrition.low-protein",
      },
      {
        key: "low-potassium",
        queryValue: "저칼륨",
        labelKey: "category.nutrition.low-potassium",
      },
      {
        key: "low-phosphorus",
        queryValue: "저인",
        labelKey: "category.nutrition.low-phosphorus",
      },
      {
        key: "high-calorie",
        queryValue: "고열량",
        labelKey: "category.nutrition.high-calorie",
      },
    ],
  },
] as const

type FilterGroups = typeof RECIPE_FILTER_GROUPS

export type RecipeFilterGroupKey = FilterGroups[number]["key"]
export type RecipeFilterLabelKey =
  FilterGroups[number]["options"][number]["labelKey"]

export interface AppliedRecipeFilter {
  group: RecipeFilterGroupKey
  optionKey: string
  labelKey: RecipeFilterLabelKey
  queryValue: string
}

export type RecipeFilterSelection = Readonly<
  Record<RecipeFilterGroupKey, readonly string[]>
>

export const EMPTY_RECIPE_FILTERS: RecipeFilterSelection = {
  category: [],
  nutrition: [],
}

export interface RecipeFilterOption {
  key: string
  queryValue: string
  labelKey: RecipeFilterLabelKey
}

export interface RecipeFilterGroupView {
  key: RecipeFilterGroupKey
  titleKey: FilterGroups[number]["titleKey"]
  options: readonly RecipeFilterOption[]
}

/**
 * 화면이 순회하는 표. `as const` 표는 그룹마다 옵션 배열 타입이 달라서 union 이 되고,
 * union 배열에는 `.map` 을 못 부른다. 여기서 한 번 넓혀 준다.
 */
export const RECIPE_FILTER_GROUP_VIEWS: readonly RecipeFilterGroupView[] =
  RECIPE_FILTER_GROUPS as unknown as readonly RecipeFilterGroupView[]

function optionsOf(group: RecipeFilterGroupKey): readonly RecipeFilterOption[] {
  const found = RECIPE_FILTER_GROUP_VIEWS.find((entry) => entry.key === group)
  return found?.options ?? []
}

/** 선택을 뒤집는다. 새 객체를 돌려준다 — Set 을 돌려 쓰면 리렌더가 안 걸린다. */
export function toggleRecipeFilter(
  selection: RecipeFilterSelection,
  group: RecipeFilterGroupKey,
  optionKey: string,
): RecipeFilterSelection {
  const current = selection[group] ?? []
  const next = current.includes(optionKey)
    ? current.filter((entry) => entry !== optionKey)
    : [...current, optionKey]
  return { ...selection, [group]: next }
}

export function removeRecipeFilter(
  selection: RecipeFilterSelection,
  group: RecipeFilterGroupKey,
  optionKey: string,
): RecipeFilterSelection {
  const current = selection[group] ?? []
  if (!current.includes(optionKey)) return selection
  return {
    ...selection,
    [group]: current.filter((entry) => entry !== optionKey),
  }
}

export function clearRecipeFilters(): RecipeFilterSelection {
  return EMPTY_RECIPE_FILTERS
}

export function countRecipeFilters(selection: RecipeFilterSelection): number {
  return RECIPE_FILTER_GROUPS.reduce(
    (total, group) => total + (selection[group.key]?.length ?? 0),
    0,
  )
}

/**
 * 적용된 필터를 **표 순서대로** 펼친다. 사용자가 고른 순서로 두면 시트를 다시 열 때마다
 * 칩이 자리를 바꿔 어떤 게 적용 중인지 다시 읽어야 한다.
 */
export function listAppliedRecipeFilters(
  selection: RecipeFilterSelection,
): AppliedRecipeFilter[] {
  const applied: AppliedRecipeFilter[] = []
  for (const group of RECIPE_FILTER_GROUP_VIEWS) {
    for (const option of group.options) {
      if (selection[group.key]?.includes(option.key)) {
        applied.push({
          group: group.key,
          optionKey: option.key,
          labelKey: option.labelKey,
          queryValue: option.queryValue,
        })
      }
    }
  }
  return applied
}

/** 계약 §3.1 쿼리 파라미터로 바꾼다. 화면 키가 아니라 저장 표기를 보낸다. */
export function toRecipeListQueryFilters(selection: RecipeFilterSelection): {
  categories: string[]
  tags: string[]
} {
  const mapGroup = (group: RecipeFilterGroupKey) =>
    optionsOf(group)
      .filter((option) => selection[group]?.includes(option.key))
      .map((option) => option.queryValue)
  return {
    categories: mapGroup("category"),
    tags: mapGroup("nutrition"),
  }
}
