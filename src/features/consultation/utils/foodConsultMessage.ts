/**
 * 식이리포트 "물어보기" 메시지의 빌더와 파서.
 *
 * 빌더가 만든 텍스트는 LLM 프롬프트이자 서버에 저장되는 원문이다.
 * 화면에는 이 원문을 그대로 보여주지 않고, 파서가 복원한 구조를
 * FoodConsultCard 로 렌더한다. 히스토리 재로드 시에도 서버에는 텍스트만
 * 남아 있으므로, 빌더와 파서는 반드시 같은 포맷을 말해야 한다 —
 * 포맷을 바꾸면 두 쪽을 함께 고치고 tests/foodConsultMessage.test.ts 로 확인한다.
 */

export type FoodConsultTranslate = (
  key: string,
  options?: Record<string, unknown>,
) => string

export interface FoodConsultContext {
  foodAnalysisResultId?: number
  mealType?: string
  mealLabel?: string
  title?: string
  servings?: number
  total?: {
    calories?: number
    carbohydrates?: number
    protein?: number
    fat?: number
    sodium?: number | null
    potassium?: number | null
    phosphorus?: number | null
    water?: number | null
  }
  foods?: {
    name?: string
    servingSizeValue?: number | null
    servingSizeUnit?: string
    nutritionStatus?: string
    calories?: number
    carbohydrates?: number
    protein?: number
    fat?: number
    sodium?: number | null
    potassium?: number | null
    phosphorus?: number | null
    water?: number | null
  }[]
}

export const FOOD_CONSULT_MESSAGE_MAX_LENGTH = 4800

export function parseFoodConsultContext(
  raw: string,
): FoodConsultContext | null {
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    return parsed as FoodConsultContext
  } catch {
    return null
  }
}

function formatNutrient(
  value: unknown,
  label: string,
  unit: string,
  language: "ko" | "en",
): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  const amount = Math.round(value).toLocaleString(
    language === "en" ? "en-US" : "ko-KR",
  )
  return language === "en"
    ? `${label}: ${amount} ${unit}`
    : `${label} ${amount}${unit}`
}

const EN_SERVING_UNITS: Record<string, [string, string]> = {
  인분: ["serving", "servings"],
  그릇: ["bowl", "bowls"],
  접시: ["plate", "plates"],
  컵: ["cup", "cups"],
  개: ["piece", "pieces"],
  조각: ["piece", "pieces"],
}

function formatServingSize(
  value: number,
  unit: string,
  language: "ko" | "en",
): string {
  const amount = value.toLocaleString(language === "en" ? "en-US" : "ko-KR")
  if (language === "ko") return `${amount}${unit}`

  const normalizedUnit = unit.toLowerCase() === "ml" ? "mL" : unit
  if (/^(?:g|mg|kg|mL|oz)$/i.test(normalizedUnit)) {
    return `${amount} ${normalizedUnit}`
  }
  const translated = EN_SERVING_UNITS[unit]
  if (translated) {
    return `${amount} ${value === 1 ? translated[0] : translated[1]}`
  }
  if (/[가-힣]/.test(unit)) {
    return `${amount} ${value === 1 ? "portion" : "portions"}`
  }
  return `${amount} ${unit}`
}

