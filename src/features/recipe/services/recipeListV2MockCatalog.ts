/**
 * 레시피 v2 목록·검색의 **모의 서버**. 서버 담당이 붙기 전에 화면을 진짜처럼 돌린다.
 *
 * 왜 "데이터"가 아니라 "쿼리 엔진"인가: 시안의 가장 큰 결함이 **검색이 아무것도
 * 하지 않는다**는 것이었다(`Typing.png` 와 `Typed.png` 가 완전히 동일하다). 모의
 * payload 를 고정 배열로 돌려주면 그 결함이 모의 모드에 그대로 남아, 서버가 붙기
 * 전까지 아무도 검색이 도는지 확인할 수 없다. 그래서 q·categories·tags·sort·cursor
 * 를 실제로 적용한다. 이 파일은 순수 함수만 두어 jest(node)에서 그대로 검증한다.
 *
 * 계약 대응:
 *   §3.1 정렬 5종 · 키셋 커서 · budget 동봉
 *   §1.2 화면 태그(`tags`)에는 임상 토큰이 없다. 임상 토큰은 **필터 질의**로만 쓰이므로
 *        모의 레코드는 화면 태그와 필터 태그를 따로 갖는다(서버의 저장 태그 ↔ displayTags).
 *   §3.1 headline = "이 레시피에서 가장 빡빡한 영양소 하나" → budget 대비 비율 최대값.
 */
import type {
  NutrientBudget,
  NutrientHeadline,
  NutrientKey,
  RecipeCard,
  RecipeListQuery,
  RecipeListResponse,
  RecipeNutrition,
  RecipeSuggestion,
  RecipeSortKey,
} from "../types/recipeListV2"

/**
 * 내 남은 참고량. 계약 §6.2/§6.3 예시("나트륨 376mg = 24%")와 산술이 맞는 값으로 뒀다.
 * `proteinG` 는 **일부러 null** 이다 — 체중 기록이 없는 사용자를 화면에서 실제로
 * 밟아 봐야 "비율 없이 절대값만" 경로가 죽지 않는다(계약 §3.2).
 */
const MOCK_BUDGET: NutrientBudget = {
  sodiumMg: 1567,
  potassiumMg: 3867,
  phosphorusMg: 1038,
  proteinG: null,
}

interface MockRecipe {
  id: number
  name: string
  summary: string | null
  category: string
  difficulty: string | null
  timeMin: number | null
  servings: number | null
  /** 화면 태그(§1.2 로 이미 걸러진 것). */
  tags: string[]
  /** 서버에 저장된 태그. `tags=저염` 같은 필터 질의가 이걸 본다. */
  filterTags: string[]
  nutrition: RecipeNutrition
  ratingAverage: number | null
  ratingCount: number
  saveCount: number
  saved: boolean
  authored: boolean
  /** 최신순 정렬용. 클 수록 최신. */
  recency: number
  /** 추천 정렬용 고정 점수 — 추천은 서버 사정이라 앱이 재현하지 않는다. */
  recommendScore: number
}

function nutrition(
  kcal: number,
  proteinG: number,
  sodiumMg: number,
  potassiumMg: number,
  phosphorusMg: number,
  unmatched: string[] = [],
): RecipeNutrition {
  return {
    kcal,
    proteinG,
    sodiumMg,
    potassiumMg,
    phosphorusMg,
    // 큐레이션 카탈로그 175건 전부 이 값이다(계약 §3.2).
    provenance: "reference_estimate",
    unmatchedIngredients: unmatched,
  }
}

