/**
 * 식당 `AI 식단 상담` — 빌더 ↔ 파서 왕복.
 *
 * 서버에는 **텍스트만** 저장된다. 대화를 다시 열면 그 텍스트를 파서가 되돌려 말풍선을
 * 그리므로, 둘 중 하나만 바뀌면 컨텍스트 블록이 버블에 그대로 새거나(숫자가 화면에 뜬다)
 * 질문이 통째로 사라진다. 오류는 안 난다 — 그 조용한 퇴화를 여기서 잡는다.
 *
 * 번역기는 스텁이 아니라 **진짜 i18n** 을 쓴다. 그래야 `restaurant.consult.*` 키가
 * 실제로 두 로케일에 있는지까지 같이 확인된다(없으면 문장에 키 문자열이 그대로 찍힌다).
 */

import i18n from "../src/i18n"
import {
  RESTAURANT_CONSULT_MENU_LIMIT,
  RESTAURANT_CONSULT_MESSAGE_MAX_LENGTH,
  buildRestaurantConsultMessage,
  parseRestaurantConsultMessage,
  pickConsultMenuFacts,
} from "../src/features/restaurant/consult/restaurantConsultMessage"
import type { ConsultMenuFact } from "../src/features/restaurant/consult/types"
import type { MenuItemDto } from "../src/features/restaurant/types"

const t = (key: string, options?: Record<string, unknown>): string =>
  (i18n.t as unknown as (k: string, o?: Record<string, unknown>) => string)(
    key,
    options,
  )

const SUNDAE: ConsultMenuFact = {
  name: "순대국밥",
  calories: 480,
  protein: 22,
  sodium: 1720,
  potassium: 640,
  phosphorus: 230,
}

const HANSANG: ConsultMenuFact = {
  name: "한상차림",
  calories: 610,
  protein: 18.5,
  sodium: 890,
  potassium: 410,
  phosphorus: 190,
}

function build(
  question: string,
  menus: ConsultMenuFact[] = [SUNDAE, HANSANG],
): string {
  return buildRestaurantConsultMessage({
    question,
    restaurantName: "장호덕손만두",
    cuisineLabel: t("restaurant.cuisine.KOREAN"),
    menus,
    t,
  })
}

