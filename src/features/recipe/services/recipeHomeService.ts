/**
 * 레시피 홈 서비스 계층 — 계약 §2 `GET /api/v1/recipes/home`.
 *
 * `recipeListV2Service` 의 관용구를 그대로 따른다:
 *  1. **방어적 정규화.** 카드 하나가 망가지면 그 카드만 떨어져 나가고 화면은 산다.
 *     `provenance` 관문(`normalizeNutrition`)도 목록과 같은 함수를 지나므로 계약 §1
 *     ("provenance 없이 수치를 그리지 않는다")이 홈에서 따로 새지 않는다.
 *  2. **모의 경로 플래그는 새로 만들지 않는다.** 목록과 같은 `RECIPE_LIST_V2_MOCK`
 *     (`EXPO_PUBLIC_RECIPE_V2_MOCK`)을 쓴다. 홈만 따로 켜는 플래그를 두면 목록은
 *     모의, 홈은 실서버인 상태가 만들어져 두 화면의 카드가 서로 다른 세계를 그린다.
 *
 * 정규화가 계약보다 **한 겹 더 방어하는 곳** — `sections` 를 언제나 3개로 맞춘다.
 * 계약은 "항상 3개" 를 서버 몫으로 못 박았지만, 빠진 섹션을 그대로 흘리면 화면이
 * "지금은 추천할 게 없어요" 를 그릴 자리조차 잃는다(계약 §2 가 빈 섹션을 보내는 이유와
 * 같은 이유다). 그래서 빠진 슬롯은 **빈 섹션으로 채워** 넣는다 — 없애지 않는다.
 */
import { api } from "@/src/services/core/apiClient"

import type {
  MealSlot,
  MealSlotState,
  RecipeHomeResponse,
  RecipeHomeSection,
  SlotDecision,
} from "../types/recipeHome"
import {
  MEAL_SLOTS,
  RECIPE_HOME_SECTION_LIMIT,
  isMealSlot,
  isMealSlotState,
  isSlotReason,
  orderFromCurrentSlot,
} from "../types/recipeHome"
import type { RecipeCard } from "../types/recipeListV2"
import { queryMockRecipeList } from "./recipeListV2MockCatalog"
import {
  RECIPE_LIST_V2_MOCK,
  normalizeBudget,
  normalizeRecipeCard,
} from "./recipeListV2Service"

type Json = Record<string, unknown>

function asRecord(value: unknown): Json | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Json)
    : null
}

/**
 * 슬롯을 못 읽었을 때의 기본값. 낮(점심)으로 둔다 — 아침·저녁 중 하나를 고르면 그 시간대가
 * 하루의 대부분에서 틀리지만, 점심은 앞뒤 어느 쪽으로도 한 칸 차이다. 애초에 이 값이
 * 쓰이는 것은 서버 결함일 때뿐이고, 그때도 세 섹션은 전부 보인다(순서만 영향을 받는다).
 */
const FALLBACK_SLOT: MealSlot = "LUNCH"

/**
 * 못 읽은 상태의 기본값. **`OPEN` 이다** — 모르는 것을 "이미 먹었다" 로 두면 화면이
 * 사용자가 하지 않은 일을 했다고 말한다. 반대 방향의 오류(먹었는데 안 먹은 것으로 보임)는
 * 섹션이 앞에 남는 것뿐이라 되돌릴 수 있다.
 */
const FALLBACK_STATE: MealSlotState = "OPEN"

function normalizeSection(raw: unknown): RecipeHomeSection | null {
  const record = asRecord(raw)
  if (!record) return null
  const slot = record.slot
  // 모르는 슬롯은 버린다 — 제목을 못 그리는 섹션은 사용자가 뭘 보는지 알 수 없다.
  if (!isMealSlot(slot)) return null
  const itemsRaw = Array.isArray(record.items) ? record.items : []
  const items = itemsRaw
    .map((entry) => normalizeRecipeCard(entry))
    .filter((entry): entry is RecipeCard => entry !== null)
    .slice(0, RECIPE_HOME_SECTION_LIMIT)
  return {
    slot,
    state: isMealSlotState(record.state) ? record.state : FALLBACK_STATE,
    items,
  }
}

