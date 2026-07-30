/**
 * 재료 분량 표기 → 그램. 서버 `src/domains/recipe/nutrition.ts::parseAmountToGrams` 의
 * **이식본**이다(계약 §4.3).
 *
 * ## 왜 앱에도 있는가 — 서버가 진실인데
 * 화면에 뜨는 숫자는 서버가 계산한 것만 쓴다. 이 파일은 숫자를 만들지 않고
 * **"이 표기는 무게를 알 수 없다"** 는 한 가지 사실만 즉시 알려준다.
 *
 * 작성자가 `가지 1개` 를 적으면 서버 왕복(디바운스 400ms + 네트워크) 뒤에야
 * "계산에서 빠졌어요" 를 볼 수 있다. 그 사이에 사용자는 자기가 적은 것이 반영됐다고
 * 믿는다. 같은 판정을 입력하는 순간 그 줄 옆에 보여주는 것이 계약 §6.4 의
 * "결과 예측 가능성" 이다.
 *
 * ## 서버와 갈라지면
 * 힌트가 틀리게 뜬다(수치는 안 틀린다 — 수치는 서버 응답만 그린다).
 * 서버 파일을 고치면 이 파일과 `tests/recipeWrite.test.ts` 의 표를 같이 고쳐라.
 *
 * ## 모르면 비운다
 * `1개` 를 "대략 100g" 으로 채우지 않는다. 계란 1개와 수박 1개가 같은 함수를 지나가고
 * 그 결과가 신장 환자의 "오늘 남은 나트륨" 에 들어간다. 범위(`1~2g`)도 null 이다 —
 * 아래를 고르면 나트륨을 낮게 말하고 위를 고르면 단백질을 높게 말한다.
 */

export const GRAMS_PER_TABLESPOON = 15
export const GRAMS_PER_TEASPOON = 5
export const GRAMS_PER_CUP = 200

/**
 * 환산 가능한 단위 **허용목록**. 여기 없는 단위는 전부 null 이다.
 * 금지목록이 아니라 허용목록인 이유: 새 단위(`토막`·`공기`…)가 나올 때 조용히
 * 그램으로 환산되는 쪽이 아니라 null 쪽으로 틀려야 한다.
 *
 * 긴 것이 먼저 와야 한다 — `mg` 가 `g` 보다 먼저 걸려야 `100mg` 이 100g 이 되지 않는다.
 */
const UNIT_TO_GRAMS: readonly (readonly [pattern: string, grams: number])[] = [
  ["큰술", GRAMS_PER_TABLESPOON],
  ["작은술", GRAMS_PER_TEASPOON],
  ["테이블스푼", GRAMS_PER_TABLESPOON],
  ["티스푼", GRAMS_PER_TEASPOON],
  ["컵", GRAMS_PER_CUP],
  ["kg", 1000],
  ["킬로그램", 1000],
  ["mg", 0.001],
  ["밀리그램", 0.001],
  ["ml", 1],
  ["밀리리터", 1],
  ["cc", 1],
  ["씨씨", 1],
  ["g", 1],
  ["그램", 1],
  ["l", 1000],
  ["리터", 1000],
]

/**
 * 유니코드 분수 문자 → `분자/분모` 표기. 값(0.75)이 아니라 표기("3/4")로 적는다 —
 * 값에서 분모를 되계산하면 `¾` 이 조용히 1 이 된다.
 */
const VULGAR_FRACTIONS: Readonly<Record<string, string>> = {
  "¼": "1/4",
  "½": "1/2",
  "¾": "3/4",
  "⅐": "1/7",
  "⅑": "1/9",
  "⅒": "1/10",
  "⅓": "1/3",
  "⅔": "2/3",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
  "⅙": "1/6",
  "⅚": "5/6",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
}

/** 한 재료의 상한(100kg). 넘으면 표기를 잘못 읽은 것으로 보고 null 이다 — 깎지 않는다. */
const MAX_GRAMS = 100_000

/** 범위 표기 판정용 구분자. `1/2` 의 `/` 는 여기 없다(분수는 범위가 아니다). */
const RANGE_SEPARATORS = "~\\-–—〜―"

/**
 * 범위 판정은 **찾아낸 수량의 바로 앞뒤만** 본다. 문자열 전체를 훑으면
 * `150g (30-40분 조림)` 이 범위로 잡혀 멀쩡한 150g 이 null 이 된다.
 */
const RANGE_BEFORE_RE = new RegExp(`\\d\\s*[${RANGE_SEPARATORS}]\\s*$`, "u")
const RANGE_AFTER_RE = new RegExp(`^\\s*[${RANGE_SEPARATORS}]\\s*\\d`, "u")