describe("식당 상담 메시지", () => {
  afterEach(async () => {
    await i18n.changeLanguage("ko")
  })

  it("질문이 **맨 앞**이다 — 대화 제목이 곧 질문이 된다", () => {
    /*
      서버는 첫 유저 메시지의 앞 50 코드포인트를 대화 제목으로 삼는다.
      컨텍스트 블록을 앞에 두면 상담 기록 목록의 제목이 전부 `[식당] …` 이 된다.
    */
    const question = "나트륨이 가장 많은 메뉴는 어떤 건가요?"
    const text = build(question)
    const title = Array.from(text).slice(0, 50).join("")

    expect(text.split("\n")[0]).toBe(question)
    expect(title.startsWith(question)).toBe(true)
    expect(title.trimStart().startsWith("[")).toBe(false)
  })

  it("질문이 길어도 제목은 질문에서만 잘린다", () => {
    const question = `${"나트륨".repeat(20)}?`
    const title = Array.from(build(question)).slice(0, 50).join("")

    expect(question.startsWith(title)).toBe(true)
    expect(title).not.toContain("[")
  })

  it("빌더가 만든 텍스트에서 파서가 질문만 되돌린다", () => {
    const question = "신장 환자에게 추천하는 메뉴는 무엇인가요?"
    const parsed = parseRestaurantConsultMessage(build(question))

    expect(parsed).not.toBeNull()
    expect(parsed?.question).toBe(question)
  })

  it("컨텍스트 블록은 파서에서 사라진다 — 버블에 메뉴 숫자가 안 뜬다", () => {
    const text = build("순대국밥과 한상차림 중 어느 쪽이 신장에 부담이 될까요?")
    // 원문에는 숫자가 있다(모델이 읽어야 하니까).
    expect(text).toContain("1720mg")
    expect(text).toContain("[식당] 장호덕손만두")

    const parsed = parseRestaurantConsultMessage(text)
    expect(parsed?.question).toBe(
      "순대국밥과 한상차림 중 어느 쪽이 신장에 부담이 될까요?",
    )
    expect(parsed?.question).not.toContain("1720")
    expect(parsed?.question).not.toContain("[")
  })

  it("메뉴 줄은 이름과 숫자뿐이다 — 등급 라벨이 실려 나가지 않는다", () => {
    const text = build("이 메뉴 어떤가요?", [SUNDAE])

    expect(text).toContain(
      "- 순대국밥: 열량 480kcal, 단백질 22g, 나트륨 1720mg, 칼륨 640mg, 인 230mg",
    )
    /*
      「안전」을 프롬프트에 실으면 모델이 「이 메뉴는 안전해요」로 되받고, 그 문장이
      서버의 `unsupported_reassurance` 에 걸려 **답변 전체가 폐기된다.**
      등급은 질문을 고르는 쪽에만 쓴다.
    */
    for (const level of ["안전", "주의", "제한"]) {
      expect(text).not.toContain(level)
    }
  })

  it("**`총`/`합계` 줄을 절대 만들지 않는다** — 몇 인분 먹는지 우리는 모른다", () => {
    const text = build("추천 메뉴는요?")
    expect(text).not.toContain("총")
    expect(text).not.toContain("합계")
    expect(text).not.toMatch(/\bTotal\b/i)
  })

  it("메뉴 0건이면 `[메뉴]` 섹션이 아예 없다", () => {
    const text = build("피해야 할 반찬이 있나요?", [])

    expect(text).toContain("[식당] 장호덕손만두")
    expect(text).toContain("[분류] 한식")
    expect(text).not.toContain("[메뉴]")
    expect(text).not.toContain("- ")
    // 그래도 질문은 그대로 되돌아온다.
    expect(parseRestaurantConsultMessage(text)?.question).toBe(
      "피해야 할 반찬이 있나요?",
    )
  })

  it("메뉴는 2건에서 자른다 — 8건 전량은 `진단하기` 몫이다", () => {
    const third: ConsultMenuFact = { ...SUNDAE, name: "신신백숙" }
    const text = build("비교해 주세요", [SUNDAE, HANSANG, third])

    expect(RESTAURANT_CONSULT_MENU_LIMIT).toBe(2)
    expect(text).toContain("순대국밥")
    expect(text).toContain("한상차림")
    expect(text).not.toContain("신신백숙")
    expect(
      text.split("\n").filter((line) => line.startsWith("- ")),
    ).toHaveLength(2)
  })

  it("숫자가 없는 메뉴는 이름만 남는다 — 콜론 뒤 빈 줄을 만들지 않는다", () => {
    const bare: ConsultMenuFact = {
      name: "오늘의 특선",
      calories: null,
      protein: null,
      sodium: null,
      potassium: null,
      phosphorus: null,
    }
    const text = build("이건 어떤가요?", [bare])
    expect(text).toContain("- 오늘의 특선")
    expect(text).not.toContain("오늘의 특선:")
  })

  it("상한 4800 에서 절단한다", () => {
    const text = build("가".repeat(6000), [SUNDAE, HANSANG])
    expect(text).toHaveLength(RESTAURANT_CONSULT_MESSAGE_MAX_LENGTH)
  })

  it("파서가 평범한 문장에는 `null` 을 준다 — 일반 텍스트 버블로 떨어진다", () => {
    expect(parseRestaurantConsultMessage("여기 주차 되나요?")).toBeNull()
    expect(parseRestaurantConsultMessage("두 줄짜리\n평범한 메시지")).toBeNull()
    expect(parseRestaurantConsultMessage("")).toBeNull()
  })

  describe("사용자가 친 `[` 를 우리 원문으로 착각하지 않는다", () => {
    /*
      판별이 "`[` 로 시작하는 줄이 하나라도 있으면" 이었을 때, 손으로 친 여러 줄 문장에
      그런 줄이 섞이면 파서가 자기 원문이라고 착각하고 **그 줄부터 아래를 통째로 버블에서
      지웠다.** 사용자가 쓴 문장이 화면에서 사라지는데 경고도 오류도 없다.

      빌더의 모양은 정확히 `질문 / 빈 줄 / 머리줄·항목만` 이다. 어긋나면 `null` 이고,
      그때 버블은 원문을 그대로 그린다 — 아무것도 잃지 않는 실패다.
    */
    it.each([
      [
        "빈 줄 없이 이어 쓴 대괄호",
        "이거 먹어도 되나요\n[참고] 어제 검사했어요",
      ],
      ["들여쓴 대괄호", "이거 먹어도 되나요\n\n  [참고] 어제 검사했어요"],
      ["닫히지 않은 대괄호", "이거 먹어도 되나요\n\n[참고 어제 검사했어요"],
      [
        "블록 뒤에 다시 산문이 온다",
        "이거 먹어도 되나요\n\n[참고] 어제\n\n그리고 또 궁금한 게 있어요",
      ],
      [
        "블록 안에 산문이 섞였다",
        "이거 먹어도 되나요\n\n[참고] 어제\n오늘도 검사했어요",
      ],
    ])("%s → null (원문 그대로 그린다)", (_label, content) => {
      expect(parseRestaurantConsultMessage(content)).toBeNull()
    })

    it("빌더 모양은 여전히 읽는다 — 끝에 개행이 붙어 와도", () => {
      expect(
        parseRestaurantConsultMessage(`${build("이건 어떤가요?")}\n`),
      ).toEqual({ question: "이건 어떤가요?" })
    })

    it("질문이 여러 줄이어도 그대로 되돌린다", () => {
      const text = build("첫 줄이고\n둘째 줄입니다")
      expect(parseRestaurantConsultMessage(text)?.question).toBe(
        "첫 줄이고\n둘째 줄입니다",
      )
    })
  })

  it("컨텍스트가 하나도 없으면 빈 줄만 매달지 않는다", () => {
    const text = buildRestaurantConsultMessage({
      question: "안녕하세요",
      restaurantName: "  ",
      cuisineLabel: "",
      menus: [],
      t,
    })
    expect(text).toBe("안녕하세요")
    expect(parseRestaurantConsultMessage(text)).toBeNull()
  })

  it("영어 로케일에서도 같은 계약이다", async () => {
    await i18n.changeLanguage("en")
    const question = "Which menu item has the most sodium?"
    const text = build(question)

    expect(text.startsWith(question)).toBe(true)
    expect(text).toContain("[Restaurant] 장호덕손만두")
    expect(text).toContain("[Menu items]")
    expect(text).toContain("Sodium 1720mg")
    expect(parseRestaurantConsultMessage(text)?.question).toBe(question)
    expect(text).not.toMatch(/\bTotal\b/i)
  })
})

