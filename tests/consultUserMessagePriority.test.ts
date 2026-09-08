/**
 * `/consult` 사용자 말풍선의 **교차 파서 우선순위**.
 *
 * 상담 기록에는 세 표면이 만든 유저 메시지가 섞여 남는다(식당 시트·식이리포트·건강검진).
 * 서버에는 텍스트만 저장되므로 대화를 다시 열면 셋이 전부 같은 버블로 되돌아오고,
 * 그때 **어느 파서가 먼저 물어가느냐**가 화면을 결정한다.
 *
 * ## 이 파일이 막는 실제 결함
 *
 * 식당 시트가 보낸 메시지가 `FoodConsultCard` 로 그려졌다 — 「식사 기록 · 한식」 눈썹을 달고
 * 메뉴 영양소가 표로 떴다. **앱이 사용자가 그 식당에서 그 메뉴들을 먹었다고 주장한 것이다.**
 * 없는 사실을 그리는 종류라 예외도 로그도 없다. 여기서 못 박지 않으면 조용히 되돌아온다.
 *
 * 번역기는 스텁이 아니라 **진짜 i18n** 을 쓴다. 세 빌더 모두 라벨을 번역기로 뜨므로,
 * 스텁을 쓰면 실제 원문과 다른 문자열을 검사하게 되어 통과해도 아무것도 보장하지 못한다.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"

import i18n from "../src/i18n"
import { codeOnly } from "./helpers/codeOnly"
import {
  resolveConsultUserCard,
  type ConsultUserCardCandidates,
} from "../src/features/consultation/utils/consultUserMessage"
import {
  buildFoodConsultMessage,
  parseFoodConsultMessage,
  type FoodConsultContext,
} from "../src/features/consultation/utils/foodConsultMessage"
import {
  buildExamConsultMessage,
  parseExamConsultMessage,
} from "../src/features/consultation/utils/examConsultMessage"
import {
  buildRestaurantConsultMessage,
  parseRestaurantConsultMessage,
} from "../src/features/restaurant/consult/restaurantConsultMessage"

const t = (key: string, options?: Record<string, unknown>): string =>
  (i18n.t as unknown as (k: string, o?: Record<string, unknown>) => string)(
    key,
    options,
  )

/** 화면이 하는 것과 **같은 배선**. 순서를 여기서 다시 쓰지 않는 것이 핵심이다. */
function resolve(content: string) {
  const candidates: ConsultUserCardCandidates = {
    restaurant: () => parseRestaurantConsultMessage(content),
    food: () => parseFoodConsultMessage(content),
    exam: () => parseExamConsultMessage(content, t),
  }
  return resolveConsultUserCard(candidates)
}

const RESTAURANT_QUESTION = "나트륨이 가장 많은 메뉴는 어떤 건가요?"

function restaurantMessage(
  menus = [
    {
      name: "순대국밥",
      calories: 480,
      protein: 22,
      sodium: 1720,
      potassium: 640,
      phosphorus: 230,
    },
    {
      name: "한상차림",
      calories: 610,
      protein: 18.5,
      sodium: 890,
      potassium: 410,
      phosphorus: 190,
    },
  ],
): string {
  return buildRestaurantConsultMessage({
    question: RESTAURANT_QUESTION,
    restaurantName: "장호덕손만두",
    cuisineLabel: t("restaurant.cuisine.KOREAN"),
    menus,
    t,
  })
}

/**
 * 출고 경로가 만드는 모양 그대로다. `total` 은 `FoodCameraNutritionTotal` 이고
 * 열량·단백질·탄수화물·지방이 **필수 number** 라, 실제 식사 메시지에는 총 영양소 줄이 늘 있다.
 */
const MEAL_CONTEXT: FoodConsultContext = {
  mealType: "LUNCH",
  title: "비빔밥",
  servings: 1,
  total: {
    calories: 600,
    carbohydrates: 90,
    protein: 20,
    fat: 12,
    sodium: 1200,
    potassium: 700,
    phosphorus: 300,
    water: 200,
  },
  foods: [
    {
      name: "비빔밥",
      servingSizeValue: 500,
      servingSizeUnit: "g",
      calories: 600,
      protein: 20,
      sodium: 1200,
      potassium: 700,
      phosphorus: 300,
    },
  ],
}

const EXAM_MESSAGE = () =>
  buildExamConsultMessage(
    {
      checkupDate: "2026.05.21",
      counts: { warning: 1, caution: 3, normal: 5 },
      metrics: [
        {
          label: "수축기 혈압",
          value: 146,
          unit: "mmHg",
          status: "warning",
          referenceText: "90~120",
        },
      ],
    },
    "ko",
    t,
  )