const MOCK_RECIPES: readonly MockRecipe[] = [
  {
    id: 101,
    name: "곤드레밥",
    summary: "곤드레를 넣고 지은 담백한 한 그릇",
    category: "한식",
    difficulty: "쉬움",
    timeMin: 35,
    servings: 1,
    tags: ["한그릇", "채식"],
    filterTags: ["저염", "한그릇", "채식"],
    nutrition: nutrition(650, 7, 376, 580, 218),
    ratingAverage: 4.7,
    ratingCount: 1227,
    saveCount: 1228,
    saved: false,
    authored: false,
    recency: 20,
    recommendScore: 98,
  },
  {
    id: 102,
    name: "닭안심 무조림",
    summary: "무에 국물이 배도록 약불에서 조린 반찬",
    category: "한식",
    difficulty: "보통",
    timeMin: 40,
    servings: 2,
    tags: ["반찬", "국물"],
    filterTags: ["저인", "반찬", "국물"],
    nutrition: nutrition(420, 24, 512, 640, 261),
    ratingAverage: 4.5,
    ratingCount: 217,
    saveCount: 640,
    saved: true,
    authored: false,
    recency: 19,
    recommendScore: 91,
  },
  {
    id: 103,
    name: "달래콩나물비빔밥",
    summary: "달래 향으로 간을 대신한 비빔밥",
    category: "한식",
    difficulty: "쉬움",
    timeMin: 20,
    servings: 1,
    tags: ["한그릇", "채식"],
    filterTags: ["저염", "저단백", "한그릇", "채식"],
    nutrition: nutrition(540, 11, 288, 720, 196),
    ratingAverage: 4.4,
    ratingCount: 27,
    saveCount: 311,
    saved: false,
    authored: false,
    recency: 18,
    recommendScore: 88,
  },
  {
    id: 104,
    name: "잡채덮밥",
    summary: null,
    category: "한식",
    difficulty: "보통",
    timeMin: 45,
    servings: 2,
    tags: ["한그릇"],
    filterTags: ["고열량", "한그릇"],
    nutrition: nutrition(720, 14, 604, 470, 240, ["당면(건조)"]),
    ratingAverage: 3.9,
    ratingCount: 27,
    saveCount: 158,
    saved: false,
    authored: false,
    recency: 17,
    recommendScore: 74,
  },
  {
    id: 105,
    name: "두부 채소 볶음",
    summary: "기름을 적게 쓰고 센 불에서 짧게 볶는다",
    category: "한식",
    difficulty: "쉬움",
    timeMin: 15,
    servings: 2,
    tags: ["반찬", "채식", "간단", "도시락"],
    filterTags: ["저염", "반찬", "채식", "간단", "도시락"],
    nutrition: nutrition(310, 18, 214, 430, 302),
    ratingAverage: null,
    ratingCount: 0,
    saveCount: 96,
    saved: false,
    authored: false,
    recency: 16,
    recommendScore: 70,
  },
  {
    id: 106,
    name: "가지 덮밥",
    summary: "가지를 먼저 구워 물기를 빼면 간이 덜 든다",
    category: "일식",
    difficulty: "쉬움",
    timeMin: 25,
    servings: 1,
    tags: ["한그릇", "채식"],
    filterTags: ["저단백", "한그릇", "채식"],
    nutrition: nutrition(480, 9, 342, 510, 168),
    ratingAverage: 4.1,
    ratingCount: 8,
    saveCount: 74,
    saved: false,
    authored: false,
    recency: 15,
    recommendScore: 66,
  },
  {
    id: 107,
    name: "닭가슴살 샐러드",
    summary: "드레싱을 뿌리지 않고 곁들여 낸다",
    category: "샐러드",
    difficulty: "쉬움",
    timeMin: 10,
    servings: 1,
    tags: ["간단", "도시락"],
    filterTags: ["고열량", "간단", "도시락"],
    nutrition: nutrition(280, 32, 196, 380, 288),
    ratingAverage: 4.2,
    ratingCount: 41,
    saveCount: 402,
    saved: true,
    authored: false,
    recency: 14,
    recommendScore: 64,
  },
  {
    id: 108,
    name: "애호박 새우 볶음밥",
    summary: "새우는 마지막에 넣어 물이 안 나오게 한다",
    category: "중식",
    difficulty: "보통",
    timeMin: 30,
    servings: 2,
    tags: ["한그릇"],
    filterTags: ["저인", "한그릇"],
    nutrition: nutrition(610, 21, 688, 560, 254, ["애호박"]),
    ratingAverage: 3.6,
    ratingCount: 5,
    saveCount: 63,
    saved: false,
    authored: false,
    recency: 13,
    recommendScore: 58,
  },
  {
    id: 109,
    name: "단호박 스프",
    summary: "우유 대신 물로 끓여 인을 줄였다",
    category: "양식",
    difficulty: "쉬움",
    timeMin: 25,
    servings: 2,
    tags: ["국물", "채식"],
    filterTags: ["저단백", "저인", "국물", "채식"],
    nutrition: nutrition(220, 5, 176, 810, 96),
    ratingAverage: 4.8,
    ratingCount: 62,
    saveCount: 288,
    saved: false,
    authored: false,
    recency: 12,
    recommendScore: 55,
  },
  {
    id: 110,
    name: "사과 조림",
    summary: "설탕을 반으로 줄이고 계피로 향을 낸다",
    category: "디저트",
    difficulty: "쉬움",
    timeMin: 20,
    servings: 4,
    tags: ["간식", "채식"],
    filterTags: ["저단백", "간식", "채식"],
    nutrition: nutrition(180, 1, 12, 240, 22),
    ratingAverage: 4.0,
    ratingCount: 12,
    saveCount: 51,
    saved: false,
    authored: false,
    recency: 11,
    recommendScore: 44,
  },
  {
    id: 111,
    name: "보리차",
    summary: null,
    category: "음료",
    difficulty: "쉬움",
    timeMin: 12,
    servings: 4,
    tags: ["간단"],
    filterTags: ["저염", "간단"],
    nutrition: nutrition(8, 0, 4, 26, 6),
    ratingAverage: null,
    ratingCount: 0,
    saveCount: 19,
    saved: false,
    authored: false,
    recency: 10,
    recommendScore: 30,
  },
  {
    id: 112,
    name: "내가 만든 저염 김치볶음밥",
    summary: "김치를 물에 한 번 헹궈 쓰면 간이 확 준다",
    category: "한식",
    difficulty: "쉬움",
    timeMin: 18,
    servings: 1,
    tags: ["한그릇", "간단"],
    filterTags: ["저염", "한그릇", "간단"],
    nutrition: nutrition(560, 13, 742, 520, 210, ["김치"]),
    ratingAverage: 3.5,
    ratingCount: 2,
    saveCount: 4,
    saved: false,
    // "내가 쓴" 배지 경로를 화면에서 실제로 밟아 본다(계약 §3.1).
    authored: true,
    recency: 21,
    recommendScore: 40,
  },
]