describe("pickConsultMenuFacts", () => {
  const menu = (over: Partial<MenuItemDto>): MenuItemDto => ({
    menuId: 1,
    name: "순대국밥",
    description: null,
    price: 12000,
    imageUrl: null,
    isSignature: true,
    calories: 480,
    protein: 22,
    sodium: 1720,
    potassium: 640,
    phosphorus: 230,
    safetyLevel: "RESTRICTED",
    safetyDriver: "sodium",
    safetyRatio: 1.4,
    confidence: "ESTIMATED",
    legacyRiskLevel: "HIGH_RISK",
    legacyRiskNutrients: ["SODIUM"],
    ...over,
  })

  it("이름과 숫자만 떠낸다 — 등급·legacy 필드는 통로 자체가 없다", () => {
    const [fact] = pickConsultMenuFacts([menu({})], ["순대국밥"])

    expect(Object.keys(fact).sort()).toEqual([
      "calories",
      "name",
      "phosphorus",
      "potassium",
      "protein",
      "sodium",
    ])
    expect(JSON.stringify(fact)).not.toContain("RESTRICTED")
    expect(JSON.stringify(fact)).not.toContain("HIGH_RISK")
  })

  it("`names` 가 준 순서를 지키고, 없는 이름은 조용히 건너뛴다", () => {
    const menus = [menu({}), menu({ menuId: 2, name: "한상차림" })]
    expect(
      pickConsultMenuFacts(menus, ["한상차림", "없는메뉴", "순대국밥"]).map(
        (fact) => fact.name,
      ),
    ).toEqual(["한상차림", "순대국밥"])
  })

  it("상한 2 에서 자른다", () => {
    const menus = [
      menu({}),
      menu({ menuId: 2, name: "한상차림" }),
      menu({ menuId: 3, name: "신신백숙" }),
    ]
    expect(
      pickConsultMenuFacts(menus, ["순대국밥", "한상차림", "신신백숙"]),
    ).toHaveLength(RESTAURANT_CONSULT_MENU_LIMIT)
  })

  it("DTO 이름에 공백이 붙어 있어도 찾는다 — 부르는 쪽은 trim 한 값을 준다", () => {
    /*
      `suggestedQuestions` 의 비교 질문은 **문장에 넣은 것과 같은 값**을 넘긴다
      (`worst.name.trim()`). DTO 원본과 `===` 로 맞추면 서버가 준 이름에 공백이 한 칸만
      있어도 아무것도 못 찾고, 그러면 비교 질문이 `[메뉴]` 블록 없이 나가 모델이 두 메뉴를
      이름만 보고 비교한다. 경고도 오류도 없다.
    */
    const menus = [
      menu({ name: " 순대국밥 " }),
      menu({ menuId: 2, name: "한상차림\n" }),
    ]
    const facts = pickConsultMenuFacts(menus, ["순대국밥", "한상차림"])

    expect(facts.map((fact) => fact.name)).toEqual(["순대국밥", "한상차림"])
    expect(facts[0].sodium).toBe(1720)
  })

  it("공백뿐인 이름은 아무것도 집지 않는다", () => {
    expect(pickConsultMenuFacts([menu({ name: "   " })], ["   "])).toEqual([])
  })
})