/**
 * `slotDecision` 정규화. 서버가 안 보내거나 망가진 값을 보내면 **시계 그대로**로 읽는다
 * (`CLOCK` · 내일 아님 · 기본 경계) — 그러면 화면은 종전과 같은 문장을 그린다. 여기서
 * 지어낸 이유를 넣으면 앱이 서버가 하지 않은 판단을 사용자에게 사실로 말하게 된다.
 */
function normalizeSlotDecision(
  raw: unknown,
  currentSlot: MealSlot,
): SlotDecision {
  const record = asRecord(raw)
  const clockSlot = isMealSlot(record?.clockSlot)
    ? record.clockSlot
    : currentSlot
  return {
    slot: isMealSlot(record?.slot) ? record.slot : currentSlot,
    reason: isSlotReason(record?.reason) ? record.reason : "CLOCK",
    clockSlot,
    isNextDay: record?.isNextDay === true,
    clockSource: record?.clockSource === "PERSONAL" ? "PERSONAL" : "DEFAULT",
  }
}

export function normalizeRecipeHomeResponse(raw: unknown): RecipeHomeResponse {
  const record = asRecord(raw)
  const sectionsRaw = Array.isArray(record?.sections) ? record.sections : []

  const bySlot = new Map<MealSlot, RecipeHomeSection>()
  const serverOrder: MealSlot[] = []
  for (const entry of sectionsRaw) {
    const section = normalizeSection(entry)
    if (!section) continue
    // 같은 슬롯이 두 번 오면 첫 번째만 쓴다. 두 개를 다 그리면 같은 제목이 두 번 나온다.
    if (bySlot.has(section.slot)) continue
    bySlot.set(section.slot, section)
    serverOrder.push(section.slot)
  }

  const currentSlot = isMealSlot(record?.currentSlot)
    ? record.currentSlot
    : (serverOrder[0] ?? FALLBACK_SLOT)

  /**
   * 순서는 **서버가 준 순서 그대로**. 빠진 슬롯만 `currentSlot` 회전 순서의 제자리
   * 뒤에 붙여 3개를 채운다(정상 응답에서는 이 루프가 아무것도 하지 않는다).
   */
  const order = [...serverOrder]
  for (const slot of orderFromCurrentSlot(currentSlot)) {
    if (!order.includes(slot)) order.push(slot)
  }

  return {
    budget: normalizeBudget(record?.budget),
    currentSlot,
    slotDecision: normalizeSlotDecision(record?.slotDecision, currentSlot),
    sections: order.map(
      (slot) =>
        bySlot.get(slot) ?? {
          slot,
          state: FALLBACK_STATE,
          items: [] as RecipeCard[],
        },
    ),
  }
}

// ---------------------------------------------------------------------------
// 모의 서버
// ---------------------------------------------------------------------------

/**
 * 모의 카탈로그 12건의 슬롯. **손으로 적은 표다** — 규칙을 TS 로 옮기지 않았다.
 *
 * 분류 규칙(MORNING/ONE_BOWL/SOUPY/SIDEY 정규식 4벌)의 정본은 서버 마이그레이션 071 이고,
 * 서버 보고 §"아직 닫히지 않은 구멍" 이 이미 **그 규칙을 두 언어에 두면 조용히 갈라진다**
 * 고 적었다. 모의 12건을 위해 앱에 다섯 번째 사본을 만들 이유가 없다. 아래 값은 071
 * docstring 의 규칙을 12건에 손으로 적용한 결과다:
 *
 *   101 곤드레밥        ONE_BOWL(밥$)            → LUNCH
 *   102 닭안심 무조림    SIDEY(조림)               → DINNER
 *   103 달래콩나물비빔밥  ONE_BOWL(비빔밥)          → LUNCH
 *   104 잡채덮밥        ONE_BOWL(덮밥)            → LUNCH
 *   105 두부 채소 볶음   SIDEY(볶음)               → DINNER
 *   106 가지 덮밥       ONE_BOWL(덮밥)            → LUNCH
 *   107 닭가슴살 샐러드  category=샐러드, 10분     → BREAKFAST + LUNCH
 *   108 애호박 새우 볶음밥 ONE_BOWL(볶음밥)+SIDEY   → LUNCH + DINNER
 *   109 단호박 스프     SOUPY(스프)               → DINNER
 *   110 사과 조림       category=디저트           → 없음(간식은 한 끼가 아니다)
 *   111 보리차          규칙 없음, 12분 ≤ 25      → LUNCH (골격 규칙)
 *   112 김치볶음밥      ONE_BOWL(볶음밥)+SIDEY(볶음) → LUNCH + DINNER
 *
 * 두 섹션에 걸치는 건(107·108·112)을 일부러 남겼다 — "겹치는 레시피가 두 섹션에 같은
 * 카드로 나오는가" 를 모의 모드에서 실제로 밟아 볼 수 있어야 한다. 디저트(110)가 어느
 * 섹션에도 없는 것도 규칙 그대로다.
 */