/**
 * 수량 + 단위. 수량은 `1`, `1.5`, `1/2`, `1 1/2` 를 받고 문자열 **아무 위치**에서 찾는다.
 * `약 50g`·`물 300cc`·`150g (껍질 제거)` 같은 표기가 실제 데이터에 있다.
 * `1공기 (200g)` 은 `1공기` 가 환산 불가라 뒤의 `200g` 이 잡힌다 — 추정이 아니라
 * 작성자가 직접 써 놓은 그램을 읽는 것이다.
 */
const AMOUNT_RE = new RegExp(
  `(?<whole>\\d+(?:\\.\\d+)?)(?:\\s+(?<fracNum>\\d+)\\s*/\\s*(?<fracDen>\\d+))?` +
    `(?:\\s*/\\s*(?<den>\\d+))?` +
    `\\s*(?<unit>${UNIT_TO_GRAMS.map(([pattern]) => pattern).join("|")})` +
    // 단위 뒤에 글자가 이어지면 다른 단어다. `g` 가 `gram` 의 g 로 잡히는 일을 막는다.
    `(?![a-z가-힣])`,
  "iu",
)

/** 유니코드 분수 문자를 `1/2` 꼴로 펼친다. `½장` → `1/2장`, `1½컵` → `1 1/2컵`. */
function expandVulgarFractions(text: string): string {
  let out = ""
  for (const char of text) {
    const fraction = VULGAR_FRACTIONS[char]
    if (fraction === undefined) {
      out += char
      continue
    }
    // 앞이 숫자면 대분수다(`1½` → `1 1/2`). 공백 없이 이으면 `11/2` 가 된다.
    if (/\d$/u.test(out)) out += " "
    out += fraction
  }
  return out
}

/**
 * Hermes 는 `String.prototype.normalize` 를 항상 갖고 있지 않다. 없으면 원문을 쓴다 —
 * 조합형 한글이 들어오면 힌트만 한 번 틀리고, 서버 판정은 그대로다.
 */
function toNfc(text: string): string {
  return typeof text.normalize === "function" ? text.normalize("NFC") : text
}

/**
 * `amountText` → 그램. 환산할 수 없으면 **null**.
 *
 * null 이 되는 경우: 빈 문자열 · 개수 단위(`1개`, `2장`) · 뭉뚱그린 말(`소량`, `약간`) ·
 * 범위(`1~2g`) · 허용목록에 없는 단위 · 0 이하 · 상한 초과.
 */
export function parseAmountToGrams(amountText: string): number | null {
  if (typeof amountText !== "string") return null
  const text = expandVulgarFractions(toNfc(amountText).trim())
  if (text === "") return null

  const match = AMOUNT_RE.exec(text)
  if (!match?.groups) return null

  // 범위는 어느 쪽도 고르지 않는다(파일 머리말 참고).
  if (RANGE_BEFORE_RE.test(text.slice(0, match.index))) return null
  if (RANGE_AFTER_RE.test(text.slice(match.index + match[0].length)))
    return null

  const { whole, fracNum, fracDen, den, unit } = match.groups
  if (whole === undefined || unit === undefined) return null

  let quantity = Number(whole)
  if (den !== undefined) {
    // `1/2` — whole 이 분자다.
    const denominator = Number(den)
    if (denominator === 0) return null
    quantity = quantity / denominator
  } else if (fracNum !== undefined && fracDen !== undefined) {
    // `1 1/2` — 대분수.
    const denominator = Number(fracDen)
    if (denominator === 0) return null
    quantity += Number(fracNum) / denominator
  }

  const factor = UNIT_TO_GRAMS.find(
    ([pattern]) => pattern.toLowerCase() === unit.toLowerCase(),
  )?.[1]
  if (factor === undefined) return null

  const grams = quantity * factor
  if (!Number.isFinite(grams) || grams <= 0 || grams > MAX_GRAMS) return null
  // 소수 셋째 자리까지. `1/3컵` = 66.667g 처럼 나누어지지 않는 값이 있다.
  return Math.round(grams * 1000) / 1000
}

/** 복합 재료 구분자. `다진마늘·파·참깨` — 계약 §4.4-2 대로 나누지 않고 통째로 매칭한다. */
const COMPOSITE_SEPARATORS = /[·・•∙]/u

export function isCompositeIngredient(name: string): boolean {
  return COMPOSITE_SEPARATORS.test(name)
}

/** 그 줄에 무엇을 알려줄지. 화면은 이 값만 보고 문구를 고른다. */
export type AmountHint = "ok" | "missing" | "unmeasurable"

/**
 * 분량 한 칸의 상태. `unmeasurable` 일 때만 "이렇게 적어주세요" 를 띄운다.
 *
 * 재료명이 비어 있으면 힌트를 내지 않는다 — 아직 아무것도 적지 않은 줄에 경고를
 * 붙이면 빈 폼이 오류로 뒤덮인다.
 */
export function amountHintFor(name: string, amountText: string): AmountHint {
  if (name.trim() === "") return "ok"
  if (amountText.trim() === "") return "missing"
  return parseAmountToGrams(amountText) === null ? "unmeasurable" : "ok"
}