/**
 * 질의가 실제로 읽는 행 목록. **일부러 id 순이 아니다.**
 *
 * 실측으로 알게 된 것: 위 `MOCK_RECIPES` 가 id 오름차순으로 적혀 있으면
 * `Array.prototype.sort` 가 stable 이라 tiebreak(`|| a.id - b.id`)을 **지워도**
 * 결과가 그대로 id 순으로 나온다 — `compareBySort` 의 tiebreak 을 삭제한 뮤테이션이
 * 테스트 59건을 전부 통과했다. 그건 테스트가 tiebreak 을 지키지 못한다는 뜻이다.
 * 실제 DB 는 행 순서를 보장하지 않으므로, 모의도 소스 순서에 기대지 않게 뒤집어 둔다.
 * 이제 정렬 키가 같은 구간에서 tiebreak 이 없으면 id 가 내림차순으로 나와 테스트가 깨진다.
 */
const MOCK_ROWS: readonly MockRecipe[] = [...MOCK_RECIPES].reverse()

/** 검색어 정규화 — 대소문자·공백만 없앤다. 형태소 분석은 서버 사정이다. */
export function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, "")
}

function matchesQuery(recipe: MockRecipe, q: string): boolean {
  const needle = normalizeSearchText(q)
  if (!needle) return true
  const haystack = [
    recipe.name,
    recipe.summary ?? "",
    recipe.category,
    ...recipe.tags,
  ]
    .map(normalizeSearchText)
    .join("|")
  return haystack.includes(needle)
}