const MOCK_SLOTS_BY_ID: Readonly<Record<number, readonly MealSlot[]>> = {
  101: ["LUNCH"],
  102: ["DINNER"],
  103: ["LUNCH"],
  104: ["LUNCH"],
  105: ["DINNER"],
  106: ["LUNCH"],
  107: ["BREAKFAST", "LUNCH"],
  108: ["LUNCH", "DINNER"],
  109: ["DINNER"],
  110: [],
  111: ["LUNCH"],
  112: ["LUNCH", "DINNER"],
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
/** KST 는 UTC+9 고정이다(서머타임 없음). Intl 의 timeZone 지원에 기대지 않는다. */
const KST_OFFSET_MS = 9 * HOUR_MS

/**
 * 계약 §2 의 경계: 11시 이전 BREAKFAST / 16시 이전 LUNCH / 그 뒤 DINNER.
 *
 * **화면은 이 함수를 부르지 않는다.** 서버가 `currentSlot` 을 주기 때문이다(기기 시계가
 * 틀리면 섹션 순서가 사람마다 달라진다). 모의 모드에는 서버가 없으니 **모의 서버가**
 * 서버 몫으로 계산한다 — 경계값을 서버와 같은 수로 둬야 붙일 때 화면이 안 바뀐다.
 */
export function mockCurrentMealSlot(now: Date): MealSlot {
  const shifted = now.getTime() + KST_OFFSET_MS
  // 음수 시각(1970 이전)에서도 0~23 이 되도록 나머지를 두 번 접는다.
  const kstHour = Math.floor((((shifted % DAY_MS) + DAY_MS) % DAY_MS) / HOUR_MS)
  if (kstHour < 11) return "BREAKFAST"
  if (kstHour < 16) return "LUNCH"
  return "DINNER"
}

/**
 * 모의 정렬 — "남은 참고량 적합도 순"(계약 §2)의 근사.
 *
 * 서버는 네 영양소의 남은 양 대비 점수식(`mealrec/repository.ts`)을 쓴다. 앱이 그 식을
 * 재현하면 두 곳이 갈라지므로, 카드가 **이미 들고 있는** `headline.percentOfRemaining`
 * (그 레시피에서 가장 빡빡한 영양소의 비율) 오름차순으로 둔다. 계산할 수 없는 카드는
 * 뒤로 보낸다 — 서버의 `nulls last` 와 같은 판단이다(모르는 것을 가장 적합한 것으로
 * 앞세우지 않는다).
 */
function compareByFitness(a: RecipeCard, b: RecipeCard): number {
  const pa = a.headline?.percentOfRemaining
  const pb = b.headline?.percentOfRemaining
  if (pa == null && pb == null) return a.id - b.id
  if (pa == null) return 1
  if (pb == null) return -1
  return pa - pb || a.id - b.id
}

/**
 * 모의 모드에서 오늘의 끼니 상태를 손으로 심는 자리.
 *
 * `EXPO_PUBLIC_RECIPE_HOME_MOCK_STATE="BREAKFAST:RECORDED,LUNCH:SKIPPED"`.
 *
 * 왜 필요한가: 모의 모드에는 `food_diary` 가 없다. 그러면 **이 기능의 화면을 미리보기에서
 * 한 번도 볼 수 없다** — 기록이 있는 사용자만 겪는 문장(“아침을 기록해서 …”)과 뒤로 밀린
 * 섹션이 그렇다. 실기기에 붙이기 전에 밟아 볼 수 있어야 한다.
 *
 * 값이 이상하면 **조용히 무시한다**. 미리보기용 스위치가 화면을 죽이면 안 된다.
 */
function mockDayState(): Record<MealSlot, MealSlotState> {
  const state: Record<MealSlot, MealSlotState> = {
    BREAKFAST: "OPEN",
    LUNCH: "OPEN",
    DINNER: "OPEN",
  }
  const raw = process.env.EXPO_PUBLIC_RECIPE_HOME_MOCK_STATE
  if (typeof raw !== "string" || raw.length === 0) return state
  for (const entry of raw.split(",")) {
    const [slot, value] = entry.split(":").map((part) => part.trim())
    if (isMealSlot(slot) && isMealSlotState(value)) state[slot] = value
  }
  return state
}

/**
 * 모의 `GET /recipes/home`. 계약 §2 응답 모양 그대로(섹션 3개·빈 섹션 허용).
 *
 * **결정 규칙의 정본은 서버다**(`sinsin-be-bun/src/domains/recipe/slotDecision.ts`).
 * 여기 있는 것은 그 규칙 중 모의 모드가 재현할 수 있는 부분 — 시계 슬롯에서 **앞으로만**
 * 전진하고 끝난 끼니를 뒤로 미는 것 — 뿐이고, 개인 식사시각 학습은 재현하지 않는다
 * (모의에는 과거 기록이 없다). 그래서 `clockSource` 는 언제나 `DEFAULT` 다.
 */
export function buildMockRecipeHome(now: Date): RecipeHomeResponse {
  // 모의 카탈로그의 카드 조립·budget·headline 을 그대로 쓴다(카드를 따로 만들지 않는다).
  const page = queryMockRecipeList({ limit: 50, sort: "recommended" })
  const clockSlot = mockCurrentMealSlot(now)
  const dayState = mockDayState()

  // 전진은 하루의 순서로 **앞으로만**. 지나간 끼니로 돌아가지 않는다(서버와 같은 규칙).
  const forward = MEAL_SLOTS.slice(MEAL_SLOTS.indexOf(clockSlot))
  const open = forward.find((slot) => dayState[slot] === "OPEN")
  const decision: SlotDecision = {
    slot: open ?? "BREAKFAST",
    reason:
      open === undefined
        ? "NEXT_DAY"
        : open === clockSlot
          ? "CLOCK"
          : dayState[clockSlot] === "SKIPPED"
            ? "AFTER_SKIP"
            : "AFTER_RECORD",
    clockSlot,
    isNextDay: open === undefined,
    clockSource: "DEFAULT",
  }

  const bySlot = new Map<MealSlot, RecipeCard[]>(
    MEAL_SLOTS.map((slot) => [slot, [] as RecipeCard[]]),
  )
  for (const card of page.items) {
    for (const slot of MOCK_SLOTS_BY_ID[card.id] ?? []) {
      bySlot.get(slot)?.push(card)
    }
  }

  const rotated = orderFromCurrentSlot(decision.slot)
  const order = [
    ...rotated.filter((slot) => dayState[slot] === "OPEN"),
    ...rotated.filter((slot) => dayState[slot] !== "OPEN"),
  ]

  return {
    budget: page.budget,
    currentSlot: decision.slot,
    slotDecision: decision,
    sections: order.map((slot) => ({
      slot,
      state: dayState[slot],
      items: (bySlot.get(slot) ?? [])
        .sort(compareByFitness)
        .slice(0, RECIPE_HOME_SECTION_LIMIT),
    })),
  }
}

export const recipeHomeService = {
  /**
   * 계약 §2 `GET /recipes/home`. 쿼리는 `locale` 하나다 — 서버 라우트가 그것만 받는다
   * (`sinsin-be-bun/src/domains/recipe/homeRoutes.ts` 실측: `limit`·`sort`·`cursor`·
   * **`categories` 없음**). 카테고리로 섹션을 좁힐 수 없다는 사실이 화면 결정의 근거다.
   */
  async getRecipeHome(locale: string): Promise<RecipeHomeResponse> {
    if (RECIPE_LIST_V2_MOCK) {
      return buildMockRecipeHome(new Date())
    }
    const { data } = await api.get("/recipes/home", { params: { locale } })
    return normalizeRecipeHomeResponse(asRecord(data)?.result)
  },
}