export function buildFoodConsultMessage(
  context: FoodConsultContext,
  language: "ko" | "en",
  translate: FoodConsultTranslate,
): string {
  const isEnglish = language === "en"
  const title = context.title?.trim() || translate("consult.recordedMeal")
  const mealLabel =
    context.mealType &&
    ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"].includes(context.mealType)
      ? translate(`meal.${context.mealType}`)
      : isEnglish && /[가-힣]/.test(context.mealLabel ?? "")
        ? context.mealType
        : (context.mealLabel ?? context.mealType)
  const total = context.total ?? {}
  const totalLine = [
    formatNutrient(
      total.calories,
      translate("mealReport.nutrients.calories"),
      "kcal",
      language,
    ),
    formatNutrient(
      total.carbohydrates,
      translate("mealReport.nutrients.carbohydrates"),
      "g",
      language,
    ),
    formatNutrient(
      total.protein,
      translate("mealReport.nutrients.protein"),
      "g",
      language,
    ),
    formatNutrient(
      total.fat,
      translate("mealReport.nutrients.fat"),
      "g",
      language,
    ),
    formatNutrient(
      total.sodium,
      translate("mealReport.nutrients.sodium"),
      "mg",
      language,
    ),
    formatNutrient(
      total.potassium,
      translate("mealReport.nutrients.potassium"),
      "mg",
      language,
    ),
    formatNutrient(
      total.phosphorus,
      translate("mealReport.nutrients.phosphorus"),
      "mg",
      language,
    ),
    formatNutrient(
      total.water,
      translate("mealReport.nutrients.water"),
      "mL",
      language,
    ),
  ]
    .filter(Boolean)
    .join(", ")

  const foodsLine =
    context.foods
      ?.slice(0, 8)
      .map((food) => {
        const serving =
          food.servingSizeValue != null && food.servingSizeUnit
            ? ` ${formatServingSize(
                food.servingSizeValue,
                food.servingSizeUnit,
                language,
              )}`
            : ""
        const nutrition = [
          formatNutrient(
            food.calories,
            translate("mealReport.nutrients.calories"),
            "kcal",
            language,
          ),
          formatNutrient(
            food.sodium,
            translate("mealReport.nutrients.sodium"),
            "mg",
            language,
          ),
          formatNutrient(
            food.potassium,
            translate("mealReport.nutrients.potassium"),
            "mg",
            language,
          ),
          formatNutrient(
            food.phosphorus,
            translate("mealReport.nutrients.phosphorus"),
            "mg",
            language,
          ),
        ]
          .filter(Boolean)
          .join(", ")
        return `- ${food.name ?? translate("consult.food")}${serving}: ${nutrition}`
      })
      .join("\n") ?? ""

  return [
    translate("consult.mealPrompt"),
    "",
    `[${translate("consult.mealSection")}] ${title}`,
    mealLabel ? `[${translate("consult.meal")}] ${mealLabel}` : null,
    context.servings
      ? `[${translate("consult.servings")}] ${translate("foodResult.servings", {
          count: context.servings,
        })}`
      : null,
    totalLine ? `[${translate("consult.nutrients")}] ${totalLine}` : null,
    foodsLine ? `[${translate("consult.foodNutrients")}]\n${foodsLine}` : null,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, FOOD_CONSULT_MESSAGE_MAX_LENGTH)
}

// === 파서 — 위 빌더가 만든 텍스트를 카드용 구조로 되돌린다 ===

export interface ParsedNutrient {
  label: string
  /** 원문에 찍힌 표기 그대로 (예: "1,800") — 다시 포맷하지 않는다. */
  amount: string
  unit: string
}

export interface ParsedConsultFood {
  /** 음식명 + 먹은 양 원문 (예: "비빔밥 500g") */
  name: string
  nutrients: ParsedNutrient[]
}

export interface FoodConsultCardData {
  /** 섹션 앞의 질문 문장 */
  prompt: string
  title: string
  mealLabel: string | null
  servingsLabel: string | null
  totals: ParsedNutrient[]
  foods: ParsedConsultFood[]
}

const SECTION_LINE_RE = /^\[([^\]]+)\]\s*(.*)$/
const FOOD_LINE_RE = /^-\s*(.+?):\s*(.+)$/
// en: "Calories: 600 kcal" — 콜론이 라벨과 수치를 가른다.
const NUTRIENT_PAIR_EN_RE = /^(.+?):\s*(\d[\d.,]*)\s*(kcal|mg|mL|g)$/i
// ko: "열량 600kcal" — 마지막 공백 뒤 수치+단위.
const NUTRIENT_PAIR_KO_RE = /^(.+?)\s+(\d[\d.,]*)\s*(kcal|mg|mL|g)$/i

