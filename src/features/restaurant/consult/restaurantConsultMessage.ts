import { buildPersonalPortionContext } from "@/src/features/nutrition/utils/personalPortionContext"
import {
  readPortionReference,
  portionLabel,
  type PersonalPortionSelection,
} from "@/src/features/nutrition/utils/portionReference"
/**
 * 식당 `AI 식단 상담` 메시지의 빌더와 파서.
 *
 * `examConsultMessage.ts` / `foodConsultMessage.ts` 와 **같은 계약**이다: 빌더가 만든
 * 텍스트가 곧 LLM 프롬프트이자 서버에 저장되는 원문이고, 화면에는 그 원문을 그대로
 * 보여주지 않는다. 서버에는 텍스트만 남으므로 히스토리를 다시 불러와도 이 파서를 탄다 —
 * **빌더와 파서는 반드시 같은 포맷을 말해야 한다.** 포맷을 바꾸면 두 쪽을 함께 고치고
 * `tests/restaurantConsultMessage.test.ts` 로 확인한다.
 *
 * ## 포맷 — 질문이 맨 앞이고, 이건 취향이 아니다
 *
 * ```
 * 나트륨이 가장 많은 메뉴는 어떤 건가요?
 *
 * [식당] 장호덕손만두
 * [분류] 한식
 * [메뉴]
 * - 순대국밥: 열량 480kcal, 단백질 22g, 나트륨 1720mg, 칼륨 640mg, 인 230mg
 * ```
 *
 * 대화 제목은 **첫 유저 메시지의 앞 50 코드포인트**다(bun 서버 `chat/service.ts`).
 * 컨텍스트 블록을 앞에 두면 상담 기록 목록의 제목이 전부 `[식당] …` 이 되어 무너진다.
 * 질문을 맨 앞에 두면 제목이 곧 질문이고, `PATCH /title` 을 부를 이유도 없다.
 *
 * ## 앞선 두 빌더에서 **가져오지 않은** 것
 *
 * `foodConsultMessage` 의 영양소 정규식(`NUTRIENT_PAIR_KO_RE` 등)과
 * "값에 숫자가 있으면 먹은 양(servings)" 휴리스틱은 **일부러 뺐다.** 식당 컨텍스트에서
 * 바로 오작동한다 — `[분류] 24시 해장국` 같은 값이 먹은 양으로 잡히고, 메뉴 이름
 * (`1인 세트 300g`)이 영양소 쌍으로 파싱된다. 여기서 파서가 되돌려야 하는 것은
 * **질문 한 덩어리뿐**이므로(버블은 카드가 아니라 평문 한 줄이다) 숫자를 다시 읽을
 * 이유가 아예 없다. 구조 판별만 남긴다.
 */

import type { MenuItemDto } from "../types"
import type { ConsultMenuFact, ConsultTranslate } from "./types"

/**
 * 프롬프트 길이 상한. 식사(4800)·검진(4800)과 같은 값이다 — 서버 저장 컬럼과 모델
 * 입력 양쪽을 지킨다.
 */
export const RESTAURANT_CONSULT_MESSAGE_MAX_LENGTH = 4800

/** Bounded context for menu-wide questions; comparison questions retain their selected subset. */
export const RESTAURANT_CONSULT_MENU_LIMIT = 20

/**
 * 실려 나가는 영양소 5종. **정의역이자 i18n 키의 정의역**이다 —
 * `t(`mealReport.nutrients.${key}`)` 로 라벨을 뜨므로, 여기에 값을 더하면
 * `tests/i18nKeyExistence.test.ts` 가 ko·en 양쪽에 그 키가 있는지 바로 확인한다.
 * (없는 키는 예외도 로그도 없이 **화면에 키 문자열이 그대로 찍힌다.**)
 */
export const RESTAURANT_CONSULT_NUTRIENT_KEYS = [
  "calories",
  "protein",
  "sodium",
  "potassium",
  "phosphorus",
] as const

/** 영양소별 단위. `MenuItemDto` 의 단위 주석과 같다(열량 kcal, 단백질 g, 나머지 mg). */
const NUTRIENT_UNITS: Record<
  (typeof RESTAURANT_CONSULT_NUTRIENT_KEYS)[number],
  string
> = {
  calories: "kcal",
  protein: "g",
  sodium: "mg",
  potassium: "mg",
  phosphorus: "mg",
}

/**
 * 숫자 표기.
 *
 * **`toLocaleString` 을 쓰지 않는다.** 이 빌더는 `language` 를 받지 않고 `t` 만 받는데,
 * 인자 없는 `toLocaleString()` 은 실행 환경의 로케일을 따라가 테스트가 기계마다
 * 달라진다. 천 단위 구분자가 모델의 이해를 돕지도 않는다. 소수는 있는 만큼만 한 자리.
 */
function formatAmount(value: number): string {
  return String(Math.round(value * 10) / 10)
}