function percentOfRemaining(
  amount: number,
  remaining: number | null,
): number | null {
  if (remaining == null || remaining <= 0) return null
  // 계약 §3.2: 0~999 로 자른다.
  return Math.min(999, Math.round((amount / remaining) * 100))
}

const HEADLINE_SOURCES: readonly {
  key: NutrientKey
  unit: "mg" | "g"
  amountOf: (n: RecipeNutrition) => number
  budgetOf: (b: NutrientBudget) => number | null
}[] = [
  {
    key: "sodium",
    unit: "mg",
    amountOf: (n) => n.sodiumMg,
    budgetOf: (b) => b.sodiumMg,
  },
  {
    key: "potassium",
    unit: "mg",
    amountOf: (n) => n.potassiumMg,
    budgetOf: (b) => b.potassiumMg,
  },
  {
    key: "phosphorus",
    unit: "mg",
    amountOf: (n) => n.phosphorusMg,
    budgetOf: (b) => b.phosphorusMg,
  },
  {
    key: "protein",
    unit: "g",
    amountOf: (n) => n.proteinG,
    budgetOf: (b) => b.proteinG,
  },
]

/**
 * 계약 §3.1 "이 레시피에서 가장 빡빡한 영양소 하나".
 * 비율을 계산할 수 있는 것 중 최대값. 하나도 계산할 수 없으면 나트륨의 절대값만
 * (percentOfRemaining=null) 준다 — 수치를 통째로 감추면 이 앱의 존재 이유가 사라진다.
 */
export function pickHeadline(
  recipeNutrition: RecipeNutrition,
  budget: NutrientBudget,
): NutrientHeadline {
  let best: NutrientHeadline | null = null
  for (const source of HEADLINE_SOURCES) {
    const percent = percentOfRemaining(
      source.amountOf(recipeNutrition),
      source.budgetOf(budget),
    )
    if (percent == null) continue
    if (
      best?.percentOfRemaining != null &&
      best.percentOfRemaining >= percent
    ) {
      continue
    }
    best = {
      key: source.key,
      amount: source.amountOf(recipeNutrition),
      unit: source.unit,
      percentOfRemaining: percent,
    }
  }
  return (
    best ?? {
      key: "sodium",
      amount: recipeNutrition.sodiumMg,
      unit: "mg",
      percentOfRemaining: null,
    }
  )
}

function toCard(recipe: MockRecipe, budget: NutrientBudget): RecipeCard {
  return {
    id: recipe.id,
    name: recipe.name,
    summary: recipe.summary,
    category: recipe.category,
    difficulty: recipe.difficulty,
    timeMin: recipe.timeMin,
    servings: recipe.servings,
    thumbnailUrl: null,
    tags: recipe.tags,
    nutrition: recipe.nutrition,
    headline: pickHeadline(recipe.nutrition, budget),
    rating: {
      average: recipe.ratingAverage,
      count: recipe.ratingCount,
      distribution: [0, 0, 0, 0, 0],
    },
    saveCount: recipe.saveCount,
    saved: recipe.saved,
    authored: recipe.authored,
  }
}