describe("식당 메시지는 식사 파서에 실제로 걸린다 — 그래서 순서가 필요하다", () => {
  afterEach(async () => {
    await i18n.changeLanguage("ko")
  })

  it("식사 파서가 식당 원문을 통과시킨다(이 사실이 사라지면 아래 검사는 무의미해진다)", () => {
    /*
      걸리게 만드는 것은 **라벨 문자열이 아니라 줄 구조**다.
      값 없는 `[메뉴]` 섹션이 "음식별 상세 시작" 신호가 되고, 그 아래
      `- 순대국밥: 열량 480kcal, …` 이 두 빌더가 공유하는 `t("mealReport.nutrients.*")`
      라벨·단위를 그대로 써서 영양소 쌍까지 파싱된다.
    */
    const parsed = parseFoodConsultMessage(restaurantMessage())
    expect(parsed).not.toBeNull()
    expect(parsed?.title).toBe("장호덕손만두")
    expect(parsed?.foods.map((food) => food.name)).toEqual([
      "순대국밥",
      "한상차림",
    ])
    // 총 영양소는 못 만든다 — 식당 빌더는 영양소를 `- ` 줄에만 싣는다.
    expect(parsed?.totals).toEqual([])
  })

  it("메뉴 줄이 없으면 식사 파서가 안 걸린다 — 범인은 `- ` 줄이다", () => {
    expect(parseFoodConsultMessage(restaurantMessage([]))).toBeNull()
  })

  it("출고 원문끼리는 안 겹친다 — 빈 줄 하나가 식당 원문을 가른다", () => {
    /*
      2026-08-21 에 식당 파서가 좁아졌다. 예전에는 "`[` 로 시작하는 줄이 있는가" 만 봐서
      세 파서 중 가장 넓은 그물이었고 식사·검진 원문도 전부 통과시켰다 — 그대로 1순위로
      올렸으면 `/consult` 의 식사 카드와 검진 카드가 **둘 다 평문으로 무너졌을** 자리다.

      지금은 빌더의 모양을 그대로 요구한다: 질문 · **빈 줄 하나** · 그 아래는 머리줄과
      `- ` 항목뿐. 식사·검진 빌더는 질문 **바로 다음 줄**부터 섹션을 쓴다 — 그 한 줄이
      셋을 가른다. 아래 "겹치는 원문" 검사가 겹침이 돌아왔을 때의 판정을 따로 잠근다.
    */
    const meal = buildFoodConsultMessage(MEAL_CONTEXT, "ko", t)
    expect(meal.split("\n")[1].startsWith("[")).toBe(true)
    expect(EXAM_MESSAGE().split("\n")[1].startsWith("[")).toBe(true)

    expect(parseRestaurantConsultMessage(meal)).toBeNull()
    expect(parseRestaurantConsultMessage(EXAM_MESSAGE())).toBeNull()
  })
})