function nutrientPairs(fact: ConsultMenuFact, t: ConsultTranslate): string[] {
  return RESTAURANT_CONSULT_NUTRIENT_KEYS.map((key) => {
    const value = fact[key]
    if (typeof value !== "number" || !Number.isFinite(value)) return null
    const label = t(`mealReport.nutrients.${key}`)
    return `${label} ${formatAmount(value)}${NUTRIENT_UNITS[key]}`
  }).filter((pair): pair is string => pair !== null)
}

/**
 * `MenuItemDto` 에서 **이름과 숫자만** 떠낸다.
 *
 * 소비처가 손으로 객체를 만들면 `safetyLevel` 이나 `legacyRiskNutrients` 를 얹기가
 * 너무 쉽다. 통로를 하나로 좁혀 그 사고를 구조적으로 막는다.
 * 이름으로 고르고, `names` 가 준 순서를 지키며, 상한(2)에서 자른다.
 *
 * ## 대조는 **양쪽 다 trim 한 값**으로 한다
 *
 * 부르는 쪽(`suggestedQuestions` 의 `compare`)이 넘기는 것은 이미 `name.trim()` 이다 —
 * 문장에 들어가는 이름과 같아야 하기 때문이다. 그런데 DTO 원본과 `===` 로 맞추면 서버가
 * 준 이름에 공백이 한 칸이라도 붙어 있을 때 **아무것도 못 찾는다.** 그러면 비교 질문이
 * 메뉴 숫자를 하나도 못 싣고 나가고(컨텍스트 블록에 `[메뉴]` 가 통째로 빠진다) 모델은
 * 두 메뉴를 이름만 보고 비교한다 — 경고도 오류도 없다.
 */
export function pickConsultMenuFacts(
  menus: MenuItemDto[],
  names: string[],
): ConsultMenuFact[] {
  const facts: ConsultMenuFact[] = []
  const requestedNames =
    names.length > 0 ? names : menus.map((menu) => menu.name)
  for (const name of requestedNames) {
    if (facts.length >= RESTAURANT_CONSULT_MENU_LIMIT) break
    const wanted = name.trim()
    if (!wanted || facts.some((fact) => fact.name === wanted)) continue
    const menu = menus.find((item) => item.name.trim() === wanted)
    if (!menu) continue
    const portionReference = readPortionReference(menu.portionReference)
    facts.push({
      ...(portionReference ? { portionReference } : {}),
      name: menu.name.trim(),
      calories: menu.calories,
      protein: menu.protein,
      sodium: menu.sodium,
      potassium: menu.potassium,
      phosphorus: menu.phosphorus,
    })
  }
  return facts
}

export function buildRestaurantConsultMessage(input: {
  question: string
  restaurantName: string
  cuisineLabel: string
  /** 비교 질문은 지정 메뉴, 일반 질문은 제공 가능한 메뉴 목록. */
  menus: ConsultMenuFact[]
  personalSelection?: PersonalPortionSelection
  t: ConsultTranslate
}): string {
  const { question, restaurantName, cuisineLabel, menus, t } = input

  const restaurant = restaurantName.trim()
  const cuisine = cuisineLabel.trim()

  const menuLines = menus
    .slice(0, RESTAURANT_CONSULT_MENU_LIMIT)
    .map((fact) => {
      const name = fact.name.trim()
      if (!name) return null
      const pairs = nutrientPairs(fact, t)
      const portion = readPortionReference(fact.portionReference)
      if (portion) {
        pairs.push(
          t(
            portion.fraction === null
              ? "restaurant.consult.context.portionBelowQuarter"
              : "restaurant.consult.context.portion",
            {
              amount:
                portion.fraction === null ? "" : portionLabel(portion.fraction),
              nutrient: t(`mealReport.nutrients.${portion.driver}`),
              percent: Math.round(portion.mealFraction * 100),
            },
          ),
        )
      }
      // 숫자가 하나도 없으면 이름만 남긴다 — 콜론 뒤가 빈 줄을 만들지 않는다.
      return pairs.length > 0 ? `- ${name}: ${pairs.join(", ")}` : `- ${name}`
    })
    .filter((line): line is string => line !== null)

  const personalContext = buildPersonalPortionContext(
    input.personalSelection,
    t,
  )
  const context = [
    personalContext ? `[${personalContext}]` : null,
    restaurant
      ? `[${t("restaurant.consult.context.restaurant")}] ${restaurant}`
      : null,
    cuisine ? `[${t("restaurant.consult.context.cuisine")}] ${cuisine}` : null,
    menuLines.length > 0 ? `[${t("restaurant.consult.context.basis")}]` : null,
    menus.some((fact) => readPortionReference(fact.portionReference))
      ? `[${t("restaurant.consult.context.portionBasis")}]`
      : null,
  ].filter((line): line is string => line !== null)

  const prompt = question.trim().slice(0, RESTAURANT_CONSULT_MESSAGE_MAX_LENGTH)
  let body = context.length > 0 ? `${prompt}\n\n${context.join("\n")}` : prompt
  // Never cut a portion fraction, nutrient value, or its qualification in half.
  if (body.length > RESTAURANT_CONSULT_MESSAGE_MAX_LENGTH) return prompt
  let hasMenu = false
  for (const line of menuLines) {
    const addition = hasMenu
      ? `\n${line}`
      : `\n[${t("restaurant.consult.context.menus")}]\n${line}`
    if (body.length + addition.length > RESTAURANT_CONSULT_MESSAGE_MAX_LENGTH)
      break
    body += addition
    hasMenu = true
  }
  return body
}