/** 정렬. 어느 정렬이든 마지막 tiebreak 은 id — 같은 요청이 다른 순서를 주면 안 된다. */
function compareBySort(
  sort: RecipeSortKey,
): (a: MockRecipe, b: MockRecipe) => number {
  return (a, b) => {
    let primary = 0
    switch (sort) {
      case "recent":
        primary = b.recency - a.recency
        break
      case "rating":
        // 계약 §5 인덱스가 개수 우선이다. 개수 → 평균 → id.
        primary =
          b.ratingCount - a.ratingCount ||
          (b.ratingAverage ?? 0) - (a.ratingAverage ?? 0)
        break
      case "saves":
        primary = b.saveCount - a.saveCount
        break
      case "quick":
        primary =
          (a.timeMin ?? Number.MAX_SAFE_INTEGER) -
          (b.timeMin ?? Number.MAX_SAFE_INTEGER)
        break
      case "recommended":
      default:
        primary = b.recommendScore - a.recommendScore
        break
    }
    return primary || a.id - b.id
  }
}

const CURSOR_PREFIX = "mock-offset:"

function parseCursor(cursor: string | undefined): number {
  if (!cursor?.startsWith(CURSOR_PREFIX)) return 0
  const raw = cursor.slice(CURSOR_PREFIX.length)
  // 십진수만 받는다. Number("0x10") === 16 이라 정규식으로 먼저 거른다.
  if (!/^\d{1,6}$/u.test(raw)) return 0
  return Number(raw)
}

export const MOCK_LIST_MAX_LIMIT = 50

/** 모의 `GET /recipes`. 계약 §3.1 응답 모양 그대로. */
export function queryMockRecipeList(
  query: RecipeListQuery = {},
): RecipeListResponse {
  const limit = Math.min(
    MOCK_LIST_MAX_LIMIT,
    Math.max(1, Math.trunc(query.limit ?? 20)),
  )
  const offset = parseCursor(query.cursor)
  const categories = query.categories ?? []
  const tags = query.tags ?? []

  const filtered = MOCK_ROWS.filter((recipe) => {
    if (!matchesQuery(recipe, query.q ?? "")) return false
    if (categories.length > 0 && !categories.includes(recipe.category)) {
      return false
    }
    // 태그는 AND — 사용자가 두 개를 고르면 둘 다 만족하는 것만 남는다.
    if (tags.some((tag) => !recipe.filterTags.includes(tag))) return false
    return true
  }).sort(compareBySort(query.sort ?? "recommended"))

  const page = filtered.slice(offset, offset + limit)
  const nextOffset = offset + page.length
  const hasMore = nextOffset < filtered.length

  return {
    items: page.map((recipe) => toCard(recipe, MOCK_BUDGET)),
    nextCursor: hasMore ? `${CURSOR_PREFIX}${nextOffset}` : null,
    hasMore,
    budget: MOCK_BUDGET,
    totalCount: filtered.length,
  }
}

export const MOCK_SUGGEST_LIMIT = 8

/**
 * 모의 `GET /recipes/search/suggest`. 이름이 맞는 레시피를 앞에 두고, 그 뒤에
 * 카테고리·태그 같은 검색어 제안을 붙인다. 빈 입력은 빈 목록 — 입력 없이 제안을
 * 만들면 사용자가 뭘 눌렀는지 예측할 수 없다.
 */
export function queryMockSuggestions(
  rawQuery: string,
  limit = MOCK_SUGGEST_LIMIT,
): RecipeSuggestion[] {
  const needle = normalizeSearchText(rawQuery)
  if (!needle) return []

  const suggestions: RecipeSuggestion[] = []
  for (const recipe of MOCK_RECIPES) {
    if (normalizeSearchText(recipe.name).includes(needle)) {
      suggestions.push({
        text: recipe.name,
        recipeId: recipe.id,
        kind: "recipe",
      })
    }
  }

  const keywords = new Set<string>()
  for (const recipe of MOCK_RECIPES) {
    for (const token of [recipe.category, ...recipe.tags]) {
      if (normalizeSearchText(token).includes(needle)) keywords.add(token)
    }
  }
  for (const keyword of [...keywords].sort()) {
    suggestions.push({ text: keyword, recipeId: null, kind: "keyword" })
  }

  return suggestions.slice(0, limit)
}