describe("우선순위 — 세 표면이 각자 제 카드로 간다", () => {
  afterEach(async () => {
    await i18n.changeLanguage("ko")
  })

  it("식당 메시지는 식사 카드가 아니라 **질문 한 줄**이다", () => {
    const card = resolve(restaurantMessage())
    expect(card?.kind).toBe("restaurant")
    expect(card).toEqual({ kind: "restaurant", question: RESTAURANT_QUESTION })
  })

  it("영어 로케일에서도 같다 — 판정은 라벨이 아니라 구조다", async () => {
    await i18n.changeLanguage("en")
    const card = resolve(restaurantMessage())
    expect(card?.kind).toBe("restaurant")
  })

  it("메뉴를 안 실은 식당 메시지도 컨텍스트 블록을 안 흘린다", () => {
    // 예전에는 파서 자체를 안 태워서 `[식당] …` 이 버블에 그대로 찍혔다.
    const card = resolve(restaurantMessage([]))
    expect(card).toEqual({ kind: "restaurant", question: RESTAURANT_QUESTION })
  })

  it("식사 메시지는 그대로 식사 카드다", () => {
    const card = resolve(buildFoodConsultMessage(MEAL_CONTEXT, "ko", t))
    expect(card?.kind).toBe("food")
    if (card?.kind !== "food") throw new Error("unreachable")
    expect(card.data.title).toBe("비빔밥")
    expect(card.data.totals.length).toBeGreaterThan(0)
  })

  it("검진 메시지는 그대로 검진 카드다", () => {
    const card = resolve(EXAM_MESSAGE())
    expect(card?.kind).toBe("exam")
    if (card?.kind !== "exam") throw new Error("unreachable")
    expect(card.data.metrics).toHaveLength(1)
  })

  it("평범한 문장은 카드가 아니다 — 버블이 원문을 그린다", () => {
    expect(resolve("신장에 좋은 음식이 뭔가요?")).toBeNull()
    expect(resolve("")).toBeNull()
  })

  /**
   * 빈 줄 하나가 낀 판본. 저장·재조회·손편집으로 실제로 생길 수 있고, 그때 **식당 파서도
   * 같이 문다** — 즉 아래 두 검사는 순서·증거 규칙이 없으면 그대로 빨개진다.
   */
  const withBlankLine = (message: string) => {
    const [head, ...rest] = message.split("\n")
    return [head, "", ...rest].join("\n")
  }

  it("겹치는 원문 — 총 영양소가 잡히면 식당보다 식사가 먼저다", () => {
    /*
      `totals` 는 *섹션 값*이 영양소 나열일 때만 생기고, 식당 빌더는 그 모양을 못 만든다.
      그래서 이것이 두 포맷을 가르는 **식사 전용 증거**다 — 순서가 아니라 증거가 판정한다.
    */
    const meal = withBlankLine(buildFoodConsultMessage(MEAL_CONTEXT, "ko", t))
    expect(parseRestaurantConsultMessage(meal)).not.toBeNull()
    expect(resolve(meal)?.kind).toBe("food")
  })

  it("겹치는 원문 — 검진은 식당보다 먼저다", () => {
    const exam = withBlankLine(EXAM_MESSAGE())
    expect(parseRestaurantConsultMessage(exam)).not.toBeNull()
    expect(resolve(exam)?.kind).toBe("exam")
  })

  it("질문 머리가 잘려 나간 식사 원문은 카드로 살린다", () => {
    // 식당 파서는 질문 머리를 요구한다 — 없으면 null 이고, 그때 식사 카드가 남는다.
    const meal = buildFoodConsultMessage(MEAL_CONTEXT, "ko", t)
    const headless = meal.split("\n").slice(1).join("\n")
    expect(parseRestaurantConsultMessage(headless)).toBeNull()
    expect(resolve(headless)?.kind).toBe("food")
  })
})

describe("배선 — `/consult` 정본이 이 우선순위를 실제로 탄다", () => {
  const canonical = codeOnly(
    readFileSync(
      join(
        __dirname,
        "..",
        "src",
        "features",
        "consultation",
        "components",
        "ChatMessageBubble.tsx",
      ),
      "utf8",
    ),
  )

  it("`UserBubble` 이 세 후보를 전부 넘긴다", () => {
    /*
      이 결함은 새 표면이 생겼는데 `/consult` 체인에 그 파서를 아무도 안 끼워서 났다.
      순서를 화면에서 다시 쓰면 다음 표면이 같은 함정을 밟는다 — 화면은 후보만 대고,
      판정은 `resolveConsultUserCard` 한 곳에서 한다.
    */
    expect(canonical).toMatch(/resolveConsultUserCard\(\{/)
    expect(canonical).toMatch(
      /restaurant: \(\) => parseRestaurantConsultMessage\(message\.content\)/,
    )
    expect(canonical).toMatch(/food: \(\) => parseFoodConsultMessage\(/)
    expect(canonical).toMatch(/exam: \(\) =>\s*parseExamConsultMessage\(/)
  })

  it("평문 버블은 파서가 되돌린 질문만 그린다", () => {
    // 원문을 그리면 `[식당]`/`[메뉴]` 블록과 영양소 숫자가 버블에 통째로 뜬다.
    expect(canonical).toMatch(
      /consult\?\.kind === "restaurant" \? consult\.question : message\.content/,
    )
    expect(canonical).toMatch(/\{bubbleText\}/)
  })
})

it.each(["ko", "en"])(
  "restaurant portion fractions are not lab metrics in %s",
  async (locale) => {
    await i18n.changeLanguage(locale)
    const content = buildRestaurantConsultMessage({
      question: "Portion question?",
      restaurantName: "Test restaurant",
      cuisineLabel: "Food",
      t,
      menus: [
        {
          name: "Test food",
          calories: 400,
          protein: 20,
          sodium: 900,
          potassium: 300,
          phosphorus: 200,
          portionReference: {
            fraction: 0.75,
            driver: "sodium",
            mealFraction: 0.35,
          },
        },
      ],
    })
    expect(parseExamConsultMessage(content, t)).toBeNull()
    expect(resolve(content)).toEqual({
      kind: "restaurant",
      question: "Portion question?",
    })
    await i18n.changeLanguage("ko")
  },
)