function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase()
  return lower === "ml" ? "mL" : lower
}

function parseNutrientPair(part: string): ParsedNutrient | null {
  const trimmed = part.trim()
  const en = NUTRIENT_PAIR_EN_RE.exec(trimmed)
  if (en) {
    return {
      label: en[1].trim(),
      amount: en[2],
      unit: normalizeUnit(en[3]),
    }
  }
  const ko = NUTRIENT_PAIR_KO_RE.exec(trimmed)
  if (ko) {
    return {
      label: ko[1].trim(),
      amount: ko[2],
      unit: normalizeUnit(ko[3]),
    }
  }
  return null
}

function parseNutrientList(value: string): ParsedNutrient[] {
  // 수치는 "1,800"처럼 콤마 뒤 공백이 없어 ", " 구분자와 충돌하지 않는다.
  return value
    .split(", ")
    .map(parseNutrientPair)
    .filter((pair): pair is ParsedNutrient => pair !== null)
}

/**
 * 상담 메시지가 식이리포트 "물어보기" 포맷이면 카드 데이터로, 아니면 null.
 *
 * 섹션 라벨 문자열에 기대지 않는다(언어·카피 변경에 흔들리지 않게).
 * 대신 빌더의 구조를 읽는다: 첫 `[…]` 줄이 식사 제목, 값이 영양소 나열로
 * 파싱되는 섹션이 총 영양소, 값 없는 섹션 아래 `- ` 줄들이 음식별 상세.
 * 과거에 저장된 깨진 라벨(foodReport.nutrients.*)도 그대로 파싱된 뒤
 * resolveNutrientLabel 이 표시 시점에 복원한다.
 */
export function parseFoodConsultMessage(
  content: string,
): FoodConsultCardData | null {
  if (!content || !content.includes("[")) return null

  const promptLines: string[] = []
  let title: string | null = null
  let mealLabel: string | null = null
  let servingsLabel: string | null = null
  let totals: ParsedNutrient[] = []
  const foods: ParsedConsultFood[] = []
  let inFoods = false

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim()
    if (!line) continue

    const section = SECTION_LINE_RE.exec(line)
    if (section) {
      inFoods = false
      const value = section[2].trim()
      if (title === null) {
        // 빌더는 식사 제목 섹션을 항상 첫 번째로 내보낸다.
        title = value
        continue
      }
      if (!value) {
        inFoods = true
        continue
      }
      const nutrients = parseNutrientList(value)
      if (nutrients.length > 0) {
        if (totals.length === 0) totals = nutrients
        continue
      }
      // 남은 짧은 값 섹션은 끼니 또는 먹은 양 — 먹은 양에는 항상 숫자가 있다.
      if (/\d/.test(value)) servingsLabel = value
      else mealLabel = value
      continue
    }

    if (inFoods) {
      const food = FOOD_LINE_RE.exec(line)
      if (food) {
        foods.push({
          name: food[1].trim(),
          nutrients: parseNutrientList(food[2]),
        })
      }
      // 매치 실패 줄은 최대 길이 절단의 꼬리 — 조용히 버린다.
      continue
    }

    if (title === null) promptLines.push(line)
  }

  if (!title) return null
  if (totals.length === 0 && foods.length === 0) return null

  return {
    prompt: promptLines.join(" "),
    title,
    mealLabel,
    servingsLabel,
    totals,
    foods,
  }
}

const RAW_NUTRIENT_KEY_RE =
  /^(?:foodReport|mealReport)\.nutrients\.([A-Za-z]+)$/

/**
 * 번역이 누락된 채 저장된 과거 메시지의 라벨
 * ("foodReport.nutrients.calories")을 표시 시점에 사람 말로 되돌린다.
 */
export function resolveNutrientLabel(
  label: string,
  translate: FoodConsultTranslate,
): string {
  const raw = RAW_NUTRIENT_KEY_RE.exec(label)
  if (!raw) return label
  return translate(`mealReport.nutrients.${raw[1]}`)
}