/** 컨텍스트 머리줄. **1열에서 시작하고 같은 줄에 `]` 가 닫힌다** — 빌더가 늘 그렇게 쓴다. */
const SECTION_HEAD_RE = /^\[[^\]]+\]/
/**
 * 컨텍스트 블록 안에 올 수 있는 줄. 머리줄이거나 메뉴 항목(`- `)이다.
 *
 * `]` 를 요구하지 않는 것은 **절단** 때문이다. 4800 에서 자르면 마지막 줄이 `[메` 처럼
 * 반토막 날 수 있고, 그 한 줄 때문에 블록 전체를 못 읽으면 오히려 라벨이 버블에 샌다.
 */
const SECTION_BODY_RE = /^(\[|- )/

/**
 * 빌더가 만든 원문이면 `{ question }` 을, 아니면 `null` 을 준다.
 *
 * 판별은 **구조**로 한다. 라벨 문자열(`식당`/`분류`)에 기대지 않는 이유는
 * `foodConsultMessage` 파서 머리말과 같다: 로케일이 바뀌거나 카피가 바뀌면 과거에
 * 저장된 메시지가 통째로 안 읽힌다.
 *
 * ## "`[` 로 시작하는 줄이 하나라도 있으면" 은 너무 헐거웠다
 *
 * 사용자가 손으로 친 여러 줄 문장에 그런 줄이 섞이면(`[참고] 어제 검사 결과가…`)
 * 파서가 자기 원문이라고 착각하고 **그 줄부터 아래를 통째로 버블에서 지웠다.**
 * 사용자가 쓴 문장이 화면에서 사라지는데 경고도 오류도 없다.
 *
 * 그래서 빌더의 모양을 그대로 요구한다 — 질문 다음에 **빈 줄 하나**, 그 다음부터
 * 끝까지가 머리줄(`[…]`)과 메뉴 항목(`- `)**뿐**이고 그 안에 빈 줄이 없다.
 * (`context.join("\n")` 이라 블록 안에는 빈 줄이 생길 수 없다.)
 * 하나라도 어긋나면 `null` 이고, 그때 버블은 원문을 그대로 그린다 — **아무것도 잃지 않는
 * 실패**다. 남는 애매함은 정직하게 적어 둔다: 사용자가 `질문 / 빈 줄 / [참고] 한 줄` 만
 * 쓰면 이 모양과 구별할 방법이 없다(그때는 마지막 줄이 접힌다).
 */
export function parseRestaurantConsultMessage(
  content: string,
): { question: string } | null {
  if (!content) return null

  const lines = content.split("\n")
  // 빈 줄 **바로 뒤**의 머리줄. 그 빈 줄이 질문과 컨텍스트의 경계다.
  const start = lines.findIndex(
    (line, index) =>
      index > 0 && lines[index - 1].trim() === "" && SECTION_HEAD_RE.test(line),
  )
  if (start < 0) return null

  // 끝의 빈 줄은 센 적이 없다 — 저장·재조회를 거치며 개행 하나가 붙어 오는 경우가 있다.
  const block = lines.slice(start)
  while (block.length > 0 && block[block.length - 1].trim() === "") block.pop()
  if (!block.every((line) => SECTION_BODY_RE.test(line))) return null

  const head: string[] = []
  for (const line of lines.slice(0, start - 1)) {
    // 질문 안에 머리줄이 또 있으면 거기서 끊는다 — 손으로 고친 원문에서 컨텍스트
    // 라벨이 버블에 새는 것을 막는 두 번째 빗장이다.
    if (SECTION_HEAD_RE.test(line)) break
    head.push(line)
  }

  const question = head.join("\n").trim()
  if (!question) return null
  return { question }
}

/** Restaurant options are not a consumed meal. Keep this entry on restaurant context. */
export function buildRestaurantAssessmentParams(input: {
  restaurantId: number
  restaurantName: string
  cuisineLabel: string
  menus: MenuItemDto[]
  requestId: string
  t: ConsultTranslate
}) {
  const context = buildRestaurantConsultMessage({
    question: "",
    restaurantName: input.restaurantName,
    cuisineLabel: input.cuisineLabel,
    menus: pickConsultMenuFacts(input.menus, []),
    t: input.t,
  }).trim()
  return {
    consultRequestId: input.requestId,
    consultCategory: "FOOD_DIET",
    consultRestaurantId: String(input.restaurantId),
    consultContext: context,
    consultContextLabel: input.restaurantName,
    consultPrompt: `${input.t("restaurant.consult.q.assess")}\n\n${context}`,
  }
}
